import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class TrendFetchLog(UUIDPrimaryKeyMixin, Base):
    """One row per trends-API call attempt, success or failure — the admin audit trail."""

    __tablename__ = "trend_fetch_logs"

    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    woeid: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    trend_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class Trend(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A distinct trending topic, upserted on refetch. times_used caps how many
    generated posts may reference it (see MAX_USES_PER_TREND in services/trends.py)."""

    __tablename__ = "trends"

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    tweet_volume: Mapped[int | None] = mapped_column(Integer, nullable=True)
    woeid: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fetch_log_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trend_fetch_logs.id"), nullable=True
    )
    times_used: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    fetch_log: Mapped["TrendFetchLog | None"] = relationship()
