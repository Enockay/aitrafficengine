import base64
import html
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

BRAND_NAME = "AI Traffic Engine"
BRAND_TAGLINE = "Auto-managed traffic, powered by AI"
# Matches the app's hexagon mark (Logo.tsx / favicon.svg) — kept as a plain HTML/CSS
# header instead of a linked <img> since most mail clients block remote images by
# default, which would otherwise show a broken-image icon before the user even
# opens the message.
BRAND_GRADIENT = "linear-gradient(135deg, #e5484d, #af3a3e)"
BRAND_ACCENT = "#e5484d"


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


def _shell(inner_html: str, preheader: str = "") -> str:
    """Wraps every outgoing email in the same branded card: gradient header with
    the app's mark, a white content area, and a muted footer. Table-based layout
    and inline styles throughout — the only markup that renders consistently
    across Gmail, Apple Mail, and Outlook alike.
    """
    return f"""
<div style="background-color:#f4f4f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">{html.escape(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <tr>
      <td style="background:{BRAND_GRADIENT};padding:22px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:34px;height:34px;background-color:rgba(255,255,255,0.16);border-radius:8px;text-align:center;vertical-align:middle;font-size:16px;line-height:34px;">
              ⚡
            </td>
            <td style="padding-left:10px;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.01em;vertical-align:middle;">
              {BRAND_NAME}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;color:#18181b;font-size:14px;line-height:1.65;">
        {inner_html}
      </td>
    </tr>
    <tr>
      <td style="padding:18px 32px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
        <p style="margin:0;color:#a1a1aa;font-size:12px;">{BRAND_NAME} &middot; {BRAND_TAGLINE}</p>
      </td>
    </tr>
  </table>
</div>
""".strip()


def _button(url: str, label: str) -> str:
    return (
        f'<a href="{html.escape(url, quote=True)}" '
        f'style="display:inline-block;background-color:{BRAND_ACCENT};color:#ffffff;text-decoration:none;'
        f'padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;margin:8px 0 4px;">'
        f"{html.escape(label)}</a>"
    )


def _quoted_message(body: str) -> str:
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" '
        f'style="margin:16px 0;border-left:3px solid {BRAND_ACCENT};background-color:#fafafa;border-radius:0 8px 8px 0;">'
        f'<tr><td style="padding:12px 16px;color:#3f3f46;font-size:14px;white-space:pre-wrap;">'
        f"{html.escape(body)}</td></tr></table>"
    )


def _format_sent_at(sent_at: datetime) -> str:
    return sent_at.strftime("%b %d, %Y at %I:%M %p UTC")


def send_verification_email(db: Session, user: User, raw_token: str) -> None:
    link = f"{settings.frontend_url}/verify-email?token={raw_token}"
    inner = (
        f"<p style='margin:0 0 12px;'>Hi {html.escape(user.full_name)},</p>"
        f"<p style='margin:0 0 4px;'>Confirm your email address to activate your {BRAND_NAME} account:</p>"
        f"{_button(link, 'Verify my email')}"
        f"<p style='margin:20px 0 0;color:#71717a;font-size:13px;'>This link expires in 24 hours. "
        f"If you didn't create this account, you can ignore this email.</p>"
    )
    _send(db, user.email, user.full_name, f"Verify your email — {BRAND_NAME}", _shell(inner, "Confirm your email address"))


def send_password_reset_email(db: Session, user: User, raw_token: str) -> None:
    link = f"{settings.frontend_url}/reset-password?token={raw_token}"
    inner = (
        f"<p style='margin:0 0 12px;'>Hi {html.escape(user.full_name)},</p>"
        f"<p style='margin:0 0 4px;'>We received a request to reset your {BRAND_NAME} password. "
        f"Click below to choose a new one:</p>"
        f"{_button(link, 'Reset my password')}"
        f"<p style='margin:20px 0 0;color:#71717a;font-size:13px;'>This link expires in 1 hour. If you didn't "
        f"request this, you can safely ignore this email — your password won't be changed.</p>"
    )
    _send(db, user.email, user.full_name, f"Reset your password — {BRAND_NAME}", _shell(inner, "Reset your password"))


def send_report_email(db: Session, user: User, pdf_bytes: bytes, since: date, until: date) -> None:
    inner = (
        f"<p style='margin:0 0 12px;'>Hi {html.escape(user.full_name)},</p>"
        f"<p style='margin:0;'>Here's your {BRAND_NAME} report for {since.isoformat()} to {until.isoformat()} — "
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
        f"Your {BRAND_NAME} report",
        _shell(inner, "Your traffic report is ready"),
        attachments=attachment,
    )


def send_support_alert_email(db: Session, admin_email: str, user_email: str, message_body: str, sent_at: datetime) -> None:
    link = f"{settings.frontend_url}/admin/support"
    inner = (
        f"<p style='margin:0 0 4px;'>A support message from <strong>{html.escape(user_email)}</strong> "
        f"has gone unanswered for 5 minutes:</p>"
        f"{_quoted_message(message_body)}"
        f"<p style='margin:0 0 4px;color:#71717a;font-size:13px;'>Sent {_format_sent_at(sent_at)}.</p>"
        f"{_button(link, 'Open the support inbox')}"
    )
    _send(
        db, admin_email, "Admin", f"Unanswered support message — {BRAND_NAME}",
        _shell(inner, f"{user_email} is waiting on a reply"),
    )


def send_support_reply_email(db: Session, user: User, message_body: str, sent_at: datetime) -> None:
    link = f"{settings.frontend_url}/support"
    inner = (
        f"<p style='margin:0 0 12px;'>Hi {html.escape(user.full_name)},</p>"
        f"<p style='margin:0 0 4px;'>You've got a new reply from support:</p>"
        f"{_quoted_message(message_body)}"
        f"<p style='margin:0 0 4px;color:#71717a;font-size:13px;'>Sent {_format_sent_at(sent_at)}.</p>"
        f"{_button(link, 'View the full conversation')}"
    )
    _send(
        db, user.email, user.full_name, f"New reply from support — {BRAND_NAME}",
        _shell(inner, "You've got a new reply from support"),
    )
