from app.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def seed_initial_admin():
    """
    Creates only the initial Government Admin user.
    Run this once to bootstrap the system.
    """
    db = SessionLocal()
    
    try:
        # Check if any admin exists
        admin_exists = db.query(User).filter(User.role == UserRole.GOVERNMENT).first()
        
        if not admin_exists:
            print("Creating Government Admin...")
            new_admin = User(
                employee_id="GOV-001",
                first_name="Government",
                last_name="Administrator",
                email="admin@pmposhan.gov.in",
                phone="9876543210",
                role=UserRole.GOVERNMENT,
                designation="Director",
                password_hash=get_password_hash("admin123"),
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print("✅ Government Admin created successfully!")
            print("\nLogin credentials:")
            print("  Employee ID: GOV-001")
            print("  Password: admin123")
            print("\nIMPORTANT: Change this password after first login!")
        else:
            print("✅ Admin already exists!")
            print("If you forgot the password, delete the user and run this script again.")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🌱 Initializing Smart Mid-Day Meal System...")
    print("This will create ONLY the initial Government Admin user.")
    print("")
    seed_initial_admin()
    print("\n✅ Initialization complete!")
    print("\nNext steps:")
    print("1. Login as Government Admin (GOV-001 / admin123)")
    print("2. Add schools through the UI")
    print("3. Add school administrators")
    print("4. School admins can add students and mark attendance")
