import html
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.models.platform_account import PlatformAccount
from app.models.post import Post
from app.services import platform_credentials
from app.services.connectors.base import (
    AuthorizeRequest,
    ConnectorAuthError,
    ConnectorNotConfigured,
    ConnectorPublishError,
    PlatformConnector,
    PublishResult,
    TokenResult,
)
from app.services.connectors.twitter import TWEET_DELIMITER

AUTHORIZE_URL = "https://www.reddit.com/api/v1/authorize"
TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
ME_URL = "https://oauth.reddit.com/api/v1/me"
SUBMIT_URL = "https://oauth.reddit.com/api/submit"
SCOPES = ["identity", "submit"]
USER_AGENT = "ai-traffic-engine/1.0"


class RedditConnector(PlatformConnector):
    platform = "reddit"
    default_scopes = SCOPES

    def is_configured(self, db: Session) -> bool:
        return platform_credentials.get_credentials(db, self.platform) is not None

    def _require_configured(self, db: Session) -> tuple[str, str]:
        creds = platform_credentials.get_credentials(db, self.platform)
        if not creds:
            raise ConnectorNotConfigured(
                "Reddit isn't configured yet. Add client credentials in Settings."
            )
        return creds

    def build_authorize_request(self, db: Session, redirect_uri: str) -> AuthorizeRequest:
        client_id, _ = self._require_configured(db)
        state = secrets.token_urlsafe(24)
        scopes = platform_credentials.get_effective_scopes(db, self.platform, self.default_scopes)
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(scopes),
            "state": state,
            "duration": "permanent",
        }
        url = httpx.URL(AUTHORIZE_URL, params=params)
        # Reddit's authorization-code flow doesn't use PKCE; code_verifier is unused
        # here but kept for interface symmetry with the other connectors.
        return AuthorizeRequest(authorize_url=str(url), state=state, code_verifier="")

    def exchange_code(self, db: Session, code: str, code_verifier: str, redirect_uri: str) -> TokenResult:
        client_id, client_secret = self._require_configured(db)
        auth = (client_id, client_secret)
        data = {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}
        headers = {"User-Agent": USER_AGENT}
        with httpx.Client(timeout=15) as client:
            resp = client.post(TOKEN_URL, data=data, auth=auth, headers=headers)
        if resp.status_code >= 400:
            raise ConnectorAuthError(f"Reddit token exchange failed: {resp.text}")
        payload = resp.json()

        access_token = payload["access_token"]
        expires_in = payload.get("expires_in", 3600)
        me = self._get_me(access_token)

        return TokenResult(
            access_token=access_token,
            refresh_token=payload.get("refresh_token"),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            account_handle=me.get("name"),
            account_name=me.get("name"),
            scopes=platform_credentials.get_effective_scopes(db, self.platform, self.default_scopes),
            # Reddit returns this HTML-entity-encoded (e.g. "&amp;" in the query string) —
            # unescape it or the URL breaks. Empty string means no custom avatar set.
            avatar_url=html.unescape(me["icon_img"]) if me.get("icon_img") else None,
        )

    def _get_me(self, access_token: str) -> dict:
        headers = {"Authorization": f"Bearer {access_token}", "User-Agent": USER_AGENT}
        with httpx.Client(timeout=15) as client:
            resp = client.get(ME_URL, headers=headers)
        if resp.status_code >= 400:
            return {}
        return resp.json()

    def ensure_fresh_token(self, db: Session, account: PlatformAccount) -> str:
        client_id, client_secret = self._require_configured(db)
        if account.token_expires_at and account.token_expires_at > datetime.now(timezone.utc) + timedelta(
            minutes=2
        ):
            return account.access_token

        if not account.refresh_token:
            raise ConnectorAuthError("Reddit access token expired and no refresh token is stored.")

        auth = (client_id, client_secret)
        data = {"grant_type": "refresh_token", "refresh_token": account.refresh_token}
        headers = {"User-Agent": USER_AGENT}
        with httpx.Client(timeout=15) as client:
            resp = client.post(TOKEN_URL, data=data, auth=auth, headers=headers)
        if resp.status_code >= 400:
            raise ConnectorAuthError(f"Reddit token refresh failed: {resp.text}")
        payload = resp.json()

        account.access_token = payload["access_token"]
        if payload.get("refresh_token"):
            account.refresh_token = payload["refresh_token"]
        account.token_expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=payload.get("expires_in", 3600)
        )
        return account.access_token

    def publish(self, db: Session, account: PlatformAccount, post: Post) -> PublishResult:
        self._require_configured(db)
        access_token = self.ensure_fresh_token(db, account)
        text = (post.body or "").replace(TWEET_DELIMITER, "\n\n").strip()
        if not text:
            raise ConnectorPublishError("Post has no content to publish.")

        # No subreddit is captured on our Post model yet, so this submits a self-post
        # to the connected account's own profile feed (u/<name>) rather than a community.
        data = {
            "sr": f"u_{account.account_handle}",
            "kind": "self",
            "title": (post.title or text[:100]),
            "text": text,
            "api_type": "json",
        }
        headers = {"Authorization": f"Bearer {access_token}", "User-Agent": USER_AGENT}
        with httpx.Client(timeout=15) as client:
            resp = client.post(SUBMIT_URL, data=data, headers=headers)
        if resp.status_code >= 400:
            raise ConnectorPublishError(f"Reddit publish failed: {resp.text}")
        payload = resp.json()
        errors = payload.get("json", {}).get("errors")
        if errors:
            raise ConnectorPublishError(f"Reddit publish failed: {errors}")

        result_data = payload.get("json", {}).get("data", {})
        return PublishResult(
            platform_post_id=result_data.get("id", ""),
            published_url=result_data.get("url", f"https://reddit.com/u/{account.account_handle}"),
        )
