import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.models.user import User
from app.services.plans import TRIAL_DAYS, TRIAL_PLAN_CODE
from app.utils.referral import generate_unique_referral_code
from app.utils.security import generate_verification_token, hash_password, hash_verification_token, verify_password


class AuthError(Exception):
    pass


class EmailNotVerifiedError(Exception):
    """Raised separately from AuthError so the router can 403 instead of 401 —
    correct credentials, just not verified yet, which shouldn't count toward the
    failed-login lockout."""

    pass


# Gmail (and Google Workspace's old googlemail.com alias) ignores dots in the local
# part and everything from a "+" on, so "a.b+x@gmail.com" and "ab@gmail.com" deliver
# to the same inbox. Left unnormalized, that's a free trial-abuse loophole — one
# inbox can register unlimited "distinct" accounts. Canonicalizing here, at both
# storage and lookup time, closes it without touching how the user's email displays
# anywhere else.
_DOT_STRIPPED_DOMAINS = {"gmail.com", "googlemail.com"}


def normalize_email(email: str) -> str:
    local, _, domain = email.strip().lower().rpartition("@")
    if domain in _DOT_STRIPPED_DOMAINS:
        local = local.split("+", 1)[0].replace(".", "")
        domain = "gmail.com"
    return f"{local}@{domain}"


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.execute(
        select(User).where(User.email == normalize_email(email), User.deleted_at.is_(None))
    ).scalar_one_or_none()


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    ).scalar_one_or_none()


def get_user_by_referral_code(db: Session, code: str) -> User | None:
    return db.execute(
        select(User).where(User.referral_code == code.strip().upper(), User.deleted_at.is_(None))
    ).scalar_one_or_none()


def get_user_by_verification_token(db: Session, token_hash: str) -> User | None:
    return db.execute(
        select(User).where(User.email_verification_token == token_hash, User.deleted_at.is_(None))
    ).scalar_one_or_none()


def get_user_by_password_reset_token(db: Session, token_hash: str) -> User | None:
    return db.execute(
        select(User).where(User.password_reset_token == token_hash, User.deleted_at.is_(None))
    ).scalar_one_or_none()


def register_user(
    db: Session,
    *,
    email: str,
    password: str,
    full_name: str,
    company_name: str | None = None,
    phone_country_code: str | None = None,
    phone_number: str | None = None,
    timezone_name: str = "UTC",
    referral_code: str | None = None,
) -> tuple[User, str]:
    email = normalize_email(email)
    if get_user_by_email(db, email):
        raise AuthError("A user with this email already exists.")

    referred_by_user_id = None
    if referral_code:
        referrer = get_user_by_referral_code(db, referral_code)
        if referrer:
            referred_by_user_id = referrer.id
        # Unknown/invalid code: soft-fail silently rather than blocking signup.

    raw_token = generate_verification_token()
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        company_name=company_name,
        phone_country_code=phone_country_code,
        phone_number=phone_number,
        timezone=timezone_name or "UTC",
        referral_code=generate_unique_referral_code(db),
        referred_by_user_id=referred_by_user_id,
        is_email_verified=False,
        email_verification_token=hash_verification_token(raw_token),
        email_verification_sent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()  # assigns user.id, needed for the Subscription FK, before the shared commit below
    db.add(
        Subscription(
            user_id=user.id,
            plan_code=TRIAL_PLAN_CODE,
            status="trialing",
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS),
        )
    )
    db.commit()
    db.refresh(user)
    return user, raw_token


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise AuthError("Incorrect email or password.")
    if not user.is_active:
        raise AuthError("This account has been deactivated.")
    if not user.is_email_verified:
        raise EmailNotVerifiedError("Please verify your email address before logging in.")
    return user
