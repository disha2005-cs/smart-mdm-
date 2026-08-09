from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.school import School
from app.core.security import get_password_hash

def seed_db():
    db = SessionLocal()
    
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.employee_id == "GOV-001").first()
        
        if not admin:
            print("Creating Government Admin GOV-001...")
            new_admin = User(
                employee_id="GOV-001",
                first_name="Government",
                last_name="Administrator",
                email="admin@pmposhan.gov.in",
                phone="9876543210",
                role=UserRole.GOVERNMENT,
                designation="Director",
                password_hash=get_password_hash("password123"),
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print("✅ Admin created successfully! Use Employee ID: GOV-001, Password: password123")
        else:
            print("✅ Admin already exists! Use Employee ID: GOV-001, Password: password123")
        
        # Create sample school if doesn't exist
        school = db.query(School).filter(School.udise_code == "12345678901").first()
        if not school:
            print("Creating sample school...")
            school = School(
                udise_code="12345678901",
                school_name="Government Primary School",
                district="Bangalore Urban",
                taluk="Bangalore North",
                village="Yelahanka",
                status="ACTIVE"
            )
            db.add(school)
            db.commit()
            db.refresh(school)
            print(f"✅ School created: {school.school_name}")
            
            # Create school admin
            school_admin = User(
                employee_id="SCH-001",
                first_name="School",
                last_name="Principal",
                email="principal@school.edu.in",
                phone="9876543211",
                role=UserRole.SCHOOL,
                school_id=school.id,
                designation="Principal",
                password_hash=get_password_hash("password123"),
                is_active=True
            )
            db.add(school_admin)
            db.commit()
            print("✅ School admin created: SCH-001 / password123")
            
    finally:
        db.close()

if __name__ == "__main__":
    print("🌱 Seeding database...")
    seed_db()
    print("\n✅ Seeding complete!")
    print("\nLogin credentials:")
    print("  Government Admin: GOV-001 / password123")
    print("  School Admin: SCH-001 / password123")
