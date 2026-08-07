import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_role
from app.models.activity_log import ActivityLog
from app.models.page import Page
from app.models.payment import Payment
from app.models.platform_account import PlatformAccount
from app.models.post import Post
from app.models.schedule import Schedule
from app.models.site import Site
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.admin import (
    AdminActivityLogListResponse,
    AdminActivityLogOut,
    AdminPaymentListResponse,
    AdminPaymentOut,
    AdminScheduleListResponse,
    AdminScheduleOut,
    AdminSiteListResponse,
    AdminSiteOut,
    AdminStatsOut,
    AdminUserDetailOut,
    AdminUserListResponse,
    AdminUserOut,
    BrevoConfigIn,
    BrevoConfigStatusOut,
    PaystackConfigIn,
    PaystackConfigStatusOut,
    RevenueMonthPoint,
    RevenueSummaryOut,
    UpdateUserPlanRequest,
    UpdateUserRoleRequest,
    UpdateUserStatusRequest,
)
from app.services import brevo_config, paystack_config
from app.services.activity_log import log_activity
from app.services.admin_stats import get_admin_summary
from app.services.plans import PLANS
from app.services.site_stats import to_site_out

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_ROLES = ("admin", "user")


def _get_target_user(db: Session, user_id: uuid.UUID) -> User:
    user = db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _guard_not_self(current_user: User, target_id: uuid.UUID, action: str) -> None:
    if target_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"You can't {action}.")


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=AdminStatsOut)
def get_stats(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return AdminStatsOut(**get_admin_summary(db))


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    plan_code: str | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = (
        select(User, Subscription)
        .outerjoin(Subscription, Subscription.user_id == User.id)
        .where(User.deleted_at.is_(None))
    )
    if search:
        like = f"%{search}%"
        query = query.where((User.email.ilike(like)) | (User.full_name.ilike(like)))
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))
    if plan_code:
        query = query.where(Subscription.plan_code == plan_code)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    ).all()

    items = []
    for user, subscription in rows:
        sites_count = db.execute(
            select(func.count(Site.id)).where(Site.user_id == user.id, Site.deleted_at.is_(None))
        ).scalar_one()
        posts_count = db.execute(
            select(func.count(Post.id))
            .join(Page, Post.page_id == Page.id)
            .join(Site, Page.site_id == Site.id)
            .where(Site.user_id == user.id, Post.deleted_at.is_(None))
        ).scalar_one()
        items.append(
            AdminUserOut(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                is_active=user.is_active,
                company_name=user.company_name,
                plan_code=subscription.plan_code if subscription else None,
                subscription_status=subscription.status if subscription else None,
                sites_count=sites_count,
                posts_count=posts_count,
                created_at=user.created_at,
            )
        )
    return AdminUserListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/users/{user_id}", response_model=AdminUserDetailOut)
def get_user_detail(
    user_id: uuid.UUID,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user = _get_target_user(db, user_id)
    subscription = user.subscription

    sites_count = db.execute(
        select(func.count(Site.id)).where(Site.user_id == user.id, Site.deleted_at.is_(None))
    ).scalar_one()
    posts_count = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == user.id, Post.deleted_at.is_(None))
    ).scalar_one()
    recent_activity = db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(20)
    ).scalars().all()

    return AdminUserDetailOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        company_name=user.company_name,
        plan_code=subscription.plan_code if subscription else None,
        subscription_status=subscription.status if subscription else None,
        sites_count=sites_count,
        posts_count=posts_count,
        created_at=user.created_at,
        trial_ends_at=subscription.trial_ends_at if subscription else None,
        current_period_end=subscription.current_period_end if subscription else None,
        recent_activity=recent_activity,
    )


@router.patch("/users/{user_id}/status", response_model=AdminUserOut)
def update_user_status(
    user_id: uuid.UUID,
    payload: UpdateUserStatusRequest,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    _guard_not_self(current_user, user_id, "suspend or reactivate your own account")
    user = _get_target_user(db, user_id)
    user.is_active = payload.is_active
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="admin_set_user_status",
        entity_type="user",
        entity_id=user.id,
        details={"is_active": payload.is_active},
        request=request,
    )
    return _to_admin_user_out(db, user)


@router.patch("/users/{user_id}/role", response_model=AdminUserOut)
def update_user_role(
    user_id: uuid.UUID,
    payload: UpdateUserRoleRequest,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role: {payload.role}")
    _guard_not_self(current_user, user_id, "change your own role")
    user = _get_target_user(db, user_id)
    user.role = payload.role
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="admin_set_user_role",
        entity_type="user",
        entity_id=user.id,
        details={"role": payload.role},
        request=request,
    )
    return _to_admin_user_out(db, user)


@router.patch("/users/{user_id}/plan", response_model=AdminUserOut)
def override_user_plan(
    user_id: uuid.UUID,
    payload: UpdateUserPlanRequest,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if payload.plan_code not in PLANS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown plan: {payload.plan_code}")
    user = _get_target_user(db, user_id)
    subscription = user.subscription
    if not subscription:
        subscription = Subscription(user_id=user.id)
        db.add(subscription)

    subscription.plan_code = payload.plan_code
    subscription.status = payload.status
    subscription.current_period_end = payload.current_period_end
    subscription.cancel_at_period_end = False
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="admin_override_user_plan",
        entity_type="user",
        entity_id=user.id,
        details={"plan_code": payload.plan_code, "status": payload.status},
        request=request,
    )
    return _to_admin_user_out(db, user)


@router.delete("/users/{user_id}", response_model=AdminUserOut)
def soft_delete_user(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    _guard_not_self(current_user, user_id, "delete your own account")
    user = _get_target_user(db, user_id)
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="admin_delete_user",
        entity_type="user",
        entity_id=user.id,
        request=request,
    )
    return _to_admin_user_out(db, user)


def _to_admin_user_out(db: Session, user: User) -> AdminUserOut:
    subscription = user.subscription
    sites_count = db.execute(
        select(func.count(Site.id)).where(Site.user_id == user.id, Site.deleted_at.is_(None))
    ).scalar_one()
    posts_count = db.execute(
        select(func.count(Post.id))
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .where(Site.user_id == user.id, Post.deleted_at.is_(None))
    ).scalar_one()
    return AdminUserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        company_name=user.company_name,
        plan_code=subscription.plan_code if subscription else None,
        subscription_status=subscription.status if subscription else None,
        sites_count=sites_count,
        posts_count=posts_count,
        created_at=user.created_at,
    )


# ---------------------------------------------------------------------------
# Sites
# ---------------------------------------------------------------------------


@router.get("/sites", response_model=AdminSiteListResponse)
def list_all_sites(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    user_id: uuid.UUID | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = select(Site, User).join(User, Site.user_id == User.id).where(Site.deleted_at.is_(None))
    if search:
        like = f"%{search}%"
        query = query.where((Site.name.ilike(like)) | (Site.domain.ilike(like)))
    if status_filter == "active":
        query = query.where(Site.is_active.is_(True))
    elif status_filter == "inactive":
        query = query.where(Site.is_active.is_(False))
    if user_id:
        query = query.where(Site.user_id == user_id)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(Site.created_at.desc()).offset((page - 1) * limit).limit(limit)
    ).all()

    items = []
    for site, owner in rows:
        stats = to_site_out(db, site)
        items.append(
            AdminSiteOut(
                id=site.id,
                name=site.name,
                domain=site.domain,
                owner_email=owner.email,
                is_active=site.is_active,
                pages_count=stats.pages_count,
                posts_count=stats.posts_count,
                total_clicks=stats.total_clicks,
                last_crawled_at=stats.last_crawled_at,
                created_at=site.created_at,
            )
        )
    return AdminSiteListResponse(items=items, total=total, page=page, limit=limit)


# ---------------------------------------------------------------------------
# Schedules
# ---------------------------------------------------------------------------


@router.get("/schedules", response_model=AdminScheduleListResponse)
def list_all_schedules(
    status_filter: str | None = Query(default=None, alias="status"),
    user_id: uuid.UUID | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = (
        select(Schedule, Post, User)
        .join(Post, Schedule.post_id == Post.id)
        .join(Page, Post.page_id == Page.id)
        .join(Site, Page.site_id == Site.id)
        .join(User, Site.user_id == User.id)
    )
    if status_filter:
        query = query.where(Schedule.status == status_filter)
    if user_id:
        query = query.where(Site.user_id == user_id)

    rows = db.execute(query.order_by(Schedule.scheduled_at.desc())).all()
    items = [
        AdminScheduleOut(
            id=schedule.id,
            post_id=post.id,
            post_title=post.title,
            platform=post.platform,
            owner_email=owner.email,
            scheduled_at=schedule.scheduled_at,
            status=schedule.status,
            retry_count=schedule.retry_count,
            last_error=schedule.last_error,
            published_at=schedule.published_at,
        )
        for schedule, post, owner in rows
    ]
    return AdminScheduleListResponse(items=items, total=len(items))


# ---------------------------------------------------------------------------
# Billing / revenue
# ---------------------------------------------------------------------------


@router.get("/payments", response_model=AdminPaymentListResponse)
def list_payments(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    user_id: uuid.UUID | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = select(Payment, User).join(User, Payment.user_id == User.id)
    if user_id:
        query = query.where(Payment.user_id == user_id)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(Payment.paid_at.desc()).offset((page - 1) * limit).limit(limit)
    ).all()
    items = [
        AdminPaymentOut(
            id=payment.id,
            user_id=payment.user_id,
            user_email=owner.email,
            plan_code=payment.plan_code,
            amount=payment.amount,
            currency=payment.currency,
            channel=payment.channel,
            paystack_reference=payment.paystack_reference,
            paid_at=payment.paid_at,
        )
        for payment, owner in rows
    ]
    return AdminPaymentListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/revenue/summary", response_model=RevenueSummaryOut)
def get_revenue_summary(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    summary = get_admin_summary(db)

    month_expr = func.to_char(Payment.paid_at, "YYYY-MM")
    monthly_rows = db.execute(
        select(month_expr, Payment.currency, func.sum(Payment.amount))
        .group_by(month_expr, Payment.currency)
        .order_by(month_expr)
    ).all()

    return RevenueSummaryOut(
        total_revenue_by_currency=summary["total_revenue_by_currency"],
        mrr_estimate_usd=summary["mrr_estimate_usd"],
        monthly_series=[
            RevenueMonthPoint(month=month, amount=float(amount), currency=currency)
            for month, currency, amount in monthly_rows
        ],
    )


# ---------------------------------------------------------------------------
# Activity logs (global)
# ---------------------------------------------------------------------------


@router.get("/activity-logs", response_model=AdminActivityLogListResponse)
def list_all_activity_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    user_id: uuid.UUID | None = None,
    action: str | None = None,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = select(ActivityLog, User).outerjoin(User, ActivityLog.user_id == User.id)
    if user_id:
        query = query.where(ActivityLog.user_id == user_id)
    if action:
        query = query.where(ActivityLog.action == action)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(ActivityLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
    ).all()
    items = [
        AdminActivityLogOut(
            id=log.id,
            user_id=log.user_id,
            user_email=owner.email if owner else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            created_at=log.created_at,
        )
        for log, owner in rows
    ]
    return AdminActivityLogListResponse(items=items, total=total, page=page, limit=limit)


# ---------------------------------------------------------------------------
# Integrations config
# ---------------------------------------------------------------------------


@router.get("/config/paystack", response_model=PaystackConfigStatusOut)
def get_paystack_config(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return PaystackConfigStatusOut(**paystack_config.get_status(db))


@router.put("/config/paystack", response_model=PaystackConfigStatusOut)
def set_paystack_config(
    payload: PaystackConfigIn,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    paystack_config.upsert(db, payload.secret_key, payload.public_key)
    log_activity(
        db, user_id=current_user.id, action="admin_set_paystack_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return PaystackConfigStatusOut(**paystack_config.get_status(db))


@router.delete("/config/paystack", response_model=PaystackConfigStatusOut)
def delete_paystack_config(
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    paystack_config.delete(db)
    log_activity(
        db, user_id=current_user.id, action="admin_delete_paystack_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return PaystackConfigStatusOut(**paystack_config.get_status(db))


@router.get("/config/brevo", response_model=BrevoConfigStatusOut)
def get_brevo_config(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    return BrevoConfigStatusOut(**brevo_config.get_status(db))


@router.put("/config/brevo", response_model=BrevoConfigStatusOut)
def set_brevo_config(
    payload: BrevoConfigIn,
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    brevo_config.upsert(db, payload.api_key, payload.sender_email, payload.sender_name)
    log_activity(
        db, user_id=current_user.id, action="admin_set_brevo_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return BrevoConfigStatusOut(**brevo_config.get_status(db))


@router.delete("/config/brevo", response_model=BrevoConfigStatusOut)
def delete_brevo_config(
    request: Request,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    brevo_config.delete(db)
    log_activity(
        db, user_id=current_user.id, action="admin_delete_brevo_config", entity_type="config",
        entity_id=current_user.id, request=request,
    )
    return BrevoConfigStatusOut(**brevo_config.get_status(db))
