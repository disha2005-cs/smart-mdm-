from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class InventoryBase(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=80)
    category: str = "Other"
    quantity: float = Field(..., ge=0)
    unit: str = Field(..., min_length=1, max_length=20)
    threshold: float = Field(..., gt=0)
    supplier: Optional[str] = Field(default=None, max_length=120)
    cost_per_unit: Optional[float] = Field(default=None, ge=0)


class InventoryCreate(InventoryBase):
    # Accepted for backwards compatibility with existing clients but ignored:
    # an item always belongs to the authenticated admin's school.
    school_id: Optional[int] = None


class InventoryUpdate(BaseModel):
    item_name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    category: Optional[str] = None
    quantity: Optional[float] = Field(default=None, ge=0)
    unit: Optional[str] = None
    threshold: Optional[float] = Field(default=None, gt=0)
    supplier: Optional[str] = Field(default=None, max_length=120)
    cost_per_unit: Optional[float] = Field(default=None, ge=0)


class Inventory(InventoryBase):
    id: int
    school_id: int
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


class DailyMealBase(BaseModel):
    date: date
    total_students_present: int = Field(..., ge=0)
    rice_consumed: float = Field(default=0.0, ge=0)
    wheat_consumed: float = Field(default=0.0, ge=0)
    dal_consumed: float = Field(default=0.0, ge=0)


class DailyMealCreate(DailyMealBase):
    pass


class DailyMeal(DailyMealBase):
    id: int
    school_id: int
    created_at: Optional[datetime] = None
    inventory_consumed: bool = False

    class Config:
        from_attributes = True
