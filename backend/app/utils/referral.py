import secrets
import string

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User

# Excludes visually-ambiguous characters (0/O, 1/I/L) since these codes get typed and
# shared manually, not just copy-pasted.
_ALPHABET = "".join(c for c in string.ascii_uppercase + string.digits if c not in "0O1IL")
CODE_LENGTH = 8
MAX_ATTEMPTS = 10


def generate_referral_code() -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(CODE_LENGTH))


def generate_unique_referral_code(db: Session) -> str:
    for _ in range(MAX_ATTEMPTS):
        code = generate_referral_code()
        exists = db.execute(select(User.id).where(User.referral_code == code)).scalar_one_or_none()
        if not exists:
            return code
    raise RuntimeError("Could not generate a unique referral code after multiple attempts.")
