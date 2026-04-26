import uuid
from datetime import datetime

from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    """系統使用者 (認證與權限管理)"""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────
    cards: Mapped[list["Card"]] = relationship(  # noqa: F821
        "Card",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    tags: Mapped[list["Tag"]] = relationship(  # noqa: F821
        "Tag",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
