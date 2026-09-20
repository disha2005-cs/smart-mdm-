"""
Bootstrap the system with its first Government Administrator.

Safe to run repeatedly: it does nothing when a government admin already
exists. Docker Compose runs this automatically on first boot; run it by hand
with ``python seed.py``.

The credentials come from the environment so a deployment never has to ship
with the documented default:

    SEED_ADMIN_EMPLOYEE_ID   (default: GOV-001)
    SEED_ADMIN_EMAIL         (default: admin@pmposhan.gov.in)
    SEED_ADMIN_PASSWORD      (default: admin123)
"""
import os
import sys

from app.core.security import get_password_hash
from app.database import SessionLocal
from app.models.user import User, UserRole

DEFAULT_PASSWORD = "admin123"


def seed_initial_admin() -> int:
    """Create the initial Government Admin. Returns a process exit code."""
    employee_id = os.getenv("SEED_ADMIN_EMPLOYEE_ID", "GOV-001").strip()
    email = os.getenv("SEED_ADMIN_EMAIL", "admin@pmposhan.gov.in").strip().lower()
    password = os.getenv("SEED_ADMIN_PASSWORD", DEFAULT_PASSWORD)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.role == UserRole.GOVERNMENT).first()
        if existing:
            print(f"Government Admin already exists: {existing.employee_id}")
            print("Nothing to do. Use the app's Settings page to change a password.")
            return 0

        # An employee ID or email may already belong to a school admin.
        clash = db.query(User).filter(
            (User.employee_id == employee_id) | (User.email == email)
        ).first()
        if clash:
            print(f"ERROR: {clash.employee_id} / {clash.email} already exists.")
            print("Set SEED_ADMIN_EMPLOYEE_ID and SEED_ADMIN_EMAIL to something else.")
            return 1

        db.add(User(
            employee_id=employee_id,
            first_name="Government",
            last_name="Administrator",
            email=email,
            phone=None,
            role=UserRole.GOVERNMENT,
            designation="Director",
            password_hash=get_password_hash(password),
            is_active=True,
        ))
        db.commit()

        print("Government Admin created.")
        print("")
        print("  Employee ID: " + employee_id)
        print("  Email:       " + email)
        if password == DEFAULT_PASSWORD:
            print("  Password:    " + password)
            print("")
            print("WARNING: this is the documented default password.")
            print("Change it from Settings after your first login.")
        else:
            print("  Password:    (taken from SEED_ADMIN_PASSWORD)")
        return 0

    except Exception as exc:  # noqa: BLE001
        db.rollback()
        print(f"ERROR: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    print("Initialising Smart Mid-Day Meal Management System...")
    sys.exit(seed_initial_admin())
