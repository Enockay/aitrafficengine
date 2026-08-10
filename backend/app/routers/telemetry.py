import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.activity_log import client_ip
from app.services.telemetry import record_pageview

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


class PageviewIn(BaseModel):
    path: str
    session_id: uuid.UUID | None = None


class PageviewOut(BaseModel):
    session_id: uuid.UUID


@router.post("/pageview", response_model=PageviewOut)
def track_pageview(
    payload: PageviewIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = record_pageview(
        db,
        user=current_user,
        ip_address=client_ip(request),
        user_agent=request.headers.get("user-agent"),
        path=payload.path,
        session_id=payload.session_id,
    )
    return PageviewOut(session_id=session.id)
