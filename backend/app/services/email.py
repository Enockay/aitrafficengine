import logging

import httpx

from app.config import get_settings
from app.models.user import User

settings = get_settings()
logger = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


class EmailSendError(Exception):
    pass


class EmailNotConfigured(EmailSendError):
    pass


def is_configured() -> bool:
    return bool(settings.brevo_api_key)


def _send(to_email: str, to_name: str, subject: str, html_content: str) -> None:
    if not settings.brevo_api_key:
        raise EmailNotConfigured("Email sending isn't configured yet. Set BREVO_API_KEY.")

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                BREVO_URL,
                headers={
                    "api-key": settings.brevo_api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "sender": {"name": settings.brevo_sender_name, "email": settings.brevo_sender_email},
                    "to": [{"email": to_email, "name": to_name}],
                    "subject": subject,
                    "htmlContent": html_content,
                },
            )
    except httpx.HTTPError as exc:
        raise EmailSendError(f"Brevo request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise EmailSendError(f"Brevo send failed ({resp.status_code}): {resp.text}")


def send_verification_email(user: User, raw_token: str) -> None:
    link = f"{settings.frontend_url}/verify-email?token={raw_token}"
    html = (
        f"<p>Hi {user.full_name},</p>"
        f"<p>Confirm your email address to activate your AI Traffic Engine account:</p>"
        f'<p><a href="{link}">Verify my email</a></p>'
        f"<p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>"
    )
    _send(user.email, user.full_name, "Verify your email — AI Traffic Engine", html)


def send_password_reset_email(user: User, raw_token: str) -> None:
    link = f"{settings.frontend_url}/reset-password?token={raw_token}"
    html = (
        f"<p>Hi {user.full_name},</p>"
        f"<p>We received a request to reset your AI Traffic Engine password. Click below to choose a new one:</p>"
        f'<p><a href="{link}">Reset my password</a></p>'
        f"<p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your "
        f"password won't be changed.</p>"
    )
    _send(user.email, user.full_name, "Reset your password — AI Traffic Engine", html)
