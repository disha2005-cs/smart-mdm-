from sqlalchemy import Column, Integer, Float, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class DailyMeal(Base):
    __tablename__ = "daily_meals"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    date = Column(Date, default=func.current_date(), nullable=False)
    total_students_present = Column(Integer, default=0)
    rice_consumed = Column(Float, default=0.0)
    wheat_consumed = Column(Float, default=0.0)
    dal_consumed = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    school = relationship("School")
