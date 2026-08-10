import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings

settings = get_settings()

PRESIGNED_URL_TTL_SECONDS = 24 * 60 * 60


class S3UploadError(Exception):
    pass


def is_configured() -> bool:
    return bool(settings.aws_access_key_id and settings.aws_secret_access_key and settings.s3_bucket_name)


def _client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )


def upload_flyer_image(image_bytes: bytes, filename: str) -> str:
    """Uploads a flyer PNG to S3 and returns its object key."""
    key = f"flyers/{filename}"
    try:
        _client().put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=image_bytes,
            ContentType="image/png",
        )
    except (BotoCoreError, ClientError) as exc:
        raise S3UploadError(f"Failed to upload flyer to S3: {exc}") from exc

    return key


def generate_presigned_url(key: str, expires_in: int = PRESIGNED_URL_TTL_SECONDS) -> str:
    # The bucket has no public-read policy (and this IAM user lacks permission to grant
    # one), so images are served via freshly-minted, time-limited presigned URLs instead
    # of a permanent public link.
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )


def delete_flyer_image(key: str) -> None:
    try:
        _client().delete_object(Bucket=settings.s3_bucket_name, Key=key)
    except (BotoCoreError, ClientError):
        pass  # best-effort cleanup; a stale S3 object shouldn't block deleting the DB row


def upload_post_media(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Uploads a user-supplied post attachment (image/video) to S3 and returns its object key."""
    key = f"post_media/{filename}"
    try:
        _client().put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except (BotoCoreError, ClientError) as exc:
        raise S3UploadError(f"Failed to upload post media to S3: {exc}") from exc

    return key


def delete_post_media(key: str) -> None:
    try:
        _client().delete_object(Bucket=settings.s3_bucket_name, Key=key)
    except (BotoCoreError, ClientError):
        pass  # best-effort cleanup; a stale S3 object shouldn't block deleting the DB row


def upload_geoip_db(file_bytes: bytes, key: str) -> None:
    try:
        _client().put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=file_bytes,
            ContentType="application/octet-stream",
        )
    except (BotoCoreError, ClientError) as exc:
        raise S3UploadError(f"Failed to upload GeoIP database to S3: {exc}") from exc


def download_geoip_db(key: str) -> bytes:
    try:
        obj = _client().get_object(Bucket=settings.s3_bucket_name, Key=key)
        return obj["Body"].read()
    except (BotoCoreError, ClientError) as exc:
        raise S3UploadError(f"Failed to download GeoIP database from S3: {exc}") from exc


def delete_geoip_db(key: str) -> None:
    try:
        _client().delete_object(Bucket=settings.s3_bucket_name, Key=key)
    except (BotoCoreError, ClientError):
        pass  # best-effort cleanup; a stale S3 object shouldn't block deleting the DB row
