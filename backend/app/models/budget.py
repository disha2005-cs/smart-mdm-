from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete='CASCADE'), nullable=False)
    financial_year = Column(String, nullable=False)  # "2026-27"
    allocated_amount = Column(Float, default=0.0)
    utilized_amount = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    school = relationship("School")
