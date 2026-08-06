import hashlib
import hmac

import httpx

from app.config import get_settings

settings = get_settings()

PAYSTACK_BASE_URL = "https://api.paystack.co"


class PaystackError(Exception):
    pass


class PaystackNotConfigured(PaystackError):
    pass


def is_configured() -> bool:
    return bool(settings.paystack_secret_key)


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.paystack_secret_key}", "Content-Type": "application/json"}


def initialize_transaction(email: str, paystack_plan_code: str, callback_url: str, metadata: dict) -> dict:
    """Starts a Paystack checkout for a subscription plan. Returns Paystack's response
    data (`authorization_url`, `access_code`, `reference`) for the frontend to redirect
    the user to.
    """
    if not is_configured():
        raise PaystackNotConfigured("Billing isn't configured yet. Set PAYSTACK_SECRET_KEY.")

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(
                f"{PAYSTACK_BASE_URL}/transaction/initialize",
                headers=_headers(),
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


def verify_transaction(reference: str) -> dict:
    if not is_configured():
        raise PaystackNotConfigured("Billing isn't configured yet. Set PAYSTACK_SECRET_KEY.")

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}", headers=_headers())
    except httpx.HTTPError as exc:
        raise PaystackError(f"Paystack request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise PaystackError(f"Paystack verify failed ({resp.status_code}): {resp.text}")

    return resp.json()["data"]


def verify_webhook_signature(raw_body: bytes, signature_header: str | None) -> bool:
    """Paystack signs webhook payloads with HMAC-SHA512 of the exact request body,
    using the secret key. Must be checked against the raw bytes Paystack sent — never
    against a re-serialized/parsed version, which can differ byte-for-byte.
    """
    if not signature_header or not settings.paystack_secret_key:
        return False
    expected = hmac.new(settings.paystack_secret_key.encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(expected, signature_header)
