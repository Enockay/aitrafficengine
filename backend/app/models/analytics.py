import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class Analytics(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "analytics"
    __table_args__ = (
        Index("idx_analytics_post_date", "post_id", "metric_date"),
        Index("idx_analytics_platform_date", "platform", "metric_date"),
    )

    post_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    metric_date: Mapped[date] = mapped_column(Date, nullable=False)
    impressions: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    clicks: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    likes: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    comments: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    shares: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    engagement_rate: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    reach: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    profile_visits: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    follower_change: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    post: Mapped["Post"] = relationship(back_populates="analytics")
