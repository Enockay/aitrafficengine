import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class SupportMessage(UUIDPrimaryKeyMixin, Base):
    """A message in a user's support thread. There's no separate conversation
    table — `user_id` always identifies whose thread this belongs to, regardless
    of whether `sender_id` is that same user or an admin replying, since every
    user has exactly one shared thread that any admin can answer.
    """

    __tablename__ = "support_messages"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    sender_role: Mapped[str] = mapped_column(String(10), nullable=False)  # "user" | "admin"
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
