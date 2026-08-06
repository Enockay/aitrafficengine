from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.activity_log import ActivityLogListResponse, ActivityLogOut

router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])


@router.get("", response_model=ActivityLogListResponse)
def list_activity_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    action: str | None = None,
    entity_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(ActivityLog).where(ActivityLog.user_id == current_user.id)
    if action:
        query = query.where(ActivityLog.action == action)
    if entity_type:
        query = query.where(ActivityLog.entity_type == entity_type)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    logs = (
        db.execute(query.order_by(ActivityLog.created_at.desc()).offset((page - 1) * limit).limit(limit))
        .scalars()
        .all()
    )
    return ActivityLogListResponse(
        items=[ActivityLogOut.model_validate(log) for log in logs], total=total, page=page, limit=limit
    )
