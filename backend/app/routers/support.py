from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.support import SupportMessageIn, SupportMessageOut
from app.services.support import list_thread, send_user_message

router = APIRouter(prefix="/support", tags=["support"])


@router.get("/messages", response_model=list[SupportMessageOut])
def get_messages(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list_thread(db, current_user.id)


@router.post("/messages", response_model=SupportMessageOut)
def post_message(
    payload: SupportMessageIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return send_user_message(db, current_user, payload.body)
