import base64
import hashlib
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

AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize"
TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
TWEETS_URL = "https://api.twitter.com/2/tweets"
ME_URL = "https://api.twitter.com/2/users/me"
SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"]

# Matches TWEET_DELIMITER in frontend/src/types/post.ts — the two must stay in sync
# since that's how a thread's tweets are packed into Post.body.
TWEET_DELIMITER = "\n\n---\n\n"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


class TwitterConnector(PlatformConnector):
    platform = "twitter"
    default_scopes = SCOPES

    def is_configured(self, db: Session) -> bool:
        return platform_credentials.get_credentials(db, self.platform) is not None

    def _require_configured(self, db: Session) -> tuple[str, str]:
        creds = platform_credentials.get_credentials(db, self.platform)
        if not creds:
            raise ConnectorNotConfigured(
                "Twitter isn't configured yet. Add client credentials in Settings."
            )
        return creds

    def build_authorize_request(self, db: Session, redirect_uri: str) -> AuthorizeRequest:
        client_id, _ = self._require_configured(db)
        state = secrets.token_urlsafe(24)
        code_verifier = _b64url(secrets.token_bytes(40))
        code_challenge = _b64url(hashlib.sha256(code_verifier.encode("ascii")).digest())
        scopes = platform_credentials.get_effective_scopes(db, self.platform, self.default_scopes)
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(scopes),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        url = httpx.URL(AUTHORIZE_URL, params=params)
        return AuthorizeRequest(authorize_url=str(url), state=state, code_verifier=code_verifier)

    def exchange_code(self, db: Session, code: str, code_verifier: str, redirect_uri: str) -> TokenResult:
        client_id, client_secret = self._require_configured(db)
        auth = (client_id, client_secret)
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "code_verifier": code_verifier,
            "client_id": client_id,
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(TOKEN_URL, data=data, auth=auth)
        if resp.status_code >= 400:
            raise ConnectorAuthError(f"Twitter token exchange failed: {resp.text}")
        payload = resp.json()

        access_token = payload["access_token"]
        expires_in = payload.get("expires_in", 7200)
        me = self._get_me(access_token)

        return TokenResult(
            access_token=access_token,
            refresh_token=payload.get("refresh_token"),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            account_handle=me.get("username"),
            account_name=me.get("name"),
            scopes=platform_credentials.get_effective_scopes(db, self.platform, self.default_scopes),
            avatar_url=me.get("profile_image_url"),
        )

    def _get_me(self, access_token: str) -> dict:
        with httpx.Client(timeout=15) as client:
            resp = client.get(
                ME_URL,
                params={"user.fields": "profile_image_url"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if resp.status_code >= 400:
            return {}
        return resp.json().get("data", {})

    def ensure_fresh_token(self, db: Session, account: PlatformAccount) -> str:
        client_id, client_secret = self._require_configured(db)
        if account.token_expires_at and account.token_expires_at > datetime.now(timezone.utc) + timedelta(
            minutes=2
        ):
            return account.access_token

        if not account.refresh_token:
            raise ConnectorAuthError("Twitter access token expired and no refresh token is stored.")

        auth = (client_id, client_secret)
        data = {
            "grant_type": "refresh_token",
            "refresh_token": account.refresh_token,
            "client_id": client_id,
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(TOKEN_URL, data=data, auth=auth)
        if resp.status_code >= 400:
            raise ConnectorAuthError(f"Twitter token refresh failed: {resp.text}")
        payload = resp.json()

        account.access_token = payload["access_token"]
        if payload.get("refresh_token"):
            account.refresh_token = payload["refresh_token"]
        account.token_expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=payload.get("expires_in", 7200)
        )
        return account.access_token

    def publish(self, db: Session, account: PlatformAccount, post: Post) -> PublishResult:
        self._require_configured(db)
        access_token = self.ensure_fresh_token(db, account)
        tweets = [t.strip() for t in (post.body or "").split(TWEET_DELIMITER) if t.strip()]
        if not tweets:
            raise ConnectorPublishError("Post has no tweet content to publish.")

        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        first_id: str | None = None
        last_id: str | None = None
        with httpx.Client(timeout=15) as client:
            for tweet in tweets:
                body: dict = {"text": tweet}
                if last_id:
                    body["reply"] = {"in_reply_to_tweet_id": last_id}
                resp = client.post(TWEETS_URL, headers=headers, json=body)
                if resp.status_code >= 400:
                    raise ConnectorPublishError(f"Twitter publish failed: {resp.text}")
                tweet_id = resp.json()["data"]["id"]
                first_id = first_id or tweet_id
                last_id = tweet_id

        return PublishResult(
            platform_post_id=first_id,
            published_url=f"https://twitter.com/{account.account_handle or 'i'}/status/{first_id}",
        )
