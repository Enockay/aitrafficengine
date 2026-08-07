import hashlib
import hmac

import httpx
from sqlalchemy.orm import Session

from app.services import paystack_config

PAYSTACK_BASE_URL = "https://api.paystack.co"


class PaystackError(Exception):
    pass


class PaystackNotConfigured(PaystackError):
    pass


def is_configured(db: Session) -> bool:
    return paystack_config.get_keys(db) is not None


def _secret_key(db: Session) -> str:
    keys = paystack_config.get_keys(db)
    if not keys:
        raise PaystackNotConfigured("Billing isn't configured yet. Set Paystack keys in Admin > Integrations.")
    return keys[0]


def _headers(db: Session) -> dict:
    return {"Authorization": f"Bearer {_secret_key(db)}", "Content-Type": "application/json"}


def initialize_transaction(db: Session, email: str, paystack_plan_code: str, callback_url: str, metadata: dict) -> dict:
    """Starts a Paystack checkout for a subscription plan. Returns Paystack's response
    data (`authorization_url`, `access_code`, `reference`) for the frontend to redirect
    the user to.
    """
    headers = _headers(db)  # raises PaystackNotConfigured before making any request

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                f"{PAYSTACK_BASE_URL}/transaction/initialize",
                headers=headers,
                json={
                    "email": email,
                    "plan": paystack_plan_code,
                    "callback_url": callback_url,
                    "metadata": metadata,
                },
            )
    except httpx.HTTPError as exc:
        raise PaystackError(f"Paystack request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise PaystackError(f"Paystack initialize failed ({resp.status_code}): {resp.text}")

    return resp.json()["data"]


def verify_transaction(db: Session, reference: str) -> dict:
    headers = _headers(db)

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}", headers=headers)
    except httpx.HTTPError as exc:
        raise PaystackError(f"Paystack request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise PaystackError(f"Paystack verify failed ({resp.status_code}): {resp.text}")

    return resp.json()["data"]


def verify_webhook_signature(db: Session, raw_body: bytes, signature_header: str | None) -> bool:
    """Paystack signs webhook payloads with HMAC-SHA512 of the exact request body,
    using the secret key. Must be checked against the raw bytes Paystack sent — never
    against a re-serialized/parsed version, which can differ byte-for-byte.
    """
    if not signature_header:
        return False
    keys = paystack_config.get_keys(db)
    if not keys:
        return False
    expected = hmac.new(keys[0].encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(expected, signature_header)
