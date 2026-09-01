"""
Check what data exists in the database
"""
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.school import School
from app.models.student import Student

db = SessionLocal()

print("📊 DATABASE CONTENTS:")
print("=" * 50)

# Count users
gov_admins = db.query(User).filter(User.role == UserRole.GOVERNMENT).count()
school_admins = db.query(User).filter(User.role == UserRole.SCHOOL).count()

print(f"\n👥 USERS:")
print(f"  - Government Admins: {gov_admins}")
print(f"  - School Admins: {school_admins}")

# List schools
schools = db.query(School).all()
print(f"\n🏫 SCHOOLS ({len(schools)} total):")
for school in schools:
    student_count = db.query(Student).filter(Student.school_id == school.id).count()
    print(f"  - {school.school_name}")
    print(f"    UDISE: {school.udise_code}")
    print(f"    Students: {student_count}")
    print(f"    District: {school.district}")
    print()

# List students
students = db.query(Student).limit(5).all()
print(f"\n👨‍🎓 STUDENTS (showing first 5):")
for student in students:
    print(f"  - {student.first_name} {student.last_name} (ID: {student.student_id}, Grade: {student.grade})")

total_students = db.query(Student).count()
print(f"\nTotal Students: {total_students}")

db.close()

print("\n" + "=" * 50)
print("✅ This is your current data")
print("If these look like fake/test data, they were created BEFORE the code cleanup.")
