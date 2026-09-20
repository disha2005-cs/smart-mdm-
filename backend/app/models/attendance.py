from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Attendance(Base):
    __tablename__ = "attendances"
    __table_args__ = (
        # A student can only have one record per day. Without this, two
        # simultaneous captures could both pass the "already marked?" check
        # and write duplicate rows.
        UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),
        Index("ix_attendance_school_date", "school_id", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete='CASCADE'), nullable=False)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    time = Column(Time, nullable=False)
    status = Column(String, nullable=False)  # "PRESENT" or "ABSENT"
    marked_by = Column(Integer, nullable=True)  # admin ID who marked attendance
    photo_url = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("Student", backref="attendances")
    school = relationship("School")
