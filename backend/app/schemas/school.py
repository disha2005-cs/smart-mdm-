from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SchoolBase(BaseModel):
    udise_code: str
    school_name: str
    district: str
    taluk: str
    village: str
    address: Optional[str] = None
    pin_code: Optional[str] = None
    principal_name: Optional[str] = None
    principal_phone: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = "Active"


class SchoolCreate(SchoolBase):
    pass


class School(SchoolBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
