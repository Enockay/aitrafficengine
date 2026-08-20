import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    EmailVerificationRequest,
    ForgotPasswordRequest,
    MessageResponse,
    PasswordChange,
    RefreshRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
    UserUpdate,
)
from app.redis_client import get_redis
from app.services.activity_log import log_activity
from app.services.auth import (
    AuthError,
    EmailNotVerifiedError,
    authenticate_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_password_reset_token,
    get_user_by_verification_token,
    register_user,
)
from app.services.email import (
    EmailNotConfigured,
    EmailSendError,
    send_password_reset_email,
    send_verification_email,
)
from app.services import turnstile
from app.utils.security import (
    InvalidTokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_verification_token,
    hash_password,
    hash_verification_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()
logger = logging.getLogger(__name__)

FAILED_LOGIN_LIMIT = 5
FAILED_LOGIN_LOCKOUT_SECONDS = 30 * 60

EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24
RESEND_VERIFICATION_LIMIT = 3
RESEND_VERIFICATION_WINDOW_SECONDS = 60 * 60

# Tighter TTL than email verification — this token grants a password change, not just
# an account-status flip, so a shorter window bounds the blast radius of a leaked link.
PASSWORD_RESET_TOKEN_TTL_HOURS = 1
FORGOT_PASSWORD_LIMIT = 3
FORGOT_PASSWORD_WINDOW_SECONDS = 60 * 60


def _failed_login_key(ip: str) -> str:
    return f"failed_login:{ip}"


def _set_access_token_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not settings.debug,
        samesite="strict",
        max_age=settings.access_token_expire_minutes * 60,
    )


def _issue_tokens(response: Response, user: User) -> TokenResponse:
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    _set_access_token_cookie(response, access_token)
    return TokenResponse(
        user=UserOut.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
    )


def _send_verification_email(db: Session, user: User, raw_token: str) -> None:
    try:
        send_verification_email(db, user, raw_token)
    except EmailNotConfigured as exc:
        logger.warning("Brevo not configured — skipping verification email for %s: %s", user.email, exc)
    except EmailSendError as exc:
        logger.error("Failed to send verification email to %s: %s", user.email, exc)


def _send_password_reset_email(db: Session, user: User, raw_token: str) -> None:
    try:
        send_password_reset_email(db, user, raw_token)
    except EmailNotConfigured as exc:
        logger.warning("Brevo not configured — skipping password reset email for %s: %s", user.email, exc)
    except EmailSendError as exc:
        logger.error("Failed to send password reset email to %s: %s", user.email, exc)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    if not turnstile.verify(payload.turnstile_token, client_ip):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CAPTCHA verification failed. Please try again.")
    try:
        user, raw_token = register_user(
            db,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            company_name=payload.company_name,
            phone_country_code=payload.phone_country_code,
            phone_number=payload.phone_number,
            timezone_name=payload.timezone,
            referral_code=payload.referral_code,
        )
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    log_activity(
        db, user_id=user.id, action="register", entity_type="user", entity_id=user.id, request=request
    )
    _send_verification_email(db, user, raw_token)
    return RegisterResponse(
        message="Account created. Check your email to verify your address before logging in.",
        email=user.email,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    redis = get_redis()
    lockout_key = _failed_login_key(client_ip)

    failures = int(redis.get(lockout_key) or 0)
    if failures >= FAILED_LOGIN_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again in 30 minutes.",
        )

    try:
        user = authenticate_user(db, payload.email, payload.password)
    except EmailNotVerifiedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except AuthError as exc:
        pipe = redis.pipeline()
        pipe.incr(lockout_key)
        pipe.expire(lockout_key, FAILED_LOGIN_LOCKOUT_SECONDS)
        pipe.execute()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    redis.delete(lockout_key)
    log_activity(db, user_id=user.id, action="login", entity_type="user", entity_id=user.id, request=request)
    return _issue_tokens(response, user)


@router.post("/verify-email", response_model=TokenResponse)
def verify_email(payload: EmailVerificationRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    token_hash = hash_verification_token(payload.token)
    user = get_user_by_verification_token(db, token_hash)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification link.")

    sent_at = user.email_verification_sent_at
    if sent_at is None or datetime.now(timezone.utc) - sent_at > timedelta(hours=EMAIL_VERIFICATION_TOKEN_TTL_HOURS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link has expired. Please request a new one.",
        )

    user.is_email_verified = True
    user.email_verification_token = None
    db.commit()
    db.refresh(user)
    log_activity(
        db, user_id=user.id, action="email_verified", entity_type="user", entity_id=user.id, request=request
    )
    return _issue_tokens(response, user)


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(payload: ResendVerificationRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    redis = get_redis()
    ip_key = f"resend_verification_ip:{client_ip}"
    email_key = f"resend_verification_email:{payload.email.lower()}"

    if (
        int(redis.get(ip_key) or 0) >= RESEND_VERIFICATION_LIMIT
        or int(redis.get(email_key) or 0) >= RESEND_VERIFICATION_LIMIT
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Please try again later."
        )

    pipe = redis.pipeline()
    pipe.incr(ip_key)
    pipe.expire(ip_key, RESEND_VERIFICATION_WINDOW_SECONDS)
    pipe.incr(email_key)
    pipe.expire(email_key, RESEND_VERIFICATION_WINDOW_SECONDS)
    pipe.execute()

    generic_message = "If an account with that email exists and needs verification, we've sent a new link."
    user = get_user_by_email(db, payload.email)
    if user and not user.is_email_verified:
        raw_token = generate_verification_token()
        user.email_verification_token = hash_verification_token(raw_token)
        user.email_verification_sent_at = datetime.now(timezone.utc)
        db.commit()
        _send_verification_email(db, user, raw_token)

    return MessageResponse(message=generic_message)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    redis = get_redis()
    ip_key = f"forgot_password_ip:{client_ip}"
    email_key = f"forgot_password_email:{payload.email.lower()}"

    if (
        int(redis.get(ip_key) or 0) >= FORGOT_PASSWORD_LIMIT
        or int(redis.get(email_key) or 0) >= FORGOT_PASSWORD_LIMIT
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests. Please try again later."
        )

    pipe = redis.pipeline()
    pipe.incr(ip_key)
    pipe.expire(ip_key, FORGOT_PASSWORD_WINDOW_SECONDS)
    pipe.incr(email_key)
    pipe.expire(email_key, FORGOT_PASSWORD_WINDOW_SECONDS)
    pipe.execute()

    # Enumeration-safe: identical response whether or not the account exists.
    generic_message = "If an account with that email exists, we've sent a password reset link."
    user = get_user_by_email(db, payload.email)
    if user and user.is_active:
        raw_token = generate_verification_token()
        user.password_reset_token = hash_verification_token(raw_token)
        user.password_reset_sent_at = datetime.now(timezone.utc)
        db.commit()
        _send_password_reset_email(db, user, raw_token)

    return MessageResponse(message=generic_message)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    token_hash = hash_verification_token(payload.token)
    user = get_user_by_password_reset_token(db, token_hash)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link.")

    sent_at = user.password_reset_sent_at
    if sent_at is None or datetime.now(timezone.utc) - sent_at > timedelta(hours=PASSWORD_RESET_TOKEN_TTL_HOURS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has expired. Please request a new one.",
        )

    user.hashed_password = hash_password(payload.new_password)
    user.password_reset_token = None
    db.commit()
    log_activity(
        db, user_id=user.id, action="password_reset", entity_type="user", entity_id=user.id, request=request
    )
    return MessageResponse(message="Password reset. You can now sign in with your new password.")


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(payload: RefreshRequest, response: Response, db: Session = Depends(get_db)):
    try:
        user_id = decode_token(payload.refresh_token, expected_type="refresh")
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access_token = create_access_token(user.id)
    _set_access_token_cookie(response, access_token)
    return AccessTokenResponse(access_token=access_token)


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    response.delete_cookie("access_token")
    log_activity(
        db, user_id=current_user.id, action="logout", entity_type="user", entity_id=current_user.id, request=request
    )
    return MessageResponse(message="Logged out successfully.")


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.email and payload.email != current_user.email:
        if get_user_by_email(db, payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use.")
        current_user.email = payload.email
    if payload.full_name:
        current_user.full_name = payload.full_name
    if payload.company_name is not None:
        current_user.company_name = payload.company_name or None
    if payload.phone_country_code is not None:
        current_user.phone_country_code = payload.phone_country_code or None
    if payload.phone_number is not None:
        current_user.phone_number = payload.phone_number or None
    if payload.timezone is not None:
        current_user.timezone = payload.timezone or "UTC"
    db.commit()
    db.refresh(current_user)
    log_activity(
        db,
        user_id=current_user.id,
        action="update",
        entity_type="user",
        entity_id=current_user.id,
        request=request,
    )
    return current_user


@router.put("/password", response_model=MessageResponse)
def change_password(
    payload: PasswordChange,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    current_user.hashed_password = hash_password(payload.new)
    db.commit()
    log_activity(
        db,
        user_id=current_user.id,
        action="password_change",
        entity_type="user",
        entity_id=current_user.id,
        request=request,
    )
    return MessageResponse(message="Password updated successfully.")
