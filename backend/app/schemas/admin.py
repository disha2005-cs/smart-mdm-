from pydantic import BaseModel, EmailStr
from typing import Optional

class AdminLogin(BaseModel):
    employee_id: str
    password: str
    role: str # "GOVERNMENT" or "SCHOOL"

class AdminCreate(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str
    school_id: Optional[int] = None
