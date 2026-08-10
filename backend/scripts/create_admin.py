"""One-off bootstrap for the first admin account — there's no way to reach admin
through the API itself (every /admin/* route requires an existing admin, and
public registration always creates role="user"), so this has to run directly
against the database.

Usage (from inside the backend container, e.g. `docker exec -it <backend> ...`):
    python -m scripts.create_admin blackienetworks@gmail.com 'a-strong-password' ''

Safe to re-run: if the email already exists, it just resets the password and
promotes that user to admin instead of erroring.
"""

import sys

from app.database import SessionLocal
from app.services.auth import AuthError, get_user_by_email, register_user
from app.utils.security import hash_password


def main() -> None:
    if len(sys.argv) != 4:
        print("Usage: python -m scripts.create_admin <email> <password> <full name>")
        sys.exit(1)

    email, password, full_name = sys.argv[1], sys.argv[2], sys.argv[3]
    db = SessionLocal()
    try:
        user = get_user_by_email(db, email)
        if user is None:
            try:
                user, _raw_token = register_user(db, email=email, password=password, full_name=full_name)
            except AuthError as exc:
                print(f"Could not create user: {exc}")
                sys.exit(1)
        else:
            user.hashed_password = hash_password(password)

        user.role = "admin"
        user.is_email_verified = True
        db.commit()
        print(f"{email} is now an admin and can log in immediately.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
