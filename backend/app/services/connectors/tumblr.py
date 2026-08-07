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

AUTHORIZE_URL = "https://www.tumblr.com/oauth2/authorize"
TOKEN_URL = "https://api.tumblr.com/v2/oauth2/token"
USER_INFO_URL = "https://api.tumblr.com/v2/user/info"
SCOPES = ["basic", "write", "offline_access"]


class TumblrConnector(PlatformConnector):
    platform = "tumblr"

    def is_configured(self, db: Session) -> bool:
        return platform_credentials.get_credentials(db, self.platform) is not None

    def _require_configured(self, db: Session) -> tuple[str, str]:
        creds = platform_credentials.get_credentials(db, self.platform)
        if not creds:
            raise ConnectorNotConfigured(
                "Tumblr isn't configured yet. Add client credentials in Settings."
            )
        return creds

    def build_authorize_request(self, db: Session, redirect_uri: str) -> AuthorizeRequest:
        client_id, _ = self._require_configured(db)
        state = secrets.token_urlsafe(24)
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(SCOPES),
            "state": state,
        }
        url = httpx.URL(AUTHORIZE_URL, params=params)
        # Tumblr's authorization-code flow doesn't use PKCE; code_verifier is unused
        # here but kept for interface symmetry with the other connectors.
        return AuthorizeRequest(authorize_url=str(url), state=state, code_verifier="")

    def exchange_code(self, db: Session, code: str, code_verifier: str, redirect_uri: str) -> TokenResult:
        client_id, client_secret = self._require_configured(db)
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": client_id,
            "client_secret": client_secret,
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(TOKEN_URL, data=data)
        if resp.status_code >= 400:
            raise ConnectorAuthError(f"Tumblr token exchange failed: {resp.text}")
        payload = resp.json()

        access_token = payload["access_token"]
        expires_in = payload.get("expires_in", 3600)
        primary_blog = self._get_primary_blog(access_token)

        return TokenResult(
            access_token=access_token,
            refresh_token=payload.get("refresh_token"),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            # The blog *name* (not the account's login name) is what publish() needs as
            # the blog-identifier path segment, so it's stored as the handle here even
            # though it isn't strictly the user's @handle.
            account_handle=primary_blog.get("name"),
            account_name=primary_blog.get("title") or primary_blog.get("name"),
            scopes=SCOPES,
            avatar_url=f"https://api.tumblr.com/v2/blog/{primary_blog['name']}.tumblr.com/avatar/128"
            if primary_blog.get("name")
            else None,
        )

    def _get_primary_blog(self, access_token: str) -> dict:
        with httpx.Client(timeout=15) as client:
            resp = client.get(USER_INFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if resp.status_code >= 400:
            return {}
        blogs = resp.json().get("response", {}).get("user", {}).get("blogs", [])
        primary = next((b for b in blogs if b.get("primary")), None)
        return primary or (blogs[0] if blogs else {})

    def ensure_fresh_token(self, db: Session, account: PlatformAccount) -> str:
        client_id, client_secret = self._require_configured(db)
        if account.token_expires_at and account.token_expires_at > datetime.now(timezone.utc) + timedelta(
            minutes=2
        ):
            return account.access_token

        if not account.refresh_token:
            raise ConnectorAuthError("Tumblr access token expired and no refresh token is stored.")

        data = {
            "grant_type": "refresh_token",
            "refresh_token": account.refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(TOKEN_URL, data=data)
        if resp.status_code >= 400:
            raise ConnectorAuthError(f"Tumblr token refresh failed: {resp.text}")
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
        body = (post.body or "").replace(TWEET_DELIMITER, "\n\n").strip()
        if not body:
            raise ConnectorPublishError("Post has no content to publish.")
        if not account.account_handle:
            raise ConnectorPublishError("No Tumblr blog is associated with this connected account.")

        content = []
        if post.title:
            content.append({"type": "text", "text": post.title, "subtype": "heading1"})
        content.append({"type": "text", "text": body})

        blog_identifier = f"{account.account_handle}.tumblr.com"
        url = f"https://api.tumblr.com/v2/blog/{blog_identifier}/posts"
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        with httpx.Client(timeout=15) as client:
            resp = client.post(url, headers=headers, json={"content": content, "tags": post.hashtags or []})
        if resp.status_code >= 400:
            raise ConnectorPublishError(f"Tumblr publish failed: {resp.text}")

        post_id = resp.json().get("response", {}).get("id", "")
        return PublishResult(
            platform_post_id=str(post_id),
            published_url=f"https://{blog_identifier}/post/{post_id}",
        )
