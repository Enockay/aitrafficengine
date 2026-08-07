from datetime import datetime

from pydantic import BaseModel, Field


class PlatformCredentialIn(BaseModel):
    client_id: str = Field(min_length=1, max_length=255)
    client_secret: str = Field(min_length=1, max_length=500)


class PlatformCredentialOut(BaseModel):
    platform: str
    configured: bool
    source: str  # "database" | "environment" | "none"
    client_id_preview: str | None
    updated_at: datetime | None
    is_enabled: bool


class PlatformEnabledIn(BaseModel):
    is_enabled: bool
