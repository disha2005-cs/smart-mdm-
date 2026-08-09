"""
Add photo_url column to students table
Run this once to update the database schema
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

print("Connecting to Neon database...")
print(f"Database: {DATABASE_URL.split('@')[1].split('/')[0]}")

try:
    # Connect to database
    engine = create_engine(DATABASE_URL)
    conn = engine.connect()
    
    print("\n📝 Adding photo_url column to students table...")
    
    # Add column
    conn.execute(text("""
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS photo_url TEXT;
    """))
    
    conn.commit()
    print("✅ Column 'photo_url' added successfully!")
    
    # Verify
    result = conn.execute(text("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'photo_url';
    """))
    
    row = result.fetchone()
    if row:
        print(f"✅ Verified: {row[0]} column exists (type: {row[1]})")
    
    conn.close()
    
    print("\n🎉 Database migration complete!")
    print("You can now upload student photos to S3!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nMake sure DATABASE_URL is correct in .env file")
