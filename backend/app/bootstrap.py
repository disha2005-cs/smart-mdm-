from datetime import date, timedelta, time as datetime_time
import random

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.database import SessionLocal
from app.models.admin import GovernmentAdmin, SchoolAdmin
from app.models.alert import Alert
from app.models.attendance import Attendance
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
        ("LOW_STOCK", "HIGH", "Dal stock is approaching the reorder threshold.", "UNREAD"),
        ("INSPECTION", "MEDIUM", "District inspection scheduled for Friday at 11:00 AM.", "UNREAD"),
        ("HEALTH", "LOW", "Two students have allergy-sensitive meal notes.", "READ"),
    ]

    for alert_type, severity, message, status in alerts:
        db.add(
            Alert(
                school_id=school.id,
                alert_type=alert_type,
                severity=severity,
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


def _seed_attendance_records(db: Session, school: School, students: list) -> None:
    """Seed attendance records for past 7 days with 90-95% attendance rate."""
    if db.query(Attendance).filter(Attendance.school_id == school.id).count() > 0:
        return
    
    for day_offset in range(7):
        attendance_date = date.today() - timedelta(days=day_offset)
        
        # 90-95% attendance rate
        num_present = int(len(students) * random.uniform(0.90, 0.95))
        present_students = random.sample(students, k=num_present)
        
        for student in present_students:
            # Random time between 8:00 AM and 10:00 AM
            hour = random.randint(8, 9)
            minute = random.randint(0, 59)
            attendance_time = datetime_time(hour, minute)
            
            db.add(Attendance(
                student_id=student.id,
                school_id=school.id,
                date=attendance_date,
                time=attendance_time,
                status="PRESENT",
                marked_by=None,
                photo_url=None,
                confidence_score=round(random.uniform(92.0, 98.5), 2)
            ))


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        _seed_government_admin(db)
        
        # Seed multiple schools
        schools_data = [
            ("29200100101", "Greenwood Government High School", "Mysuru", "Mysuru", "Jayalakshmipuram", "12 Temple Road", "570012", "Meena Rao", "+91 90000 00002", 12.3142, 76.6133, "SCH-001", "Anita", "Sharma"),
            ("29200100102", "St. Joseph Government School", "Bangalore Urban", "Bangalore North", "Hebbal", "45 Church Street", "560024", "Robert D'Souza", "+91 90000 00004", 13.0358, 77.5970, "SCH-002", "Priya", "Kumar"),
            ("29200100103", "Mahatma Gandhi Primary School", "Bangalore Urban", "Bangalore South", "Jayanagar", "23 Main Road", "560041", "Lakshmi Reddy", "+91 90000 00006", 12.9250, 77.5937, "SCH-003", "Suresh", "Patel"),
            ("29200100104", "Sarvodaya High School", "Mandya", "Mandya", "KR Pete", "89 School Lane", "571426", "Gangadhar Gowda", "+91 90000 00008", 12.6759, 76.5881, "SCH-004", "Kavita", "Rao"),
            ("29200100105", "Vidya Niketan School", "Hassan", "Hassan", "Holenarasipura", "56 Education Street", "573211", "Manjunath K", "+91 90000 00010", 13.2257, 76.1040, "SCH-005", "Deepak", "Singh"),
        ]
        
        for idx, (udise, name, district, taluk, village, address, pin, principal_name, principal_phone, lat, lng, emp_id, fname, lname) in enumerate(schools_data):
            school = db.query(School).filter(School.udise_code == udise).first()
            if not school:
                school = School(
                    udise_code=udise,
                    school_name=name,
                    district=district,
                    taluk=taluk,
                    village=village,
                    address=address,
                    pin_code=pin,
                    principal_name=principal_name,
                    principal_phone=principal_phone,
                    email=f"{emp_id.lower()}@pmposhan.gov.in",
                    phone=f"+91 82100 000{idx:02d}",
                    latitude=lat,
                    longitude=lng,
                    status="Active",
                )
                db.add(school)
                db.flush()

            # Create school admin
            school_admin = db.query(SchoolAdmin).filter(SchoolAdmin.employee_id == emp_id).first()
            if not school_admin:
                db.add(
                    SchoolAdmin(
                        school_id=school.id,
                        employee_id=emp_id,
                        first_name=fname,
                        last_name=lname,
                        email=f"{emp_id.lower()}@pmposhan.gov.in",
                        phone=f"+91 90000 00{(idx*2)+3:03d}",
                        password_hash=get_password_hash("password123"),
                        is_active=True,
                    )
                )
            
            # Seed students (30-50 per school)
            num_students = random.randint(30, 50)
            students = _seed_students_for_school(db, school, num_students)
            
            # Seed attendance
            _seed_attendance_records(db, school, students)
            
            # Seed inventory with varying levels
            _seed_inventory_for_school(db, school, idx)
            
            # Seed alerts
            _seed_alerts(db, school)
            
            # Seed daily meals
            _seed_daily_meals(db, school)
        
        db.commit()
    finally:
        db.close()


def _seed_students_for_school(db: Session, school: School, count: int) -> list:
    """Seed variable number of students for a school."""
    if db.query(Student).filter(Student.school_id == school.id).count() > 0:
        return db.query(Student).filter(Student.school_id == school.id).all()
    
    first_names_male = ["Rohan", "Vikram", "Imran", "Karthik", "Aditya", "Arjun", "Dev", "Akash", "Ravi", "Suresh"]
    first_names_female = ["Asha", "Sneha", "Pooja", "Nandini", "Priya", "Divya", "Ananya", "Kavya", "Meera", "Lakshmi"]
    last_names = ["Kumar", "Nair", "Patil", "Rao", "Pasha", "Das", "Gowda", "Singh", "Reddy", "Sharma"]
    
    students = []
    for index in range(1, count + 1):
        gender = random.choice(["Male", "Female"])
        first_name = random.choice(first_names_male if gender == "Male" else first_names_female)
        last_name = random.choice(last_names)
        
        # Random age 6-16 years
        birth_year = 2024 - random.randint(6, 16)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)
        
        student = Student(
            student_id=f"STU-{school.id:02d}{index:03d}",
            school_id=school.id,
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date(birth_year, birth_month, birth_day),
            gender=gender,
            grade=str(random.randint(1, 10)),
            section=random.choice(["A", "B", "C"]),
            parent_name=f"{random.choice(last_names)} {random.choice(['Father', 'Mother'])}",
            parent_phone=f"+91 99000 {random.randint(10000, 99999)}",
            has_allergies=random.random() < 0.1,  # 10% have allergies
            dietary_preferences=random.choice(["Standard", "High protein", "Vegetarian"]),
            is_active=True,
        )
        db.add(student)
        students.append(student)
    
    db.flush()
    return students


def _seed_inventory_for_school(db: Session, school: School, school_index: int) -> None:
    """Seed inventory with varying stock levels."""
    if db.query(Inventory).filter(Inventory.school_id == school.id).count() > 0:
        return

    # Vary stock levels - some schools have critical stock, others healthy
    stock_multiplier = [0.5, 0.8, 1.2, 0.6, 1.5][school_index % 5]
    
    items = [
        ("Rice", 620.0 * stock_multiplier, "kg", 180.0),
        ("Wheat", 210.0 * stock_multiplier, "kg", 90.0),
        ("Dal", 155.0 * stock_multiplier, "kg", 75.0),
        ("Oil", 58.0 * stock_multiplier, "litres", 20.0),
        ("Vegetables", 84.0 * stock_multiplier, "kg", 30.0),
        ("Salt", 25.0 * stock_multiplier, "kg", 10.0),
        ("Spices", 15.0 * stock_multiplier, "kg", 5.0),
    ]

    for item_name, quantity, unit, threshold in items:
        db.add(
            Inventory(
                school_id=school.id,
                item_name=item_name,
                quantity=round(quantity, 2),
                unit=unit,
                threshold=threshold,
            )
        )
