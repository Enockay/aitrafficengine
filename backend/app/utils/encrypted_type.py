from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.config import get_settings

settings = get_settings()


class EncryptionNotConfigured(Exception):
    pass


def _fernet() -> Fernet:
    if not settings.encryption_key:
        raise EncryptionNotConfigured(
            "ENCRYPTION_KEY isn't set — required to store OAuth tokens securely. Generate one with: "
            'python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
        )
    return Fernet(settings.encryption_key.encode())


class EncryptedString(TypeDecorator):
    """Transparently encrypts a string column at rest with Fernet (AES-128-CBC + HMAC).

    Application code reads/writes plaintext as normal (`account.access_token = "..."`);
    only the value actually persisted to Postgres is ciphertext.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: str | None, dialect) -> str | None:
        if value is None:
            return None
        return _fernet().encrypt(value.encode()).decode()

    def process_result_value(self, value: str | None, dialect) -> str | None:
        if value is None:
            return None
        try:
            return _fernet().decrypt(value.encode()).decode()
        except InvalidToken:
            # Pre-encryption legacy plaintext row — return as-is rather than crash;
            # it will be re-encrypted the next time this row is written.
            return value
