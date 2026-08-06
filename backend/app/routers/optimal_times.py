from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.optimal_time import OptimalTimesResponse
from app.services.optimal_times import get_optimal_times

router = APIRouter(prefix="/optimal-times", tags=["optimal-times"])


@router.get("/{platform}", response_model=OptimalTimesResponse)
def get_optimal_times_endpoint(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return get_optimal_times(db, current_user.id, platform)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
