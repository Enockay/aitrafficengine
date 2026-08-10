from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin


class SubscriptionPlan(TimestampMixin, Base):
    """Admin-editable subscription tiers — replaces the old hardcoded PLANS dict so
    prices/limits/Paystack plan codes can be managed from Admin > Plans without a
    deploy. `code` is the natural key already referenced everywhere (Subscription.
    plan_code, Payment.plan_code), so it's the primary key here too rather than a
    separate surrogate UUID.
    """

    __tablename__ = "subscription_plans"

    code: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    price_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    max_sites: Mapped[int] = mapped_column(Integer, nullable=False)
    max_posts_per_month: Mapped[int] = mapped_column(Integer, nullable=False)
    max_flyers_per_month: Mapped[int] = mapped_column(Integer, nullable=False)
    schedule_horizon_days: Mapped[int] = mapped_column(Integer, nullable=False)
    # Paystack never accepts a custom plan_code on creation — this must be the real
    # code Paystack assigned (see scripts/create_paystack_plans.py), copied in here
    # after creating/recreating the plan on Paystack's dashboard/API.
    paystack_plan_code: Mapped[str] = mapped_column(String(50), nullable=False)
