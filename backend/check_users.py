from app.database import SessionLocal
from app.models.admin import GovernmentAdmin

def list_users():
    session = SessionLocal()
    admins = session.query(GovernmentAdmin).all()
    print("--- Registered Admins ---")
    for admin in admins:
        print(f"Email: {admin.email}")
        print(f"Employee ID: {admin.employee_id}")
    print("-------------------------")
    session.close()

if __name__ == "__main__":
    list_users()
