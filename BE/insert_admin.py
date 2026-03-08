import asyncio
from app.database.database import AsyncSessionLocal
from app.modules.auth.models import User
from app.modules.auth.security import hash_password

async def main():
    async with AsyncSessionLocal() as db:
        admin = User(
            email="pcanh@admin.com",
            full_name="admin pcanh",
            hashed_password=hash_password("123456"),
            role_id=2, # Admin role
            is_verified=True,
            is_active=True
        )
        db.add(admin)
        await db.commit()
        print("Admin user inserted successfully.")

if __name__ == "__main__":
    asyncio.run(main())
