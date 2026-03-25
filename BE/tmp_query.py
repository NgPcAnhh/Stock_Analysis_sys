import asyncio
from sqlalchemy import text
from app.database.database import SessionLocal

async def main():
    async with SessionLocal() as db:
        sql = text("""
            SELECT DISTINCT ind_code, ind_name
            FROM hethong_phantich_chungkhoan.bctc
            WHERE (ind_name ILIKE '%doanh thu%'
               OR ind_name ILIKE '%thu nhập%'
               OR ind_name ILIKE '%chi phí%'
               OR ind_name ILIKE '%giá vốn%')
               AND report_type = 'KQKD'
            LIMIT 50;
        """)
        # Wait, does bctc have report_type?
        # Let's just select distinct without report_type first
        sql2 = text("""
            SELECT DISTINCT ind_code, ind_name
            FROM hethong_phantich_chungkhoan.bctc
            WHERE ind_name ILIKE '%doanh thu%'
               OR ind_name ILIKE '%thu nhập%'
               OR ind_name ILIKE '%chi phí%'
               OR ind_name ILIKE '%giá vốn%'
            LIMIT 50;
        """)
        res = await db.execute(sql2)
        rows = res.mappings().all()
        for r in rows:
            print(r)

if __name__ == "__main__":
    asyncio.run(main())
