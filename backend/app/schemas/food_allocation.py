from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from app.models.food_allocation import AllocationStatus

class FoodAllocationBase(BaseModel):
    school_id: int
    item_name: str
    category: str
    quantity: float
    unit: str
    notes: Optional[str] = None

class FoodAllocationCreate(FoodAllocationBase):
    pass

class FoodAllocationUpdate(BaseModel):
    status: Optional[AllocationStatus] = None
    quantity: Optional[float] = None
    notes: Optional[str] = None

class FoodAllocation(FoodAllocationBase):
    id: int
    allocation_date: date
    status: AllocationStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
