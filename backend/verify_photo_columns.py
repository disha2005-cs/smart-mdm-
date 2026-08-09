"""
Verify that photo_data and photo_mime_type columns exist in students table
If not, create an Alembic migration to add them
"""
import sys
from sqlalchemy import inspect, text
from app.database import engine

def verify_photo_columns():
    """Check if photo storage columns exist in database"""
    inspector = inspect(engine)
    
    # Get students table columns
    columns = inspector.get_columns('students')
    column_names = [col['name'] for col in columns]
    
    print("=== STUDENTS TABLE COLUMNS ===")
    for col in columns:
        print(f"  - {col['name']}: {col['type']}")
    
    # Check for photo columns
    has_photo_data = 'photo_data' in column_names
    has_photo_mime_type = 'photo_mime_type' in column_names
    
    print("\n=== PHOTO STORAGE COLUMNS ===")
    print(f"  photo_data (LargeBinary): {'✓ EXISTS' if has_photo_data else '✗ MISSING'}")
    print(f"  photo_mime_type (String): {'✓ EXISTS' if has_photo_mime_type else '✗ MISSING'}")
    
    if not has_photo_data or not has_photo_mime_type:
        print("\n⚠️  MISSING COLUMNS DETECTED!")
        print("Run: alembic revision --autogenerate -m 'add_photo_storage_columns'")
        print("Then: alembic upgrade head")
        return False
    
    print("\n✅ All photo storage columns exist!")
    
    # Check if any students have photos
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM students WHERE photo_data IS NOT NULL"))
        photo_count = result.scalar()
        
        result = conn.execute(text("SELECT COUNT(*) FROM students"))
        total_count = result.scalar()
        
        print(f"\n=== PHOTO DATA STATISTICS ===")
        print(f"  Total students: {total_count}")
        print(f"  Students with photos: {photo_count}")
        print(f"  Students without photos: {total_count - photo_count}")
    
    return True

if __name__ == "__main__":
    try:
        success = verify_photo_columns()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        sys.exit(1)
