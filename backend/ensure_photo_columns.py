"""
Ensure photo_data and photo_mime_type columns exist in students table
This script can be safely run on AWS to add missing columns if needed
"""
from sqlalchemy import text
from app.database import engine

def ensure_photo_columns():
    """Add photo columns if they don't exist"""
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Check if photo_data column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'students' 
                AND column_name = 'photo_data'
            """))
            
            if not result.fetchone():
                print("Adding photo_data column...")
                conn.execute(text("""
                    ALTER TABLE students 
                    ADD COLUMN photo_data BYTEA
                """))
                print("✓ photo_data column added")
            else:
                print("✓ photo_data column already exists")
            
            # Check if photo_mime_type column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'students' 
                AND column_name = 'photo_mime_type'
            """))
            
            if not result.fetchone():
                print("Adding photo_mime_type column...")
                conn.execute(text("""
                    ALTER TABLE students 
                    ADD COLUMN photo_mime_type VARCHAR
                """))
                print("✓ photo_mime_type column added")
            else:
                print("✓ photo_mime_type column already exists")
            
            # Commit transaction
            trans.commit()
            print("\n✅ All photo storage columns are ready!")
            return True
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Error: {e}")
            return False

if __name__ == "__main__":
    import sys
    success = ensure_photo_columns()
    sys.exit(0 if success else 1)
