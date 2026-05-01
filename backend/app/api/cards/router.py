import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, delete
from sqlalchemy.orm import selectinload
import aiofiles
import os
from pathlib import Path

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.card import Card, CardTag
from app.models.tag import Tag
from app.schemas.card import CardCreate, CardUpdate, CardResponse, CardSimple, CardUploadResponse, CardParsedResponse
from app.schemas.tag import TagSimple
from app.api.auth.router import get_current_user
from app.services.minimax import parse_card_with_minimax

router = APIRouter(prefix="/cards", tags=["cards"])

# Absolute path inside container where uploaded files are stored
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _make_filename(user_id: str, side: str, ext: str) -> str:
    """Generate unique filename: {user_id}_{side}_{timestamp}.{ext}"""
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    return f"{user_id}_{side}_{ts}.{ext}"


@router.get("", response_model=list[CardResponse])
async def list_cards(
    search: str = Query(None, description="搜尋關鍵字"),
    tag_id: str = Query(None, description="標籤過濾"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """列出當前用戶的所有名片（可依關鍵字或標籤過濾）"""
    query = select(Card).where(Card.user_id == current_user.id).options(selectinload(Card.tags).selectinload(CardTag.tag))

    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                Card.name.ilike(search_filter),
                Card.company.ilike(search_filter),
                Card.email.ilike(search_filter),
                Card.title.ilike(search_filter),
            )
        )

    if tag_id:
        query = query.where(
            Card.id.in_(
                select(CardTag.card_id).where(CardTag.tag_id == uuid.UUID(tag_id))
            )
        )

    result = await db.execute(query.order_by(Card.created_at.desc()))
    cards = result.scalars().all()

    return [_card_to_response(card) for card in cards]


@router.get("/check-duplicates", response_model=list[dict])
async def check_duplicates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """偵測重複名片(同名稱+同公司)"""
    result = await db.execute(
        select(Card).where(Card.user_id == current_user.id).order_by(Card.name, Card.company)
    )
    all_cards = result.scalars().all()

    # Group by name + company
    groups: dict[tuple, list[Card]] = {}
    for card in all_cards:
        if card.name:  # Only check if name exists
            key = (card.name.strip().lower(), (card.company or "").strip().lower())
            if key not in groups:
                groups[key] = []
            groups[key].append(card)

    # Find duplicates
    duplicates = []
    for key, cards in groups.items():
        if len(cards) > 1:
            duplicates.append({
                "name": key[0],
                "company": key[1],
                "count": len(cards),
                "cards": [{"id": str(c.id), "created_at": c.created_at.isoformat() if c.created_at else ""} for c in cards],
            })

    return duplicates


# ──────────────────────────────────────────────────────────────────────────────
# Endpoint: Upload & AI Parse (Step 3.3 - AI OCR)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/upload_and_parse", response_model=CardUploadResponse)
async def upload_and_parse(
    front: UploadFile = File(..., description="名片正面圖檔"),
    back: UploadFile | None = File(None, description="名片背面圖檔 (可選)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    1. Receive front (and optionally back) card images.
    2. Save them to /app/uploads with unique filenames.
    3. Call MiniMax Vision API to extract structured JSON.
    4. Return image paths + parsed data for human review.
       (NO database write at this stage.)
    """
    saved_paths: list[str] = []
    front_url: str | None = None
    back_url: str | None = None

    # ── Save front image ──────────────────────────────────────
    front_ext = Path(front.filename or "front.jpg").suffix.lstrip(".") or "jpg"
    front_name = _make_filename(str(current_user.id), "front", front_ext)
    front_path = UPLOAD_DIR / front_name
    async with aiofiles.open(front_path, "wb") as f:
        content = await front.read()
        await f.write(content)
    saved_paths.append(str(front_path))
    front_url = f"uploads/{front_name}"

    # ── Save back image (if provided) ──────────────────────────
    if back and back.filename:
        back_ext = Path(back.filename or "back.jpg").suffix.lstrip(".") or "jpg"
        back_name = _make_filename(str(current_user.id), "back", back_ext)
        back_path = UPLOAD_DIR / back_name
        async with aiofiles.open(back_path, "wb") as f:
            content = await back.read()
            await f.write(content)
        saved_paths.append(str(back_path))
        back_url = f"uploads/{back_name}"

    # ── Call MiniMax Vision API ────────────────────────────────
    try:
        parsed = await parse_card_with_minimax(saved_paths)
    except Exception as e:
        parsed = {
            "name": None, "company": None, "title": None,
            "phone": None, "mobile": None, "email": None,
            "address": None, "suggested_tags": [],
            "_parse_error": str(e),
        }

    return CardUploadResponse(
        front_image_url=front_url,
        back_image_url=back_url,
        parsed=CardParsedResponse(**parsed),
    )


@router.post("", response_model=CardResponse)
async def create_card(
    card_data: CardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """新增名片"""
    try:
        card_dict = card_data.model_dump(exclude_unset=True)
        now = datetime.utcnow()
        new_id = uuid.uuid4()

        # ✅ 先將 Card 加入 session(順序很重要!)
        new_card = Card(
            id=new_id,
            user_id=current_user.id,
            name=card_dict.get('name'),
            company=card_dict.get('company'),
            title=card_dict.get('title'),
            phone=card_dict.get('phone'),
            mobile=card_dict.get('mobile'),
            email=card_dict.get('email'),
            address=card_dict.get('address'),
            front_image_url=card_dict.get('front_image_url'),
            back_image_url=card_dict.get('back_image_url'),
            created_at=now,
            updated_at=now,
        )
        db.add(new_card)  # ← 確保 Card 在所有 related objects 之前被加入

        # Add tags if provided
        tag_ids = card_dict.get('tag_ids', [])
        for tag_id in tag_ids:
            card_tag = CardTag(card_id=new_id, tag_id=tag_id)
            db.add(card_tag)

        await db.commit()
        await db.refresh(new_card)

        # Return response without accessing relationships (avoids lazy load issues)
        return CardResponse(
            id=str(new_id),
            user_id=str(current_user.id),
            name=card_dict.get('name'),
            company=card_dict.get('company'),
            title=card_dict.get('title'),
            phone=card_dict.get('phone'),
            mobile=card_dict.get('mobile'),
            email=card_dict.get('email'),
            address=card_dict.get('address'),
            front_image_url=card_dict.get('front_image_url'),
            back_image_url=card_dict.get('back_image_url'),
            created_at=now,
            updated_at=now,
            tags=[],
        )
    except ValueError as e:
        await db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        print(f"Card creation error: {error_detail}")
        print(f"Card data: {card_dict}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"儲存失敗:{str(e)}",
        )


@router.get("/{card_id}", response_model=CardResponse)
async def get_card(
    card_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取得單張名片"""
    card = await _get_card_or_404(card_id, current_user.id, db)
    return _card_to_response(card)


@router.put("/{card_id}", response_model=CardResponse)
async def update_card(
    card_id: str,
    card_data: CardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新名片"""
    card = await _get_card_or_404(card_id, current_user.id, db)
    card_dict = card_data.model_dump(exclude_unset=True)
    
    # Handle tag_ids separately (replace all existing tags)
    tag_ids = card_dict.pop('tag_ids', None)
    print(f"[DEBUG] update_card card_id={card_id} tag_ids={tag_ids}")

    # Update other fields
    for key, value in card_dict.items():
        if key not in ('id', 'user_id', 'created_at'):
            setattr(card, key, value)

    # Always update updated_at
    card.updated_at = datetime.utcnow()

    # Update tags if provided (even if empty list means clear all tags)
    if tag_ids is not None:
        print(f"[DEBUG] Removing existing tags for card_id={card.id}")
        # Remove all existing tags for this card (convert string to UUID)
        await db.execute(
            delete(CardTag).where(CardTag.card_id == card.id)
        )
        print(f"[DEBUG] Adding {len(tag_ids)} new tags")
        # Add new tags
        for tag_id in tag_ids:
            card_tag = CardTag(card_id=card.id, tag_id=uuid.UUID(tag_id))
            db.add(card_tag)

    await db.commit()

    # Re-fetch card with tags to ensure they're loaded for response
    print(f"[DEBUG] Re-fetching card to verify tags")
    result = await db.execute(
        select(Card)
        .where(Card.id == uuid.UUID(card_id))
        .options(selectinload(Card.tags).selectinload(CardTag.tag))
    )
    card = result.scalar_one()
    print(f"[DEBUG] After re-fetch, card.tags = {card.tags}")

    await db.refresh(card)
    return _card_to_response(card)


@router.delete("/{card_id}")
async def delete_card(
    card_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """刪除名片"""
    card = await _get_card_or_404(card_id, current_user.id, db)
    await db.delete(card)
    await db.commit()
    return {"message": "Card deleted"}


@router.post("/{card_id}/tags/{tag_id}")
async def add_tag_to_card(
    card_id: str,
    tag_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """關聯標籤到名片"""
    card = await _get_card_or_404(card_id, current_user.id, db)
    # Verify tag belongs to user
    result = await db.execute(select(Tag).where(Tag.id == tag_id, Tag.user_id == current_user.id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    # Check if association already exists
    result = await db.execute(
        select(CardTag).where(CardTag.card_id == card.id, CardTag.tag_id == tag.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {"message": "Tag already associated"}

    card_tag = CardTag(card_id=card.id, tag_id=tag.id)
    db.add(card_tag)
    await db.commit()
    return {"message": "Tag added to card"}


@router.delete("/{card_id}/tags/{tag_id}")
async def remove_tag_from_card(
    card_id: str,
    tag_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """移除名片上的標籤"""
    card = await _get_card_or_404(card_id, current_user.id, db)
    result = await db.execute(
        select(CardTag).where(CardTag.card_id == card.id, CardTag.tag_id == tag_id)
    )
    card_tag = result.scalar_one_or_none()
    if not card_tag:
        raise HTTPException(status_code=404, detail="Tag association not found")
    await db.delete(card_tag)
    await db.commit()
    return {"message": "Tag removed from card"}


async def _get_card_or_404(card_id: str, user_id: uuid.UUID, db: AsyncSession) -> Card:
    try:
        card_uuid = uuid.UUID(card_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid card ID")

    result = await db.execute(
        select(Card)
        .where(Card.id == card_uuid, Card.user_id == user_id)
        .options(selectinload(Card.tags).selectinload(CardTag.tag))
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


def _card_to_response(card: Card) -> CardResponse:
    # Safely handle tags that might not be loaded
    tags = []
    if card.tags:
        for ct in card.tags:
            if ct.tag:
                tags.append(TagSimple(id=str(ct.tag.id), name=ct.tag.name, color=ct.tag.color))
    return CardResponse(
        id=str(card.id),
        user_id=str(card.user_id),
        name=card.name,
        company=card.company,
        title=card.title,
        phone=card.phone,
        mobile=card.mobile,
        email=card.email,
        address=card.address,
        front_image_url=card.front_image_url,
        back_image_url=card.back_image_url,
        created_at=card.created_at,
        updated_at=card.updated_at,
        tags=tags,
    )
