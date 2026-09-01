"""
Clean only meal and inventory dummy data while preserving schools, students, and users.
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db, engine
from app.models.daily_meal import DailyMeal
from app.models.inventory import Inventory
from app.models.attendance import Attendance

def clean_meal_inventory_data():
    """Delete only meal records, inventory, and attendance. Keep schools, students, and users."""
    
    print("\n" + "="*60)
    print("🧹 CLEANING MEAL & INVENTORY DATA")
    print("="*60)
    
    db = next(get_db())
    
    try:
        # Count before deletion
        meal_count = db.query(DailyMeal).count()
        inventory_count = db.query(Inventory).count()
        attendance_count = db.query(Attendance).count()
        
        print(f"\n📊 Current Data:")
        print(f"  - Daily Meal Records: {meal_count}")
        print(f"  - Inventory Items: {inventory_count}")
        print(f"  - Attendance Records: {attendance_count}")
        
        if meal_count == 0 and inventory_count == 0 and attendance_count == 0:
            print("\n✅ Database is already clean! No meal/inventory data to delete.")
            return
        
        print(f"\n⚠️  This will DELETE:")
        print(f"  ❌ {meal_count} meal records")
        print(f"  ❌ {inventory_count} inventory items")
        print(f"  ❌ {attendance_count} attendance records")
        print(f"\n✅ This will KEEP:")
        print(f"  ✓ All schools")
        print(f"  ✓ All students")
        print(f"  ✓ All users (admins)")
        print(f"  ✓ All face encodings")
        
        confirmation = input("\n⚠️  Type 'YES' to proceed with cleanup: ")
        
        if confirmation != 'YES':
            print("\n❌ Cleanup cancelled.")
            return
        
        # Delete data
        print("\n🗑️  Deleting data...")
        
        # Delete daily meals
        deleted_meals = db.query(DailyMeal).delete()
        print(f"  ✓ Deleted {deleted_meals} meal records")
        
        # Delete inventory
        deleted_inventory = db.query(Inventory).delete()
        print(f"  ✓ Deleted {deleted_inventory} inventory items")
        
        # Delete attendance
        deleted_attendance = db.query(Attendance).delete()
        print(f"  ✓ Deleted {deleted_attendance} attendance records")
        
        # Commit changes
        db.commit()
        
        print("\n" + "="*60)
        print("✅ CLEANUP COMPLETE!")
        print("="*60)
        print("\nYour schools, students, and admin users are preserved.")
        print("You can now add fresh meal and inventory data.\n")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error during cleanup: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    clean_meal_inventory_data()
