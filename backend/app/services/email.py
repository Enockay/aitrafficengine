import base64
import logging
from datetime import date, datetime

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.user import User
from app.services import brevo_config

settings = get_settings()
logger = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


class EmailSendError(Exception):
    pass


class EmailNotConfigured(EmailSendError):
    pass


def is_configured(db: Session) -> bool:
    return brevo_config.get_config(db) is not None


def _send(
    db: Session,
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    attachments: list[dict] | None = None,
) -> None:
    config = brevo_config.get_config(db)
    if not config:
        raise EmailNotConfigured("Email sending isn't configured yet. Set Brevo config in Admin > Integrations.")
    api_key, sender_email, sender_name = config

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_content,
    }
    if attachments:
        payload["attachment"] = attachments

    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                BREVO_URL,
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise EmailSendError(f"Brevo request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise EmailSendError(f"Brevo send failed ({resp.status_code}): {resp.text}")


def send_verification_email(db: Session, user: User, raw_token: str) -> None:
    link = f"{settings.frontend_url}/verify-email?token={raw_token}"
    html = (
        f"<p>Hi {user.full_name},</p>"
        f"<p>Confirm your email address to activate your AI Traffic Engine account:</p>"
        f'<p><a href="{link}">Verify my email</a></p>'
        f"<p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>"
    )
    _send(db, user.email, user.full_name, "Verify your email — AI Traffic Engine", html)


def send_password_reset_email(db: Session, user: User, raw_token: str) -> None:
    link = f"{settings.frontend_url}/reset-password?token={raw_token}"
    html = (
        f"<p>Hi {user.full_name},</p>"
        f"<p>We received a request to reset your AI Traffic Engine password. Click below to choose a new one:</p>"
        f'<p><a href="{link}">Reset my password</a></p>'
        f"<p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your "
        f"password won't be changed.</p>"
    )
    _send(db, user.email, user.full_name, "Reset your password — AI Traffic Engine", html)


def send_report_email(db: Session, user: User, pdf_bytes: bytes, since: date, until: date) -> None:
    html = (
        f"<p>Hi {user.full_name},</p>"
        f"<p>Here's your AI Traffic Engine report for {since.isoformat()} to {until.isoformat()} — "
        f"posts published, clicks, and interactions, attached as a PDF.</p>"
    )
    attachment = [
        {
            "content": base64.b64encode(pdf_bytes).decode(),
            "name": f"report_{since.isoformat()}_{until.isoformat()}.pdf",
        }
    ]
    _send(
        db,
        user.email,
        user.full_name,
        "Your AI Traffic Engine report",
        html,
        attachments=attachment,
    )


def _format_sent_at(sent_at: datetime) -> str:
    return sent_at.strftime("%b %d, %Y at %I:%M %p UTC")


def send_support_alert_email(db: Session, admin_email: str, user_email: str, message_body: str, sent_at: datetime) -> None:
    link = f"{settings.frontend_url}/admin/support"
    html = (
        f"<p>A support message from <strong>{user_email}</strong> has gone unanswered for "
        f"5 minutes:</p>"
        f'<blockquote style="margin:12px 0;padding:8px 12px;border-left:3px solid #ccc;">{message_body}</blockquote>'
        f"<p>Sent {_format_sent_at(sent_at)}.</p>"
        f'<p><a href="{link}">Open the support inbox</a></p>'
    )
    _send(db, admin_email, "Admin", "Unanswered support message — AI Traffic Engine", html)


def send_support_reply_email(db: Session, user: User, message_body: str, sent_at: datetime) -> None:
    link = f"{settings.frontend_url}/support"
    html = (
        f"<p>Hi {user.full_name},</p>"
        f"<p>You've got a new reply from support:</p>"
        f'<blockquote style="margin:12px 0;padding:8px 12px;border-left:3px solid #ccc;">{message_body}</blockquote>'
        f"<p>Sent {_format_sent_at(sent_at)}.</p>"
        f'<p><a href="{link}">View the full conversation</a></p>'
    )
    _send(db, user.email, user.full_name, "New reply from support — AI Traffic Engine", html)
