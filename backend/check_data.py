from app.database import SessionLocal
from app.models.admin import GovernmentAdmin, SchoolAdmin
from app.models.school import School
from app.models.student import Student

db = SessionLocal()

print('=== Database Status ===')
print(f'Government Admins: {db.query(GovernmentAdmin).count()}')
print(f'School Admins: {db.query(SchoolAdmin).count()}')
print(f'Schools: {db.query(School).count()}')
print(f'Students: {db.query(Student).count()}')

print('\n=== Sample Data ===')
gov = db.query(GovernmentAdmin).first()
if gov:
    print(f'Gov Admin: {gov.employee_id} - {gov.first_name} {gov.last_name}')

schools = db.query(School).limit(3).all()
for school in schools:
    print(f'School: ID={school.id}, UDISE={school.udise_code}, Name={school.school_name}')

sch_admin = db.query(SchoolAdmin).first()
if sch_admin:
    print(f'School Admin: {sch_admin.employee_id} (School ID: {sch_admin.school_id})')

students = db.query(Student).limit(3).all()
for student in students:
    print(f'Student: ID={student.id}, StudentID={student.student_id}, Name={student.first_name} {student.last_name}, School={student.school_id}')

db.close()
