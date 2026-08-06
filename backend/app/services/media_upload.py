import io
import uuid
from pathlib import Path
from typing import Literal

from PIL import Image, UnidentifiedImageError

from app.services import s3_storage
from app.services.flyer_generator import MEDIA_DIR

POST_MEDIA_DIR = MEDIA_DIR / "post_media"

# image/svg+xml is deliberately excluded — SVG can embed <script> and would be a
# stored-XSS vector if ever rendered inline from the same origin as the app (/media).
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_VIDEO_BYTES = 100 * 1024 * 1024  # 100 MB

_EXTENSION_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
}

# Magic-byte sniffing for video containers — avoids pulling in a new dependency just
# for container detection.
_VIDEO_SIGNATURES: list[tuple[bytes, int]] = [
    (b"ftyp", 4),  # mp4/mov/m4v (ISO base media file format), signature at offset 4
    (b"\x1a\x45\xdf\xa3", 0),  # webm/mkv (EBML header)
]


class MediaValidationError(Exception):
    pass


def _looks_like_video(data: bytes) -> bool:
    return any(data[offset : offset + len(sig)] == sig for sig, offset in _VIDEO_SIGNATURES)


def validate_media(content_type: str, data: bytes) -> Literal["image", "video"]:
    """Validates a claimed content_type against the real bytes and a size ceiling.

    Never trusts the client's Content-Type header alone — an attacker can set any
    header value on a multipart upload.
    """
    if content_type in ALLOWED_IMAGE_TYPES:
        if len(data) > MAX_IMAGE_BYTES:
            raise MediaValidationError(f"Image exceeds the {MAX_IMAGE_BYTES // (1024 * 1024)}MB limit.")
        try:
            img = Image.open(io.BytesIO(data))
            img.verify()
        except (UnidentifiedImageError, OSError) as exc:
            raise MediaValidationError("File isn't a valid image.") from exc
        return "image"

    if content_type in ALLOWED_VIDEO_TYPES:
        if len(data) > MAX_VIDEO_BYTES:
            raise MediaValidationError(f"Video exceeds the {MAX_VIDEO_BYTES // (1024 * 1024)}MB limit.")
        if not _looks_like_video(data):
            raise MediaValidationError("File isn't a valid video.")
        return "video"

    raise MediaValidationError(f"Unsupported media type: {content_type}")


def save_post_media(file_bytes: bytes, content_type: str) -> tuple[str, Literal["image", "video"]]:
    """Persists a post attachment and returns (path_token, media_type).

    Stored as `s3:<key>` when S3 is configured, or a bare relative path (served via the
    local /media static mount) otherwise — same convention as Flyer.image_path, so a
    future BACKEND_URL change can't strand the link. Filename is always server-generated,
    never the client-supplied name.
    """
    media_type = validate_media(content_type, file_bytes)
    filename = f"{uuid.uuid4()}{_EXTENSION_BY_TYPE.get(content_type, '')}"

    if s3_storage.is_configured():
        try:
            key = s3_storage.upload_post_media(file_bytes, filename, content_type)
            return f"s3:{key}", media_type
        except s3_storage.S3UploadError:
            pass  # transient S3 issue — fall through to local disk so the upload still succeeds

    POST_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    (POST_MEDIA_DIR / filename).write_bytes(file_bytes)
    return f"post_media/{filename}", media_type


def delete_post_media(media_path: str) -> None:
    if media_path.startswith("s3:"):
        s3_storage.delete_post_media(media_path.removeprefix("s3:"))
        return
    path: Path = MEDIA_DIR / media_path
    if path.exists():
        path.unlink()
