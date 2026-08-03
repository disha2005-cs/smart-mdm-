from app.database import SessionLocal
from app.models.admin import GovernmentAdmin
from app.core.security import get_password_hash

def seed_db():
    db = SessionLocal()
    
    # Check if admin exists
    admin = db.query(GovernmentAdmin).filter(GovernmentAdmin.employee_id == "GOV-001").first()
    
    if not admin:
        print("Creating Government Admin GOV-001...")
        new_admin = GovernmentAdmin(
            employee_id="GOV-001",
            first_name="Super",
            last_name="Admin",
            email="admin@pmposhan.gov.in",
            password_hash=get_password_hash("password123"),
            designation="Director",
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        print("Admin created successfully! Use Employee ID: GOV-001, Password: password123")
    else:
        print("Admin already exists! Use Employee ID: GOV-001, Password: password123")
        
    db.close()

if __name__ == "__main__":
    seed_db()
