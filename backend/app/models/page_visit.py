import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class PageVisit(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "page_visits"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_sessions.id"), nullable=False
    )
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    session: Mapped["UserSession"] = relationship(back_populates="page_visits")
