"""
Standalone script to seed the database with demo data.
Run this separately: python run_seed.py
"""
from app.bootstrap import seed_demo_data

if __name__ == "__main__":
    print("🌱 Starting database seeding...")
    try:
        seed_demo_data()
        print("✅ Database seeded successfully!")
        print("\n📋 Demo Credentials:")
        print("   Government Admin: GOV-001 / password123")
        print("   School Admins: SCH-001 to SCH-005 / password123")
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
