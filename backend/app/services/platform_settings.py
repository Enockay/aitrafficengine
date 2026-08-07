from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.platform_setting import PlatformSetting


def is_enabled(db: Session, platform: str) -> bool:
    row = db.execute(select(PlatformSetting).where(PlatformSetting.platform == platform)).scalar_one_or_none()
    return row.is_enabled if row else True


def set_enabled(db: Session, platform: str, enabled: bool) -> PlatformSetting:
    row = db.execute(select(PlatformSetting).where(PlatformSetting.platform == platform)).scalar_one_or_none()
    if row:
        row.is_enabled = enabled
    else:
        row = PlatformSetting(platform=platform, is_enabled=enabled)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row
