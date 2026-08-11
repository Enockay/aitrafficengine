from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.flyer import Flyer
from app.models.page import Page
from app.models.post import Post
from app.models.site import Site
from app.models.subscription import Subscription
from app.models.subscription_plan import SubscriptionPlan
from app.models.user import User
from app.services.plans import TRIAL_PLAN_CODE, get_plan


class QuotaExceededError(Exception):
    pass


def _month_start(now: datetime) -> datetime:
    return now.replace(year=now.year, month=now.month, day=1, hour=0, minute=0, second=0, microsecond=0)


def get_effective_plan(db: Session, subscription: Subscription | None) -> SubscriptionPlan | None:
    """Resolves what plan's limits actually apply right now, accounting for trial
    state. Returns None when the user isn't entitled to create anything (trial
    expired and never subscribed, or a lapsed/cancelled subscription) — callers treat
    that as "block everything, prompt to subscribe."
    """
    if subscription is None:
        return None
    now = datetime.now(timezone.utc)
    if subscription.status == "trialing":
        if subscription.trial_ends_at and now < subscription.trial_ends_at:
            return get_plan(db, subscription.plan_code) or get_plan(db, TRIAL_PLAN_CODE)
        return None
    if subscription.status == "active":
        return get_plan(db, subscription.plan_code)
    return None  # past_due, cancelled, expired


def _count_sites(db: Session, user: User) -> int:
    return db.execute(
        select(func.count(Site.id)).where(Site.user_id == user.id, Site.deleted_at.is_(None))
    ).scalar_one()


def _count_posts_this_month(db: Session, user: User, now: datetime) -> int:
    return db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == user.id, Post.deleted_at.is_(None), Post.created_at >= _month_start(now))
    ).scalar_one()


def _count_flyers_this_month(db: Session, user: User, now: datetime) -> int:
    return db.execute(
        select(func.count(Flyer.id))
        .join(Page, Flyer.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == user.id, Flyer.deleted_at.is_(None), Flyer.created_at >= _month_start(now))
    ).scalar_one()


def get_usage_summary(db: Session, user: User) -> dict:
    plan = get_effective_plan(db, user.subscription)
    now = datetime.now(timezone.utc)
    return {
        "plan_code": plan.code if plan else None,
        "plan_name": plan.name if plan else None,
        "schedule_horizon_days": plan.schedule_horizon_days if plan else None,
        "sites_used": _count_sites(db, user),
        "sites_limit": plan.max_sites if plan else None,
        "posts_used_this_month": _count_posts_this_month(db, user, now),
        "posts_limit": plan.max_posts_per_month if plan else None,
        "flyers_used_this_month": _count_flyers_this_month(db, user, now),
        "flyers_limit": plan.max_flyers_per_month if plan else None,
    }


def _require_plan(db: Session, user: User) -> SubscriptionPlan:
    plan = get_effective_plan(db, user.subscription)
    if plan is None:
        raise QuotaExceededError("Your trial has ended or your plan isn't active. Subscribe to continue.")
    return plan


def check_can_create_post(db: Session, user: User) -> None:
    plan = _require_plan(db, user)
    now = datetime.now(timezone.utc)
    used = _count_posts_this_month(db, user, now)
    if used >= plan.max_posts_per_month:
        raise QuotaExceededError(
            f"You've reached your {plan.name} plan's limit of {plan.max_posts_per_month} posts this month. "
            "Upgrade to create more."
        )


def check_can_add_site(db: Session, user: User) -> None:
    plan = _require_plan(db, user)
    used = _count_sites(db, user)
    if used >= plan.max_sites:
        raise QuotaExceededError(
            f"You've reached your {plan.name} plan's limit of {plan.max_sites} connected sites. "
            "Upgrade to add more."
        )


def check_can_generate_flyer(db: Session, user: User) -> None:
    plan = _require_plan(db, user)
    now = datetime.now(timezone.utc)
    used = _count_flyers_this_month(db, user, now)
    if used >= plan.max_flyers_per_month:
        raise QuotaExceededError(
            f"You've reached your {plan.name} plan's limit of {plan.max_flyers_per_month} flyers this month. "
            "Upgrade to generate more."
        )


def check_schedule_horizon(db: Session, user: User, scheduled_at: datetime) -> None:
    plan = _require_plan(db, user)
    now = datetime.now(timezone.utc)
    max_horizon_days = plan.schedule_horizon_days
    if (scheduled_at - now).days >= max_horizon_days:
        raise QuotaExceededError(
            f"Your {plan.name} plan allows scheduling up to {max_horizon_days} days ahead. "
            "Pick an earlier time or upgrade for a longer horizon."
        )
