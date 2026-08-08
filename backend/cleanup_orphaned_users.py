"""
Script to clean up orphaned users whose schools were deleted
"""
import psycopg2
from app.core.config import settings

def cleanup_orphaned_users():
    """Remove users whose school_id references a deleted school OR is NULL for SCHOOL role users"""
    
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    
    try:
        print("🔍 Checking for orphaned users...")
        
        # Find users with school_id that doesn't exist in schools table OR is NULL for SCHOOL role
        cur.execute("""
            SELECT u.id, u.employee_id, u.email, u.school_id
            FROM users u
            WHERE u.role = 'SCHOOL'
            AND (
                u.school_id IS NULL
                OR NOT EXISTS (
                    SELECT 1 FROM schools s WHERE s.id = u.school_id
                )
            )
        """)
        
        orphaned_users = cur.fetchall()
        
        if not orphaned_users:
            print("✅ No orphaned users found. Database is clean!")
            return
        
        print(f"\n⚠️  Found {len(orphaned_users)} orphaned user(s):")
        for user_id, employee_id, email, school_id in orphaned_users:
            school_status = "NULL (no school)" if school_id is None else f"School ID: {school_id} (doesn't exist)"
            print(f"   - {employee_id} ({email}) - {school_status}")
        
        # Delete orphaned users
        print(f"\n🗑️  Deleting {len(orphaned_users)} orphaned user(s)...")
        cur.execute("""
            DELETE FROM users
            WHERE role = 'SCHOOL'
            AND (
                school_id IS NULL
                OR NOT EXISTS (
                    SELECT 1 FROM schools s WHERE s.id = users.school_id
                )
            )
        """)
        
        deleted_count = cur.rowcount
        conn.commit()
        
        print(f"✅ Successfully deleted {deleted_count} orphaned user(s)!")
        print("\n💡 You can now create new admins with these emails.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    cleanup_orphaned_users()
