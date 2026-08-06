import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class GenerateFlyerRequest(BaseModel):
    page_id: uuid.UUID
    template_name: str = "standard"
    headline: str | None = Field(default=None, max_length=200)
    subheadline: str | None = Field(default=None, max_length=300)
    cta_text: str = Field(default="Read More", max_length=100)
    image_prompt: str | None = Field(default=None, max_length=500)


class GeneratePromptRequest(BaseModel):
    page_id: uuid.UUID


class GeneratePromptResponse(BaseModel):
    image_prompt: str


class FlyerOut(BaseModel):
    id: uuid.UUID
    page_id: uuid.UUID
    template_name: str
    image_url: str
    headline: str | None
    subheadline: str | None
    cta_text: str
    status: str
    created_at: datetime


class FlyerListResponse(BaseModel):
    items: list[FlyerOut]
    total: int
    page: int
    limit: int
