from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.validators import bad_request, parse_iso_date
from app.database import get_db
from app.models.attendance import Attendance
from app.models.daily_meal import DailyMeal
from app.models.inventory import Inventory
from app.models.school import School
from app.models.student import Student
from app.models.user import UserRole
from app.schemas.report import DailyReportRow, ReportsSummary

router = APIRouter()

STATUS_PRESENT = "PRESENT"
MAX_RANGE_DAYS = 366


def _scope_school_id(current_user, school_id: Optional[int]) -> Optional[int]:
    """School admins are pinned to their own school; government may filter."""
    if current_user.role == UserRole.SCHOOL:
        return current_user.school_id
    return school_id


def _resolve_range(start_date: Optional[str], end_date: Optional[str], default_days: int):
    end = parse_iso_date(end_date, "End date") or date.today()
    start = parse_iso_date(start_date, "Start date") or (end - timedelta(days=default_days - 1))

    if start > end:
        raise bad_request("Start date must be on or before the end date")
    if (end - start).days > MAX_RANGE_DAYS:
        raise bad_request(f"Date range cannot exceed {MAX_RANGE_DAYS} days")

    return start, end


@router.get("/summary", response_model=ReportsSummary)
def get_reports_summary(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Recent daily meal records (legacy shape kept for existing clients)."""
    if limit < 1 or limit > 365:
        raise bad_request("limit must be between 1 and 365")

    query = db.query(DailyMeal)
    if current_user.role == UserRole.SCHOOL:
        query = query.filter(DailyMeal.school_id == current_user.school_id)

    reports = query.order_by(DailyMeal.date.desc()).limit(limit).all()

    return ReportsSummary(
        reports=[
            DailyReportRow(
                date=row.date or date.today(),
                attendance=row.total_students_present or 0,
                rice=row.rice_consumed or 0.0,
                wheat=row.wheat_consumed or 0.0,
                dal=row.dal_consumed or 0.0,
            )
            for row in reports
        ]
    )


@router.get("/daily")
def get_daily_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """
    Day-by-day attendance and meal consumption over a date range.

    Attendance is counted from the register itself rather than from the meal
    record, so the series is present even on days no meal was logged.
    """
    start, end = _resolve_range(start_date, end_date, default_days=30)
    scoped_school = _scope_school_id(current_user, school_id)

    attendance_query = db.query(
        Attendance.date,
        func.count(distinct(Attendance.student_id)).label("present"),
    ).filter(
        Attendance.date >= start,
        Attendance.date <= end,
        Attendance.status == STATUS_PRESENT,
    )
    if scoped_school:
        attendance_query = attendance_query.filter(Attendance.school_id == scoped_school)
    attendance_by_day = dict(attendance_query.group_by(Attendance.date).all())

    meals_query = db.query(
        DailyMeal.date,
        func.coalesce(func.sum(DailyMeal.total_students_present), 0).label("meals"),
        func.coalesce(func.sum(DailyMeal.rice_consumed), 0.0).label("rice"),
        func.coalesce(func.sum(DailyMeal.wheat_consumed), 0.0).label("wheat"),
        func.coalesce(func.sum(DailyMeal.dal_consumed), 0.0).label("dal"),
    ).filter(DailyMeal.date >= start, DailyMeal.date <= end)
    if scoped_school:
        meals_query = meals_query.filter(DailyMeal.school_id == scoped_school)
    meals_by_day = {row[0]: row for row in meals_query.group_by(DailyMeal.date).all()}

    student_query = db.query(func.count(Student.id)).filter(Student.is_active.is_(True))
    if scoped_school:
        student_query = student_query.filter(Student.school_id == scoped_school)
    total_students = student_query.scalar() or 0

    rows = []
    cursor = start
    while cursor <= end:
        meal_row = meals_by_day.get(cursor)
        present = attendance_by_day.get(cursor, 0)
        rows.append({
            "date": cursor.isoformat(),
            "attendance": present,
            "attendance_percentage": round(present / total_students * 100, 1) if total_students else 0.0,
            "meals_served": int(meal_row[1]) if meal_row else 0,
            "rice": round(float(meal_row[2]), 3) if meal_row else 0.0,
            "wheat": round(float(meal_row[3]), 3) if meal_row else 0.0,
            "dal": round(float(meal_row[4]), 3) if meal_row else 0.0,
        })
        cursor += timedelta(days=1)

    # Days with no register entry are non-working days and must not drag the
    # average down, so the mean is taken over active days only.
    active_days = [row for row in rows if row["attendance"] > 0]

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "total_students": total_students,
        "rows": rows,
        "totals": {
            "school_days": len(active_days),
            "total_meals_served": sum(row["meals_served"] for row in rows),
            "total_rice": round(sum(row["rice"] for row in rows), 3),
            "total_wheat": round(sum(row["wheat"] for row in rows), 3),
            "total_dal": round(sum(row["dal"] for row in rows), 3),
            "average_attendance": (
                round(sum(row["attendance"] for row in active_days) / len(active_days), 1)
                if active_days else 0.0
            ),
            "average_attendance_percentage": (
                round(sum(row["attendance_percentage"] for row in active_days) / len(active_days), 1)
                if active_days else 0.0
            ),
        },
    }


def _bucketed_report(db: Session, current_user, start_date, end_date, school_id, bucket: str, default_days: int):
    start, end = _resolve_range(start_date, end_date, default_days=default_days)
    scoped_school = _scope_school_id(current_user, school_id)

    period = func.date_trunc(bucket, Attendance.date)
    attendance_query = db.query(
        period.label("period"),
        func.count(distinct(Attendance.student_id)).label("unique_students"),
        func.count(Attendance.id).label("records"),
        func.count(distinct(Attendance.date)).label("days"),
    ).filter(
        Attendance.date >= start,
        Attendance.date <= end,
        Attendance.status == STATUS_PRESENT,
    )
    if scoped_school:
        attendance_query = attendance_query.filter(Attendance.school_id == scoped_school)
    attendance_rows = attendance_query.group_by(period).order_by(period).all()

    meal_period = func.date_trunc(bucket, DailyMeal.date)
    meals_query = db.query(
        meal_period.label("period"),
        func.coalesce(func.sum(DailyMeal.total_students_present), 0),
        func.coalesce(func.sum(DailyMeal.rice_consumed), 0.0),
        func.coalesce(func.sum(DailyMeal.wheat_consumed), 0.0),
        func.coalesce(func.sum(DailyMeal.dal_consumed), 0.0),
    ).filter(DailyMeal.date >= start, DailyMeal.date <= end)
    if scoped_school:
        meals_query = meals_query.filter(DailyMeal.school_id == scoped_school)
    meals_by_period = {row[0]: row for row in meals_query.group_by(meal_period).all()}

    rows = []
    for period_start, unique_students, records, days in attendance_rows:
        meal_row = meals_by_period.get(period_start)
        period_date = period_start.date() if hasattr(period_start, "date") else period_start
        rows.append({
            "period": period_date.isoformat(),
            "unique_students": unique_students,
            "attendance_records": records,
            "school_days": days,
            # Averaged over days actually worked, not over calendar days.
            "average_daily_attendance": round(records / days, 1) if days else 0.0,
            "meals_served": int(meal_row[1]) if meal_row else 0,
            "rice": round(float(meal_row[2]), 3) if meal_row else 0.0,
            "wheat": round(float(meal_row[3]), 3) if meal_row else 0.0,
            "dal": round(float(meal_row[4]), 3) if meal_row else 0.0,
        })

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "bucket": bucket,
        "rows": rows,
        "totals": {
            "meals_served": sum(row["meals_served"] for row in rows),
            "rice": round(sum(row["rice"] for row in rows), 3),
            "wheat": round(sum(row["wheat"] for row in rows), 3),
            "dal": round(sum(row["dal"] for row in rows), 3),
        },
    }


@router.get("/weekly")
def get_weekly_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Attendance and consumption aggregated by week."""
    return _bucketed_report(db, current_user, start_date, end_date, school_id, "week", 84)


@router.get("/monthly")
def get_monthly_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Attendance and consumption aggregated by month."""
    return _bucketed_report(db, current_user, start_date, end_date, school_id, "month", 365)


@router.get("/inventory")
def get_inventory_report(
    school_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_user),
):
    """Stock position with value, grouped by category."""
    scoped_school = _scope_school_id(current_user, school_id)

    query = db.query(Inventory)
    if scoped_school:
        query = query.filter(Inventory.school_id == scoped_school)

    items = query.order_by(Inventory.category, Inventory.item_name).all()

    rows = []
    for item in items:
        quantity = item.quantity or 0
        threshold = item.threshold or 0
        rows.append({
            "id": item.id,
            "school_id": item.school_id,
            "item_name": item.item_name,
            "category": item.category,
            "quantity": quantity,
            "unit": item.unit,
            "threshold": threshold,
            "supplier": item.supplier,
            "cost_per_unit": item.cost_per_unit,
            "stock_value": round(quantity * (item.cost_per_unit or 0), 2),
            "status": (
                "out" if quantity <= 0
                else "critical" if quantity <= threshold * 0.5
                else "low" if quantity <= threshold
                else "healthy"
            ),
        })

    return {
        "rows": rows,
        "totals": {
            "items": len(rows),
            "stock_value": round(sum(row["stock_value"] for row in rows), 2),
            "low_or_out": sum(1 for row in rows if row["status"] in ("out", "critical", "low")),
        },
    }


@router.get("/schools")
def get_school_performance_report(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """Per-school attendance and stock health for the government view."""
    today = date.today()
    window_start = today - timedelta(days=30)

    schools = db.query(School).filter(School.is_active.is_(True)).all()

    students_by_school = dict(
        db.query(Student.school_id, func.count(Student.id))
        .filter(Student.is_active.is_(True))
        .group_by(Student.school_id)
        .all()
    )

    attendance_rows = db.query(
        Attendance.school_id,
        func.count(Attendance.id),
        func.count(distinct(Attendance.date)),
    ).filter(
        Attendance.date >= window_start,
        Attendance.status == STATUS_PRESENT,
    ).group_by(Attendance.school_id).all()
    attendance_by_school = {row[0]: (row[1], row[2]) for row in attendance_rows}

    low_stock_by_school = dict(
        db.query(Inventory.school_id, func.count(Inventory.id))
        .filter(Inventory.quantity <= Inventory.threshold)
        .group_by(Inventory.school_id)
        .all()
    )

    rows = []
    for school in schools:
        enrolled = students_by_school.get(school.id, 0)
        records, days = attendance_by_school.get(school.id, (0, 0))
        average_present = records / days if days else 0
        rows.append({
            "school_id": school.id,
            "school_name": school.school_name,
            "district": school.district,
            "udise_code": school.udise_code,
            "students": enrolled,
            "school_days": days,
            "average_attendance": round(average_present, 1),
            "attendance_percentage": round(average_present / enrolled * 100, 1) if enrolled else 0.0,
            "low_stock_items": low_stock_by_school.get(school.id, 0),
        })

    rows.sort(key=lambda row: row["attendance_percentage"], reverse=True)

    return {
        "period_days": 30,
        "rows": rows,
        "totals": {
            "schools": len(rows),
            "students": sum(row["students"] for row in rows),
            "schools_with_low_stock": sum(1 for row in rows if row["low_stock_items"] > 0),
        },
    }
