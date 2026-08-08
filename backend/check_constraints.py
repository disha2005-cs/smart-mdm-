"""
Check the actual foreign key constraints in the database
"""
import psycopg2
from app.core.config import settings

def check_constraints():
    """Check foreign key constraints"""
    
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    
    try:
        print("🔍 Checking foreign key constraints...\n")
        
        # Get all foreign key constraints
        cur.execute("""
            SELECT
                tc.table_name, 
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                tc.constraint_name,
                rc.delete_rule
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            JOIN information_schema.referential_constraints AS rc
                ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            ORDER BY tc.table_name, kcu.column_name;
        """)
        
        constraints = cur.fetchall()
        
        for table, column, ref_table, ref_column, constraint_name, delete_rule in constraints:
            icon = "✅" if delete_rule == "CASCADE" else "❌"
            print(f"{icon} {table}.{column} → {ref_table}.{ref_column}")
            print(f"   Constraint: {constraint_name}")
            print(f"   Delete Rule: {delete_rule}")
            print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    check_constraints()
