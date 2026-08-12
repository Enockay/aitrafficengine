from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.platform_account import PlatformAccount
from app.models.post import Post


class ConnectorNotConfigured(Exception):
    """Raised when a platform's OAuth client credentials aren't set in config."""


class ConnectorAuthError(Exception):
    """Raised when a stored account's credentials are invalid or expired and can't be refreshed."""


class ConnectorPublishError(Exception):
    """Raised when the platform rejects a publish request."""


@dataclass
class AuthorizeRequest:
    authorize_url: str
    state: str
    code_verifier: str


@dataclass
class TokenResult:
    access_token: str
    refresh_token: str | None
    expires_at: datetime | None
    account_handle: str | None
    account_name: str | None
    scopes: list[str] | None
    avatar_url: str | None = None


@dataclass
class PublishResult:
    platform_post_id: str
    published_url: str


class PlatformConnector(ABC):
    platform: str
    # Built-in OAuth scope list, used unless an admin has overridden it in Settings
    # (see services/platform_credentials.get_effective_scopes).
    default_scopes: list[str]

    @abstractmethod
    def is_configured(self, db: Session) -> bool: ...

    @abstractmethod
    def build_authorize_request(self, db: Session, redirect_uri: str) -> AuthorizeRequest: ...

    @abstractmethod
    def exchange_code(self, db: Session, code: str, code_verifier: str, redirect_uri: str) -> TokenResult: ...

    @abstractmethod
    def ensure_fresh_token(self, db: Session, account: PlatformAccount) -> str:
        """Returns a valid access token for the account, refreshing it first if expired."""

    @abstractmethod
    def publish(self, db: Session, account: PlatformAccount, post: Post) -> PublishResult: ...
