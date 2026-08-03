from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.models.daily_meal import DailyMeal
from app.schemas.report import DailyReportRow, ReportsSummary

router = APIRouter()


@router.get("/summary", response_model=ReportsSummary)
def get_reports_summary(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    query = db.query(DailyMeal)

    if current_user.role == "SCHOOL":
        query = query.filter(DailyMeal.school_id == current_user.school_id)

    reports = (
        query.order_by(DailyMeal.date.desc())
        .limit(limit)
        .all()
    )

    return ReportsSummary(
        reports=[
            DailyReportRow(
                date=row.date or date.today(),
                attendance=row.total_students_present,
                rice=row.rice_consumed,
                wheat=row.wheat_consumed,
                dal=row.dal_consumed,
            )
            for row in reports
        ]
    )
