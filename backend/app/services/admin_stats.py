from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.post import Post
from app.models.schedule import Schedule
from app.models.site import Site
from app.models.subscription import Subscription
from app.models.user import User
from app.services.plans import PLANS

RECENT_SIGNUPS_LIMIT = 10


def get_admin_summary(db: Session) -> dict:
    total_users = db.execute(select(func.count(User.id)).where(User.deleted_at.is_(None))).scalar_one()
    active_users = db.execute(
        select(func.count(User.id)).where(User.deleted_at.is_(None), User.is_active.is_(True))
    ).scalar_one()

    plan_rows = db.execute(
        select(Subscription.plan_code, func.count(Subscription.id))
        .where(Subscription.status == "active")
        .group_by(Subscription.plan_code)
    ).all()
    users_by_plan = {plan_code: count for plan_code, count in plan_rows}

    # Kept explicitly separate from the real Payment ledger sum below — this is a
    # snapshot estimate of recurring revenue from currently-active plans, not a
    # historical actual. Trialing subscriptions don't count toward MRR.
    mrr_estimate_usd = sum(
        PLANS[code].price_usd * count for code, count in users_by_plan.items() if code in PLANS
    )

    revenue_rows = db.execute(
        select(Payment.currency, func.coalesce(func.sum(Payment.amount), 0)).group_by(Payment.currency)
    ).all()
    total_revenue_by_currency = {currency: float(total) for currency, total in revenue_rows}

    total_sites = db.execute(select(func.count(Site.id)).where(Site.deleted_at.is_(None))).scalar_one()
    total_posts = db.execute(select(func.count(Post.id)).where(Post.deleted_at.is_(None))).scalar_one()
    pending_schedules_count = db.execute(
        select(func.count(Schedule.id)).where(Schedule.status == "pending")
    ).scalar_one()

    recent_signups = db.execute(
        select(User.id, User.email, User.full_name, User.created_at)
        .where(User.deleted_at.is_(None))
        .order_by(User.created_at.desc())
        .limit(RECENT_SIGNUPS_LIMIT)
    ).all()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "users_by_plan": users_by_plan,
        "mrr_estimate_usd": mrr_estimate_usd,
        "total_revenue_by_currency": total_revenue_by_currency,
        "total_sites": total_sites,
        "total_posts": total_posts,
        "pending_schedules_count": pending_schedules_count,
        "recent_signups": [
            {"id": row.id, "email": row.email, "full_name": row.full_name, "created_at": row.created_at}
            for row in recent_signups
        ],
    }
