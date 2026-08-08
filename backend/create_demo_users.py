"""
Create demo users for testing
"""
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.school import School
from app.core.security import get_password_hash
from loguru import logger

def create_demo_users():
    db = SessionLocal()
    
    try:
        # 1. Create Government Admin
        gov_admin = db.query(User).filter(User.employee_id == "GOV-001").first()
        
        if not gov_admin:
            logger.info("Creating Government Admin...")
            gov_admin = User(
                employee_id="GOV-001",
                email="gov@admin.com",
                password_hash=get_password_hash("password123"),
                first_name="Government",
                last_name="Admin",
                phone="1234567890",
                role=UserRole.GOVERNMENT,
                designation="State Director",
                is_active=True
            )
            db.add(gov_admin)
            db.commit()
            logger.success("✓ Government Admin created: GOV-001 / password123")
        else:
            logger.info("✓ Government Admin already exists: GOV-001 / password123")
        
        # 2. Create Demo School
        school = db.query(School).filter(School.udise_code == "12345678").first()
        
        if not school:
            logger.info("Creating Demo School...")
            school = School(
                udise_code="12345678",
                school_name="Demo Primary School",
                district="Test District",
                taluk="Test Taluk",
                village="Test Village",
                address="123 Test Street",
                pin_code="560001",
                principal_name="Principal Name",
                principal_phone="9876543210",
                email="school@demo.com",
                phone="0801234567",
                status="Active",
                is_active=True
            )
            db.add(school)
            db.commit()
            db.refresh(school)
            logger.success(f"✓ Demo School created: {school.school_name} (ID: {school.id})")
        else:
            logger.info(f"✓ Demo School already exists: {school.school_name} (ID: {school.id})")
        
        # 3. Create School Admin
        school_admin = db.query(User).filter(User.employee_id == "SCH-001").first()
        
        if not school_admin:
            logger.info("Creating School Admin...")
            school_admin = User(
                employee_id="SCH-001",
                email="school@admin.com",
                password_hash=get_password_hash("password123"),
                first_name="School",
                last_name="Admin",
                phone="9876543210",
                role=UserRole.SCHOOL,
                school_id=school.id,
                designation="School Coordinator",
                is_active=True
            )
            db.add(school_admin)
            db.commit()
            logger.success("✓ School Admin created: SCH-001 / password123")
        else:
            logger.info("✓ School Admin already exists: SCH-001 / password123")
        
        # Summary
        print("\n" + "="*60)
        print("DEMO USERS CREATED SUCCESSFULLY")
        print("="*60)
        print("\nGovernment Admin:")
        print("  Employee ID: GOV-001")
        print("  Password: password123")
        print("  Email: gov@admin.com")
        print("\nSchool Admin:")
        print("  Employee ID: SCH-001")
        print("  Password: password123")
        print("  Email: school@admin.com")
        print(f"  School: {school.school_name}")
        print("="*60 + "\n")
        
    except Exception as e:
        logger.error(f"Error creating demo users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_demo_users()
