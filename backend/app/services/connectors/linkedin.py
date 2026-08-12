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

AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts"
SCOPES = ["openid", "profile", "w_member_social"]


class LinkedInConnector(PlatformConnector):
    platform = "linkedin"
    default_scopes = SCOPES

    def is_configured(self, db: Session) -> bool:
        return platform_credentials.get_credentials(db, self.platform) is not None

    def _require_configured(self, db: Session) -> tuple[str, str]:
        creds = platform_credentials.get_credentials(db, self.platform)
        if not creds:
            raise ConnectorNotConfigured(
                "LinkedIn isn't configured yet. Add client credentials in Settings."
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
        }
        url = httpx.URL(AUTHORIZE_URL, params=params)
        # LinkedIn's standard authorization-code flow doesn't use PKCE; code_verifier
        # is unused here but kept for interface symmetry with the other connectors.
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
            raise ConnectorAuthError(f"LinkedIn token exchange failed: {resp.text}")
        payload = resp.json()

        access_token = payload["access_token"]
        expires_in = payload.get("expires_in", 5184000)
        me = self._get_userinfo(access_token)

        return TokenResult(
            access_token=access_token,
            refresh_token=payload.get("refresh_token"),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            account_handle=me.get("sub"),
            account_name=me.get("name"),
            scopes=platform_credentials.get_effective_scopes(db, self.platform, self.default_scopes),
            avatar_url=me.get("picture"),
        )

    def _get_userinfo(self, access_token: str) -> dict:
        with httpx.Client(timeout=15) as client:
            resp = client.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
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
            raise ConnectorAuthError("LinkedIn access token expired and no refresh token is stored.")

        data = {
            "grant_type": "refresh_token",
            "refresh_token": account.refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(TOKEN_URL, data=data)
        if resp.status_code >= 400:
            raise ConnectorAuthError(f"LinkedIn token refresh failed: {resp.text}")
        payload = resp.json()

        account.access_token = payload["access_token"]
        if payload.get("refresh_token"):
            account.refresh_token = payload["refresh_token"]
        account.token_expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=payload.get("expires_in", 5184000)
        )
        return account.access_token

    def publish(self, db: Session, account: PlatformAccount, post: Post) -> PublishResult:
        self._require_configured(db)
        access_token = self.ensure_fresh_token(db, account)
        text = (post.body or "").replace(TWEET_DELIMITER, "\n\n").strip()
        if not text:
            raise ConnectorPublishError("Post has no content to publish.")

        body = {
            "author": f"urn:li:person:{account.account_handle}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json",
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(UGC_POSTS_URL, headers=headers, json=body)
        if resp.status_code >= 400:
            raise ConnectorPublishError(f"LinkedIn publish failed: {resp.text}")

        post_urn = resp.headers.get("x-restli-id") or resp.json().get("id", "")
        return PublishResult(
            platform_post_id=post_urn,
            published_url=f"https://www.linkedin.com/feed/update/{post_urn}/",
        )
