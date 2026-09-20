from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AlertBase(BaseModel):
    alert_type: str = Field(default="GENERAL", max_length=60)
    message: str = Field(..., min_length=1, max_length=500)
    severity: Optional[str] = "LOW"
    status: Optional[str] = "UNREAD"


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    status: str


class Alert(AlertBase):
    id: int
    school_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
