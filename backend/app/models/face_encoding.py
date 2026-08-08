from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database import Base

class FaceEncoding(Base):
    __tablename__ = "face_encodings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete='CASCADE'), unique=True, nullable=False)
    encoding = Column(Vector(512), nullable=False)
    registered_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", backref="face_encoding")
