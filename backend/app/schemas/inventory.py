from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class InventoryBase(BaseModel):
    item_name: str
    quantity: float
    unit: str
    threshold: float

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    quantity: Optional[float] = None
    threshold: Optional[float] = None

class Inventory(InventoryBase):
    id: int
    school_id: int
    last_updated: datetime

    class Config:
        from_attributes = True

class DailyMealBase(BaseModel):
    date: date
    total_students_present: int
    rice_consumed: float
    wheat_consumed: float
    dal_consumed: float

class DailyMealCreate(DailyMealBase):
    pass

class DailyMeal(DailyMealBase):
    id: int
    school_id: int
    created_at: datetime

    class Config:
        from_attributes = True
