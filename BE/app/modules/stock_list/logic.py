"""Business logic for the Stock List module."""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

# Schema
SCHEMA = "hethong_phantich_chungkhoan"
SYSTEM_SCHEMA = "system"

# Allowed sort fields → actual SQL expression
SORT_MAP = {
    "ticker": "hp.ticker",
    "current_price": "hp.close",
    "price_change_percent": "price_change_percent",
    "volume": "hp.volume",
    "market_cap": "fr.market_cap",
    "pe": "fr.pe",
    "pb": "fr.pb",
    "eps": "fr.eps",
    "roe": "fr.roe",
    "roa": "fr.roa",
    "dividend_yield": "fr.dividend_yield",
    "debt_to_equity": "fr.debt_to_equity",
}


# ────────────────────────────────────────────────────────────────────
# 1. Stock list overview — paginated
# ────────────────────────────────────────────────────────────────────
async def get_stock_overview(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 30,
    search: Optional[str] = None,
    sector: Optional[str] = None,
    exchange: Optional[str] = None,
    sort_by: str = "market_cap",
    sort_dir: str = "desc",
) -> Dict[str, Any]:
    """
    Return paginated stock list using history_price, company_overview, financial_ratio.
    """
    cache_key = f"stock_list:{page}:{page_size}:{search}:{sector}:{exchange}:{sort_by}:{sort_dir}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    # Validate sort
    sort_col = SORT_MAP.get(sort_by, "fr.market_cap")
    sort_direction = "ASC" if sort_dir.lower() == "asc" else "DESC"

    # ── Build WHERE conditions ──
    conditions: List[str] = []
    params: Dict[str, Any] = {}

    if search:
        conditions.append(
            "(hp.ticker ILIKE :search OR co.organ_short_name ILIKE :search)"
        )
        params["search"] = f"%{search}%"
    if sector:
        conditions.append("co.icb_name2 = :sector")
        params["sector"] = sector
    if exchange:
        conditions.append("co.exchange = :exchange")
        params["exchange"] = exchange

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # ── Latest trading date ──
    latest_date_sql = text(f"""
        SELECT MAX(trading_date) FROM {SCHEMA}.history_price
    """)
    res = await db.execute(latest_date_sql)
    latest_date = res.scalar()
    if not latest_date:
        return _empty_response(page, page_size)

    # ── Previous trading date ──
    prev_date_sql = text(f"""
        SELECT MAX(trading_date) FROM {SCHEMA}.history_price
        WHERE trading_date < :latest_date
    """)
    res = await db.execute(prev_date_sql, {"latest_date": latest_date})
    prev_date = res.scalar()

    # ── Count total ──
    count_sql = text(f"""
        WITH co_dedup AS (
            SELECT DISTINCT ON (ticker)
                ticker,
                CASE
                    WHEN organ_short_name IS NOT NULL AND organ_short_name != 'NaN' THEN organ_short_name
                    WHEN organ_name IS NOT NULL AND organ_name != 'NaN' THEN organ_name
                    ELSE NULL
                END AS organ_short_name,
                icb_name2, exchange
            FROM {SCHEMA}.company_overview
            WHERE exchange IS NOT NULL AND exchange != 'NaN' AND exchange != 'DELISTED'
            ORDER BY ticker,
                CASE WHEN organ_short_name IS NOT NULL AND organ_short_name != 'NaN' THEN 0 ELSE 1 END,
                exchange
        )
        SELECT COUNT(DISTINCT hp.ticker)
        FROM {SCHEMA}.history_price hp
        LEFT JOIN co_dedup co ON co.ticker = hp.ticker
        WHERE hp.trading_date = :latest_date AND {where_clause}
    """)
    count_params = {"latest_date": latest_date, **params}
    count_res = await db.execute(count_sql, count_params)
    total = count_res.scalar() or 0

    if total == 0:
        return _empty_response(page, page_size)

    total_pages = math.ceil(total / page_size)
    offset = (page - 1) * page_size

    # ── Main query ──
    # Join latest financial_ratio (latest year+quarter per ticker)
    main_sql = text(f"""
        WITH latest_fr AS (
            SELECT DISTINCT ON (ticker)
                ticker, pe, pb, eps, roe, roa, market_cap,
                dividend_yield, debt_to_equity, outstanding_shares
            FROM {SCHEMA}.financial_ratio
            ORDER BY ticker, year DESC, quarter DESC
        ),
        co_dedup AS (
            SELECT DISTINCT ON (ticker)
                ticker,
                CASE
                    WHEN organ_short_name IS NOT NULL AND organ_short_name != 'NaN' THEN organ_short_name
                    WHEN organ_name IS NOT NULL AND organ_name != 'NaN' THEN organ_name
                    ELSE NULL
                END AS organ_short_name,
                icb_name2, exchange
            FROM {SCHEMA}.company_overview
            WHERE exchange IS NOT NULL AND exchange != 'NaN' AND exchange != 'DELISTED'
            ORDER BY ticker,
                CASE WHEN organ_short_name IS NOT NULL AND organ_short_name != 'NaN' THEN 0 ELSE 1 END,
                exchange
        )
        SELECT
            hp.ticker,
            co.organ_short_name AS company_name,
            co.icb_name2 AS sector,
            co.exchange,
            hp.close AS current_price,
            CASE WHEN hp_prev.close > 0
                THEN hp.close - hp_prev.close
                ELSE 0
            END AS price_change,
            CASE WHEN hp_prev.close > 0
                THEN ROUND(((hp.close - hp_prev.close) / hp_prev.close * 100)::numeric, 2)
                ELSE 0
            END AS price_change_percent,
            hp.volume,
            fr.market_cap,
            fr.pe,
            fr.pb,
            fr.eps,
            fr.roe,
            fr.roa,
            fr.debt_to_equity,
            fr.dividend_yield
        FROM {SCHEMA}.history_price hp
        LEFT JOIN co_dedup co ON co.ticker = hp.ticker
        LEFT JOIN {SCHEMA}.history_price hp_prev ON hp_prev.ticker = hp.ticker
            AND hp_prev.trading_date = :prev_date
        LEFT JOIN latest_fr fr ON fr.ticker = hp.ticker
        WHERE hp.trading_date = :latest_date AND {where_clause}
        ORDER BY {sort_col} {sort_direction} NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    query_params = {
        "latest_date": latest_date,
        "prev_date": prev_date,
        "limit": page_size,
        "offset": offset,
        **params,
    }

    try:
        res = await db.execute(main_sql, query_params)
        rows = res.mappings().all()
    except Exception as exc:
        logger.error("get_stock_overview query error: %s", exc)
        return _empty_response(page, page_size)

    tickers = [r["ticker"] for r in rows]

    # ── Sparkline (last 20 days close prices) ──
    sparkline_map = await _get_sparklines(db, tickers, latest_date)

    # ── Avg volume 10d ──
    avg_vol_map = await _get_avg_volume(db, tickers, latest_date)

    # ── 52-week high/low ──
    week52_map = await _get_52w_range(db, tickers, latest_date)

    # ── Build response data ──
    data = []
    for r in rows:
        t = r["ticker"]
        w52 = week52_map.get(t, {})
        current = float(r["current_price"]) if r["current_price"] else None
        high52 = w52.get("high")
        low52 = w52.get("low")
        # 52w change = (current - low52) / low52 * 100
        week_change_52 = None
        if current and low52 and low52 > 0:
            week_change_52 = round((current - low52) / low52 * 100, 2)

        data.append({
            "ticker": t,
            "company_name": r["company_name"] if r["company_name"] and r["company_name"] != "NaN" else None,
            "sector": r["sector"] if r["sector"] and r["sector"] != "NaN" else None,
            "exchange": r["exchange"] if r["exchange"] and r["exchange"] != "NaN" else None,
            "current_price": float(r["current_price"]) if r["current_price"] else None,
            "price_change": float(r["price_change"]) if r["price_change"] else None,
            "price_change_percent": float(r["price_change_percent"]) if r["price_change_percent"] else None,
            "volume": int(r["volume"]) if r["volume"] else None,
            "avg_volume_10d": avg_vol_map.get(t),
            "market_cap": r["market_cap"],
            "pe": round(r["pe"], 2) if r["pe"] else None,
            "pb": round(r["pb"], 2) if r["pb"] else None,
            "eps": round(r["eps"], 2) if r["eps"] else None,
            "roe": round(r["roe"] * 100, 2) if r["roe"] else None,      # Convert ratio → percent
            "roa": round(r["roa"] * 100, 2) if r["roa"] else None,
            "debt_to_equity": round(r["debt_to_equity"], 2) if r["debt_to_equity"] else None,
            "dividend_yield": round(r["dividend_yield"] * 100, 2) if r["dividend_yield"] else None,
            "high_52w": high52,
            "low_52w": low52,
            "week_change_52": week_change_52,
            "sparkline": sparkline_map.get(t, []),
        })

    # ── Summary stats ──
    summary = await _get_market_summary(db, latest_date, prev_date)

    result = {
        "data": data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "summary": summary,
    }
    await cache_set(cache_key, result, ttl=120)
    return result


# ────────────────────────────────────────────────────────────────────
# 2. Sectors list
# ────────────────────────────────────────────────────────────────────
async def get_sectors(db: AsyncSession) -> List[Dict[str, Any]]:
    cache_key = "stock_list:sectors"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT
            co.icb_name2 AS name,
            COUNT(DISTINCT co.ticker) AS count
        FROM {SCHEMA}.company_overview co
        WHERE co.icb_name2 IS NOT NULL AND co.icb_name2 != 'NaN'
            AND co.exchange IS NOT NULL AND co.exchange != 'NaN'
            AND co.exchange != 'DELISTED'
        GROUP BY co.icb_name2
        ORDER BY count DESC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()
    data = [{"name": r["name"], "count": r["count"]} for r in rows]
    await cache_set(cache_key, data, ttl=3600)
    return data


# ────────────────────────────────────────────────────────────────────
# 3. Most viewed stocks (by click count)
# ────────────────────────────────────────────────────────────────────
async def get_most_viewed(
    db: AsyncSession, limit: int = 10, days: int = 30
) -> List[Dict[str, Any]]:
    cache_key = f"stock_list:most_viewed:{limit}:{days}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT
            sc.ticker,
            co.organ_short_name AS company_name,
            COUNT(sc.id) AS click_count
        FROM {SYSTEM_SCHEMA}.stock_clicks sc
        LEFT JOIN {SCHEMA}.company_overview co ON co.ticker = sc.ticker
            AND co.exchange != 'NaN' AND co.exchange IS NOT NULL
        WHERE sc.clicked_at >= NOW() - make_interval(days => :days)
        GROUP BY sc.ticker, co.organ_short_name
        ORDER BY click_count DESC
        LIMIT :limit
    """)
    try:
        res = await db.execute(sql, {"limit": limit, "days": days})
        rows = res.mappings().all()
    except Exception as exc:
        logger.warning("most_viewed query error: %s", exc)
        return []

    data = [
        {
            "ticker": r["ticker"],
            "company_name": r["company_name"] if r["company_name"] and r["company_name"] != "NaN" else None,
            "click_count": r["click_count"],
        }
        for r in rows
    ]
    await cache_set(cache_key, data, ttl=300)
    return data


# ────────────────────────────────────────────────────────────────────
# 4. Hot stock search keywords
# ────────────────────────────────────────────────────────────────────
async def get_hot_stock_search(
    db: AsyncSession, limit: int = 12, days: int = 7
) -> List[Dict[str, Any]]:
    cache_key = f"stock_list:hot_search:{limit}:{days}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text(f"""
        SELECT
            keyword,
            COUNT(*) AS search_count
        FROM {SYSTEM_SCHEMA}.stock_search_logs
        WHERE searched_at >= NOW() - make_interval(days => :days)
        GROUP BY keyword
        ORDER BY search_count DESC
        LIMIT :limit
    """)
    try:
        res = await db.execute(sql, {"limit": limit, "days": days})
        rows = res.mappings().all()
    except Exception as exc:
        logger.warning("hot_stock_search query error: %s", exc)
        return []

    data = [{"keyword": r["keyword"], "search_count": r["search_count"]} for r in rows]
    await cache_set(cache_key, data, ttl=300)
    return data


# ────────────────────────────────────────────────────────────────────
# 5. Track stock click
# ────────────────────────────────────────────────────────────────────
async def track_stock_click(
    db: AsyncSession,
    ticker: str,
    session_id: str = "anonymous",
    ip_address: Optional[str] = None,
) -> bool:
    sql = text(f"""
        INSERT INTO {SYSTEM_SCHEMA}.stock_clicks (ticker, session_id, ip_address)
        VALUES (:ticker, :session_id, :ip_address)
    """)
    try:
        await db.execute(sql, {
            "ticker": ticker.upper().strip(),
            "session_id": session_id,
            "ip_address": ip_address,
        })
        return True
    except Exception as exc:
        logger.error("track_stock_click error: %s", exc)
        return False


# ────────────────────────────────────────────────────────────────────
# 6. Track stock search
# ────────────────────────────────────────────────────────────────────
async def track_stock_search(
    db: AsyncSession,
    keyword: str,
    session_id: str = "anonymous",
    ip_address: Optional[str] = None,
) -> bool:
    sql = text(f"""
        INSERT INTO {SYSTEM_SCHEMA}.stock_search_logs (keyword, session_id, ip_address)
        VALUES (:keyword, :session_id, :ip_address)
    """)
    try:
        await db.execute(sql, {
            "keyword": keyword.strip().lower(),
            "session_id": session_id,
            "ip_address": ip_address,
        })
        return True
    except Exception as exc:
        logger.error("track_stock_search error: %s", exc)
        return False


# ════════════════════════════════════════════════════════════════════
# Private helpers
# ════════════════════════════════════════════════════════════════════

async def _get_sparklines(
    db: AsyncSession, tickers: List[str], latest_date: str
) -> Dict[str, List[float]]:
    """Get last 20 trading days close prices for sparkline charts."""
    if not tickers:
        return {}

    sql = text(f"""
        SELECT ticker, close
        FROM (
            SELECT
                ticker, close, trading_date,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY trading_date DESC) AS rn
            FROM {SCHEMA}.history_price
            WHERE ticker = ANY(:tickers)
              AND trading_date <= :latest_date
        ) sub
        WHERE rn <= 20
        ORDER BY ticker, trading_date ASC
    """)
    try:
        res = await db.execute(sql, {"tickers": tickers, "latest_date": latest_date})
        rows = res.fetchall()
    except Exception as exc:
        logger.warning("sparkline query error: %s", exc)
        return {}

    result: Dict[str, List[float]] = {}
    for row in rows:
        t = row[0]
        c = float(row[1]) if row[1] else 0
        result.setdefault(t, []).append(c)
    return result


async def _get_avg_volume(
    db: AsyncSession, tickers: List[str], latest_date: str
) -> Dict[str, int]:
    """Get 10-day average volume."""
    if not tickers:
        return {}

    sql = text(f"""
        SELECT ticker, ROUND(AVG(volume)) AS avg_vol
        FROM (
            SELECT ticker, volume,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY trading_date DESC) AS rn
            FROM {SCHEMA}.history_price
            WHERE ticker = ANY(:tickers)
              AND trading_date <= :latest_date
        ) sub
        WHERE rn <= 10
        GROUP BY ticker
    """)
    try:
        res = await db.execute(sql, {"tickers": tickers, "latest_date": latest_date})
        rows = res.fetchall()
    except Exception as exc:
        logger.warning("avg_volume query error: %s", exc)
        return {}

    return {row[0]: int(row[1]) if row[1] else 0 for row in rows}


async def _get_52w_range(
    db: AsyncSession, tickers: List[str], latest_date: str
) -> Dict[str, Dict[str, float]]:
    """Get 52-week high and low."""
    if not tickers:
        return {}

    sql = text(f"""
        SELECT ticker, MAX(high) AS high_52w, MIN(low) AS low_52w
        FROM {SCHEMA}.history_price
        WHERE ticker = ANY(:tickers)
          AND trading_date >= :date_52w_ago
        GROUP BY ticker
    """)
    # trading_date is stored as text (YYYY-MM-DD), so string comparison works
    from datetime import datetime, timedelta
    try:
        dt = datetime.strptime(latest_date, "%Y-%m-%d")
    except Exception:
        return {}
    date_52w_ago = (dt - timedelta(days=365)).strftime("%Y-%m-%d")
    try:
        res = await db.execute(sql, {"tickers": tickers, "date_52w_ago": date_52w_ago})
        rows = res.fetchall()
    except Exception as exc:
        logger.warning("52w_range query error: %s", exc)
        return {}

    return {
        row[0]: {
            "high": float(row[1]) if row[1] else None,
            "low": float(row[2]) if row[2] else None,
        }
        for row in rows
    }


async def _get_market_summary(
    db: AsyncSession, latest_date: str, prev_date: Optional[str]
) -> Dict[str, Any]:
    """Compute market summary stats."""
    cache_key = f"stock_list:summary:{latest_date}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    if not prev_date:
        return {
            "total_stocks": 0, "total_up": 0, "total_down": 0,
            "total_unchanged": 0, "total_volume": 0, "avg_pe": None,
        }

    sql = text(f"""
        SELECT
            COUNT(*) AS total_stocks,
            SUM(CASE WHEN hp.close > hp_prev.close THEN 1 ELSE 0 END) AS total_up,
            SUM(CASE WHEN hp.close < hp_prev.close THEN 1 ELSE 0 END) AS total_down,
            SUM(CASE WHEN hp.close = hp_prev.close THEN 1 ELSE 0 END) AS total_unchanged,
            SUM(hp.volume) AS total_volume
        FROM {SCHEMA}.history_price hp
        LEFT JOIN {SCHEMA}.history_price hp_prev
            ON hp_prev.ticker = hp.ticker AND hp_prev.trading_date = :prev_date
        WHERE hp.trading_date = :latest_date
    """)
    res = await db.execute(sql, {"latest_date": latest_date, "prev_date": prev_date})
    row = res.mappings().first()

    # Average PE
    pe_sql = text(f"""
        SELECT AVG(pe) AS avg_pe
        FROM (
            SELECT DISTINCT ON (ticker) pe
            FROM {SCHEMA}.financial_ratio
            WHERE pe IS NOT NULL AND pe > 0 AND pe < 200
            ORDER BY ticker, year DESC, quarter DESC
        ) sub
    """)
    pe_res = await db.execute(pe_sql)
    avg_pe = pe_res.scalar()

    summary = {
        "total_stocks": int(row["total_stocks"]) if row else 0,
        "total_up": int(row["total_up"] or 0) if row else 0,
        "total_down": int(row["total_down"] or 0) if row else 0,
        "total_unchanged": int(row["total_unchanged"] or 0) if row else 0,
        "total_volume": int(row["total_volume"] or 0) if row else 0,
        "avg_pe": round(float(avg_pe), 1) if avg_pe else None,
    }
    await cache_set(cache_key, summary, ttl=300)
    return summary


def _empty_response(page: int, page_size: int) -> Dict[str, Any]:
    return {
        "data": [],
        "total": 0,
        "page": page,
        "page_size": page_size,
        "total_pages": 0,
        "summary": {
            "total_stocks": 0, "total_up": 0, "total_down": 0,
            "total_unchanged": 0, "total_volume": 0, "avg_pe": None,
        },
    }
