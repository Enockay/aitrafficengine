from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from celery_worker import celery_app

from app.database import SessionLocal
from app.models.schedule import Schedule
from app.services.distribution import execute_scheduled, mark_schedule_failed

# How overdue a still-"pending" schedule has to be before the sweep will re-fire it.
# Gives an on-time worker room to finish its normal ETA-triggered run first, so the
# sweep doesn't race a publish that's already in flight.
MISSED_SCHEDULE_GRACE = timedelta(minutes=3)


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


@celery_app.task(name="sweep_missed_schedules")
def sweep_missed_schedules():
    """Safety net for schedules whose primary ETA task never actually ran — e.g. no
    worker was consuming the queue at fire time, or a worker restarted between enqueue
    and eta (Redis acks a task on receipt, not completion, so an in-flight ETA task is
    silently dropped if that worker dies first). Runs on a short beat interval and
    re-enqueues (via the normal task, with its own retry/backoff handling) anything
    still 'pending' well past scheduled_at.
    """
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - MISSED_SCHEDULE_GRACE
        overdue = (
            db.execute(select(Schedule).where(Schedule.status == "pending", Schedule.scheduled_at <= cutoff))
            .scalars()
            .all()
        )
        for schedule in overdue:
            publish_scheduled_post.apply_async(args=[str(schedule.id)])
    finally:
        db.close()
