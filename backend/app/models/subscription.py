import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.utils.encrypted_type import EncryptedString


class Subscription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True
    )
    plan_code: Mapped[str] = mapped_column(String(20), default="starter", server_default="starter")
    # trialing | active | past_due | cancelled | expired
    status: Mapped[str] = mapped_column(String(20), default="trialing", server_default="trialing")
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    paystack_customer_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    paystack_subscription_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Encrypted at rest (Fernet) — a reusable charge token, same sensitivity as an OAuth
    # access token.
    paystack_authorization_code: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)

    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    user: Mapped["User"] = relationship(back_populates="subscription")
