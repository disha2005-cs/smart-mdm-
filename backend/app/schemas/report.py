from datetime import date
from typing import List

from pydantic import BaseModel


class DailyReportRow(BaseModel):
    date: date
    attendance: int
    rice: float
    wheat: float
    dal: float


class ReportsSummary(BaseModel):
    reports: List[DailyReportRow]
