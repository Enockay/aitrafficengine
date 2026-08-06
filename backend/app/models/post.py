import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Post(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "posts"
    __table_args__ = (
        Index("idx_posts_page_id", "page_id"),
        Index("idx_posts_platform_status", "platform", "status"),
    )

    page_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pages.id"), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    content_type: Mapped[str] = mapped_column(String(20), default="single", server_default="single")
    title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    hashtags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tracked_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", server_default="draft")
    published_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    platform_post_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    engagement_score: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    variant_group_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    variant_label: Mapped[str | None] = mapped_column(String(1), nullable=True)

    page: Mapped["Page"] = relationship(back_populates="posts")
    schedules: Mapped[list["Schedule"]] = relationship(back_populates="post")
    analytics: Mapped[list["Analytics"]] = relationship(back_populates="post")
