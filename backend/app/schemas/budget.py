from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BudgetBase(BaseModel):
    financial_year: str
    allocated_amount: float

class BudgetCreate(BudgetBase):
    school_id: int

class BudgetUpdate(BaseModel):
    allocated_amount: Optional[float] = None
    utilized_amount: Optional[float] = None

class Budget(BudgetBase):
    id: int
    school_id: int
    utilized_amount: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
