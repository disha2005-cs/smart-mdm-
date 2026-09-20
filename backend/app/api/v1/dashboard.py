from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import distinct, func, text
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
from app.services.meal_calculator import requirements_from_grade_counts

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

    window_start = today - timedelta(days=TREND_WINDOW_DAYS)
    previous_start = window_start - timedelta(days=TREND_WINDOW_DAYS)
    month_start = today.replace(day=1)

    # Every headline number in one round trip.
    #
    # These were fourteen separate scalar queries. Against a managed database
    # in another region each one costs a full round trip (~250ms here), so the
    # page spent seconds doing nothing but waiting. As correlated subqueries in
    # a single SELECT the whole set comes back in one.
    totals = db.execute(text("""
        SELECT
          (SELECT count(*) FROM schools WHERE is_active) AS total_schools,
          (SELECT count(*) FROM students WHERE is_active) AS total_students,
          (SELECT count(DISTINCT district) FROM schools WHERE is_active) AS districts,
          (SELECT count(*) FROM schools WHERE created_at >= :month_start) AS schools_this_month,
          (SELECT count(DISTINCT student_id) FROM attendances
             WHERE date = :today AND status = :present) AS present_today,
          (SELECT coalesce(sum(total_students_present), 0) FROM daily_meals
             WHERE date = :today) AS meals_today,
          (SELECT count(*) FROM daily_meals WHERE date >= :month_start) AS meal_records_month,
          (SELECT coalesce(sum(quantity), 0) FROM food_allocations
             WHERE status IN ('APPROVED', 'DELIVERED')
               AND allocation_date >= :month_start) AS food_allocated,
          (SELECT count(*) FROM food_allocations WHERE status = 'PENDING') AS pending_allocations,
          (SELECT coalesce(sum(allocated_amount), 0) FROM budgets
             WHERE financial_year = :fy) AS budget_allocated,
          (SELECT coalesce(sum(utilized_amount), 0) FROM budgets
             WHERE financial_year = :fy) AS budget_utilized,
          (SELECT count(*) FROM attendances
             WHERE date >= :window_start AND status = :present) AS present_window,
          (SELECT count(*) FROM attendances
             WHERE date >= :previous_start AND date < :window_start
               AND status = :present) AS present_previous,
          (SELECT avg(confidence_score) FROM attendances
             WHERE date >= :window_start AND confidence_score IS NOT NULL) AS avg_confidence,
          (SELECT count(*) FROM alerts WHERE status = 'UNREAD') AS unread_alerts,
          (SELECT count(DISTINCT school_id) FROM inventory
             WHERE quantity <= threshold) AS low_stock_schools
    """), {
        "today": today,
        "month_start": month_start,
        "window_start": window_start,
        "previous_start": previous_start,
        "fy": financial_year,
        "present": STATUS_PRESENT,
    }).mappings().one()

    total_schools = int(totals["total_schools"])
    total_students = int(totals["total_students"])
    students_present_today = int(totals["present_today"])
    meals_served_today = int(totals["meals_today"])
    food_allocated = float(totals["food_allocated"])
    pending_allocations = int(totals["pending_allocations"])
    budget_allocated = float(totals["budget_allocated"])
    budget_utilized = float(totals["budget_utilized"])
    schools_added_this_month = int(totals["schools_this_month"])
    unread_alerts = int(totals["unread_alerts"])
    low_stock_schools = int(totals["low_stock_schools"])
    reports_generated = int(totals["meal_records_month"])
    district_count = int(totals["districts"])
    current_present = int(totals["present_window"])
    previous_present = int(totals["present_previous"])

    budget_utilisation = round(budget_utilized / budget_allocated * 100, 1) if budget_allocated else 0.0
    attendance_percentage = (
        round(students_present_today / total_students * 100, 1) if total_students else 0.0
    )
    ai_health = round(float(totals["avg_confidence"]), 1) if totals["avg_confidence"] is not None else 0.0

    kpis = {
        "total_schools": {
            "value": total_schools, "label": "Total Schools",
            "trend": f"+{schools_added_this_month} this month", "icon": "Building2",
        },
        "total_students": {
            "value": total_students, "label": "Total Students",
            "trend": f"Across {district_count} district(s)",
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

    # District rollup in one round trip. Three grouped queries became one with
    # the per-district aggregates as correlated subqueries; the counts must be
    # computed separately anyway to avoid a fan-out between students,
    # attendance and alerts on the same join.
    district_rows = db.execute(text("""
        SELECT s.district                                           AS name,
               count(DISTINCT s.id)                                 AS schools,
               (SELECT count(*) FROM students st
                  JOIN schools s2 ON s2.id = st.school_id
                 WHERE s2.district = s.district AND st.is_active AND s2.is_active) AS students,
               (SELECT count(DISTINCT a.student_id) FROM attendances a
                  JOIN schools s3 ON s3.id = a.school_id
                 WHERE s3.district = s.district
                   AND a.date = :today AND a.status = :present)     AS present_today,
               (SELECT count(*) FROM alerts al
                  JOIN schools s4 ON s4.id = al.school_id
                 WHERE s4.district = s.district AND al.status = 'UNREAD') AS alerts
          FROM schools s
         WHERE s.is_active
         GROUP BY s.district
         ORDER BY schools DESC
    """), {"today": today, "present": STATUS_PRESENT}).mappings().all()

    districts = [{
        "name": row["name"],
        "schools": int(row["schools"]),
        "students": int(row["students"]),
        "present_today": int(row["present_today"]),
        "attendance": round(int(row["present_today"]) / int(row["students"]) * 100, 1)
                      if row["students"] else 0.0,
        "alerts": int(row["alerts"]),
    } for row in district_rows]

    # Recent activity, and the alert list, in one round trip.
    #
    # The three ORM loops here each triggered a lazy load of `.school` per row
    # (a classic N+1). One UNION ALL with the join already done replaces the
    # lot, and the LIMITs mean it stays cheap as the tables grow.
    activity_rows = db.execute(text("""
        (SELECT 'school' AS kind, s.created_at AS at, s.school_name AS school,
                s.district AS detail, NULL::text AS extra, NULL::text AS status
           FROM schools s ORDER BY s.created_at DESC NULLS LAST LIMIT 3)
        UNION ALL
        (SELECT 'allocation', a.created_at, sc.school_name,
                a.quantity || ' ' || a.unit || ' ' || a.item_name, NULL, a.status
           FROM food_allocations a LEFT JOIN schools sc ON sc.id = a.school_id
          ORDER BY a.created_at DESC NULLS LAST LIMIT 3)
        UNION ALL
        (SELECT 'budget', b.created_at, sc.school_name,
                NULL, to_char(b.allocated_amount, 'FM999999999990'), NULL
           FROM budgets b LEFT JOIN schools sc ON sc.id = b.school_id
          ORDER BY b.created_at DESC NULLS LAST LIMIT 2)
        ORDER BY at DESC NULLS LAST
    """)).mappings().all()

    recent_activities = []
    for row in activity_rows:
        at = row["at"].isoformat() if row["at"] else None
        if row["kind"] == "school":
            recent_activities.append({
                "activity": "School Registered", "school": row["school"],
                "district": row["detail"], "time": at, "type": "success",
            })
        elif row["kind"] == "allocation":
            status = (row["status"] or "").title()
            recent_activities.append({
                "activity": f"Food Allocation {status}", "school": row["school"],
                "detail": row["detail"], "time": at,
                "type": "info" if row["status"] == AllocationStatus.PENDING.value else "success",
            })
        else:
            recent_activities.append({
                "activity": "Budget Allocated", "school": row["school"],
                "amount": f"₹{row['extra'] or 0}", "time": at, "type": "success",
            })

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

    window_start = today - timedelta(days=TREND_WINDOW_DAYS)
    yesterday = today - timedelta(days=1)

    # School row plus every headline number in one round trip. This was ten
    # separate queries, each a full round trip to a remote database.
    summary = db.execute(text("""
        SELECT s.id, s.school_name, s.principal_name, s.district, s.udise_code,
          (SELECT count(*) FROM students
             WHERE school_id = :sid AND is_active)                       AS total_students,
          (SELECT count(DISTINCT a.student_id) FROM attendances a
             WHERE a.school_id = :sid AND a.date = :today
               AND a.status = :present)                                  AS present_today,
          (SELECT count(DISTINCT a.student_id) FROM attendances a
             WHERE a.school_id = :sid AND a.date = :yesterday
               AND a.status = :present)                                  AS present_yesterday,
          (SELECT coalesce(sum(quantity), 0) FROM inventory
             WHERE school_id = :sid)                                     AS total_stock,
          (SELECT coalesce(sum(quantity * coalesce(cost_per_unit, 0)), 0) FROM inventory
             WHERE school_id = :sid)                                     AS stock_value,
          (SELECT count(*) FROM inventory
             WHERE school_id = :sid AND quantity <= threshold)           AS low_stock_items,
          (SELECT avg(a.confidence_score) FROM attendances a
             WHERE a.school_id = :sid AND a.date >= :window_start
               AND a.confidence_score IS NOT NULL)                       AS avg_confidence,
          (SELECT count(*) FROM face_encodings fe
             JOIN students st ON st.id = fe.student_id
            WHERE st.school_id = :sid AND st.is_active)                  AS students_with_faces,
          (SELECT count(*) FROM alerts
             WHERE school_id = :sid AND status = 'UNREAD')               AS gov_alerts,
          dm.id                                                          AS meal_id,
          dm.total_students_present                                      AS meal_served,
          dm.inventory_consumed                                          AS meal_consumed
        FROM schools s
        LEFT JOIN daily_meals dm ON dm.school_id = s.id AND dm.date = :today
        WHERE s.id = :sid
    """), {
        "sid": school_id, "today": today, "yesterday": yesterday,
        "window_start": window_start, "present": STATUS_PRESENT,
    }).mappings().first()

    if summary is None:
        raise HTTPException(status_code=404, detail="School not found")

    total_students = int(summary["total_students"])
    students_present_today = int(summary["present_today"])
    total_stock = float(summary["total_stock"])
    stock_value = float(summary["stock_value"])
    low_stock_items = int(summary["low_stock_items"])
    students_with_faces = int(summary["students_with_faces"])
    gov_alerts = int(summary["gov_alerts"])

    attendance_percentage = (
        round(students_present_today / total_students * 100, 1) if total_students else 0.0
    )
    attendance_trend = _percentage_change(students_present_today, int(summary["present_yesterday"]))
    ai_accuracy = round(float(summary["avg_confidence"]), 1) if summary["avg_confidence"] is not None else 0.0

    # Meal requirement from the government norms for the students actually
    # present. Counting grades in SQL avoids pulling every present student's
    # row back just to bucket them.
    grade_counts = db.execute(text("""
        SELECT st.grade, count(DISTINCT st.id) AS n
          FROM attendances a JOIN students st ON st.id = a.student_id
         WHERE a.school_id = :sid AND a.date = :today AND a.status = :present
           AND st.is_active
         GROUP BY st.grade
    """), {"sid": school_id, "today": today, "present": STATUS_PRESENT}).all()

    meal_calc = requirements_from_grade_counts({row[0]: int(row[1]) for row in grade_counts})
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

    # Today's meal record came back with the summary above (LEFT JOIN).
    meal_recorded = summary["meal_id"] is not None
    meal_served = int(summary["meal_served"] or 0)

    meal_summary = {
        "required": students_present_today,
        "prepared": meal_served,
        "served": meal_served,
        "remaining": max(0, students_present_today - meal_served),
        "recorded": meal_recorded,
        "stock_deducted": bool(summary["meal_consumed"]),
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

    # Recent activity: three "most recent row" lookups collapsed into one.
    activity_rows = db.execute(text("""
        (SELECT 'attendance' AS kind, a.created_at AS at, NULL::text AS detail
           FROM attendances a WHERE a.school_id = :sid
          ORDER BY a.created_at DESC NULLS LAST LIMIT 1)
        UNION ALL
        (SELECT 'student', st.created_at,
                st.first_name || ' ' || st.last_name || ' (Grade ' || coalesce(st.grade, '-') || ')'
           FROM students st WHERE st.school_id = :sid
          ORDER BY st.created_at DESC NULLS LAST LIMIT 1)
        UNION ALL
        (SELECT 'inventory', i.last_updated,
                i.item_name || ': ' || i.quantity || ' ' || i.unit
           FROM inventory i WHERE i.school_id = :sid
          ORDER BY i.last_updated DESC NULLS LAST LIMIT 1)
        ORDER BY at DESC NULLS LAST
    """), {"sid": school_id}).mappings().all()

    labels = {
        "attendance": ("Attendance marked", "success"),
        "student": ("Student registered", "info"),
        "inventory": ("Inventory updated", "success"),
    }
    recent_activities = []
    for row in activity_rows:
        if row["at"] is None:
            continue
        activity, tone = labels[row["kind"]]
        recent_activities.append({
            "activity": activity,
            "detail": row["detail"] or f"{students_present_today} present today",
            "time": row["at"].isoformat(),
            "type": tone,
        })

    if meal_recorded:
        recent_activities.append({
            "activity": "Meal record saved",
            "detail": f"{meal_served} meals today",
            "time": None,
            "type": "success",
        })

    alerts = db.query(Alert).filter(
        Alert.school_id == school_id,
        Alert.status == "UNREAD",
    ).order_by(Alert.created_at.desc()).limit(5).all()

    return {
        "school": {
            "id": summary["id"],
            "name": summary["school_name"],
            "principal": summary["principal_name"] or "Not recorded",
            "district": summary["district"],
            "udise_code": summary["udise_code"],
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
