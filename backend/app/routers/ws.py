from fastapi import APIRouter, WebSocket
from redis import asyncio as aioredis

from app.config import get_settings
from app.services.events import channel_name
from app.utils.security import InvalidTokenError, decode_token

router = APIRouter(tags=["websocket"])
settings = get_settings()


@router.websocket("/ws")
async def websocket_events(websocket: WebSocket, token: str = ""):
    # Native browser WebSockets can't send custom Authorization headers, so the access
    # token travels as a query param instead (?token=...) and is validated the same way.
    try:
        user_id = decode_token(token, expected_type="access")
    except InvalidTokenError:
        await websocket.close(code=4401)
        return

    await websocket.accept()

    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis.pubsub()
    channel = channel_name(user_id)
    await pubsub.subscribe(channel)

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            await websocket.send_text(message["data"])
    except Exception:
        pass
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
        await redis.close()
