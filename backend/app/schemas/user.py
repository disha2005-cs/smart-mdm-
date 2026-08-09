from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole

# User Base Schema
class UserBase(BaseModel):
    employee_id: str
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    designation: Optional[str] = None

# Create User (for adding school admin)
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    school_id: int  # Required for school admin
    designation: Optional[str] = "School Administrator"

# Update User (for editing school admin)
class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    designation: Optional[str] = None
    is_active: Optional[bool] = None

# User Response
class UserResponse(BaseModel):
    id: int
    employee_id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: UserRole
    school_id: Optional[int]
    designation: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# User with School Info
class UserWithSchool(UserResponse):
    school_name: Optional[str] = None
    school_udise: Optional[str] = None
    
# Admin Created Response (shows password once)
class AdminCreatedResponse(BaseModel):
    user: UserResponse
    employee_id: str
    password: str  # Plain text password shown only once
    message: str
