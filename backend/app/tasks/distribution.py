from celery_worker import celery_app

from app.database import SessionLocal
from app.models.schedule import Schedule
from app.services.distribution import execute_scheduled, mark_schedule_failed


@celery_app.task(name="publish_scheduled_post", bind=True, max_retries=3, default_retry_delay=300)
def publish_scheduled_post(self, schedule_id: str):
    db = SessionLocal()
    try:
        schedule = db.get(Schedule, schedule_id)
        if not schedule or schedule.status != "pending":
            return
        try:
            execute_scheduled(db, schedule)
        except Exception as exc:
            if self.request.retries < self.max_retries:
                # Exponential backoff: 2^retry * 5 min (5, 10, 20 min), matching the documented spec.
                raise self.retry(exc=exc, countdown=300 * (2**self.request.retries))
            mark_schedule_failed(db, schedule)
    finally:
        db.close()
