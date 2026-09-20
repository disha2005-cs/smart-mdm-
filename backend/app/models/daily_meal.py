from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class DailyMeal(Base):
    __tablename__ = "daily_meals"
    # One consumption record per school per day - the API upserts on this.
    __table_args__ = (
        UniqueConstraint("school_id", "date", name="uq_daily_meal_school_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete='CASCADE'), nullable=False)
    date = Column(Date, default=func.current_date(), nullable=False)
    total_students_present = Column(Integer, default=0)
    rice_consumed = Column(Float, default=0.0)
    wheat_consumed = Column(Float, default=0.0)
    dal_consumed = Column(Float, default=0.0)
    # Guards against deducting the same meal from stock twice.
    inventory_consumed = Column(Boolean, default=False, nullable=False, server_default='false')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    school = relationship("School")
