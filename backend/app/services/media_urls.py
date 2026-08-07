from app.config import get_settings
from app.services.s3_storage import generate_presigned_url

settings = get_settings()


def resolve_media_url(media_path: str | None) -> str | None:
    """Turns a stored media_path (S3 key or local filename) into a URL a client — or a
    third-party platform API — can actually fetch. Shared so every caller (post
    serialization, the Pinterest connector's pin image, etc.) stays in sync with
    however media is actually being stored.
    """
    if not media_path:
        return None
    if media_path.startswith("s3:"):
        return generate_presigned_url(media_path.removeprefix("s3:"))
    return f"{settings.backend_url}/media/{media_path}"
