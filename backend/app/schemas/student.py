from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class StudentBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    grade: Optional[str] = None
    section: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    photo_path: Optional[str] = None  # DEPRECATED
    photo_url: Optional[str] = None  # S3 public URL
    has_allergies: Optional[bool] = False
    dietary_preferences: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(StudentBase):
    pass

class Student(StudentBase):
    id: int
    student_id: str
    school_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    has_photo: Optional[bool] = None  # Indicates if photo exists

    class Config:
        from_attributes = True
