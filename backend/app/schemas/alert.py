from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AlertBase(BaseModel):
    alert_type: str
    message: str
    status: Optional[str] = "UNREAD"

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    status: str

class Alert(AlertBase):
    id: int
    school_id: int
    created_at: datetime

    class Config:
        from_attributes = True
