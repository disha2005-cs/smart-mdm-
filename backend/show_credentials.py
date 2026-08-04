from app.database import SessionLocal
from app.models.admin import GovernmentAdmin, SchoolAdmin

db = SessionLocal()

print('=== CREDENTIALS FOR TESTING ===\n')

print('Government Admin:')
gov = db.query(GovernmentAdmin).first()
print(f'  Employee ID: {gov.employee_id}')
print(f'  Name: {gov.first_name} {gov.last_name}')
print(f'  Email: {gov.email}')
print(f'  Active: {gov.is_active}')
print(f'  Password: password123 (default)')

print('\nSchool Admins:')
admins = db.query(SchoolAdmin).all()
for a in admins:
    print(f'  {a.employee_id} - {a.first_name} {a.last_name} (School ID: {a.school_id}, Active: {a.is_active})')
    print(f'    Password: password123 (default)')

print('\n=== ROLE-BASED ACCESS ===')
print('Government Admin can access:')
print('  - Dashboard, School Management, Food Allocation, Budget Allocation')
print('  - Inventory Monitoring, Reports & Analytics, Notifications')
print('  - Users & Roles, Settings')

print('\nSchool Admin can access:')
print('  - Dashboard, Student Management, Face Registration, Attendance')
print('  - Meal Management, Inventory Management, Reports & Analytics')
print('  - Notifications, Settings')

db.close()
