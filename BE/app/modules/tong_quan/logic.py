from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────

INDEX_NAME_MAP = {
    "VNINDEX": "VN-INDEX",
    "VN30": "VN30",
    "HNXINDEX": "HNX-INDEX",
    "UPCOMINDEX": "UPCOM-INDEX",
}

PERIOD_DAYS = {
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
    "ALL": 99999,
}


def _format_volume(v: float) -> str:
    """Format a numeric volume to a human-readable string."""
    if v >= 1_000_000_000:
        return f"{v / 1_000_000_000:.1f}B"
    if v >= 1_000_000:
        return f"{v / 1_000_000:.1f}M"
    if v >= 1_000:
        return f"{v / 1_000:.0f}K"
    return str(int(v))


def _status(change: float) -> str:
    if change > 0:
        return "up"
    if change < 0:
        return "down"
    return "unchanged"

# ────────────────────────────────────────────────────────────────────
# 0. Ticker Slide — top 10 tăng, top 10 giảm + 4 chỉ số
# ────────────────────────────────────────────────────────────────────
def get_ticker_slide(db: Session) -> List[Dict[str, Any]]:
    """
    Trả danh sách cho thanh trượt dưới header:
      - 4 chỉ số thị trường (VNINDEX, VN30, HNXINDEX, UPCOMINDEX)
      - Top 10 cổ phiếu tăng giá mạnh nhất so với phiên trước
      - Top 10 cổ phiếu giảm giá mạnh nhất so với phiên trước
    Tổng cộng tối đa 24 items.
    """
    cache_key = "ticker_slide"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    # ── 4 chỉ số thị trường ──
    idx_sql = text("""
        SELECT
            t.ticker,
            cur.close AS price,
            cur.close - prev.close AS change,
            CASE WHEN prev.close > 0
                THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                ELSE 0 END AS percent
        FROM (VALUES
            ('VNINDEX', 1),
            ('VN30', 2),
            ('HNXINDEX', 3),
            ('UPCOMINDEX', 4)
        ) AS t(ticker, sort_order)
        CROSS JOIN LATERAL (
            SELECT close
            FROM hethong_phantich_chungkhoan.market_index
            WHERE ticker = t.ticker
            ORDER BY trading_date DESC
            LIMIT 1
        ) cur
        CROSS JOIN LATERAL (
            SELECT close
            FROM hethong_phantich_chungkhoan.market_index
            WHERE ticker = t.ticker
            ORDER BY trading_date DESC
            OFFSET 1 LIMIT 1
        ) prev
        ORDER BY t.sort_order
    """)
    idx_rows = db.execute(idx_sql).mappings().all()

    indices = []
    for r in idx_rows:
        change = float(r["change"] or 0)
        indices.append({
            "symbol": r["ticker"],
            "price": float(r["price"] or 0),
            "change": round(change, 2),
            "percent": float(r["percent"] or 0),
            "category": "index",
        })

    # ── Top 10 tăng + Top 10 giảm (cổ phiếu thường) ──
    stock_sql = text("""
        WITH latest_date AS (
            SELECT MAX(trading_date) AS td
            FROM hethong_phantich_chungkhoan.history_price
        ),
        prev_date AS (
            SELECT MAX(trading_date) AS td
            FROM hethong_phantich_chungkhoan.history_price
            WHERE trading_date < (SELECT td FROM latest_date)
        ),
        changes AS (
            SELECT
                cur.ticker,
                cur.close AS price,
                cur.close - prev.close AS change,
                CASE WHEN prev.close > 0
                    THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                    ELSE 0 END AS percent
            FROM hethong_phantich_chungkhoan.history_price cur
            JOIN hethong_phantich_chungkhoan.history_price prev
                ON cur.ticker = prev.ticker
                AND prev.trading_date = (SELECT td FROM prev_date)
            WHERE cur.trading_date = (SELECT td FROM latest_date)
              AND cur.close IS NOT NULL
              AND prev.close IS NOT NULL
              AND prev.close > 0
        ),
        top_gainers AS (
            SELECT *, 'gainer' AS category
            FROM changes
            ORDER BY percent DESC
            LIMIT 10
        ),
        top_losers AS (
            SELECT *, 'loser' AS category
            FROM changes
            ORDER BY percent ASC
            LIMIT 10
        )
        SELECT * FROM top_gainers
        UNION ALL
        SELECT * FROM top_losers
    """)
    stock_rows = db.execute(stock_sql).mappings().all()

    stocks = []
    for r in stock_rows:
        stocks.append({
            "symbol": r["ticker"],
            "price": float(r["price"] or 0),
            "change": float(r["change"] or 0),
            "percent": float(r["percent"] or 0),
            "category": r["category"],
        })

    result = indices + stocks
    cache_set(cache_key, result, ttl=120)  # cache 2 phút
    return result


# ────────────────────────────────────────────────────────────────────
# 1. Market Index Cards
# ────────────────────────────────────────────────────────────────────
def get_market_index_cards(db: Session) -> List[Dict[str, Any]]:
    """Return latest index values for VNINDEX, VN30, HNX, UPCOM."""
    sql = text("""
        SELECT
            cur.trading_date,
            t.ticker,
            cur.close AS value,
            cur.close - prev.close AS change,
            CASE WHEN prev.close > 0
                THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                ELSE 0 END AS percent
        FROM (VALUES
            ('VNINDEX', 1),
            ('VN30', 2),
            ('HNXINDEX', 3),
            ('UPCOMINDEX', 4)
        ) AS t(ticker, sort_order)
        CROSS JOIN LATERAL (
            SELECT close, trading_date
            FROM hethong_phantich_chungkhoan.market_index
            WHERE ticker = t.ticker
            ORDER BY trading_date DESC
            LIMIT 1
        ) cur
        CROSS JOIN LATERAL (
            SELECT close
            FROM hethong_phantich_chungkhoan.market_index
            WHERE ticker = t.ticker
            ORDER BY trading_date DESC
            OFFSET 1 LIMIT 1
        ) prev
        ORDER BY t.sort_order;
    """)
    
    # ── Redis cache ──
    cache_key = "market_index_cards"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    rows = db.execute(sql).mappings().all()

    results = []
    for r in rows:
        change = float(r["change"] or 0)
        results.append({
            "id": r["ticker"],
            "tradingDate": str(r["trading_date"]) if r["trading_date"] else None,
            "name": INDEX_NAME_MAP.get(r["ticker"], r["ticker"]),
            "value": float(r["value"] or 0),
            "change": round(change, 2),
            "percent": float(r["percent"] or 0),
            "status": _status(change),
        })

    cache_set(cache_key, results, ttl=60)  # cache 1 phút
    return results


# ────────────────────────────────────────────────────────────────────
# 2. Market Chart (OHLCV) — Optimised with Redis cache + downsampling
# ────────────────────────────────────────────────────────────────────

# Ánh xạ period → interval SQL để gom nến (downsampling)
# Với khoảng thời gian lớn, gom dữ liệu theo tuần/tháng để giảm số bản ghi
RESAMPLE_MAP: Dict[str, Optional[str]] = {
    "1W": None,       # daily — ít dữ liệu, giữ nguyên
    "1M": None,       # daily
    "3M": None,       # daily
    "6M": "1 week",   # gom tuần
    "1Y": "1 week",   # gom tuần
    "ALL": "1 month",  # gom tháng
}

# TTL (giây) cho cache theo period — dữ liệu cũ ít thay đổi → cache lâu hơn
CACHE_TTL_MAP: Dict[str, int] = {
    "1W": 60,       # 1 phút
    "1M": 120,      # 2 phút
    "3M": 300,      # 5 phút
    "6M": 600,      # 10 phút
    "1Y": 900,      # 15 phút
    "ALL": 1800,    # 30 phút
}


def _build_market_chart_sql(interval: Optional[str]) -> str:
    """Tạo câu SQL phù hợp: raw daily hoặc aggregated (tuần/tháng)."""
    if interval is None:
        # Trả về dữ liệu daily, không gom
        return """
            SELECT trading_date, open, high, low, close, volume
            FROM hethong_phantich_chungkhoan.market_index
            WHERE ticker = :ticker
              AND trading_date >= :cutoff
            ORDER BY trading_date ASC
        """
    # Gom nến theo interval (tuần / tháng) bằng date_trunc
    # trading_date là kiểu text → cast sang date trước khi dùng date_trunc
    unit = interval.split()[1] if ' ' in interval else interval
    return f"""
        SELECT
            date_trunc('{unit}', trading_date::date)::date AS trading_date,
            (ARRAY_AGG(open ORDER BY trading_date ASC))[1]   AS open,
            MAX(high)                                         AS high,
            MIN(low)                                          AS low,
            (ARRAY_AGG(close ORDER BY trading_date DESC))[1]  AS close,
            SUM(volume)                                       AS volume
        FROM hethong_phantich_chungkhoan.market_index
        WHERE ticker = :ticker
          AND trading_date >= :cutoff
        GROUP BY 1
        ORDER BY 1 ASC
    """


def get_market_chart(
    db: Session,
    ticker: str = "VNINDEX",
    period: str = "1Y",
    page: int = 1,
    page_size: int = 0,
) -> Dict[str, Any]:
    """
    Trả dữ liệu OHLCV cho chart, đã tối ưu:
      - Redis cache tránh query DB lặp lại
      - Downsampling: 6M/1Y gom tuần, ALL gom tháng
      - Hỗ trợ phân trang (page_size > 0) để giảm tải FE

    Returns:
        {
            "data": [...],
            "meta": {"ticker", "period", "total", "page", "page_size", "total_pages"}
        }
    """
    cache_key = f"market_chart:{ticker}:{period}"
    cached = cache_get(cache_key)

    if cached is None:
        # ── Query DB ──────────────────────────────────────────────
        days = PERIOD_DAYS.get(period, 365)
        cutoff = (date.today() - timedelta(days=days)).isoformat()

        interval = RESAMPLE_MAP.get(period)
        sql = text(_build_market_chart_sql(interval))

        rows = db.execute(sql, {"ticker": ticker, "cutoff": cutoff}).mappings().all()
        cached = [
            {
                "date": r["trading_date"].isoformat()
                    if hasattr(r["trading_date"], "isoformat")
                    else str(r["trading_date"]),
                "open": float(r["open"] or 0),
                "high": float(r["high"] or 0),
                "low": float(r["low"] or 0),
                "close": float(r["close"] or 0),
                "volume": int(r["volume"] or 0),
            }
            for r in rows
        ]
        # ── Lưu vào Redis ─────────────────────────────────────────
        ttl = CACHE_TTL_MAP.get(period, 300)
        cache_set(cache_key, cached, ttl=ttl)
        logger.info(
            "market_chart DB query: ticker=%s period=%s rows=%d",
            ticker, period, len(cached),
        )

    # ── Phân trang (nếu FE yêu cầu) ──────────────────────────────
    total = len(cached)

    if page_size > 0:
        total_pages = (total + page_size - 1) // page_size
        start = (page - 1) * page_size
        end = start + page_size
        page_data = cached[start:end]
    else:
        # Không phân trang — trả hết (dữ liệu đã downsampled nên OK)
        total_pages = 1
        page_data = cached

    return {
        "data": page_data,
        "meta": {
            "ticker": ticker,
            "period": period,
            "total": total,
            "page": page,
            "page_size": page_size if page_size > 0 else total,
            "total_pages": total_pages,
        },
    }


# ────────────────────────────────────────────────────────────────────
# 3. Sector Performance
# ────────────────────────────────────────────────────────────────────

def get_sector_performance(db: Session) -> List[Dict[str, Any]]:
    """Average % price change per sector (icb_name2) for the latest trading day.

    Tối ưu:
      - CTE lấy 2 ngày giao dịch gần nhất rồi JOIN thay vì N sub-query tương quan
      - Redis cache 2 phút
    """
    cache_key = "sector_performance"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        WITH latest_date AS (
            SELECT MAX(trading_date) AS td FROM history_price
        ),
        prev_date AS (
            SELECT MAX(trading_date) AS td
            FROM history_price
            WHERE trading_date < (SELECT td FROM latest_date)
        )
        SELECT
            co.icb_name2 AS name,
            ROUND(AVG(
                (cur.close - prev.close) / prev.close * 100
            )::numeric, 2) AS value
        FROM company_overview co
        JOIN history_price cur
            ON cur.ticker = co.ticker
            AND cur.trading_date = (SELECT td FROM latest_date)
        JOIN history_price prev
            ON prev.ticker = co.ticker
            AND prev.trading_date = (SELECT td FROM prev_date)
        WHERE prev.close > 0
          AND cur.close IS NOT NULL
          AND co.icb_name2 IS NOT NULL
        GROUP BY co.icb_name2
        ORDER BY value DESC;
    """)
    rows = db.execute(sql).mappings().all()
    result = [{"name": r["name"], "value": float(r["value"] or 0)} for r in rows]
    cache_set(cache_key, result, ttl=120)
    return result


# ────────────────────────────────────────────────────────────────────
# 4. Market Comparison (international & macro indices)
# ────────────────────────────────────────────────────────────────────

def get_market_comparison(db: Session) -> List[Dict[str, Any]]:
    """Latest close + % change for macro_economy asset types (global indices etc.).

    Redis cache 5 phút — dữ liệu quốc tế cập nhật không quá thường xuyên.
    """
    cache_key = "market_comparison"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        SELECT
            a.asset_type AS name,
            p.prices[1] AS price,
            CASE
                WHEN p.prices[2] > 0
                THEN ROUND(((p.prices[1] - p.prices[2]) / p.prices[2] * 100)::numeric, 2)
                ELSE 0
            END AS change
        FROM (
            SELECT DISTINCT asset_type FROM macro_economy
        ) a
        CROSS JOIN LATERAL (
            SELECT ARRAY(
                SELECT close
                FROM macro_economy me
                WHERE me.asset_type = a.asset_type
                ORDER BY date DESC
                LIMIT 2
            ) AS prices
        ) p
        ORDER BY a.asset_type;
    """)
    rows = db.execute(sql).mappings().all()
    result = [
        {
            "name": r["name"],
            "price": float(r["price"] or 0),
            "change": float(r["change"] or 0),
            "status": _status(float(r["change"] or 0)),
        }
        for r in rows
    ]
    cache_set(cache_key, result, ttl=300)
    return result


# ────────────────────────────────────────────────────────────────────
# 5. Market Breadth
# ────────────────────────────────────────────────────────────────────

def get_market_breadth(db: Session) -> Dict[str, int]:
    """Count advancing / declining / unchanged stocks for the latest trading day.

    Redis cache 2 phút.
    """
    cache_key = "market_breadth"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    sql = text("""
        WITH recent_dates AS (
            SELECT DISTINCT trading_date
            FROM history_price
            ORDER BY trading_date DESC
            LIMIT 2
        ),
        date_vars AS (
            SELECT
                MAX(trading_date) AS t0_date,
                MIN(trading_date) AS t1_date
            FROM recent_dates
        )
        SELECT
            COUNT(*) FILTER (WHERE cur.close > prev.close) AS advancing,
            COUNT(*) FILTER (WHERE cur.close < prev.close) AS declining,
            COUNT(*) FILTER (WHERE cur.close = prev.close) AS unchanged
        FROM date_vars v
        JOIN history_price cur
        ON cur.trading_date = v.t0_date
        JOIN history_price prev
        ON prev.trading_date = v.t1_date
        AND prev.ticker = cur.ticker
        WHERE v.t0_date > v.t1_date
        AND prev.close > 0;
    """)
    r = db.execute(sql).mappings().one()
    result = {
        "advancing": int(r["advancing"] or 0),
        "declining": int(r["declining"] or 0),
        "unchanged": int(r["unchanged"] or 0),
    }
    cache_set(cache_key, result, ttl=120)
    return result


# ────────────────────────────────────────────────────────────────────
# 6. Top Stocks (gainers / losers / foreign)
# ────────────────────────────────────────────────────────────────────

def get_top_stocks(
    db: Session, category: str = "gainers", limit: int = 10
) -> List[Dict[str, Any]]:
    """Top gaining, losing, or foreign-traded stocks.

    Tối ưu:
      - gainers / losers: tận dụng cache của ticker_slide (đã có sẵn top 10
        tăng & top 10 giảm) → không query DB lần nữa.
      - foreign: query riêng + Redis cache 2 phút.
    """

    if category == "foreign":
        cache_key = f"top_stocks:foreign:{limit}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

        sql = text("""
            WITH latest_date AS (
                SELECT MAX(trading_date) AS td FROM history_price
            ),
            prev_date AS (
                SELECT MAX(trading_date) AS td
                FROM history_price
                WHERE trading_date < (SELECT td FROM latest_date)
            )
            SELECT
                cur.ticker  AS symbol,
                cur.close   AS price,
                CASE WHEN prev.close > 0
                    THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                    ELSE 0 END AS change,
                cur.volume
            FROM history_price cur
            JOIN history_price prev
                ON prev.ticker = cur.ticker
                AND prev.trading_date = (SELECT td FROM prev_date)
            JOIN company_overview co
                ON co.ticker = cur.ticker
            WHERE cur.trading_date = (SELECT td FROM latest_date)
              AND cur.close IS NOT NULL
              AND prev.close IS NOT NULL
              AND prev.close > 0
            ORDER BY cur.volume DESC
            LIMIT :limit
        """)
        rows = db.execute(sql, {"limit": limit}).mappings().all()
        result = [
            {
                "symbol": r["symbol"],
                "price": float(r["price"] or 0),
                "change": float(r["change"] or 0),
                "volume": _format_volume(int(r["volume"] or 0)),
            }
            for r in rows
        ]
        cache_set(cache_key, result, ttl=120)
        return result

    # ── Gainers / Losers — tận dụng cache ticker_slide ──
    slide_data = get_ticker_slide(db)  # đã cached sẵn, không query DB thêm
    cat_key = "gainer" if category == "gainers" else "loser"
    filtered = [
        {
            "symbol": item["symbol"],
            "price": item["price"],
            "change": item["percent"],  # percent = % thay đổi
            "volume": "",  # ticker_slide không lưu volume
        }
        for item in slide_data
        if item["category"] == cat_key
    ]
    return filtered[:limit]


# ────────────────────────────────────────────────────────────────────
# 7. Market Heatmap
# ────────────────────────────────────────────────────────────────────

def get_market_heatmap(
    db: Session, exchange: str = "all"
) -> List[Dict[str, Any]]:
    """Sector → stocks treemap data."""
    exchange_filter = ""
    params: Dict[str, Any] = {}
    if exchange != "all":
        exchange_filter = "AND co.exchange = :exchange"
        params["exchange"] = exchange

    sql = text(f"""
        WITH latest_two AS (
            SELECT
                hp.ticker,
                hp.close,
                hp.volume,
                hp.trading_date,
                ROW_NUMBER() OVER (PARTITION BY hp.ticker ORDER BY hp.trading_date DESC) AS rn
            FROM history_price hp
            WHERE hp.close IS NOT NULL AND hp.close > 0
        ),
        stock_data AS (
            SELECT
                co.icb_name2 AS sector,
                cur.ticker,
                cur.close AS price,
                cur.volume,
                ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2) AS p_change
            FROM latest_two cur
            JOIN latest_two prev ON cur.ticker = prev.ticker AND prev.rn = 2
            JOIN company_overview co ON cur.ticker = co.ticker
            WHERE cur.rn = 1
              AND prev.close > 0
              AND co.icb_name2 IS NOT NULL
              {exchange_filter}
        )
        SELECT sector, ticker, price, volume, p_change
        FROM stock_data
        ORDER BY sector, price * volume DESC
    """)
    rows = db.execute(sql, params).mappings().all()

    # Group by sector
    sectors: Dict[str, List[Dict]] = {}
    for r in rows:
        sector = r["sector"]
        if sector not in sectors:
            sectors[sector] = []
        sectors[sector].append({
            "name": r["ticker"],
            "value": float(r["price"] or 0) * int(r["volume"] or 0) / 1_000_000,  # proxy market cap in M
            "pChange": float(r["p_change"] or 0),
            "volume": int(r["volume"] or 0),
        })

    return [
        {"name": sector, "children": stocks[:15]}  # cap at 15 per sector
        for sector, stocks in sectors.items()
    ]


# ────────────────────────────────────────────────────────────────────
# 8. Macro Data
# ────────────────────────────────────────────────────────────────────

SPARKLINE_PERIOD_DAYS = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
}


def get_macro_data(db: Session) -> List[Dict[str, Any]]:
    """Macro indicators with sparkline data for all periods."""
    results = []
    asset_types_sql = text("""
        SELECT DISTINCT asset_type FROM macro_economy ORDER BY asset_type
    """)
    asset_types = [r["asset_type"] for r in db.execute(asset_types_sql).mappings().all()]

    for asset in asset_types:
        # Get latest 2 records for headline values
        latest_sql = text("""
            SELECT close, date
            FROM macro_economy
            WHERE asset_type = :asset
            ORDER BY date DESC
            LIMIT 2
        """)
        latest_rows = db.execute(latest_sql, {"asset": asset}).mappings().all()
        if len(latest_rows) < 2:
            continue

        cur_close = float(latest_rows[0]["close"] or 0)
        prev_close = float(latest_rows[1]["close"] or 0)
        change = round(cur_close - prev_close, 4)
        change_pct = round((change / prev_close * 100), 2) if prev_close else 0

        # Build sparklines for all 4 periods
        sparklines: Dict[str, List[float]] = {}
        for period_key, days in SPARKLINE_PERIOD_DAYS.items():
            cutoff = (date.today() - timedelta(days=days)).isoformat()
            spark_sql = text("""
                SELECT close
                FROM macro_economy
                WHERE asset_type = :asset AND date >= :cutoff
                ORDER BY date ASC
            """)
            spark_rows = db.execute(
                spark_sql, {"asset": asset, "cutoff": cutoff}
            ).mappings().all()
            sparklines[period_key] = [float(s["close"] or 0) for s in spark_rows]

        results.append({
            "name": asset,
            "price": cur_close,
            "change": change,
            "changePct": change_pct,
            "sparklines": sparklines,
        })

    return results


# ────────────────────────────────────────────────────────────────────
# 9. News
# ────────────────────────────────────────────────────────────────────

def get_news(
    db: Session, limit: int = 10, offset: int = 0
) -> List[Dict[str, Any]]:
    """Latest news from the news table."""
    sql = text("""
        SELECT id, source, title, link, published, summary
        FROM news
        ORDER BY published DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    rows = db.execute(sql, {"limit": limit, "offset": offset}).mappings().all()
    return [
        {
            "id": r["id"],
            "title": r["title"],
            "source": r["source"],
            "published": r["published"].isoformat() if r["published"] else None,
            "summary": r["summary"],
            "link": r["link"],
        }
        for r in rows
    ]


# ────────────────────────────────────────────────────────────────────
# 10. Valuation P/E
# ────────────────────────────────────────────────────────────────────

def get_valuation_pe(db: Session) -> List[Dict[str, Any]]:
    """Average market P/E per quarter for the last 8 quarters."""
    sql = text("""
        SELECT
            year,
            quarter,
            ROUND(AVG(pe)::numeric, 2) AS avg_pe
        FROM financial_ratio
        WHERE pe IS NOT NULL AND pe > 0
        GROUP BY year, quarter
        ORDER BY year DESC, quarter DESC
        LIMIT 12
    """)
    rows = db.execute(sql).mappings().all()
    # Reverse so oldest first
    rows = list(reversed(rows))
    return [
        {
            "month": f"Q{r['quarter']}/{r['year']}",
            "value": float(r["avg_pe"] or 0),
        }
        for r in rows
    ]


# ────────────────────────────────────────────────────────────────────
# 11. Liquidity
# ────────────────────────────────────────────────────────────────────

def get_liquidity(db: Session, days: int = 20) -> List[Dict[str, Any]]:
    """Daily total trading value (close * volume) aggregated from history_price."""
    sql = text("""
        SELECT
            trading_date,
            ROUND((SUM(close * volume) / 1e9)::numeric, 0) AS total_value_bn
        FROM history_price
        WHERE close IS NOT NULL AND volume IS NOT NULL
        GROUP BY trading_date
        ORDER BY trading_date DESC
        LIMIT :days
    """)
    rows = db.execute(sql, {"days": days}).mappings().all()
    # Reverse so oldest first
    rows = list(reversed(rows))
    return [
        {
            "date": r["trading_date"],
            "value": float(r["total_value_bn"] or 0),
        }
        for r in rows
    ]
