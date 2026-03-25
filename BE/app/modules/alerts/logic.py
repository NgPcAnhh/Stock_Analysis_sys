from typing import List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_alerts(db: AsyncSession, user_id: Optional[int], session_id: str) -> List[dict]:
    if user_id:
        query = text(
            """
            SELECT id, ticker, target_price, condition_type, status, created_at, triggered_at
            FROM system.stock_price_alerts
            WHERE user_id = :uid
            ORDER BY created_at DESC
            """
        )
        result = await db.execute(query, {"uid": user_id})
    else:
        query = text(
            """
            SELECT id, ticker, target_price, condition_type, status, created_at, triggered_at
            FROM system.stock_price_alerts
            WHERE session_id = :sid
            ORDER BY created_at DESC
            """
        )
        result = await db.execute(query, {"sid": session_id})

    return [dict(r._mapping) for r in result]


async def create_alert(
    db: AsyncSession,
    ticker: str,
    condition_type: str,
    target_price: float,
    user_id: Optional[int],
    session_id: str,
) -> dict:
    query = text(
        """
        INSERT INTO system.stock_price_alerts (user_id, session_id, ticker, condition_type, target_price, status)
        VALUES (:uid, :sid, :ticker, :condition_type, :target_price, 'ACTIVE')
        RETURNING id, ticker, target_price, condition_type, status, created_at, triggered_at
        """
    )

    result = await db.execute(
        query,
        {
            "uid": user_id,
            "sid": session_id,
            "ticker": ticker,
            "condition_type": condition_type,
            "target_price": target_price,
        },
    )
    await db.commit()
    row = result.fetchone()
    return dict(row._mapping) if row else {}
