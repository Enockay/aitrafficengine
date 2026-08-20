import logging

import httpx

from app.config import get_settings

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

settings = get_settings()
logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.turnstile_secret_key)


def verify(token: str | None, remote_ip: str | None) -> bool:
    """Verifies a Turnstile widget token server-side. Skips verification (returns
    True) when no secret key is configured, so local dev works without a Cloudflare
    account — see Settings.turnstile_secret_key.
    """
    if not is_configured():
        return True
    if not token:
        return False

    data = {"secret": settings.turnstile_secret_key, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(VERIFY_URL, data=data)
    except httpx.HTTPError as exc:
        logger.error("Turnstile verification request failed: %s", exc)
        return False

    if resp.status_code >= 400:
        logger.error("Turnstile verification failed: status=%s response=%s", resp.status_code, resp.text)
        return False

    result = resp.json()
    if not result.get("success"):
        logger.info("Turnstile token rejected: %s", result.get("error-codes"))
    return bool(result.get("success"))
