import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.models.tag import Tag
from app.schemas.tag import TagCreate, TagUpdate, TagResponse
from app.api.auth.router import get_current_user

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagResponse])
async def list_tags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """列出當前用戶的所有標籤"""
    result = await db.execute(select(Tag).where(Tag.user_id == current_user.id))
    tags = result.scalars().all()
    return [_tag_to_response(tag) for tag in tags]


@router.post("", response_model=TagResponse)
async def create_tag(
    tag_data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """新增標籤"""
    # Check if tag with same name already exists for this user
    result = await db.execute(
        select(Tag).where(Tag.user_id == current_user.id, Tag.name == tag_data.name)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Tag with this name already exists")

    new_tag = Tag(
        user_id=current_user.id,
        name=tag_data.name,
        color=tag_data.color,
    )
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    return _tag_to_response(new_tag)


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: str,
    tag_data: TagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新標籤"""
    tag = await _get_tag_or_404(tag_id, current_user.id, db)

    if tag_data.name is not None:
        # Check if new name conflicts with existing tag
        result = await db.execute(
            select(Tag).where(
                Tag.user_id == current_user.id,
                Tag.name == tag_data.name,
                Tag.id != tag.id,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Tag with this name already exists")
        tag.name = tag_data.name

    if tag_data.color is not None:
        tag.color = tag_data.color

    await db.commit()
    await db.refresh(tag)
    return _tag_to_response(tag)


@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """刪除標籤"""
    tag = await _get_tag_or_404(tag_id, current_user.id, db)
    await db.delete(tag)
    await db.commit()
    return {"message": "Tag deleted"}


async def _get_tag_or_404(tag_id: str, user_id: uuid.UUID, db: AsyncSession) -> Tag:
    try:
        tag_uuid = uuid.UUID(tag_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tag ID")

    result = await db.execute(select(Tag).where(Tag.id == tag_uuid, Tag.user_id == user_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


def _tag_to_response(tag: Tag) -> TagResponse:
    return TagResponse(
        id=str(tag.id),
        user_id=str(tag.user_id),
        name=tag.name,
        color=tag.color,
        created_at=tag.created_at,
    )
