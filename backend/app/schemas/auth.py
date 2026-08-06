import re
import uuid
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, EmailStr, field_validator

PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")
PASSWORD_REQUIREMENTS_MESSAGE = (
    "Password must be at least 8 characters and include an uppercase letter, "
    "a lowercase letter, and a number."
)
PHONE_COUNTRY_CODE_PATTERN = re.compile(r"^\+\d{1,4}$")


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: str | None = None
    phone_country_code: str | None = None
    phone_number: str | None = None
    timezone: str = "UTC"
    referral_code: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError(PASSWORD_REQUIREMENTS_MESSAGE)
        return v

    @field_validator("phone_country_code")
    @classmethod
    def validate_phone_country_code(cls, v: str | None) -> str | None:
        if v and not PHONE_COUNTRY_CODE_PATTERN.match(v):
            raise ValueError("Phone country code must look like +1, +44, +254, etc.")
        return v

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        # A bad client-detected timezone shouldn't ever block registration — fall back
        # to UTC rather than raising.
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError):
            return "UTC"
        return v

    @field_validator("referral_code")
    @classmethod
    def normalize_referral_code(cls, v: str | None) -> str | None:
        return v.strip().upper() if v else v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: str
    company_name: str | None
    phone_country_code: str | None
    phone_number: str | None
    timezone: str
    referral_code: str
    is_email_verified: bool

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RegisterResponse(BaseModel):
    message: str
    email: EmailStr


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    company_name: str | None = None
    phone_country_code: str | None = None
    phone_number: str | None = None
    timezone: str | None = None

    @field_validator("phone_country_code")
    @classmethod
    def validate_phone_country_code(cls, v: str | None) -> str | None:
        if v and not PHONE_COUNTRY_CODE_PATTERN.match(v):
            raise ValueError("Phone country code must look like +1, +44, +254, etc.")
        return v

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError):
            return "UTC"
        return v


class PasswordChange(BaseModel):
    current: str
    new: str

    @field_validator("new")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError(PASSWORD_REQUIREMENTS_MESSAGE)
        return v


class EmailVerificationRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not PASSWORD_PATTERN.match(v):
            raise ValueError(PASSWORD_REQUIREMENTS_MESSAGE)
        return v


class MessageResponse(BaseModel):
    message: str
