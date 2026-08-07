import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class Payment(UUIDPrimaryKeyMixin, Base):
    """An immutable record of a successful Paystack charge — the real revenue ledger,
    as opposed to Subscription (current state) or PaystackWebhookEvent (idempotency
    only). No updated_at: a payment that happened doesn't get edited after the fact.
    """

    __tablename__ = "payments"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True
    )
    plan_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Major currency unit (e.g. naira, not kobo) — converted once at ingestion from
    # Paystack's subunit amount. See services/paystack.py webhook handling.
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    channel: Mapped[str | None] = mapped_column(String(30), nullable=True)
    paystack_reference: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
