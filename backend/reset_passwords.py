"""
Quick script to update all admin passwords with faster bcrypt hashing.
Run this to fix slow login: python reset_passwords.py
"""
from app.database import SessionLocal
from app.models.admin import GovernmentAdmin, SchoolAdmin
from app.core.security import get_password_hash

def reset_all_passwords():
    db = SessionLocal()
    try:
        # Update government admin
        gov_admin = db.query(GovernmentAdmin).filter(GovernmentAdmin.employee_id == "GOV-001").first()
        if gov_admin:
            gov_admin.password_hash = get_password_hash("password123")
            print(f"✅ Updated GOV-001 password")
        
        # Update school admins
        for i in range(1, 6):
            emp_id = f"SCH-{i:03d}"
            school_admin = db.query(SchoolAdmin).filter(SchoolAdmin.employee_id == emp_id).first()
            if school_admin:
                school_admin.password_hash = get_password_hash("password123")
                print(f"✅ Updated {emp_id} password")
        
        db.commit()
        print("\n🎉 All passwords updated successfully!")
        print("Login should now be much faster!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔐 Resetting all admin passwords with faster bcrypt...")
    reset_all_passwords()
