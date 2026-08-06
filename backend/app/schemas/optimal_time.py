from pydantic import BaseModel


class OptimalTimeSlot(BaseModel):
    # weekday: 0=Sunday..6=Saturday (matches Postgres EXTRACT(dow) and JS Date.getDay(),
    # NOT Python's datetime.weekday() which is 0=Monday).
    weekday: int
    hour: int
    score: float
    post_count: int
    source: str  # "data" | "fallback"


class OptimalTimesResponse(BaseModel):
    platform: str
    slots: list[OptimalTimeSlot]
    sample_size: int
