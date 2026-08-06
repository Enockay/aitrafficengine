from celery_worker import celery_app

from app.database import SessionLocal
from app.services.trends import fetch_trending_topics


@celery_app.task(name="fetch_trending_topics_task")
def fetch_trending_topics_task():
    db = SessionLocal()
    try:
        fetch_trending_topics(db)
    finally:
        db.close()
