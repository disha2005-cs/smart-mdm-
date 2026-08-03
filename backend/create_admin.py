import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import SessionLocal
from app.models.admin import GovernmentAdmin
from app.core.security import get_password_hash

async def create_admin():
    async with SessionLocal() as session:
        # Check if exists
        from sqlalchemy import select
        result = await session.execute(select(GovernmentAdmin).filter_by(email="admin@pmposhan.gov.in"))
        admin = result.scalar_one_or_none()
        
        if not admin:
            print("Creating default admin user...")
            new_admin = GovernmentAdmin(
                first_name="System",
                last_name="Administrator",
                email="admin@pmposhan.gov.in",
                password_hash=get_password_hash("password123"),
                employee_id="GOV-001",
                designation="Director",
                is_active=True
            )
            session.add(new_admin)
            await session.commit()
            print("Admin created: admin@pmposhan.gov.in / password123")
        else:
            print("Admin already exists.")

if __name__ == "__main__":
    asyncio.run(create_admin())
