"""
Script to add CASCADE deletes to all foreign keys
"""
import psycopg2
from app.core.config import settings

def add_cascade_deletes():
    """Add CASCADE DELETE to all foreign key constraints"""
    
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    
    try:
        print("🔄 Adding CASCADE deletes to foreign keys...")
        
        # List of foreign key constraints to update
        constraints = [
            ('users', 'users_school_id_fkey', 'school_id', 'schools', 'id'),
            ('students', 'students_school_id_fkey', 'school_id', 'schools', 'id'),
            ('attendances', 'attendances_school_id_fkey', 'school_id', 'schools', 'id'),
            ('attendances', 'attendances_student_id_fkey', 'student_id', 'students', 'id'),
            ('alerts', 'alerts_school_id_fkey', 'school_id', 'schools', 'id'),
            ('inventory', 'inventory_school_id_fkey', 'school_id', 'schools', 'id'),
            ('daily_meals', 'daily_meals_school_id_fkey', 'school_id', 'schools', 'id'),
            ('face_encodings', 'face_encodings_student_id_fkey', 'student_id', 'students', 'id'),
        ]
        
        for table, constraint, column, ref_table, ref_column in constraints:
            try:
                # Drop existing foreign key
                print(f"  Dropping {constraint}...")
                cur.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint}")
                
                # Add new foreign key with CASCADE
                print(f"  Adding {constraint} with CASCADE...")
                cur.execute(f"""
                    ALTER TABLE {table} 
                    ADD CONSTRAINT {constraint} 
                    FOREIGN KEY ({column}) 
                    REFERENCES {ref_table}({ref_column}) 
                    ON DELETE CASCADE
                """)
                print(f"  ✓ {constraint} updated")
            except Exception as e:
                print(f"  ✗ Error updating {constraint}: {e}")
        
        conn.commit()
        print("\n✅ All foreign keys updated with CASCADE deletes!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_cascade_deletes()
