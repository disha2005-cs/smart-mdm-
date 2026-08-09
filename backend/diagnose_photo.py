"""
Diagnose photo storage issues - check if photos exist in database
"""
from sqlalchemy import text
from app.database import engine, SessionLocal
from app.models.student import Student

def diagnose_photos():
    """Check photo storage status"""
    db = SessionLocal()
    
    try:
        print("=== PHOTO STORAGE DIAGNOSTICS ===\n")
        
        # Get all students
        students = db.query(Student).all()
        
        if not students:
            print("❌ No students found in database!")
            return
        
        print(f"Total Students: {len(students)}\n")
        
        for student in students:
            print(f"Student: {student.first_name} {student.last_name} (ID: {student.id})")
            print(f"  Student ID: {student.student_id}")
            
            # Check photo_data
            has_photo_data = student.photo_data is not None
            photo_size = len(student.photo_data) if has_photo_data else 0
            
            print(f"  photo_data: {'✓ EXISTS' if has_photo_data else '✗ NULL'}")
            if has_photo_data:
                print(f"  photo_size: {photo_size:,} bytes ({photo_size/1024:.2f} KB)")
                print(f"  photo_mime_type: {student.photo_mime_type}")
            
            # Check photo_path (old method)
            has_photo_path = student.photo_path is not None
            print(f"  photo_path: {'✓ ' + student.photo_path if has_photo_path else '✗ NULL'}")
            
            # Check has_photo logic
            has_photo = bool(student.photo_data or student.photo_path)
            print(f"  has_photo result: {has_photo}")
            print()
        
        # Check face encodings
        print("\n=== FACE ENCODINGS ===")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM face_encodings"))
            encoding_count = result.scalar()
            print(f"Total face encodings: {encoding_count}")
            
            if encoding_count > 0:
                result = conn.execute(text("""
                    SELECT fe.student_id, s.first_name, s.last_name
                    FROM face_encodings fe
                    JOIN students s ON fe.student_id = s.id
                """))
                print("\nStudents with encodings:")
                for row in result:
                    print(f"  - {row[1]} {row[2]} (ID: {row[0]})")
        
    finally:
        db.close()

if __name__ == "__main__":
    diagnose_photos()
