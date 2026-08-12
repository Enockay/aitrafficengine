import uuid
from datetime import datetime

from pydantic import BaseModel


class PlatformAccountOut(BaseModel):
    id: uuid.UUID
    platform: str
    account_name: str | None
    account_handle: str | None
    avatar_url: str | None
    is_active: bool
    token_expires_at: datetime | None
    scopes: list[str] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PlatformStatusOut(BaseModel):
    platform: str
    configured: bool
    accounts: list[PlatformAccountOut]


class ConnectUrlOut(BaseModel):
    authorize_url: str
