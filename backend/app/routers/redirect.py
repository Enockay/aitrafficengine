import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.analytics import Analytics
from app.models.page import Page
from app.models.post import Post

router = APIRouter(tags=["redirect"])


@router.get("/r/{post_id}")
def track_and_redirect(post_id: uuid.UUID, db: Session = Depends(get_db)):
    post = db.execute(
        select(Post).where(Post.id == post_id, Post.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    destination = post.tracked_url
    if not destination:
        page = db.get(Page, post.page_id)
        destination = page.url if page else None
    if not destination:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No destination configured")

    today = date.today()
    row = db.execute(
        select(Analytics).where(Analytics.post_id == post.id, Analytics.metric_date == today)
    ).scalar_one_or_none()
    if row:
        row.clicks += 1
    else:
        db.add(Analytics(post_id=post.id, platform=post.platform, metric_date=today, clicks=1))
    db.commit()

    return RedirectResponse(url=destination, status_code=status.HTTP_302_FOUND)
