"""
Database Reset Script - AUTO MODE
This script will:
1. Drop all tables from the Neon PostgreSQL database (including old schema)
2. Recreate all tables
3. Create a single Government Admin account (GOV-001 / password123)
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base
from app.models.school import School
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.face_encoding import FaceEncoding
from app.models.inventory import Inventory
from app.models.daily_meal import DailyMeal
from app.models.alert import Alert
from app.models.attendance import Attendance

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database URL
DATABASE_URL = "postgresql://neondb_owner:npg_Wa4m0kjgSEfi@ep-curly-river-ax6atung-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"

def reset_database():
    """Drop all tables and recreate them"""
    print("=" * 60)
    print("DATABASE RESET SCRIPT - AUTO MODE")
    print("=" * 60)
    print("\n⚠️  Resetting database automatically...")
    print("\n" + "=" * 60)
    
    print("\n🔄 Connecting to database...")
    engine = create_engine(DATABASE_URL)
    
    try:
        # Drop all tables with CASCADE
        print("\n🗑️  Dropping all old tables (including deprecated schema)...")
        
        with engine.connect() as conn:
            # Drop old admin tables
            conn.execute(text("DROP TABLE IF EXISTS school_admins CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS government_admins CASCADE"))
            
            # Drop other tables
            conn.execute(text("DROP TABLE IF EXISTS attendance CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS face_encodings CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS alerts CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS daily_meals CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS inventory CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS students CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS schools CASCADE"))
            conn.commit()
        
        print("✅ All old tables dropped successfully")
        
        # Recreate all tables
        print("\n🔨 Creating fresh tables with new schema...")
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully")
        
        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Create Government Admin
            print("\n👤 Creating Government Admin account...")
            hashed_password = pwd_context.hash("password123")
            
            gov_admin = User(
                employee_id="GOV-001",
                first_name="Government",
                last_name="Administrator",
                email="gov.admin@pmposhan.gov.in",
                phone="1800-123-4567",
                designation="State Officer - PM POSHAN Karnataka",
                password_hash=hashed_password,
                role=UserRole.GOVERNMENT,
                is_active=True
            )
            
            db.add(gov_admin)
            db.commit()
            db.refresh(gov_admin)
            
            print("✅ Government Admin created successfully")
            print("\n" + "=" * 60)
            print("LOGIN CREDENTIALS")
            print("=" * 60)
            print(f"Employee ID: GOV-001")
            print(f"Password: password123")
            print(f"Role: Government Administrator")
            print(f"Email: gov.admin@pmposhan.gov.in")
            print("=" * 60)
            
            print("\n✅ Database reset completed successfully!")
            print("\n📝 Next steps:")
            print("   1. Start the backend server: python main.py")
            print("   2. Login with the credentials above")
            print("   3. Add schools and school admins through the API")
            
            return True
            
        except Exception as e:
            db.rollback()
            print(f"\n❌ Error creating admin account: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            db.close()
            
    except Exception as e:
        print(f"\n❌ Error during database reset: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        engine.dispose()

if __name__ == "__main__":
    success = reset_database()
    sys.exit(0 if success else 1)
