import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
import aiofiles
import os

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.card import Card, CardTag
from app.models.tag import Tag
from app.schemas.card import CardCreate, CardUpdate, CardResponse, CardSimple
from app.schemas.tag import TagSimple
from app.api.auth.router import get_current_user

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("", response_model=list[CardResponse])
async def list_cards(
    search: str = Query(None, description="搜尋關鍵字"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """列出當前用戶的所有名片"""
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

    result = await db.execute(query.order_by(Card.created_at.desc()))
    cards = result.scalars().all()

    return [_card_to_response(card) for card in cards]


@router.post("", response_model=CardResponse)
async def create_card(
    card_data: CardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """新增名片"""
    new_card = Card(
        user_id=current_user.id,
        **card_data.model_dump(exclude_unset=True),
    )
    db.add(new_card)
    await db.commit()
    await db.refresh(new_card)
    return _card_to_response(new_card)


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
    for key, value in card_data.model_dump(exclude_unset=True).items():
        setattr(card, key, value)
    await db.commit()
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
    tags = [TagSimple(id=str(ct.tag.id), name=ct.tag.name, color=ct.tag.color) for ct in card.tags]
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
