"""
Clean all data from database - USE WITH CAUTION!
This will delete ALL schools, students, attendance, etc.
Only the Government Admin user will remain.
"""
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.school import School
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.inventory import Inventory
from app.models.daily_meal import DailyMeal
from app.models.alert import Alert
from app.models.face_encoding import FaceEncoding

def clean_database():
    """Remove all data except Government Admin users"""
    db = SessionLocal()
    
    try:
        print("⚠️  WARNING: This will delete ALL data except Government Admin users!")
        print("This includes:")
        print("  - All schools")
        print("  - All school administrators")
        print("  - All students and their photos")
        print("  - All attendance records")
        print("  - All inventory data")
        print("  - All meal records")
        print("  - All alerts")
        print("")
        
        confirm = input("Type 'DELETE ALL DATA' to confirm: ")
        
        if confirm != "DELETE ALL DATA":
            print("❌ Aborted. No data was deleted.")
            return
        
        print("\n🗑️  Cleaning database...")
        
        # Delete in correct order (child tables first)
        print("Deleting attendance records...")
        db.query(Attendance).delete()
        
        print("Deleting face encodings...")
        db.query(FaceEncoding).delete()
        
        print("Deleting students...")
        db.query(Student).delete()
        
        print("Deleting inventory...")
        db.query(Inventory).delete()
        
        print("Deleting daily meals...")
        db.query(DailyMeal).delete()
        
        print("Deleting alerts...")
        db.query(Alert).delete()
        
        print("Deleting school administrators...")
        db.query(User).filter(User.role == UserRole.SCHOOL).delete()
        
        print("Deleting schools...")
        db.query(School).delete()
        
        db.commit()
        
        print("\n✅ Database cleaned successfully!")
        print("\nRemaining data:")
        gov_admins = db.query(User).filter(User.role == UserRole.GOVERNMENT).count()
        print(f"  - Government Admins: {gov_admins}")
        
        print("\nThe system is now clean and ready for production use.")
        print("Login with your Government Admin account to start adding real data.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
