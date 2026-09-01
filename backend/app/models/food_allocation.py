from sqlalchemy import Column, Integer, Float, String, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class AllocationStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DELIVERED = "DELIVERED"

class FoodAllocation(Base):
    __tablename__ = "food_allocations"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete='CASCADE'), nullable=False)
    item_name = Column(String, nullable=False)  # Rice, Dal, Oil, Vegetables
    category = Column(String, nullable=False)  # Grains, Pulses, Oil, Vegetables
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    allocation_date = Column(Date, default=func.current_date())
    status = Column(SQLEnum(AllocationStatus), default=AllocationStatus.PENDING)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    school = relationship("School")
