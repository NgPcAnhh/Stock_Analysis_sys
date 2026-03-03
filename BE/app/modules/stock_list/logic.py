"""Business logic for the Stock List module."""

from __future__ import annotations

import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta
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
    "market_cap": "computed_market_cap",
    "pe": "computed_pe",
    "pb": "computed_pb",
    "eps": "computed_eps",
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
    # Join latest financial_ratio + BCTC to compute P/E, P/B, EPS
    main_sql = text(f"""
        WITH bctc_data AS (
            SELECT ticker, year, quarter, ind_code, value
            FROM {SCHEMA}.bctc
            WHERE ind_code IN (
                'C_PHI_U_PH_TH_NG_NG',
                'V_N_CH_S_H_U_NG',
                'L_I_NHU_N_SAU_THU_C_A_C_NG_C_NG_TY_M_NG'
            ) AND value IS NOT NULL AND value != 0
        ),
        shares AS (
            SELECT DISTINCT ON (ticker)
                ticker, value / 10000.0 AS shares
            FROM bctc_data
            WHERE ind_code = 'C_PHI_U_PH_TH_NG_NG' AND value > 0
            ORDER BY ticker, year DESC, quarter DESC
        ),
        equity AS (
            SELECT DISTINCT ON (ticker)
                ticker, value AS equity
            FROM bctc_data
            WHERE ind_code = 'V_N_CH_S_H_U_NG' AND value > 0
            ORDER BY ticker, year DESC, quarter DESC
        ),
        ranked_ni AS (
            SELECT ticker, value,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
            FROM bctc_data
            WHERE ind_code = 'L_I_NHU_N_SAU_THU_C_A_C_NG_C_NG_TY_M_NG'
        ),
        ttm_ni AS (
            SELECT ticker, SUM(value) AS ttm_ni
            FROM ranked_ni WHERE rn <= 4
            GROUP BY ticker HAVING COUNT(*) >= 2
        ),
        latest_fr AS (
            SELECT DISTINCT ON (ticker)
                ticker, roe, roa, market_cap,
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
            -- Market cap from BCTC shares
            CASE WHEN sh.shares > 0 AND hp.close > 0
                THEN ROUND((hp.close * 1000 * sh.shares / 1e9)::numeric, 1)
                ELSE fr.market_cap
            END AS computed_market_cap,
            -- EPS from BCTC (TTM net income / shares)
            CASE WHEN sh.shares > 0 AND ni.ttm_ni IS NOT NULL
                THEN ROUND((ni.ttm_ni / sh.shares)::numeric, 0)
                ELSE NULL
            END AS computed_eps,
            -- P/E from price and EPS
            CASE WHEN sh.shares > 0 AND ni.ttm_ni IS NOT NULL AND ni.ttm_ni > 0
                    AND hp.close * 1000 * sh.shares / ni.ttm_ni > 0
                    AND hp.close * 1000 * sh.shares / ni.ttm_ni < 500
                THEN ROUND((hp.close * 1000 / (ni.ttm_ni / sh.shares))::numeric, 2)
                ELSE NULL
            END AS computed_pe,
            -- P/B from price, shares, equity
            CASE WHEN sh.shares > 0 AND eq.equity > 0 AND hp.close > 0
                    AND hp.close * 1000 * sh.shares / eq.equity > 0
                    AND hp.close * 1000 * sh.shares / eq.equity < 100
                THEN ROUND((hp.close * 1000 * sh.shares / eq.equity)::numeric, 2)
                ELSE NULL
            END AS computed_pb,
            fr.roe,
            fr.roa,
            fr.debt_to_equity,
            fr.dividend_yield
        FROM {SCHEMA}.history_price hp
        LEFT JOIN co_dedup co ON co.ticker = hp.ticker
        LEFT JOIN {SCHEMA}.history_price hp_prev ON hp_prev.ticker = hp.ticker
            AND hp_prev.trading_date = :prev_date
        LEFT JOIN latest_fr fr ON fr.ticker = hp.ticker
        LEFT JOIN shares sh ON sh.ticker = hp.ticker
        LEFT JOIN equity eq ON eq.ticker = hp.ticker
        LEFT JOIN ttm_ni ni ON ni.ticker = hp.ticker
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
            "market_cap": float(r["computed_market_cap"]) if r["computed_market_cap"] else None,
            "pe": float(r["computed_pe"]) if r["computed_pe"] else None,
            "pb": float(r["computed_pb"]) if r["computed_pb"] else None,
            "eps": float(r["computed_eps"]) if r["computed_eps"] else None,
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


# ════════════════════════════════════════════════════════════════════
# 7. Stock Screener — full dataset with all metrics
# ════════════════════════════════════════════════════════════════════

def _compute_rsi(closes: List[float], period: int = 14) -> Optional[float]:
    """Compute RSI (Relative Strength Index) from a list of close prices."""
    if len(closes) < period + 1:
        return None
    changes = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [max(c, 0) for c in changes]
    losses = [max(-c, 0) for c in changes]

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    for i in range(period, len(changes)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - 100 / (1 + rs)


def _compute_ema(data: List[float], period: int) -> List[float]:
    """Compute Exponential Moving Average."""
    if not data:
        return []
    k = 2 / (period + 1)
    result = [data[0]]
    for i in range(1, len(data)):
        result.append(data[i] * k + result[-1] * (1 - k))
    return result


def _compute_macd_signal(closes: List[float]) -> str:
    """Compute MACD signal: 'Mua', 'Bán', or 'Trung tính'."""
    if len(closes) < 35:
        return "Trung tính"

    ema12 = _compute_ema(closes, 12)
    ema26 = _compute_ema(closes, 26)
    macd_line = [ema12[i] - ema26[i] for i in range(len(closes))]
    signal_line = _compute_ema(macd_line, 9)

    if macd_line[-1] > signal_line[-1]:
        return "Mua"
    elif macd_line[-1] < signal_line[-1]:
        return "Bán"
    return "Trung tính"


def _determine_signal(
    rsi: Optional[float], macd: Optional[str], ma_trend: Optional[str]
) -> str:
    """Derive overall signal from RSI, MACD, and MA20 trend."""
    buy = 0
    sell = 0
    if macd == "Mua":
        buy += 1
    elif macd == "Bán":
        sell += 1
    if ma_trend == "Trên MA20":
        buy += 1
    elif ma_trend == "Dưới MA20":
        sell += 1
    if rsi is not None:
        if rsi > 70:
            sell += 1
        elif rsi < 30:
            buy += 1

    if buy >= 2 and sell == 0:
        return "Mua"
    elif sell >= 2 and buy == 0:
        return "Bán"
    elif buy > sell:
        return "Theo dõi"
    return "Nắm giữ"


async def get_screener_data(db: AsyncSession) -> Dict[str, Any]:
    """
    Return full stock screener dataset.
    Computes P/E, P/B, EPS from BCTC; growth from YoY BCTC;
    technical indicators (RSI14, MACD, MA20) from price history.
    """
    cache_key = "stock_list:screener"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    # ── Latest & previous trading dates ──
    date_sql = text(f"""
        SELECT
            (SELECT MAX(trading_date) FROM {SCHEMA}.history_price) AS latest,
            (SELECT MAX(trading_date) FROM {SCHEMA}.history_price
             WHERE trading_date < (SELECT MAX(trading_date) FROM {SCHEMA}.history_price)) AS prev
    """)
    res = await db.execute(date_sql)
    dates = res.first()
    if not dates or not dates.latest:
        return {"data": [], "total": 0}

    latest_date = dates.latest
    prev_date = dates.prev

    # Compute date boundaries
    try:
        dt = datetime.strptime(str(latest_date), "%Y-%m-%d")
    except Exception:
        dt = datetime.now()
    date_1y_ago = (dt - timedelta(days=365)).strftime("%Y-%m-%d")
    date_90d_ago = (dt - timedelta(days=120)).strftime("%Y-%m-%d")  # ~60 trading days

    # ── Main query: price + company + BCTC valuations + financial ratios + foreign ──
    main_sql = text(f"""
        WITH bctc_data AS (
            SELECT ticker, year, quarter, ind_code, value
            FROM {SCHEMA}.bctc
            WHERE ind_code IN (
                'C_PHI_U_PH_TH_NG_NG',
                'V_N_CH_S_H_U_NG',
                'N_PH_I_TR_NG',
                'L_I_NHU_N_SAU_THU_C_A_C_NG_C_NG_TY_M_NG',
                'DOANH_THU_THU_N',
                'C_T_C_TR'
            ) AND value IS NOT NULL AND value != 0
        ),
        shares AS (
            SELECT DISTINCT ON (ticker)
                ticker, value / 10000.0 AS shares
            FROM bctc_data
            WHERE ind_code = 'C_PHI_U_PH_TH_NG_NG' AND value > 0
            ORDER BY ticker, year DESC, quarter DESC
        ),
        equity AS (
            SELECT DISTINCT ON (ticker)
                ticker, value AS equity
            FROM bctc_data
            WHERE ind_code = 'V_N_CH_S_H_U_NG' AND value > 0
            ORDER BY ticker, year DESC, quarter DESC
        ),
        total_liabilities AS (
            SELECT DISTINCT ON (ticker)
                ticker, value AS liabilities
            FROM bctc_data
            WHERE ind_code = 'N_PH_I_TR_NG'
            ORDER BY ticker, year DESC, quarter DESC
        ),
        ranked_div AS (
            SELECT ticker, value,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
            FROM bctc_data
            WHERE ind_code = 'C_T_C_TR'
        ),
        ttm_div AS (
            SELECT ticker, SUM(ABS(value)) AS ttm_div
            FROM ranked_div WHERE rn <= 4
            GROUP BY ticker HAVING COUNT(*) >= 2
        ),
        ranked_ni AS (
            SELECT ticker, value,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
            FROM bctc_data
            WHERE ind_code = 'L_I_NHU_N_SAU_THU_C_A_C_NG_C_NG_TY_M_NG'
        ),
        ttm_ni AS (
            SELECT ticker, SUM(value) AS ttm_ni
            FROM ranked_ni WHERE rn <= 4
            GROUP BY ticker HAVING COUNT(*) >= 2
        ),
        prev_ni AS (
            SELECT ticker, SUM(value) AS prev_ni
            FROM ranked_ni WHERE rn BETWEEN 5 AND 8
            GROUP BY ticker HAVING COUNT(*) = 4
        ),
        ranked_rev AS (
            SELECT ticker, value,
                ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
            FROM bctc_data
            WHERE ind_code = 'DOANH_THU_THU_N'
        ),
        ttm_rev AS (
            SELECT ticker, SUM(value) AS ttm_rev
            FROM ranked_rev WHERE rn <= 4
            GROUP BY ticker HAVING COUNT(*) >= 2
        ),
        prev_rev AS (
            SELECT ticker, SUM(value) AS prev_rev
            FROM ranked_rev WHERE rn BETWEEN 5 AND 8
            GROUP BY ticker HAVING COUNT(*) = 4
        ),
        latest_fr AS (
            SELECT DISTINCT ON (ticker)
                ticker, roe, roa, debt_to_equity, dividend_yield
            FROM {SCHEMA}.financial_ratio
            ORDER BY ticker, year DESC, quarter DESC
        ),
        co_dedup AS (
            SELECT DISTINCT ON (ticker)
                ticker,
                CASE
                    WHEN organ_short_name IS NOT NULL AND organ_short_name != 'NaN'
                        THEN organ_short_name
                    WHEN organ_name IS NOT NULL AND organ_name != 'NaN'
                        THEN organ_name
                    ELSE NULL
                END AS company_name,
                icb_name2 AS sector,
                exchange
            FROM {SCHEMA}.company_overview
            WHERE exchange IS NOT NULL AND exchange != 'NaN' AND exchange != 'DELISTED'
            ORDER BY ticker,
                CASE WHEN organ_short_name IS NOT NULL AND organ_short_name != 'NaN' THEN 0 ELSE 1 END,
                exchange
        ),
        latest_eb AS (
            SELECT DISTINCT ON (ticker)
                ticker,
                COALESCE(foreign_buy_volume, 0) AS foreign_buy,
                COALESCE(foreign_sell_volume, 0) AS foreign_sell,
                CASE WHEN match_price > 0 THEN match_price ELSE ref_price END AS eb_price
            FROM {SCHEMA}.electric_board
            WHERE match_price > 0 OR ref_price > 0
            ORDER BY ticker, trading_date DESC
        ),
        week52 AS (
            SELECT ticker,
                MAX(high) AS high_52w,
                MIN(low) AS low_52w
            FROM {SCHEMA}.history_price
            WHERE trading_date >= :date_1y_ago
            GROUP BY ticker
        )
        SELECT
            hp.ticker,
            co.company_name,
            co.sector,
            co.exchange,
            hp.close AS close_raw,
            hp_prev.close AS prev_close_raw,
            hp.volume,
            sh.shares,
            eq.equity,
            ni.ttm_ni,
            pn.prev_ni,
            tr.ttm_rev,
            pr.prev_rev,
            fr.roe,
            fr.roa,
            fr.debt_to_equity,
            fr.dividend_yield,
            tl.liabilities AS total_liabilities,
            dv.ttm_div,
            eb.foreign_buy,
            eb.foreign_sell,
            eb.eb_price,
            w52.high_52w,
            w52.low_52w
        FROM {SCHEMA}.history_price hp
        LEFT JOIN co_dedup co ON co.ticker = hp.ticker
        LEFT JOIN {SCHEMA}.history_price hp_prev
            ON hp_prev.ticker = hp.ticker AND hp_prev.trading_date = :prev_date
        LEFT JOIN shares sh ON sh.ticker = hp.ticker
        LEFT JOIN equity eq ON eq.ticker = hp.ticker
        LEFT JOIN ttm_ni ni ON ni.ticker = hp.ticker
        LEFT JOIN prev_ni pn ON pn.ticker = hp.ticker
        LEFT JOIN ttm_rev tr ON tr.ticker = hp.ticker
        LEFT JOIN prev_rev pr ON pr.ticker = hp.ticker
        LEFT JOIN latest_fr fr ON fr.ticker = hp.ticker
        LEFT JOIN total_liabilities tl ON tl.ticker = hp.ticker
        LEFT JOIN ttm_div dv ON dv.ticker = hp.ticker
        LEFT JOIN latest_eb eb ON eb.ticker = hp.ticker
        LEFT JOIN week52 w52 ON w52.ticker = hp.ticker
        WHERE hp.trading_date = :latest_date
        ORDER BY
            CASE WHEN sh.shares > 0 THEN hp.close * sh.shares ELSE 0 END DESC NULLS LAST
    """)

    try:
        res = await db.execute(main_sql, {
            "latest_date": latest_date,
            "prev_date": prev_date,
            "date_1y_ago": date_1y_ago,
        })
        base_rows = res.mappings().all()
    except Exception as exc:
        logger.error("screener main query error: %s", exc)
        return {"data": [], "total": 0}

    if not base_rows:
        return {"data": [], "total": 0}

    # ── Price history (last ~60 trading days) for technical indicators ──
    history_sql = text(f"""
        SELECT ticker, trading_date, close, volume
        FROM {SCHEMA}.history_price
        WHERE trading_date >= :date_90d_ago AND trading_date <= :latest_date
        ORDER BY ticker, trading_date ASC
    """)
    try:
        res = await db.execute(history_sql, {
            "date_90d_ago": date_90d_ago,
            "latest_date": latest_date,
        })
        history_rows = res.fetchall()
    except Exception as exc:
        logger.warning("screener history query error: %s", exc)
        history_rows = []

    # Build per-ticker price & volume series
    price_series: Dict[str, List[float]] = defaultdict(list)
    vol_series: Dict[str, List[int]] = defaultdict(list)
    for row in history_rows:
        ticker = row[0]
        close_val = float(row[2]) if row[2] else 0
        vol_val = int(row[3]) if row[3] else 0
        price_series[ticker].append(close_val)
        vol_series[ticker].append(vol_val)

    # ── Compute technical indicators per ticker ──
    tech_map: Dict[str, Dict[str, Any]] = {}
    for ticker, closes in price_series.items():
        # RSI14
        rsi14 = _compute_rsi(closes, 14)

        # MA20 trend
        ma20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else None
        ma20_trend = None
        if ma20 and closes:
            ma20_trend = "Trên MA20" if closes[-1] > ma20 else "Dưới MA20"

        # MACD signal
        macd_signal = _compute_macd_signal(closes)

        # Sparkline (last 20 closes × 1000 → VND)
        sparkline = [round(c * 1000, 0) for c in closes[-20:]]

        # Avg volume 10d
        vols = vol_series.get(ticker, [])
        avg_vol_10d = round(sum(vols[-10:]) / min(len(vols[-10:]), 10)) if vols else None

        tech_map[ticker] = {
            "rsi14": round(rsi14, 1) if rsi14 is not None else None,
            "ma20_trend": ma20_trend,
            "macd_signal": macd_signal,
            "sparkline": sparkline,
            "avg_vol_10d": avg_vol_10d,
        }

    # ── Build final response items ──
    data: List[Dict[str, Any]] = []
    for r in base_rows:
        t = r["ticker"]
        tech = tech_map.get(t, {})

        close_raw = float(r["close_raw"]) if r["close_raw"] else None
        prev_raw = float(r["prev_close_raw"]) if r["prev_close_raw"] else None
        shares = float(r["shares"]) if r["shares"] else None
        equity_val = float(r["equity"]) if r["equity"] else None
        ttm_ni_val = float(r["ttm_ni"]) if r["ttm_ni"] else None
        prev_ni_val = float(r["prev_ni"]) if r["prev_ni"] else None
        ttm_rev_val = float(r["ttm_rev"]) if r["ttm_rev"] else None
        prev_rev_val = float(r["prev_rev"]) if r["prev_rev"] else None

        # Current price (VND)
        current_price = round(close_raw * 1000, 0) if close_raw else None

        # Price change
        price_change = None
        price_change_pct = None
        if close_raw and prev_raw and prev_raw > 0:
            price_change = round((close_raw - prev_raw) * 1000, 0)
            price_change_pct = round((close_raw - prev_raw) / prev_raw * 100, 2)

        # Market cap (tỷ VND)
        market_cap = None
        if close_raw and shares and shares > 0:
            market_cap = round(close_raw * 1000 * shares / 1e9, 1)

        # EPS (VND)
        eps = None
        if ttm_ni_val is not None and shares and shares > 0:
            eps = round(ttm_ni_val / shares, 0)

        # P/E
        pe = None
        if eps and eps > 0 and current_price:
            pe_val = current_price / eps
            if 0 < pe_val < 500:
                pe = round(pe_val, 2)

        # P/B
        pb = None
        if close_raw and shares and shares > 0 and equity_val and equity_val > 0:
            pb_val = close_raw * 1000 * shares / equity_val
            if 0 < pb_val < 100:
                pb = round(pb_val, 2)

        # ROE, ROA (stored as ratios → convert to %)
        roe = round(float(r["roe"]) * 100, 2) if r["roe"] else None
        roa = round(float(r["roa"]) * 100, 2) if r["roa"] else None

        # Debt to equity — compute from BCTC (liabilities / equity), fallback to financial_ratio
        dte = None
        total_liab = float(r["total_liabilities"]) if r["total_liabilities"] else None
        if total_liab is not None and equity_val and equity_val > 0:
            dte = round(total_liab / equity_val, 2)
        elif r["debt_to_equity"]:
            dte = round(float(r["debt_to_equity"]), 2)

        # Dividend yield — compute from BCTC TTM dividends / market_cap, fallback to FR
        div_yield = None
        ttm_div_val = float(r["ttm_div"]) if r["ttm_div"] else None
        if ttm_div_val and ttm_div_val > 0 and close_raw and shares and shares > 0:
            mkt = close_raw * 1000 * shares
            if mkt > 0:
                div_yield = round(ttm_div_val / mkt * 100, 2)
        if div_yield is None and r["dividend_yield"]:
            div_yield = round(float(r["dividend_yield"]) * 100, 2)

        # Revenue growth (TTM vs prev TTM, %)
        revenue_growth = None
        if ttm_rev_val is not None and prev_rev_val and prev_rev_val != 0:
            revenue_growth = round(
                (ttm_rev_val - prev_rev_val) / abs(prev_rev_val) * 100, 1
            )

        # Profit growth (TTM vs prev TTM, %)
        profit_growth = None
        if ttm_ni_val is not None and prev_ni_val and prev_ni_val != 0:
            profit_growth = round(
                (ttm_ni_val - prev_ni_val) / abs(prev_ni_val) * 100, 1
            )

        # Foreign net buy (tỷ VND)
        foreign_net_buy = None
        if r["foreign_buy"] is not None and r["foreign_sell"] is not None and r["eb_price"]:
            eb_price = float(r["eb_price"])
            if eb_price > 0:
                net_vol = int(r["foreign_buy"]) - int(r["foreign_sell"])
                foreign_net_buy = round(net_vol * eb_price / 1e9, 2)

        # 52-week high/low (× 1000 → VND)
        high_52w = round(float(r["high_52w"]) * 1000, 0) if r["high_52w"] else None
        low_52w = round(float(r["low_52w"]) * 1000, 0) if r["low_52w"] else None

        # 52-week change
        week_change_52 = None
        if current_price and low_52w and low_52w > 0:
            week_change_52 = round((current_price - low_52w) / low_52w * 100, 2)

        # Signal
        rsi14 = tech.get("rsi14")
        macd_sig = tech.get("macd_signal", "Trung tính")
        ma20_tr = tech.get("ma20_trend", "Dưới MA20")
        signal = _determine_signal(rsi14, macd_sig, ma20_tr)

        # Normalize exchange: HSX → HOSE
        raw_exchange = r["exchange"]
        if raw_exchange == "HSX":
            raw_exchange = "HOSE"

        data.append({
            "ticker": t,
            "companyName": r["company_name"],
            "sector": r["sector"],
            "exchange": raw_exchange,
            "currentPrice": current_price,
            "priceChange": price_change,
            "priceChangePercent": price_change_pct,
            "volume": int(r["volume"]) if r["volume"] else None,
            "avgVolume10d": tech.get("avg_vol_10d"),
            "marketCap": market_cap,
            "pe": pe,
            "pb": pb,
            "eps": eps,
            "roe": roe,
            "roa": roa,
            "debtToEquity": dte,
            "dividendYield": div_yield,
            "revenueGrowth": revenue_growth,
            "profitGrowth": profit_growth,
            "foreignOwnership": None,   # Not available in current data
            "foreignNetBuy": foreign_net_buy,
            "weekChange52": week_change_52,
            "high52w": high_52w,
            "low52w": low_52w,
            "beta": None,               # Requires index correlation, not implemented
            "rsi14": rsi14,
            "macdSignal": macd_sig,
            "ma20Trend": ma20_tr,
            "signal": signal,
            "sparkline": tech.get("sparkline", []),
        })

    result = {"data": data, "total": len(data)}
    await cache_set(cache_key, result, ttl=300)
    return result
