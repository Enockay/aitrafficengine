from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.models.subscription_plan import SubscriptionPlan

TRIAL_PLAN_CODE = "growth"
TRIAL_DAYS = 5

# All 3 tiers currently get access to all 3 supported platforms (Twitter, LinkedIn,
# Reddit) — there's no per-tier accounts-linked cap in practice since that's the entire
# platform catalog. Revisit if the platform count grows.


class PlanError(Exception):
    pass


def list_plans(db: Session) -> list[SubscriptionPlan]:
    return list(db.execute(select(SubscriptionPlan).order_by(SubscriptionPlan.price_usd)).scalars())


def get_plan(db: Session, code: str) -> SubscriptionPlan | None:
    return db.get(SubscriptionPlan, code)


def create_plan(
    db: Session,
    *,
    code: str,
    name: str,
    price_usd: int,
    max_sites: int,
    max_posts_per_month: int,
    max_flyers_per_month: int,
    schedule_horizon_days: int,
    paystack_plan_code: str,
) -> SubscriptionPlan:
    if get_plan(db, code) is not None:
        raise PlanError(f"A plan with code {code!r} already exists.")
    plan = SubscriptionPlan(
        code=code,
        name=name,
        price_usd=price_usd,
        max_sites=max_sites,
        max_posts_per_month=max_posts_per_month,
        max_flyers_per_month=max_flyers_per_month,
        schedule_horizon_days=schedule_horizon_days,
        paystack_plan_code=paystack_plan_code,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def update_plan(
    db: Session,
    code: str,
    *,
    name: str,
    price_usd: int,
    max_sites: int,
    max_posts_per_month: int,
    max_flyers_per_month: int,
    schedule_horizon_days: int,
    paystack_plan_code: str,
) -> SubscriptionPlan:
    plan = get_plan(db, code)
    if plan is None:
        raise PlanError(f"Unknown plan: {code}")
    plan.name = name
    plan.price_usd = price_usd
    plan.max_sites = max_sites
    plan.max_posts_per_month = max_posts_per_month
    plan.max_flyers_per_month = max_flyers_per_month
    plan.schedule_horizon_days = schedule_horizon_days
    plan.paystack_plan_code = paystack_plan_code
    db.commit()
    db.refresh(plan)
    return plan


def delete_plan(db: Session, code: str) -> None:
    plan = get_plan(db, code)
    if plan is None:
        return
    if code == TRIAL_PLAN_CODE:
        raise PlanError(f"Can't delete {code!r} — it's the plan new signups start their trial on.")
    in_use = db.execute(select(Subscription.id).where(Subscription.plan_code == code).limit(1)).first()
    if in_use:
        raise PlanError(f"Can't delete {code!r} — at least one subscription is still on this plan.")
    db.delete(plan)
    db.commit()
