from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.database import SessionLocal
from app.models.admin import GovernmentAdmin, SchoolAdmin
from app.models.alert import Alert
from app.models.daily_meal import DailyMeal
from app.models.inventory import Inventory
from app.models.school import School
from app.models.student import Student


def _seed_government_admin(db: Session) -> None:
    admin = db.query(GovernmentAdmin).filter(GovernmentAdmin.employee_id == "GOV-001").first()
    if admin:
        return

    db.add(
        GovernmentAdmin(
            employee_id="GOV-001",
            first_name="State",
            last_name="Director",
            email="admin@pmposhan.gov.in",
            phone="+91 90000 00001",
            designation="Director, PM POSHAN",
            password_hash=get_password_hash("password123"),
            is_active=True,
        )
    )


def _seed_school_and_admin(db: Session) -> School:
    school = db.query(School).filter(School.udise_code == "29200100101").first()
    if not school:
        school = School(
            udise_code="29200100101",
            school_name="Greenwood Government High School",
            district="Mysuru",
            taluk="Mysuru",
            village="Jayalakshmipuram",
            address="12 Temple Road, Jayalakshmipuram",
            pin_code="570012",
            principal_name="Meena Rao",
            principal_phone="+91 90000 00002",
            email="greenwood.school@pmposhan.gov.in",
            phone="+91 82100 00000",
            latitude=12.3142,
            longitude=76.6133,
            status="Active",
        )
        db.add(school)
        db.flush()

    school_admin = db.query(SchoolAdmin).filter(SchoolAdmin.employee_id == "SCH-001").first()
    if not school_admin:
        db.add(
            SchoolAdmin(
                school_id=school.id,
                employee_id="SCH-001",
                first_name="Anita",
                last_name="Sharma",
                email="school.admin@pmposhan.gov.in",
                phone="+91 90000 00003",
                password_hash=get_password_hash("password123"),
                is_active=True,
            )
        )

    return school


def _seed_students(db: Session, school: School) -> None:
    if db.query(Student).filter(Student.school_id == school.id).count() > 0:
        return

    students = [
        ("Rohan", "Kumar", "2011-04-11", "Male", "8", "A"),
        ("Asha", "Nair", "2012-01-19", "Female", "7", "B"),
        ("Vikram", "Patil", "2011-10-08", "Male", "8", "B"),
        ("Sneha", "Rao", "2010-07-24", "Female", "9", "A"),
        ("Imran", "Pasha", "2012-03-14", "Male", "7", "A"),
        ("Pooja", "Das", "2011-12-29", "Female", "8", "C"),
        ("Karthik", "M", "2010-09-05", "Male", "9", "B"),
        ("Nandini", "Gowda", "2012-06-20", "Female", "7", "C"),
    ]

    for index, (first_name, last_name, dob, gender, grade, section) in enumerate(students, start=1):
        db.add(
            Student(
                student_id=f"STU-{school.id:02d}{index:03d}",
                school_id=school.id,
                first_name=first_name,
                last_name=last_name,
                date_of_birth=date.fromisoformat(dob),
                gender=gender,
                grade=grade,
                section=section,
                parent_name=f"Parent {index}",
                parent_phone=f"+91 99000 00{index:03d}",
                has_allergies=index % 4 == 0,
                dietary_preferences="High protein" if index % 3 == 0 else "Standard",
                is_active=True,
            )
        )


def _seed_inventory(db: Session, school: School) -> None:
    if db.query(Inventory).filter(Inventory.school_id == school.id).count() > 0:
        return

    items = [
        ("Rice", 620.0, "kg", 180.0),
        ("Wheat", 210.0, "kg", 90.0),
        ("Dal", 155.0, "kg", 75.0),
        ("Oil", 58.0, "litres", 20.0),
        ("Vegetables", 84.0, "kg", 30.0),
    ]

    for item_name, quantity, unit, threshold in items:
        db.add(
            Inventory(
                school_id=school.id,
                item_name=item_name,
                quantity=quantity,
                unit=unit,
                threshold=threshold,
            )
        )


def _seed_alerts(db: Session, school: School) -> None:
    if db.query(Alert).filter(Alert.school_id == school.id).count() > 0:
        return

    alerts = [
        ("LOW_STOCK", "Dal stock is approaching the reorder threshold.", "UNREAD"),
        ("INSPECTION", "District inspection scheduled for Friday at 11:00 AM.", "UNREAD"),
        ("HEALTH", "Two students have allergy-sensitive meal notes.", "READ"),
    ]

    for alert_type, message, status in alerts:
        db.add(
            Alert(
                school_id=school.id,
                alert_type=alert_type,
                message=message,
                status=status,
            )
        )


def _seed_daily_meals(db: Session, school: School) -> None:
    if db.query(DailyMeal).filter(DailyMeal.school_id == school.id).count() > 0:
        return

    for offset, attendance in enumerate([176, 181, 185, 178, 188, 191, 194]):
        meal_date = date.today() - timedelta(days=6 - offset)
        db.add(
            DailyMeal(
                school_id=school.id,
                date=meal_date,
                total_students_present=attendance,
                rice_consumed=round(attendance * 0.12, 2),
                wheat_consumed=round(attendance * 0.05, 2),
                dal_consumed=round(attendance * 0.04, 2),
            )
        )


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        _seed_government_admin(db)
        school = _seed_school_and_admin(db)
        _seed_students(db, school)
        _seed_inventory(db, school)
        _seed_alerts(db, school)
        _seed_daily_meals(db, school)
        db.commit()
    finally:
        db.close()
