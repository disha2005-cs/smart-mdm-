from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete='CASCADE'), nullable=False)
    alert_type = Column(String, nullable=False)
    severity = Column(String, default="LOW")  # HIGH, MEDIUM, LOW
    message = Column(String, nullable=False)
    status = Column(String, default="UNREAD")  # UNREAD, READ
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    school = relationship("School")
