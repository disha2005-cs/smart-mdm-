from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete='CASCADE'), nullable=False)
    item_name = Column(String, nullable=False)
    category = Column(String, default="Other")  # NEW: Grains, Pulses, Oil, Vegetables, Spices, Other
    quantity = Column(Float, default=0.0)
    unit = Column(String, nullable=False)
    threshold = Column(Float, default=10.0)
    supplier = Column(String, nullable=True)  # NEW: Supplier name
    cost_per_unit = Column(Float, nullable=True)  # NEW: Cost per unit in rupees
    last_updated = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    school = relationship("School")
