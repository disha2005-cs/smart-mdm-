"""
Check if an email exists in the database
"""
import psycopg2
from app.core.config import settings
import sys

def check_email(email):
    """Check if email exists and show details"""
    
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    
    try:
        print(f"\n🔍 Checking email: {email}")
        
        # Find user with this email
        cur.execute("""
            SELECT u.id, u.employee_id, u.email, u.first_name, u.last_name, 
                   u.role, u.school_id, u.is_active, s.school_name
            FROM users u
            LEFT JOIN schools s ON u.school_id = s.id
            WHERE u.email = %s
        """, (email,))
        
        user = cur.fetchone()
        
        if not user:
            print(f"✅ Email '{email}' is NOT in database - FREE TO USE!")
        else:
            user_id, emp_id, email, first, last, role, school_id, is_active, school_name = user
            print(f"\n⚠️  Email '{email}' EXISTS in database:")
            print(f"   User ID: {user_id}")
            print(f"   Employee ID: {emp_id}")
            print(f"   Name: {first} {last}")
            print(f"   Role: {role}")
            print(f"   School ID: {school_id}")
            print(f"   School Name: {school_name if school_name else '(School deleted/not found)'}")
            print(f"   Is Active: {is_active}")
            
            if school_id and not school_name:
                print(f"\n🗑️  This is an ORPHANED USER (school {school_id} doesn't exist)")
                print(f"   Run: python cleanup_orphaned_users.py")
            
            # Show option to delete
            print(f"\n💡 To delete this user, run:")
            print(f"   DELETE FROM users WHERE id = {user_id};")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "disha@gmail.com"
    check_email(email)
