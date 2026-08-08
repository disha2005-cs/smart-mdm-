from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    udise_code = Column(String, unique=True, index=True, nullable=False)
    school_name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    taluk = Column(String, nullable=False)
    village = Column(String, nullable=False)
    address = Column(String)
    pin_code = Column(String)
    principal_name = Column(String)
    principal_phone = Column(String)
    email = Column(String)
    phone = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String, default="Active")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    admin = relationship("User", back_populates="school", uselist=False, cascade="all, delete-orphan")  # One-to-One with cascade delete
    students = relationship("Student", back_populates="school")
