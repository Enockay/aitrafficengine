from datetime import datetime

from pydantic import BaseModel


class PlanOut(BaseModel):
    code: str
    name: str
    price_usd: int
    max_sites: int
    max_posts_per_month: int
    max_flyers_per_month: int
    schedule_horizon_days: int


class SubscriptionOut(BaseModel):
    plan_code: str
    status: str
    trial_ends_at: datetime | None
    current_period_end: datetime | None
    cancel_at_period_end: bool


class UsageOut(BaseModel):
    plan_code: str | None
    schedule_horizon_days: int | None
    sites_used: int
    sites_limit: int | None
    posts_used_this_month: int
    posts_limit: int | None
    flyers_used_this_month: int
    flyers_limit: int | None


class SubscribeRequest(BaseModel):
    plan_code: str


class InitializeTransactionOut(BaseModel):
    authorization_url: str
    reference: str
