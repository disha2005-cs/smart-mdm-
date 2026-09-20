from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.validators import current_financial_year
from app.database import get_db
from app.models.alert import Alert
from app.models.attendance import Attendance
from app.models.budget import Budget
from app.models.daily_meal import DailyMeal
from app.models.face_encoding import FaceEncoding
from app.models.food_allocation import AllocationStatus, FoodAllocation
from app.models.inventory import Inventory
from app.models.school import School
from app.models.student import Student
from app.services.meal_calculator import calculate_meal_requirements

router = APIRouter()

STATUS_PRESENT = "PRESENT"
TREND_WINDOW_DAYS = 30


def _percentage_change(current: float, previous: float) -> str:
    """Human-readable trend, guarding the divide-by-zero the old code hit."""
    if previous == 0:
        return "No prior data" if current == 0 else "New this period"
    delta = (current - previous) / previous * 100
    sign = "+" if delta >= 0 else ""
    return f"{sign}{delta:.1f}% vs previous period"


@router.get("/government")
def get_government_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_gov_admin),
):
    """State-wide KPIs, district analytics and recent activity."""
    today = date.today()
    financial_year = current_financial_year(today)

    total_schools = db.query(func.count(School.id)).filter(School.is_active.is_(True)).scalar() or 0
    total_students = db.query(func.count(Student.id)).filter(Student.is_active.is_(True)).scalar() or 0

    students_present_today = db.query(func.count(distinct(Attendance.student_id))).filter(
        Attendance.date == today,
        Attendance.status == STATUS_PRESENT,
    ).scalar() or 0

    meals_served_today = db.query(
        func.coalesce(func.sum(DailyMeal.total_students_present), 0)
    ).filter(DailyMeal.date == today).scalar() or 0

    # Real food allocation totals instead of the previous hardcoded 50,000 kg.
    food_allocated = db.query(func.coalesce(func.sum(FoodAllocation.quantity), 0)).filter(
        FoodAllocation.status.in_([AllocationStatus.APPROVED, AllocationStatus.DELIVERED]),
        FoodAllocation.allocation_date >= today.replace(day=1),
    ).scalar() or 0

    pending_allocations = db.query(func.count(FoodAllocation.id)).filter(
        FoodAllocation.status == AllocationStatus.PENDING
    ).scalar() or 0

    # Real budget totals instead of the previous hardcoded 50,00,000.
    budget_row = db.query(
        func.coalesce(func.sum(Budget.allocated_amount), 0.0),
        func.coalesce(func.sum(Budget.utilized_amount), 0.0),
    ).filter(Budget.financial_year == financial_year).one()
    budget_allocated, budget_utilized = float(budget_row[0]), float(budget_row[1])
    budget_utilisation = round(budget_utilized / budget_allocated * 100, 1) if budget_allocated else 0.0

    attendance_percentage = (
        round(students_present_today / total_students * 100, 1) if total_students else 0.0
    )

    # Month-on-month attendance trend, computed rather than asserted.
    window_start = today - timedelta(days=TREND_WINDOW_DAYS)
    previous_start = window_start - timedelta(days=TREND_WINDOW_DAYS)

    current_present = db.query(func.count(Attendance.id)).filter(
        Attendance.date >= window_start, Attendance.status == STATUS_PRESENT
    ).scalar() or 0
    previous_present = db.query(func.count(Attendance.id)).filter(
        Attendance.date >= previous_start,
        Attendance.date < window_start,
        Attendance.status == STATUS_PRESENT,
    ).scalar() or 0

    schools_added_this_month = db.query(func.count(School.id)).filter(
        School.created_at >= today.replace(day=1)
    ).scalar() or 0

    unread_alerts = db.query(func.count(Alert.id)).filter(Alert.status == "UNREAD").scalar() or 0

    low_stock_schools = db.query(func.count(distinct(Inventory.school_id))).filter(
        Inventory.quantity <= Inventory.threshold
    ).scalar() or 0

    # "AI health" is now the observed recognition confidence, not a fixed 98.5.
    avg_confidence = db.query(func.avg(Attendance.confidence_score)).filter(
        Attendance.date >= window_start,
        Attendance.confidence_score.isnot(None),
    ).scalar()
    ai_health = round(float(avg_confidence), 1) if avg_confidence is not None else 0.0

    reports_generated = db.query(func.count(DailyMeal.id)).filter(
        DailyMeal.date >= today.replace(day=1)
    ).scalar() or 0

    kpis = {
        "total_schools": {
            "value": total_schools, "label": "Total Schools",
            "trend": f"+{schools_added_this_month} this month", "icon": "Building2",
        },
        "total_students": {
            "value": total_students, "label": "Total Students",
            "trend": f"Across {db.query(func.count(distinct(School.district))).scalar() or 0} districts",
            "icon": "Users",
        },
        "students_present_today": {
            "value": students_present_today, "label": "Students Present Today",
            "trend": f"{attendance_percentage}% of enrolment", "icon": "UserCheck",
        },
        "meals_served_today": {
            "value": int(meals_served_today), "label": "Meals Served Today",
            "trend": "From daily meal records", "icon": "Utensils",
        },
        "food_allocated": {
            "value": round(float(food_allocated), 2), "label": "Food Allocated This Month (kg)",
            "trend": f"{pending_allocations} request(s) pending", "icon": "Package",
        },
        "budget_allocated": {
            "value": round(budget_allocated, 2), "label": "Budget Allocated (₹)",
            "trend": f"FY {financial_year} · {budget_utilisation}% utilised", "icon": "DollarSign",
        },
        "attendance_percentage": {
            "value": attendance_percentage, "label": "Overall Attendance %",
            "trend": _percentage_change(current_present, previous_present), "icon": "TrendingUp",
        },
        "pending_requests": {
            "value": pending_allocations, "label": "Pending Allocations",
            "trend": "Awaiting approval", "icon": "AlertCircle",
        },
        "notifications": {
            "value": unread_alerts, "label": "Unread Alerts",
            "trend": f"{low_stock_schools} school(s) low on stock", "icon": "Bell",
        },
        "reports_generated": {
            "value": reports_generated, "label": "Meal Records This Month",
            "trend": "Submitted by schools", "icon": "FileText",
        },
        "ai_health": {
            "value": ai_health, "label": "Avg Recognition Confidence %",
            "trend": "Last 30 days" if ai_health else "No captures yet", "icon": "Cpu",
        },
        "iot_devices": {
            "value": 0, "label": "IoT Devices", "trend": "Not deployed", "icon": "Wifi",
        },
    }

    # District rollup: schools, students, today's attendance and open alerts.
    district_rows = db.query(
        School.district,
        func.count(distinct(School.id)).label("schools"),
        func.count(distinct(Student.id)).label("students"),
    ).outerjoin(
        Student, (Student.school_id == School.id) & (Student.is_active.is_(True))
    ).filter(School.is_active.is_(True)).group_by(School.district).all()

    attendance_by_district = dict(
        db.query(School.district, func.count(distinct(Attendance.student_id)))
        .join(Attendance, Attendance.school_id == School.id)
        .filter(Attendance.date == today, Attendance.status == STATUS_PRESENT)
        .group_by(School.district)
        .all()
    )

    alerts_by_district = dict(
        db.query(School.district, func.count(Alert.id))
        .join(Alert, Alert.school_id == School.id)
        .filter(Alert.status == "UNREAD")
        .group_by(School.district)
        .all()
    )

    districts = []
    for district, school_count, student_count in district_rows:
        present = attendance_by_district.get(district, 0)
        districts.append({
            "name": district,
            "schools": school_count,
            "students": student_count,
            "present_today": present,
            "attendance": round(present / student_count * 100, 1) if student_count else 0.0,
            "alerts": alerts_by_district.get(district, 0),
        })
    districts.sort(key=lambda d: d["schools"], reverse=True)

    # Recent activity assembled from real rows rather than a fixed sample list.
    recent_activities = []

    for school in db.query(School).order_by(School.created_at.desc()).limit(3).all():
        recent_activities.append({
            "activity": "School Registered",
            "school": school.school_name,
            "district": school.district,
            "time": school.created_at.isoformat() if school.created_at else None,
            "type": "success",
        })

    for allocation in db.query(FoodAllocation).order_by(FoodAllocation.created_at.desc()).limit(3).all():
        recent_activities.append({
            "activity": f"Food Allocation {allocation.status.value.title()}",
            "school": allocation.school.school_name if allocation.school else None,
            "detail": f"{allocation.quantity} {allocation.unit} {allocation.item_name}",
            "time": allocation.created_at.isoformat() if allocation.created_at else None,
            "type": "info" if allocation.status == AllocationStatus.PENDING else "success",
        })

    for budget in db.query(Budget).order_by(Budget.created_at.desc()).limit(2).all():
        recent_activities.append({
            "activity": "Budget Allocated",
            "school": budget.school.school_name if budget.school else None,
            "amount": f"₹{budget.allocated_amount:,.0f}",
            "time": budget.created_at.isoformat() if budget.created_at else None,
            "type": "success",
        })

    recent_activities.sort(key=lambda item: item["time"] or "", reverse=True)

    alerts = db.query(Alert).filter(
        Alert.status == "UNREAD"
    ).order_by(Alert.created_at.desc()).limit(5).all()

    return {
        "financial_year": financial_year,
        "kpis": kpis,
        "districts": districts,
        "recent_activities": recent_activities[:8],
        "alerts": [{
            "id": a.id,
            "message": a.message,
            "type": a.alert_type,
            "severity": a.severity,
            "school_id": a.school_id,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        } for a in alerts],
        "budget": {
            "allocated": round(budget_allocated, 2),
            "utilized": round(budget_utilized, 2),
            "remaining": round(budget_allocated - budget_utilized, 2),
            "utilization_percentage": budget_utilisation,
        },
        "summary": {
            "total_schools": total_schools,
            "total_students": total_students,
            "attendance_today": students_present_today,
            "attendance_percentage": attendance_percentage,
        },
    }


@router.get("/school")
def get_school_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(deps.get_current_school_admin),
):
    """School KPIs, weekly attendance, norms-based meal summary and stock status."""
    school_id = current_user.school_id
    today = date.today()

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    total_students = db.query(func.count(Student.id)).filter(
        Student.school_id == school_id,
        Student.is_active.is_(True),
    ).scalar() or 0

    present_student_ids = [
        row[0] for row in db.query(distinct(Attendance.student_id)).filter(
            Attendance.school_id == school_id,
            Attendance.date == today,
            Attendance.status == STATUS_PRESENT,
        ).all()
    ]
    students_present_today = len(present_student_ids)

    total_stock = db.query(func.coalesce(func.sum(Inventory.quantity), 0.0)).filter(
        Inventory.school_id == school_id
    ).scalar() or 0.0

    stock_value = db.query(
        func.coalesce(func.sum(Inventory.quantity * func.coalesce(Inventory.cost_per_unit, 0)), 0.0)
    ).filter(Inventory.school_id == school_id).scalar() or 0.0

    low_stock_items = db.query(func.count(Inventory.id)).filter(
        Inventory.school_id == school_id,
        Inventory.quantity <= Inventory.threshold,
    ).scalar() or 0

    attendance_percentage = (
        round(students_present_today / total_students * 100, 1) if total_students else 0.0
    )

    # Yesterday's rate, so the trend text reflects reality instead of "+3%".
    yesterday_present = db.query(func.count(distinct(Attendance.student_id))).filter(
        Attendance.school_id == school_id,
        Attendance.date == today - timedelta(days=1),
        Attendance.status == STATUS_PRESENT,
    ).scalar() or 0
    attendance_trend = _percentage_change(students_present_today, yesterday_present)

    avg_confidence = db.query(func.avg(Attendance.confidence_score)).filter(
        Attendance.school_id == school_id,
        Attendance.date >= today - timedelta(days=TREND_WINDOW_DAYS),
        Attendance.confidence_score.isnot(None),
    ).scalar()
    ai_accuracy = round(float(avg_confidence), 1) if avg_confidence is not None else 0.0

    # How many students the camera can actually recognise.
    students_with_faces = db.query(func.count(FaceEncoding.id)).join(
        Student, FaceEncoding.student_id == Student.id
    ).filter(
        Student.school_id == school_id,
        Student.is_active.is_(True),
    ).scalar() or 0

    gov_alerts = db.query(func.count(Alert.id)).filter(
        Alert.school_id == school_id,
        Alert.status == "UNREAD",
    ).scalar() or 0

    # Meal requirement from the government norms for the students who are
    # actually present, replacing the previous flat 0.15kg-per-head estimate.
    meal_calc = calculate_meal_requirements(
        db=db, school_id=school_id, student_ids=present_student_ids
    )
    requirements = meal_calc["requirements"]

    kpis = {
        "total_students": {
            "value": total_students, "label": "Total Students",
            "trend": f"{students_with_faces} with face registered", "icon": "Users",
        },
        "students_present_today": {
            "value": students_present_today, "label": "Students Present Today",
            "trend": f"{attendance_percentage}% of enrolment", "icon": "UserCheck",
        },
        "meals_required_today": {
            "value": students_present_today, "label": "Meals Required Today",
            "trend": f"{meal_calc['primary_students']} primary · {meal_calc['upper_primary_students']} upper primary",
            "icon": "Utensils",
        },
        "current_food_stock": {
            "value": round(float(total_stock), 2), "label": "Current Food Stock",
            "trend": f"Worth ₹{stock_value:,.0f}", "icon": "Package",
        },
        "low_stock_items": {
            "value": low_stock_items, "label": "Low Stock Items",
            "trend": "Reorder needed" if low_stock_items else "All items healthy",
            "icon": "AlertTriangle",
        },
        "attendance_percentage": {
            "value": attendance_percentage, "label": "Attendance %",
            "trend": attendance_trend, "icon": "TrendingUp",
        },
        "ai_accuracy": {
            "value": ai_accuracy, "label": "Avg Recognition Confidence %",
            "trend": "Last 30 days" if ai_accuracy else "No captures yet", "icon": "Camera",
        },
        "government_alerts": {
            "value": gov_alerts, "label": "Government Alerts",
            "trend": "Action required" if gov_alerts else "Nothing pending", "icon": "Bell",
        },
    }

    # Weekly attendance in one grouped query rather than seven round-trips.
    week_start = today - timedelta(days=6)
    counts_by_day = dict(
        db.query(Attendance.date, func.count(distinct(Attendance.student_id)))
        .filter(
            Attendance.school_id == school_id,
            Attendance.date >= week_start,
            Attendance.status == STATUS_PRESENT,
        )
        .group_by(Attendance.date)
        .all()
    )

    attendance_data = []
    for offset in range(7):
        day = week_start + timedelta(days=offset)
        count = counts_by_day.get(day, 0)
        attendance_data.append({
            "date": day.strftime("%a"),
            "full_date": day.isoformat(),
            "count": count,
            "percentage": round(count / total_students * 100, 1) if total_students else 0.0,
        })

    inventory_items = db.query(Inventory).filter(
        Inventory.school_id == school_id
    ).order_by(Inventory.item_name).all()

    inventory_status = [{
        "id": inv.id,
        "item": inv.item_name,
        "category": inv.category,
        "quantity": inv.quantity,
        "unit": inv.unit,
        "threshold": inv.threshold,
        "status": (
            "out" if (inv.quantity or 0) <= 0
            else "critical" if (inv.quantity or 0) <= (inv.threshold or 0)
            else "healthy"
        ),
    } for inv in inventory_items]

    daily_record = db.query(DailyMeal).filter(
        DailyMeal.school_id == school_id,
        DailyMeal.date == today,
    ).first()

    meal_summary = {
        "required": students_present_today,
        "prepared": daily_record.total_students_present if daily_record else 0,
        "served": daily_record.total_students_present if daily_record else 0,
        "remaining": max(0, students_present_today - (daily_record.total_students_present if daily_record else 0)),
        "recorded": daily_record is not None,
        "stock_deducted": bool(daily_record.inventory_consumed) if daily_record else False,
        "ingredients": {
            "rice": {"required": requirements["rice_kg"], "unit": "kg"},
            "wheat": {"required": requirements["wheat_kg"], "unit": "kg"},
            "dal": {"required": requirements["dal_kg"], "unit": "kg"},
            "vegetables": {"required": requirements["vegetables_kg"], "unit": "kg"},
            "oil": {"required": requirements["oil_liters"], "unit": "L"},
        },
        "nutrition": {
            "total_calories": requirements["total_calories"],
            "total_protein_gms": requirements["total_protein_gms"],
        },
    }

    # Recent activity built from real records.
    recent_activities = []
    last_capture = db.query(Attendance).filter(
        Attendance.school_id == school_id
    ).order_by(Attendance.created_at.desc()).first()
    if last_capture:
        recent_activities.append({
            "activity": "Attendance marked",
            "detail": f"{students_present_today} present today",
            "time": last_capture.created_at.isoformat() if last_capture.created_at else None,
            "type": "success",
        })

    last_student = db.query(Student).filter(
        Student.school_id == school_id
    ).order_by(Student.created_at.desc()).first()
    if last_student:
        recent_activities.append({
            "activity": "Student registered",
            "detail": f"{last_student.first_name} {last_student.last_name} (Grade {last_student.grade})",
            "time": last_student.created_at.isoformat() if last_student.created_at else None,
            "type": "info",
        })

    last_inventory = db.query(Inventory).filter(
        Inventory.school_id == school_id
    ).order_by(Inventory.last_updated.desc()).first()
    if last_inventory:
        recent_activities.append({
            "activity": "Inventory updated",
            "detail": f"{last_inventory.item_name}: {last_inventory.quantity} {last_inventory.unit}",
            "time": last_inventory.last_updated.isoformat() if last_inventory.last_updated else None,
            "type": "success",
        })

    if daily_record:
        recent_activities.append({
            "activity": "Meal record saved",
            "detail": f"{daily_record.total_students_present} meals on {daily_record.date.isoformat()}",
            "time": daily_record.created_at.isoformat() if daily_record.created_at else None,
            "type": "success",
        })

    recent_activities.sort(key=lambda item: item["time"] or "", reverse=True)

    alerts = db.query(Alert).filter(
        Alert.school_id == school_id,
        Alert.status == "UNREAD",
    ).order_by(Alert.created_at.desc()).limit(5).all()

    return {
        "school": {
            "id": school.id,
            "name": school.school_name,
            "principal": school.principal_name or "Not recorded",
            "district": school.district,
            "udise_code": school.udise_code,
        },
        "kpis": kpis,
        "attendance_data": attendance_data,
        "meal_summary": meal_summary,
        "inventory_status": inventory_status,
        "alerts": [{
            "id": a.id,
            "type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        } for a in alerts],
        "recent_activities": recent_activities,
    }
