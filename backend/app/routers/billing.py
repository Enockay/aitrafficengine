import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.payment import Payment
from app.models.paystack_webhook_event import PaystackWebhookEvent
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.billing import (
    InitializeTransactionOut,
    PlanOut,
    SubscribeRequest,
    SubscriptionOut,
    UsageOut,
)
from app.services.paystack import PaystackError, PaystackNotConfigured, initialize_transaction, verify_webhook_signature
from app.services.plans import PLANS, get_plan
from app.services.quotas import get_usage_summary

router = APIRouter(prefix="/billing", tags=["billing"])
settings = get_settings()


def _get_or_create_subscription(db: Session, user: User) -> Subscription:
    if user.subscription:
        return user.subscription
    subscription = Subscription(user_id=user.id, plan_code="starter", status="incomplete")
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


@router.get("/plans", response_model=list[PlanOut])
def list_plans():
    return [
        PlanOut(
            code=plan.code,
            name=plan.name,
            price_usd=plan.price_usd,
            max_sites=plan.max_sites,
            max_posts_per_month=plan.max_posts_per_month,
            max_flyers_per_month=plan.max_flyers_per_month,
            schedule_horizon_days=plan.schedule_horizon_days,
        )
        for plan in PLANS.values()
    ]


@router.get("/subscription", response_model=SubscriptionOut)
def get_subscription(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subscription = _get_or_create_subscription(db, current_user)
    return SubscriptionOut(
        plan_code=subscription.plan_code,
        status=subscription.status,
        trial_ends_at=subscription.trial_ends_at,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
    )


@router.get("/usage", response_model=UsageOut)
def get_usage(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_create_subscription(db, current_user)
    return UsageOut(**get_usage_summary(db, current_user))


@router.post("/subscribe", response_model=InitializeTransactionOut)
def subscribe(
    payload: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = get_plan(payload.plan_code)
    if not plan:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown plan: {payload.plan_code}")

    try:
        data = initialize_transaction(
            db,
            email=current_user.email,
            paystack_plan_code=plan.paystack_plan_code,
            callback_url=f"{settings.frontend_url}/billing",
            metadata={"user_id": str(current_user.id), "plan_code": plan.code},
        )
    except PaystackNotConfigured as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except PaystackError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    return InitializeTransactionOut(authorization_url=data["authorization_url"], reference=data["reference"])


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def paystack_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_paystack_signature: str | None = Header(default=None),
):
    raw_body = await request.body()
    if not verify_webhook_signature(db, raw_body, x_paystack_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    payload = await request.json()
    event_type = payload.get("event", "")
    data = payload.get("data", {})
    reference = data.get("reference") or data.get("subscription_code") or ""

    # Idempotency: Paystack retries webhook delivery on any non-2xx/timeout. Insert
    # first — a unique-constraint violation means this exact event was already
    # processed, so no-op instead of double-applying it.
    try:
        db.add(PaystackWebhookEvent(event_type=event_type, reference=reference, raw_payload=payload))
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"status": "already processed"}

    if event_type == "charge.success":
        _activate_subscription(db, data)
    elif event_type == "subscription.disable":
        _cancel_subscription(db, data)

    return {"status": "ok"}


def _parse_paystack_datetime(value: str | None, fallback: datetime) -> datetime:
    if not value:
        return fallback
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return fallback


def _activate_subscription(db: Session, data: dict) -> None:
    metadata = data.get("metadata") or {}
    user_id = metadata.get("user_id")
    plan_code = metadata.get("plan_code")
    if not user_id or plan_code not in PLANS:
        return

    subscription = db.query(Subscription).filter(Subscription.user_id == uuid.UUID(user_id)).one_or_none()
    if not subscription:
        subscription = Subscription(user_id=uuid.UUID(user_id))
        db.add(subscription)

    now = datetime.now(timezone.utc)
    subscription.plan_code = plan_code
    subscription.status = "active"
    subscription.current_period_start = now
    subscription.current_period_end = now + timedelta(days=30)
    subscription.cancel_at_period_end = False
    subscription.paystack_customer_code = (data.get("customer") or {}).get("customer_code")
    authorization = data.get("authorization") or {}
    if authorization.get("authorization_code"):
        subscription.paystack_authorization_code = authorization["authorization_code"]
    db.flush()  # assigns subscription.id if newly created, needed for Payment FK

    # Paystack sends amounts in the currency's smallest subunit (kobo for NGN, etc.) —
    # convert to major unit once here so every downstream revenue query is a plain SUM.
    amount_minor = data.get("amount")
    try:
        amount_major = (Decimal(amount_minor) / 100) if amount_minor is not None else Decimal("0")
    except InvalidOperation:
        amount_major = Decimal("0")

    try:
        db.add(
            Payment(
                user_id=uuid.UUID(user_id),
                subscription_id=subscription.id,
                plan_code=plan_code,
                amount=amount_major,
                currency=data.get("currency", "NGN"),
                channel=authorization.get("channel"),
                paystack_reference=data.get("reference", ""),
                paid_at=_parse_paystack_datetime(data.get("paid_at"), now),
            )
        )
        db.commit()
    except IntegrityError:
        # Same defensive pattern as the PaystackWebhookEvent insert above — a retried
        # delivery with the same reference shouldn't double-record revenue.
        db.rollback()


def _cancel_subscription(db: Session, data: dict) -> None:
    subscription_code = data.get("subscription_code")
    if not subscription_code:
        return
    subscription = (
        db.query(Subscription)
        .filter(Subscription.paystack_subscription_code == subscription_code)
        .one_or_none()
    )
    if subscription:
        subscription.status = "cancelled"
        db.commit()
