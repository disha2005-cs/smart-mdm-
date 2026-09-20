from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class StudentBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    grade: Optional[str] = None
    section: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    photo_path: Optional[str] = None  # DEPRECATED - legacy local path
    photo_url: Optional[str] = None  # S3 URL or /uploads/... path
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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    has_photo: Optional[bool] = None
    # True once a usable face encoding is registered - the UI uses this to show
    # which students can actually be recognised by the camera.
    has_face_encoding: Optional[bool] = None

    class Config:
        from_attributes = True
