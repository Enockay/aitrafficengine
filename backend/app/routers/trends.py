from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_role
from app.models.trend import Trend, TrendFetchLog
from app.models.user import User
from app.schemas.trend import (
    TrendFetchLogListResponse,
    TrendFetchLogOut,
    TrendListResponse,
    TrendOut,
)
from app.services.trends import fetch_trending_topics

router = APIRouter(prefix="/trends", tags=["trends"])


@router.get("/fetch-logs", response_model=TrendFetchLogListResponse)
def list_fetch_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = select(TrendFetchLog).order_by(TrendFetchLog.requested_at.desc())
    total = db.execute(select(func.count()).select_from(TrendFetchLog)).scalar_one()
    logs = db.execute(query.offset((page - 1) * limit).limit(limit)).scalars().all()
    return TrendFetchLogListResponse(
        items=[TrendFetchLogOut.model_validate(log) for log in logs], total=total, page=page, limit=limit
    )


@router.get("", response_model=TrendListResponse)
def list_trends(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    query = select(Trend).order_by(Trend.fetched_at.desc())
    total = db.execute(select(func.count()).select_from(Trend)).scalar_one()
    trends = db.execute(query.offset((page - 1) * limit).limit(limit)).scalars().all()
    return TrendListResponse(
        items=[TrendOut.model_validate(t) for t in trends], total=total, page=page, limit=limit
    )


@router.post("/fetch-now", response_model=TrendFetchLogOut)
def fetch_now(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    log = fetch_trending_topics(db)
    return TrendFetchLogOut.model_validate(log)
