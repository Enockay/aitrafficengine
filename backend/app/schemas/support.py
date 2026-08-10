import uuid
from datetime import datetime

from pydantic import BaseModel


class SupportMessageOut(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    sender_role: str
    body: str
    created_at: datetime


class SupportMessageIn(BaseModel):
    body: str


class SupportContactOut(BaseModel):
    email: str
