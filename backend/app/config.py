import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolved relative to this file, not the process cwd — pydantic-settings treats a
# relative env_file as cwd-relative, which silently no-ops when run from backend/.
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"

# Standard marker file present in every Docker container, absent on bare metal — used
# to tell native local dev (Redis on the host via Homebrew, "localhost" is correct)
# apart from any `docker compose`/Coolify deployment (Redis is a sibling container,
# only reachable at hostname "redis").
_IN_DOCKER = os.path.exists("/.dockerenv")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # App
    app_name: str = "AI Traffic Engine"
    debug: bool = False
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"
    backend_url: str = "http://localhost:8000"

    # Database
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_traffic_engine"
    db_pool_size: int = 10

    # requirements.txt only installs psycopg (v3) — a bare "postgresql://" DATABASE_URL
    # (no driver suffix, e.g. from a managed-DB provider's connection string) makes
    # SQLAlchemy default to the psycopg2 dialect instead, which isn't installed and
    # fails at engine-creation time. Normalize it here so the driver is never
    # ambiguous, regardless of what a deploy's DATABASE_URL env var actually says.
    @field_validator("database_url")
    @classmethod
    def _use_psycopg3_driver(cls, value: str) -> str:
        if value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value.removeprefix("postgresql://")
        return value

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # A misconfigured deploy (e.g. an env var copied straight from local dev, where
    # Redis runs on the host) would otherwise fail with "Connection refused" forever —
    # normalize it here instead of relying on every deploy target setting this
    # correctly by hand. Covers redis_url, celery_broker_url, celery_result_backend
    # (declared further down) in one validator since all three share this failure mode.
    @field_validator("redis_url", "celery_broker_url", "celery_result_backend")
    @classmethod
    def _use_redis_service_hostname_in_docker(cls, value: str) -> str:
        if _IN_DOCKER and ("localhost" in value or "127.0.0.1" in value):
            return value.replace("localhost", "redis").replace("127.0.0.1", "redis")
        return value

    # Security
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    # Fernet key (32 url-safe base64 bytes) for encrypting OAuth tokens at rest.
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    encryption_key: str = ""

    # External APIs
    # Named distinctly from the plain ANTHROPIC_API_KEY env var, which is commonly
    # exported globally on dev machines for the Claude Code CLI itself — pydantic-settings
    # gives real env vars priority over .env file values, so reusing that name would silently
    # shadow whatever key is configured here.
    anthropic_api_key: str | None = Field(default=None, validation_alias="CONTENT_ANTHROPIC_API_KEY")
    claude_model: str = "claude-opus-5"
    # OAuth2 client credentials for Twitter/X's v2 API (PKCE user-context flow).
    twitter_client_id: str | None = None
    twitter_client_secret: str | None = None
    linkedin_client_id: str | None = None
    linkedin_client_secret: str | None = None
    reddit_client_id: str | None = None
    reddit_client_secret: str | None = None
    tumblr_client_id: str | None = None
    tumblr_client_secret: str | None = None
    pinterest_client_id: str | None = None
    pinterest_client_secret: str | None = None
    stability_api_key: str | None = None
    # Transactional email (registration verification). Leaving the key unset is fine in
    # dev — sends are skipped with a logged warning instead of failing registration.
    brevo_api_key: str | None = None
    brevo_sender_email: str = "no-reply@aitrafficengine.com"
    brevo_sender_name: str = "AI Traffic Engine"

    # S3 storage for generated media (flyers). Falls back to local disk if unset.
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "us-east-1"
    s3_bucket_name: str | None = None

    # Path to a MaxMind GeoLite2-City .mmdb file for IP -> location lookups on the
    # admin user-session tracker. Free to obtain (MaxMind account + license key) but
    # not something this repo can bundle/download on its own — location just stays
    # blank until this is set.
    geoip_db_path: str | None = None

    # Billing (Paystack). Public key is safe to expose client-side (checkout init);
    # secret key signs API calls and verifies webhook signatures — never expose it
    # client-side.
    paystack_secret_key: str | None = None
    paystack_public_key: str | None = None

    # Celery
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # CORS
    frontend_url: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()
