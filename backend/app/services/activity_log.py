import uuid
from datetime import datetime, timezone

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog
from app.services.events import publish_event


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    # Behind the reverse proxy (Traefik/Coolify) request.client.host is the proxy's
    # own container IP, not the visitor's — X-Forwarded-For carries the real one and
    # must be checked first. uvicorn isn't run with --proxy-headers, so this has to be
    # read manually rather than relying on request.client being rewritten for us.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client is None:
        return None
    return request.client.host


def log_activity(
    db: Session,
    *,
    user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID,
    details: dict | None = None,
    request: Request | None = None,
) -> None:
    db.add(
        ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=client_ip(request),
        )
    )
    db.commit()

    # Every logged action is also pushed live over the /ws WebSocket — this is what
    # powers real-time dashboard updates (§11.4) without the frontend having to poll.
    if user_id is not None:
        publish_event(
            user_id,
            f"{entity_type}.{action}",
            {
                "action": action,
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "details": details,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
