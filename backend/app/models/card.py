import uuid
from datetime import datetime

from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Card(Base):
    """
    名片資料 (AI 辨識後經人工確認的結構化資料)
    """

    __tablename__ = "cards"
    __table_args__ = (
        # 防止同一使用者有重複 (姓名+公司)
        UniqueConstraint(
            "user_id",
            "name",
            "company",
            name="uq_card_user_name_company",
        ),
        # 加速常見查詢
        Index("ix_card_user_id", "user_id"),
        Index("ix_card_user_name", "user_id", "name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
    )
    company: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
    )
    phone: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
    )
    mobile: Mapped[str] = mapped_column(
        String(50),
        nullable=True,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    address: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )
    front_image_url: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
    )
    back_image_url: Mapped[str] = mapped_column(
        String(500),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────
    owner: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="cards",
    )
    tags: Mapped[list["CardTag"]] = relationship(
        "CardTag",
        back_populates="card",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class CardTag(Base):
    """名片 ↔ 標籤 多對多關聯表"""

    __tablename__ = "card_tags"

    card_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cards.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # ── Relationships ──────────────────────────────────────────
    card: Mapped["Card"] = relationship(
        "Card",
        back_populates="tags",
    )
    tag: Mapped["Tag"] = relationship(  # noqa: F821
        "Tag",
        back_populates="cards",
    )
