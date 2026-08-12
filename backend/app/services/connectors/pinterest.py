import secrets
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
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
from app.services.media_urls import resolve_media_url

AUTHORIZE_URL = "https://www.pinterest.com/oauth/"
TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"
USER_ACCOUNT_URL = "https://api.pinterest.com/v5/user_account"
BOARDS_URL = "https://api.pinterest.com/v5/boards"
PINS_URL = "https://api.pinterest.com/v5/pins"
# Pinterest scopes are comma-separated, unlike every other connector's space-separated
# OAuth2 scope string — this isn't a typo, it's what their API actually expects.
# boards:write looks unnecessary for a pin-only flow (we never create/edit boards
# ourselves), but Pinterest's Create Pin endpoint rejects tokens without it anyway —
# an undocumented quirk on their end, not our bug. See:
# https://community.pinterest.biz/t/boards-write-permission-is-required-when-creating-pins/44201
SCOPES = "boards:read,boards:write,pins:read,pins:write,user_accounts:read"

settings = get_settings()


class PinterestConnector(PlatformConnector):
    platform = "pinterest"
    default_scopes = SCOPES.split(",")

    def is_configured(self, db: Session) -> bool:
        return platform_credentials.get_credentials(db, self.platform) is not None

    def _require_configured(self, db: Session) -> tuple[str, str]:
        creds = platform_credentials.get_credentials(db, self.platform)
        if not creds:
            raise ConnectorNotConfigured(
                "Pinterest isn't configured yet. Add client credentials in Settings."
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
            "scope": ",".join(scopes),
            "state": state,
        }
        url = httpx.URL(AUTHORIZE_URL, params=params)
        # Pinterest's authorization-code flow doesn't use PKCE; code_verifier is unused
        # here but kept for interface symmetry with the other connectors.
        return AuthorizeRequest(authorize_url=str(url), state=state, code_verifier="")

    def exchange_code(self, db: Session, code: str, code_verifier: str, redirect_uri: str) -> TokenResult:
        client_id, client_secret = self._require_configured(db)
        auth = (client_id, client_secret)
        data = {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        with httpx.Client(timeout=15) as client:
            resp = client.post(TOKEN_URL, data=data, auth=auth, headers=headers)
        if resp.status_code >= 400:
            raise ConnectorAuthError(f"Pinterest token exchange failed: {resp.text}")
        payload = resp.json()

        access_token = payload["access_token"]
        expires_in = payload.get("expires_in", 2592000)
        me = self._get_me(access_token)

        # Trust what Pinterest actually granted, not what we asked for — an app can
        # request a scope it isn't approved for and Pinterest will silently issue a
        # token without it instead of erroring the authorize step, so blindly storing
        # SCOPES here hides a mismatch until the next API call fails on it.
        granted_scope = payload.get("scope")
        granted_scopes = (
            granted_scope.replace(",", " ").split()
            if granted_scope
            else platform_credentials.get_effective_scopes(db, self.platform, self.default_scopes)
        )

        return TokenResult(
            access_token=access_token,
            refresh_token=payload.get("refresh_token"),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            account_handle=me.get("username"),
            account_name=me.get("username"),
            scopes=granted_scopes,
            avatar_url=me.get("profile_image"),
        )

    def _get_me(self, access_token: str) -> dict:
        with httpx.Client(timeout=15) as client:
            resp = client.get(USER_ACCOUNT_URL, headers={"Authorization": f"Bearer {access_token}"})
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
            raise ConnectorAuthError("Pinterest access token expired and no refresh token is stored.")

        auth = (client_id, client_secret)
        data = {"grant_type": "refresh_token", "refresh_token": account.refresh_token}
        with httpx.Client(timeout=15) as client:
            resp = client.post(TOKEN_URL, data=data, auth=auth)
        if resp.status_code >= 400:
            raise ConnectorAuthError(f"Pinterest token refresh failed: {resp.text}")
        payload = resp.json()

        account.access_token = payload["access_token"]
        if payload.get("refresh_token"):
            account.refresh_token = payload["refresh_token"]
        account.token_expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=payload.get("expires_in", 2592000)
        )
        return account.access_token

    def _get_first_board_id(self, access_token: str) -> str | None:
        with httpx.Client(timeout=15) as client:
            resp = client.get(BOARDS_URL, headers={"Authorization": f"Bearer {access_token}"}, params={"page_size": 1})
        if resp.status_code >= 400:
            return None
        items = resp.json().get("items", [])
        return items[0]["id"] if items else None

    def publish(self, db: Session, account: PlatformAccount, post: Post) -> PublishResult:
        self._require_configured(db)
        access_token = self.ensure_fresh_token(db, account)

        # A pin is fundamentally an image — there's no text-only pin type, so this is a
        # hard requirement rather than a soft fallback like the other connectors' media.
        image_url = resolve_media_url(post.media_path)
        if not image_url:
            raise ConnectorPublishError(
                "Pinterest requires an image. Attach one to this post before publishing."
            )

        board_id = self._get_first_board_id(access_token)
        if not board_id:
            raise ConnectorPublishError(
                "No Pinterest board found on this account. Create a board on Pinterest first."
            )

        body = {
            "board_id": board_id,
            "media_source": {"source_type": "image_url", "url": image_url},
        }
        if post.title:
            body["title"] = post.title[:100]
        if post.body:
            body["description"] = post.body[:800]
        if post.tracked_url:
            # Points at our own /r/{post_id} redirect (not the raw destination URL) so
            # a pin click gets logged as first-party Analytics data, same as every
            # other platform's tracked link — see routers/pages.py's redirect_url.
            body["link"] = f"{settings.backend_url}/r/{post.id}"

        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        with httpx.Client(timeout=15) as client:
            resp = client.post(PINS_URL, headers=headers, json=body)
        if resp.status_code >= 400:
            raise ConnectorPublishError(f"Pinterest publish failed: {resp.text}")

        pin_id = resp.json().get("id", "")
        return PublishResult(
            platform_post_id=str(pin_id),
            published_url=f"https://www.pinterest.com/pin/{pin_id}/",
        )
