"""
Database Verification and Fix Script
Checks database schema, identifies issues, and provides fixes
"""

import sys
from sqlalchemy import create_engine, inspect, text, MetaData
from sqlalchemy.orm import sessionmaker
from loguru import logger
from app.core.config import settings
from app.database import Base
from app.models import student, attendance, face_encoding, school, admin, alert, user

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}✗ {msg}{RESET}")

def print_warning(msg):
    print(f"{YELLOW}⚠ {msg}{RESET}")

def print_info(msg):
    print(f"{BLUE}ℹ {msg}{RESET}")

def check_database_connection():
    """Test database connection"""
    print_info("Testing database connection...")
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print_success("Database connection successful")
        return engine
    except Exception as e:
        print_error(f"Database connection failed: {e}")
        return None

def check_pgvector_extension(engine):
    """Check if pgvector extension is installed"""
    print_info("Checking pgvector extension...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector'"))
            if result.fetchone():
                print_success("pgvector extension is installed")
                return True
            else:
                print_warning("pgvector extension is NOT installed")
                return False
    except Exception as e:
        print_error(f"Error checking pgvector: {e}")
        return False

def check_table_exists(engine, table_name):
    """Check if a table exists"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def check_all_tables(engine):
    """Check if all required tables exist"""
    print_info("Checking required tables...")
    
    required_tables = [
        'users',
        'schools',
        'students',
        'attendances',
        'face_encodings',
        'alerts',
        'inventory',
        'daily_meals'
    ]
    
    old_tables = ['government_admins', 'school_admins']
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    missing_tables = []
    for table in required_tables:
        if table in existing_tables:
            print_success(f"Table '{table}' exists")
        else:
            print_error(f"Table '{table}' is MISSING")
            missing_tables.append(table)
    
    # Check for old tables that should be migrated
    for old_table in old_tables:
        if old_table in existing_tables:
            print_warning(f"Old table '{old_table}' still exists (should be migrated to 'users')")
    
    return missing_tables

def check_face_encodings_table(engine):
    """Check face_encodings table schema"""
    print_info("Checking face_encodings table schema...")
    
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns('face_encodings')
        
        column_names = [col['name'] for col in columns]
        
        required_columns = ['id', 'student_id', 'encoding', 'registered_at']
        
        for col in required_columns:
            if col in column_names:
                col_info = next(c for c in columns if c['name'] == col)
                if col == 'encoding':
                    # Check if it's a vector type
                    col_type = str(col_info['type'])
                    if 'vector' in col_type.lower() or 'user_defined' in col_type.lower():
                        print_success(f"Column '{col}' exists with correct type (Vector)")
                    else:
                        print_warning(f"Column '{col}' type might be incorrect: {col_type}")
                else:
                    print_success(f"Column '{col}' exists")
            else:
                print_error(f"Column '{col}' is MISSING")
        
        # Check for unique constraint on student_id
        indexes = inspector.get_indexes('face_encodings')
        unique_indexes = inspector.get_unique_constraints('face_encodings')
        
        has_unique = any('student_id' in str(idx) for idx in unique_indexes)
        if has_unique:
            print_success("Unique constraint on 'student_id' exists")
        else:
            print_warning("Unique constraint on 'student_id' might be missing")
        
        return True
    except Exception as e:
        print_error(f"Error checking face_encodings table: {e}")
        return False

def check_students_table(engine):
    """Check students table schema"""
    print_info("Checking students table schema...")
    
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns('students')
        
        column_names = [col['name'] for col in columns]
        
        required_columns = {
            'id': True,
            'student_id': True,
            'school_id': True,
            'first_name': True,
            'last_name': True,
            'date_of_birth': False,
            'gender': False,
            'grade': False,
            'section': False,
            'parent_name': False,
            'parent_phone': False,
            'photo_path': False,
            'is_active': True,
        }
        
        for col, required in required_columns.items():
            if col in column_names:
                col_info = next(c for c in columns if c['name'] == col)
                nullable = col_info['nullable']
                if required and nullable:
                    print_warning(f"Column '{col}' should be NOT NULL but is nullable")
                else:
                    print_success(f"Column '{col}' exists")
            else:
                if required:
                    print_error(f"Required column '{col}' is MISSING")
                else:
                    print_warning(f"Optional column '{col}' is MISSING")
        
        return True
    except Exception as e:
        print_error(f"Error checking students table: {e}")
        return False

def check_attendance_table(engine):
    """Check attendances table schema"""
    print_info("Checking attendances table schema...")
    
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns('attendances')
        
        column_names = [col['name'] for col in columns]
        
        required_columns = {
            'id': True,
            'student_id': True,
            'school_id': True,
            'date': True,
            'time': True,
            'status': True,
            'marked_by': False,
            'photo_url': False,
            'confidence_score': False,
        }
        
        for col, required in required_columns.items():
            if col in column_names:
                print_success(f"Column '{col}' exists")
            else:
                if required:
                    print_error(f"Required column '{col}' is MISSING")
                else:
                    print_warning(f"Optional column '{col}' is MISSING")
        
        # Check for indexes
        indexes = inspector.get_indexes('attendances')
        date_indexed = any('date' in str(idx) for idx in indexes)
        
        if date_indexed:
            print_success("Index on 'date' column exists")
        else:
            print_warning("Index on 'date' column is missing (performance impact)")
        
        return True
    except Exception as e:
        print_error(f"Error checking attendances table: {e}")
        return False

def check_data_integrity(engine):
    """Check data integrity issues"""
    print_info("Checking data integrity...")
    
    try:
        with engine.connect() as conn:
            # Check for orphaned face encodings
            result = conn.execute(text("""
                SELECT COUNT(*) FROM face_encodings fe
                LEFT JOIN students s ON fe.student_id = s.id
                WHERE s.id IS NULL
            """))
            orphaned_encodings = result.scalar()
            
            if orphaned_encodings > 0:
                print_warning(f"Found {orphaned_encodings} orphaned face encoding(s)")
            else:
                print_success("No orphaned face encodings")
            
            # Check for orphaned attendance records
            result = conn.execute(text("""
                SELECT COUNT(*) FROM attendances a
                LEFT JOIN students s ON a.student_id = s.id
                WHERE s.id IS NULL
            """))
            orphaned_attendance = result.scalar()
            
            if orphaned_attendance > 0:
                print_warning(f"Found {orphaned_attendance} orphaned attendance record(s)")
            else:
                print_success("No orphaned attendance records")
            
            # Check for students without schools
            result = conn.execute(text("""
                SELECT COUNT(*) FROM students s
                LEFT JOIN schools sch ON s.school_id = sch.id
                WHERE sch.id IS NULL
            """))
            students_without_schools = result.scalar()
            
            if students_without_schools > 0:
                print_warning(f"Found {students_without_schools} student(s) without valid school")
            else:
                print_success("All students have valid schools")
            
            # Check for duplicate student IDs
            result = conn.execute(text("""
                SELECT student_id, COUNT(*) as count
                FROM students
                GROUP BY student_id
                HAVING COUNT(*) > 1
            """))
            duplicates = result.fetchall()
            
            if duplicates:
                print_warning(f"Found {len(duplicates)} duplicate student ID(s)")
                for dup in duplicates:
                    print(f"  - {dup[0]}: {dup[1]} occurrences")
            else:
                print_success("No duplicate student IDs")
            
        return True
    except Exception as e:
        print_error(f"Error checking data integrity: {e}")
        return False

def check_cascade_deletes(engine):
    """Check if cascade deletes are properly configured"""
    print_info("Checking cascade delete configurations...")
    
    try:
        inspector = inspect(engine)
        
        # Check face_encodings foreign key
        fks = inspector.get_foreign_keys('face_encodings')
        for fk in fks:
            if 'student_id' in fk['constrained_columns']:
                ondelete = fk.get('ondelete', 'NO ACTION')
                if ondelete == 'CASCADE':
                    print_success("face_encodings.student_id has CASCADE delete")
                else:
                    print_warning(f"face_encodings.student_id ondelete is '{ondelete}' (should be CASCADE)")
        
        # Check attendances foreign keys
        fks = inspector.get_foreign_keys('attendances')
        for fk in fks:
            if 'student_id' in fk['constrained_columns']:
                ondelete = fk.get('ondelete', 'NO ACTION')
                if ondelete == 'CASCADE':
                    print_success("attendances.student_id has CASCADE delete")
                else:
                    print_warning(f"attendances.student_id ondelete is '{ondelete}' (should be CASCADE)")
        
        return True
    except Exception as e:
        print_error(f"Error checking cascade deletes: {e}")
        return False

def generate_fix_script(issues):
    """Generate SQL fix script for identified issues"""
    print_info("\nGenerating fix script...")
    
    fix_script = """
-- Database Fix Script
-- Generated automatically based on detected issues
-- Review carefully before executing!

"""
    
    if 'pgvector' in issues:
        fix_script += """
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

"""
    
    if 'missing_photo_path' in issues:
        fix_script += """
-- Add photo_path column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_path VARCHAR;

"""
    
    if 'missing_confidence_score' in issues:
        fix_script += """
-- Add confidence_score column to attendances table
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

"""
    
    if 'missing_photo_url' in issues:
        fix_script += """
-- Add photo_url column to attendances table
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS photo_url VARCHAR;

"""
    
    if 'orphaned_encodings' in issues:
        fix_script += """
-- Remove orphaned face encodings
DELETE FROM face_encodings
WHERE student_id NOT IN (SELECT id FROM students);

"""
    
    if 'orphaned_attendance' in issues:
        fix_script += """
-- Remove orphaned attendance records
DELETE FROM attendances
WHERE student_id NOT IN (SELECT id FROM students);

"""
    
    if fix_script.strip() == "-- Database Fix Script\n-- Generated automatically based on detected issues\n-- Review carefully before executing!":
        print_success("No fixes needed - database is healthy!")
        return None
    
    # Save to file
    with open('database_fixes.sql', 'w') as f:
        f.write(fix_script)
    
    print_success("Fix script saved to 'database_fixes.sql'")
    print_warning("Review the script carefully before executing!")
    
    return fix_script

def main():
    print("\n" + "="*70)
    print(f"{BLUE}DATABASE VERIFICATION AND FIX SCRIPT{RESET}")
    print("="*70 + "\n")
    
    issues = []
    
    # Step 1: Check connection
    engine = check_database_connection()
    if not engine:
        print_error("Cannot proceed without database connection")
        sys.exit(1)
    
    print()
    
    # Step 2: Check pgvector
    if not check_pgvector_extension(engine):
        issues.append('pgvector')
    
    print()
    
    # Step 3: Check tables
    missing_tables = check_all_tables(engine)
    if missing_tables:
        issues.append('missing_tables')
    
    print()
    
    # Step 4: Check specific table schemas
    if check_table_exists(engine, 'face_encodings'):
        check_face_encodings_table(engine)
    
    print()
    
    if check_table_exists(engine, 'students'):
        check_students_table(engine)
    
    print()
    
    if check_table_exists(engine, 'attendances'):
        check_attendance_table(engine)
    
    print()
    
    # Step 5: Check data integrity
    check_data_integrity(engine)
    
    print()
    
    # Step 6: Check cascade deletes
    check_cascade_deletes(engine)
    
    print()
    
    # Step 7: Generate fix script if needed
    if issues:
        generate_fix_script(issues)
    
    print("\n" + "="*70)
    if not issues:
        print_success("DATABASE VERIFICATION COMPLETE - NO CRITICAL ISSUES FOUND!")
    else:
        print_warning(f"DATABASE VERIFICATION COMPLETE - {len(issues)} ISSUE(S) FOUND")
        print_info("Review the generated fix script and apply if needed")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
