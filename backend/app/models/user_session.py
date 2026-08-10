import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class UserSession(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "user_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    browser: Mapped[str | None] = mapped_column(String(50), nullable=True)
    os: Mapped[str | None] = mapped_column(String(50), nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="sessions")
    page_visits: Mapped[list["PageVisit"]] = relationship(
        back_populates="session", order_by="PageVisit.visited_at", cascade="all, delete-orphan"
    )
