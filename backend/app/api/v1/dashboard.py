from datetime import date, timedelta
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.models.user import User, UserRole
from app.models.alert import Alert
from app.models.attendance import Attendance
from app.models.daily_meal import DailyMeal
from app.models.inventory import Inventory
from app.models.school import School
from app.models.student import Student

router = APIRouter()


@router.get("/government")
def get_government_dashboard(db: Session = Depends(get_db), current_user = Depends(deps.get_current_gov_admin)):
    """
    Get comprehensive dashboard stats for Government Admin
    Includes: 12 KPI cards, district analytics, recent activities
    """
    today = date.today()
    
    # Core KPIs
    total_schools = db.query(School).filter(School.is_active == True).count()
    total_students = db.query(Student).filter(Student.is_active == True).count()
    
    # Today's attendance
    students_present_today = db.query(func.count(distinct(Attendance.student_id))).filter(
        Attendance.date == today,
        Attendance.status == "PRESENT"
    ).scalar() or 0
    
    # Today's meals
    meals_served_today = db.query(func.coalesce(func.sum(DailyMeal.total_students_present), 0)).filter(
        DailyMeal.date == today
    ).scalar() or 0
    
    # Food & Budget (mock data for now)
    food_allocated = 50000  # kg
    budget_allocated = 5000000  # rupees
    
    # Attendance percentage
    attendance_percentage = round((students_present_today / total_students * 100), 1) if total_students > 0 else 0
    
    # Alerts & notifications
    pending_requests = db.query(Alert).filter(Alert.status == "UNREAD").count()
    notifications_count = pending_requests
    
    # Reports & AI
    reports_generated = 0  # Placeholder
    ai_health = 98.5  # Mock AI accuracy
    iot_devices = 0  # Future feature
    
    kpis = {
        "total_schools": {"value": total_schools, "label": "Total Schools", "trend": "+2 this month", "icon": "Building2"},
        "total_students": {"value": total_students, "label": "Total Students", "trend": "Across Karnataka", "icon": "Users"},
        "students_present_today": {"value": students_present_today, "label": "Students Present Today", "trend": f"{attendance_percentage}%", "icon": "UserCheck"},
        "meals_served_today": {"value": meals_served_today, "label": "Meals Served Today", "trend": "Updated live", "icon": "Utensils"},
        "food_allocated": {"value": food_allocated, "label": "Total Food Allocated (kg)", "trend": "This month", "icon": "Package"},
        "budget_allocated": {"value": budget_allocated, "label": "Budget Allocated (₹)", "trend": "FY 2026-27", "icon": "DollarSign"},
        "attendance_percentage": {"value": attendance_percentage, "label": "Overall Attendance %", "trend": "+5% vs last month", "icon": "TrendingUp"},
        "pending_requests": {"value": pending_requests, "label": "Pending Requests", "trend": "Needs review", "icon": "AlertCircle"},
        "notifications": {"value": notifications_count, "label": "Notifications", "trend": "New updates", "icon": "Bell"},
        "reports_generated": {"value": reports_generated, "label": "Reports Generated", "trend": "This month", "icon": "FileText"},
        "ai_health": {"value": ai_health, "label": "AI Health %", "trend": "System optimal", "icon": "Cpu"},
        "iot_devices": {"value": iot_devices, "label": "IoT Devices", "trend": "Coming soon", "icon": "Wifi"},
    }
    
    # District-wise breakdown
    district_stats = db.query(
        School.district,
        func.count(School.id).label("school_count")
    ).filter(School.is_active == True).group_by(School.district).all()
    
    districts = [
        {"name": dist[0], "schools": dist[1], "attendance": 0, "alerts": 0}
        for dist in district_stats
    ]
    
    # Recent activities (mock data)
    recent_activities = [
        {"activity": "School Registered", "school": "ABC High School", "time": "2 hours ago", "type": "success"},
        {"activity": "Food Allocated", "district": "Mysuru", "time": "5 hours ago", "type": "info"},
        {"activity": "Budget Released", "amount": "₹50,000", "time": "1 day ago", "type": "success"},
        {"activity": "Low Stock Alert", "school": "XYZ School", "time": "2 days ago", "type": "warning"},
    ]
    
    # Government alerts
    alerts = db.query(Alert).filter(Alert.status == "UNREAD").order_by(Alert.created_at.desc()).limit(5).all()
    alert_list = [
        {"id": a.id, "message": a.alert_type, "severity": a.severity, "school_id": a.school_id}
        for a in alerts
    ]
    
    return {
        "kpis": kpis,
        "districts": districts,
        "recent_activities": recent_activities,
        "alerts": alert_list,
        "summary": {
            "total_schools": total_schools,
            "total_students": total_students,
            "attendance_today": students_present_today,
            "attendance_percentage": attendance_percentage
        }
    }


@router.get("/school")
def get_school_dashboard(db: Session = Depends(get_db), current_user = Depends(deps.get_current_school_admin)):
    """
    Get comprehensive dashboard stats for School Admin
    Includes: 8 KPI cards, attendance analytics, meal summary, inventory status
    """
    school_id = current_user.school_id
    today = date.today()
    
    # Get school details
    school = db.query(School).filter(School.id == school_id).first()
    
    # Core KPIs
    total_students = db.query(Student).filter(
        Student.school_id == school_id,
        Student.is_active == True
    ).count()
    
    # Today's attendance
    students_present_today = db.query(func.count(distinct(Attendance.student_id))).filter(
        Attendance.school_id == school_id,
        Attendance.date == today,
        Attendance.status == "PRESENT"
    ).scalar() or 0
    
    # Meals required today
    meals_required_today = total_students
    
    # Current food stock (total across all items)
    total_stock = db.query(func.coalesce(func.sum(Inventory.quantity), 0)).filter(
        Inventory.school_id == school_id
    ).scalar() or 0
    
    # Low stock items
    low_stock_items = db.query(Inventory).filter(
        Inventory.school_id == school_id,
        Inventory.quantity <= Inventory.threshold
    ).count()
    
    # Attendance percentage
    attendance_percentage = round((students_present_today / total_students * 100), 1) if total_students > 0 else 0
    
    # AI Recognition accuracy (mock)
    ai_accuracy = 96.8
    
    # Government alerts
    gov_alerts = db.query(Alert).filter(
        Alert.school_id == school_id,
        Alert.status == "UNREAD"
    ).count()
    
    kpis = {
        "total_students": {"value": total_students, "label": "Total Students", "trend": "Enrolled", "icon": "Users"},
        "students_present_today": {"value": students_present_today, "label": "Students Present Today", "trend": f"{attendance_percentage}%", "icon": "UserCheck"},
        "meals_required_today": {"value": meals_required_today, "label": "Meals Required Today", "trend": "For kitchen", "icon": "Utensils"},
        "current_food_stock": {"value": total_stock, "label": "Current Food Stock (kg)", "trend": "All items", "icon": "Package"},
        "low_stock_items": {"value": low_stock_items, "label": "Low Stock Items", "trend": "⚠ Reorder needed", "icon": "AlertTriangle"},
        "attendance_percentage": {"value": attendance_percentage, "label": "Attendance %", "trend": "+3% vs yesterday", "icon": "TrendingUp"},
        "ai_accuracy": {"value": ai_accuracy, "label": "AI Recognition Accuracy %", "trend": "System optimal", "icon": "Camera"},
        "government_alerts": {"value": gov_alerts, "label": "Government Alerts", "trend": "Action required", "icon": "Bell"},
    }
    
    # Weekly attendance data
    week_ago = today - timedelta(days=7)
    attendance_data = []
    for i in range(7):
        day = today - timedelta(days=6-i)
        count = db.query(func.count(distinct(Attendance.student_id))).filter(
            Attendance.school_id == school_id,
            Attendance.date == day,
            Attendance.status == "PRESENT"
        ).scalar() or 0
        attendance_data.append({
            "date": day.strftime("%a"),
            "count": count
        })
    
    # Inventory status by item
    inventory_items = db.query(Inventory).filter(Inventory.school_id == school_id).all()
    inventory_status = [
        {
            "item": inv.item_name,
            "quantity": inv.quantity,
            "unit": inv.unit,
            "threshold": inv.threshold,
            "status": "critical" if inv.quantity <= inv.threshold else "healthy"
        }
        for inv in inventory_items
    ]
    
    # Government alerts list
    alerts = db.query(Alert).filter(
        Alert.school_id == school_id,
        Alert.status == "UNREAD"
    ).order_by(Alert.created_at.desc()).limit(5).all()
    
    alert_list = [
        {"id": a.id, "type": a.alert_type, "severity": a.severity, "message": a.alert_type}
        for a in alerts
    ]
    
    # Recent activities (mock)
    recent_activities = [
        {"activity": "Attendance Completed", "count": students_present_today, "time": "Today 9:30 AM", "type": "success"},
        {"activity": "Student Registered", "name": "New admission", "time": "Yesterday", "type": "info"},
        {"activity": "Inventory Updated", "item": "Rice", "time": "2 days ago", "type": "success"},
        {"activity": "Meal Generated", "count": meals_required_today, "time": "Today 8:00 AM", "type": "success"},
    ]
    
    # Meal summary
    meal_summary = {
        "required": meals_required_today,
        "prepared": students_present_today,
        "served": students_present_today,
        "remaining": 0,
        "ingredients": {
            "rice": {"required": round(students_present_today * 0.15, 2), "unit": "kg"},
            "dal": {"required": round(students_present_today * 0.03, 2), "unit": "kg"},
            "oil": {"required": round(students_present_today * 0.005, 2), "unit": "L"},
            "vegetables": {"required": round(students_present_today * 0.05, 2), "unit": "kg"},
            "eggs": {"required": students_present_today // 2, "unit": "nos"},
            "milk": {"required": round(students_present_today * 0.1, 2), "unit": "L"},
        }
    }
    
    return {
        "school": {
            "name": school.school_name if school else "Unknown",
            "principal": school.principal_name if school else "Unknown",
            "district": school.district if school else "Unknown"
        },
        "kpis": kpis,
        "attendance_data": attendance_data,
        "meal_summary": meal_summary,
        "inventory_status": inventory_status,
        "alerts": alert_list,
        "recent_activities": recent_activities
    }
