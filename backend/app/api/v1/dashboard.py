from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.models.alert import Alert
from app.models.daily_meal import DailyMeal
from app.models.inventory import Inventory
from app.models.school import School
from app.models.student import Student
from app.schemas.dashboard import DashboardStats, KPIStats

router = APIRouter()

@router.get("/government", response_model=DashboardStats)
def get_government_dashboard(db: Session = Depends(get_db), current_user = Depends(deps.get_current_gov_admin)):
    """
    Get dashboard stats for Government Admin
    """
    total_schools = db.query(School).count()
    total_students = db.query(Student).count()
    meals_served_today = db.query(func.coalesce(func.sum(DailyMeal.total_students_present), 0)).filter(
        DailyMeal.date == func.current_date()
    ).scalar()
    alerts_count = db.query(Alert).filter(Alert.status == "UNREAD").count()

    kpis = [
        KPIStats(label="Total Schools", value=total_schools, trend="Network live"),
        KPIStats(label="Students Enrolled", value=total_students, trend="Across Karnataka"),
        KPIStats(label="Meals Served Today", value=meals_served_today, trend="Updated today"),
        KPIStats(label="Critical Alerts", value=alerts_count, trend="Needs review")
    ]

    return DashboardStats(
        total_schools=total_schools,
        total_students=total_students,
        meals_served_today=meals_served_today,
        alerts_count=alerts_count,
        kpis=kpis
    )

@router.get("/school", response_model=DashboardStats)
def get_school_dashboard(db: Session = Depends(get_db), current_user = Depends(deps.get_current_school_admin)):
    """
    Get dashboard stats for a specific School Admin
    """
    # Assuming school_id is on the current_user (SchoolAdmin model)
    school_id = current_user.school_id
    
    total_students = db.query(Student).filter(Student.school_id == school_id).count()
    meals_served_today = db.query(func.coalesce(func.sum(DailyMeal.total_students_present), 0)).filter(
        DailyMeal.school_id == school_id,
        DailyMeal.date == func.current_date()
    ).scalar()
    alerts_count = db.query(Alert).filter(Alert.school_id == school_id, Alert.status == "UNREAD").count()
    low_stock_items = db.query(Inventory).filter(
        Inventory.school_id == school_id,
        Inventory.quantity <= Inventory.threshold
    ).count()

    kpis = [
        KPIStats(label="Students Enrolled", value=total_students, trend="Roster synced"),
        KPIStats(label="Attendance Today", value=meals_served_today, trend="Meals mapped"),
        KPIStats(label="Meals Served Today", value=meals_served_today, trend="Kitchen ready"),
        KPIStats(label="Low Stock Alerts", value=low_stock_items + alerts_count, trend="Monitor closely")
    ]

    return DashboardStats(
        total_schools=1, # Scope is 1 school
        total_students=total_students,
        meals_served_today=meals_served_today,
        alerts_count=alerts_count,
        kpis=kpis
    )
