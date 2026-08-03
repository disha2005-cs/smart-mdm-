from pydantic import BaseModel
from typing import List

class KPIStats(BaseModel):
    label: str
    value: int
    trend: str # "+5%" or "-2%" etc.

class DashboardStats(BaseModel):
    total_schools: int
    total_students: int
    meals_served_today: int
    alerts_count: int
    kpis: List[KPIStats] = []
