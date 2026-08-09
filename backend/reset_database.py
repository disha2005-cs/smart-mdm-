"""
Reset Database - Drop all tables and recreate with latest schema
WARNING: This will delete ALL data in the database!
"""
from sqlalchemy import text
from app.database import engine, Base
from app.models import *  # Import all models

def reset_database():
    print("🗑️  Dropping all tables...")
    
    with engine.connect() as conn:
        # Drop all tables
        conn.execute(text("""
            DROP TABLE IF EXISTS attendance CASCADE;
            DROP TABLE IF EXISTS face_encodings CASCADE;
            DROP TABLE IF EXISTS students CASCADE;
            DROP TABLE IF EXISTS daily_meals CASCADE;
            DROP TABLE IF EXISTS inventory CASCADE;
            DROP TABLE IF EXISTS alerts CASCADE;
            DROP TABLE IF EXISTS admins CASCADE;
            DROP TABLE IF EXISTS schools CASCADE;
            DROP TABLE IF EXISTS alembic_version CASCADE;
        """))
        conn.commit()
    
    print("✅ All tables dropped")
    print("🔨 Creating new tables with latest schema...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("✅ All tables created")
    print("\n🎯 Next steps:")
    print("1. Run: python seed.py (to create admin user)")
    print("2. Start backend: python main.py")
    print("3. Add students with photos through UI")

if __name__ == "__main__":
    confirm = input("⚠️  WARNING: This will DELETE ALL DATA! Type 'YES' to confirm: ")
    if confirm == "YES":
        reset_database()
        print("\n✅ Database reset complete!")
    else:
        print("❌ Aborted")
