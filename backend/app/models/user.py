from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    GOVERNMENT = "GOVERNMENT"
    SCHOOL = "SCHOOL"

class User(Base):
    """
    Unified user model for both Government and School admins
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    
    # Personal Information
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String)
    profile_image = Column(String)
    
    # Role and School Assignment
    role = Column(SQLEnum(UserRole), nullable=False, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True, unique=True)  # Only for SCHOOL role, ONE admin per school
    
    # Additional Info
    designation = Column(String)  # e.g., "State Officer", "School Coordinator"
    
    # Status
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    last_login_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    school = relationship("School", back_populates="admin")
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f"<User {self.employee_id} ({self.role})>"
