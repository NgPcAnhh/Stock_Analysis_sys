from __future__ import annotations

import logging
import re
from datetime import date, timedelta
from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cached

logger = logging.getLogger(__name__)

# Statement timeout (ms) — cancel slow queries to protect pool
_STMT_TIMEOUT = text("SET LOCAL statement_timeout = '15000'")

SCHEMA = "hethong_phantich_chungkhoan"


# ────────────────────────────────────────────────────────────────────
# Helper: two most recent trading dates from history_price (text type)
# ────────────────────────────────────────────────────────────────────
_RANKED_DATES_CTE = f"""
    ranked_dates AS (
        SELECT trading_date,
               ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
        FROM {SCHEMA}.history_price
        WHERE close IS NOT NULL
        GROUP BY trading_date
        HAVING COUNT(*) >= 50
    ),
    latest_date AS (SELECT trading_date AS td FROM ranked_dates WHERE rn = 1),
    prev_date   AS (SELECT trading_date AS td FROM ranked_dates WHERE rn = 2)
"""

# Helper: two most recent trading dates from electric_board (date type)
_EB_RANKED_DATES_CTE = f"""
    eb_ranked AS (
        SELECT trading_date,
               ROW_NUMBER() OVER (ORDER BY trading_date DESC) AS rn
        FROM {SCHEMA}.electric_board
        WHERE match_price IS NOT NULL
        GROUP BY trading_date
    ),
    eb_latest AS (SELECT trading_date AS td FROM eb_ranked WHERE rn = 1),
    eb_prev   AS (SELECT trading_date AS td FROM eb_ranked WHERE rn = 2)
"""


def _slugify(name: str) -> str:
    """Convert Vietnamese sector name to a URL-safe slug."""
    s = name.lower().strip()
    s = re.sub(r"[àáạảãâầấậẩẫăằắặẳẵ]", "a", s)
    s = re.sub(r"[èéẹẻẽêềếệểễ]", "e", s)
    s = re.sub(r"[ìíịỉĩ]", "i", s)
    s = re.sub(r"[òóọỏõôồốộổỗơờớợởỡ]", "o", s)
    s = re.sub(r"[ùúụủũưừứựửữ]", "u", s)
    s = re.sub(r"[ỳýỵỷỹ]", "y", s)
    s = re.sub(r"đ", "d", s)
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def _fmt_market_cap(v: float) -> str:
    """Format market cap in tỷ VND."""
    if v >= 1_000_000:
        return f"{v / 1_000:,.0f}T"
    if v >= 1_000:
        return f"{v:,.0f}T"
    return f"{v:,.0f}T"


# ────────────────────────────────────────────────────────────────────
# 1. Market Heatmap
# ────────────────────────────────────────────────────────────────────
@cached("market:heatmap", ttl=120)
async def get_market_heatmap(
    db: AsyncSession, exchange: str = "all"
) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    exchange_filter = ""
    params: Dict[str, Any] = {}
    if exchange != "all":
        exchange_map = {"HOSE": "HSX", "HNX": "HNX", "UPCOM": "UPCOM"}
        eb_code = exchange_map.get(exchange, exchange)
        exchange_filter = "AND eb.exchange = :exchange"
        params["exchange"] = eb_code

    sql = text(f"""
        SELECT sector, ticker, price, volume, p_change
        FROM (
            SELECT DISTINCT ON (eb.ticker)
                co.icb_name2                                      AS sector,
                eb.ticker,
                eb.match_price                                    AS price,
                COALESCE(eb.accumulated_volume, 0)                AS volume,
                CASE WHEN eb.ref_price > 0
                     THEN ROUND(((eb.match_price - eb.ref_price)
                                 / eb.ref_price * 100)::numeric, 2)
                     ELSE 0 END                                   AS p_change,
                eb.match_price * COALESCE(eb.accumulated_volume, 0) AS trade_val
            FROM {SCHEMA}.electric_board eb
            JOIN {SCHEMA}.company_overview co ON eb.ticker = co.ticker
            WHERE eb.trading_date = (
                    SELECT MAX(trading_date)
                    FROM {SCHEMA}.electric_board
                    WHERE match_price IS NOT NULL
                  )
              AND eb.match_price IS NOT NULL
              AND eb.match_price > 0
              AND co.icb_name2 IS NOT NULL
              {exchange_filter}
            ORDER BY eb.ticker, trade_val DESC
        ) sub
        ORDER BY sector, trade_val DESC
    """)
    res = await db.execute(sql, params)
    rows = res.mappings().all()

    sectors: Dict[str, List[Dict]] = {}
    for r in rows:
        sector = r["sector"]
        if sector not in sectors:
            sectors[sector] = []
        if len(sectors[sector]) < 20:
            sectors[sector].append({
                "name": r["ticker"],
                "value": float(r["price"] or 0) * int(r["volume"] or 0) / 1_000_000,
                "pChange": float(r["p_change"] or 0),
                "volume": int(r["volume"] or 0),
            })

    result = [
        {"name": sector, "children": stocks}
        for sector, stocks in sectors.items()
        if stocks
    ]
    return result


# ────────────────────────────────────────────────────────────────────
# 2. Cash Flow Distribution
# ────────────────────────────────────────────────────────────────────
@cached("market:cash_flow", ttl=120)
async def get_cash_flow(db: AsyncSession) -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    sql = text(f"""
        WITH {_RANKED_DATES_CTE}
        SELECT
            ROUND((SUM(CASE WHEN cur.close > prev.close
                        THEN cur.close * cur.volume ELSE 0 END) / 1e9)::numeric, 1) AS advancing_value,
            ROUND((SUM(CASE WHEN cur.close = prev.close
                        THEN cur.close * cur.volume ELSE 0 END) / 1e9)::numeric, 1) AS unchanged_value,
            ROUND((SUM(CASE WHEN cur.close < prev.close
                        THEN cur.close * cur.volume ELSE 0 END) / 1e9)::numeric, 1) AS declining_value,
            COUNT(*) FILTER (WHERE cur.close > prev.close) AS advancing_count,
            COUNT(*) FILTER (WHERE cur.close = prev.close) AS unchanged_count,
            COUNT(*) FILTER (WHERE cur.close < prev.close) AS declining_count
        FROM {SCHEMA}.history_price cur
        JOIN {SCHEMA}.history_price prev
            ON cur.ticker = prev.ticker
            AND prev.trading_date = (SELECT td FROM prev_date)
        WHERE cur.trading_date = (SELECT td FROM latest_date)
          AND cur.close IS NOT NULL
          AND prev.close IS NOT NULL
          AND prev.close > 0
    """)
    res = await db.execute(sql)
    r = res.mappings().one()

    result = {
        "advancingValue": float(r["advancing_value"] or 0),
        "unchangedValue": float(r["unchanged_value"] or 0),
        "decliningValue": float(r["declining_value"] or 0),
        "advancingCount": int(r["advancing_count"] or 0),
        "unchangedCount": int(r["unchanged_count"] or 0),
        "decliningCount": int(r["declining_count"] or 0),
    }
    return result


# ────────────────────────────────────────────────────────────────────
# 3. Index Impact — Top stocks by estimated impact on VNINDEX
#    Uses trade-value weighting since financial_ratio may lack
#    outstanding_shares for some tickers.
# ────────────────────────────────────────────────────────────────────
@cached("market:index_impact", ttl=120)
async def get_index_impact(db: AsyncSession, limit: int = 10) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    sql = text(f"""
        WITH {_RANKED_DATES_CTE},
        market_total AS (
            SELECT SUM(cur.close * cur.volume) AS total_val
            FROM {SCHEMA}.history_price cur
            WHERE cur.trading_date = (SELECT td FROM latest_date)
              AND cur.close IS NOT NULL
              AND cur.volume > 0
        )
        SELECT
            cur.ticker,
            ROUND(
                ((cur.close - prev.close) * cur.volume / mt.total_val * 1000)::numeric, 2
            ) AS impact
        FROM {SCHEMA}.history_price cur
        JOIN {SCHEMA}.history_price prev
            ON cur.ticker = prev.ticker
            AND prev.trading_date = (SELECT td FROM prev_date)
        CROSS JOIN market_total mt
        WHERE cur.trading_date = (SELECT td FROM latest_date)
          AND cur.close IS NOT NULL
          AND prev.close IS NOT NULL
          AND prev.close > 0
          AND cur.volume > 0
          AND mt.total_val > 0
        ORDER BY ABS((cur.close - prev.close) * cur.volume) DESC
        LIMIT :limit
    """)
    res = await db.execute(sql, {"limit": limit})
    rows = res.mappings().all()

    result = [
        {"ticker": r["ticker"], "impact": float(r["impact"] or 0)}
        for r in rows
    ]
    return result


# ────────────────────────────────────────────────────────────────────
# 4. Foreign Flow — Net foreign by date (last N days)
#    electric_board.trading_date is DATE type — use INTERVAL for arithmetic.
# ────────────────────────────────────────────────────────────────────
@cached("market:foreign_flow", ttl=120)
async def get_foreign_flow(db: AsyncSession, days: int = 10) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    sql = text(f"""
        WITH eb_max AS (
            SELECT MAX(trading_date) AS max_td
            FROM {SCHEMA}.electric_board
            WHERE match_price IS NOT NULL
        )
        SELECT
            eb.trading_date,
            ROUND((SUM(
                COALESCE(eb.foreign_buy_volume, 0) * eb.match_price
                - COALESCE(eb.foreign_sell_volume, 0) * eb.match_price
            ) / 1e9)::numeric, 1) AS net_val
        FROM {SCHEMA}.electric_board eb
        CROSS JOIN eb_max
        WHERE eb.match_price IS NOT NULL
          AND eb.match_price > 0
          AND eb.trading_date >= eb_max.max_td - make_interval(days => :days)
        GROUP BY eb.trading_date
        ORDER BY eb.trading_date ASC
    """)
    res = await db.execute(sql, {"days": days})
    rows = res.mappings().all()

    result = [
        {
            "date": r["trading_date"].strftime("%d/%m")
                if hasattr(r["trading_date"], "strftime")
                else str(r["trading_date"])[5:10].replace("-", "/"),
            "netVal": float(r["net_val"] or 0),
        }
        for r in rows
    ]
    return result


# ────────────────────────────────────────────────────────────────────
# 5. Sector Overview — change + volume + value per sector
# ────────────────────────────────────────────────────────────────────
@cached("market:sector_overview", ttl=120)
async def get_sector_overview(db: AsyncSession) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    sql = text(f"""
        WITH {_RANKED_DATES_CTE}
        SELECT
            co.icb_name2 AS name,
            ROUND(AVG(
                (cur.close - prev.close) / prev.close * 100
            )::numeric, 2) AS change,
            SUM(cur.volume)::bigint AS volume,
            ROUND((SUM(cur.close * cur.volume) / 1e9)::numeric, 0) AS value
        FROM {SCHEMA}.company_overview co
        JOIN {SCHEMA}.history_price cur
            ON cur.ticker = co.ticker
            AND cur.trading_date = (SELECT td FROM latest_date)
        JOIN {SCHEMA}.history_price prev
            ON prev.ticker = co.ticker
            AND prev.trading_date = (SELECT td FROM prev_date)
        WHERE prev.close > 0
          AND cur.close IS NOT NULL
          AND co.icb_name2 IS NOT NULL
        GROUP BY co.icb_name2
        ORDER BY change DESC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()

    result = [
        {
            "name": r["name"],
            "change": float(r["change"] or 0),
            "volume": int(r["volume"] or 0),
            "value": float(r["value"] or 0),
            "cashFlow": float(r["value"] or 0),
        }
        for r in rows
    ]
    return result


# ────────────────────────────────────────────────────────────────────
# 6. Sector Analysis Table — P/E, P/B, market cap, price changes
#    P/E & P/B computed from BCTC data (weighted: Σmarket_cap / Σearnings|equity).
# ────────────────────────────────────────────────────────────────────
@cached("market:sector_analysis", ttl=300)
async def get_sector_analysis(db: AsyncSession) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    sql = text(f"""
        WITH {_RANKED_DATES_CTE},
        date_7d AS (
            SELECT trading_date AS td FROM ranked_dates WHERE rn = 6
        ),
        ytd_date AS (
            SELECT MIN(trading_date) AS td
            FROM {SCHEMA}.history_price
            WHERE close IS NOT NULL
              AND trading_date >= date_trunc('year', (SELECT td FROM latest_date)::date)::text
        ),
        date_1y AS (
            SELECT MAX(trading_date) AS td
            FROM {SCHEMA}.history_price
            WHERE close IS NOT NULL
              AND trading_date <= ((SELECT td FROM latest_date)::date - INTERVAL '1 year')::text
        ),
        date_3y AS (
            SELECT MAX(trading_date) AS td
            FROM {SCHEMA}.history_price
            WHERE close IS NOT NULL
              AND trading_date <= ((SELECT td FROM latest_date)::date - INTERVAL '3 years')::text
        ),
        -- BCTC data for computing P/E, P/B
        bctc_data AS (
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
                ticker, market_cap
            FROM {SCHEMA}.financial_ratio
            ORDER BY ticker, year DESC, quarter DESC
        ),
        stock_data AS (
            SELECT
                co.icb_name2 AS sector,
                co.ticker,
                -- Raw market cap for P/E, P/B aggregation (VND-based)
                CASE WHEN sh.shares > 0 AND cur.close > 0
                    THEN cur.close * 1000 * sh.shares
                    ELSE NULL
                END AS mcap_raw,
                -- Market cap in tỷ for display / sorting
                CASE WHEN sh.shares > 0 AND cur.close > 0
                    THEN cur.close * 1000 * sh.shares / 1e9
                    ELSE COALESCE(fr.market_cap, cur.close * cur.volume)
                END AS market_cap,
                -- TTM net income (positive only, for sector P/E)
                CASE WHEN ni.ttm_ni > 0 THEN ni.ttm_ni ELSE NULL END AS ttm_ni_pos,
                -- Equity (positive only, for sector P/B)
                CASE WHEN eq.equity > 0 THEN eq.equity ELSE NULL END AS equity_pos,
                CASE WHEN prev.close > 0
                     THEN (cur.close - prev.close) / prev.close * 100
                     ELSE 0 END AS change_1d,
                CASE WHEN d7.close > 0
                     THEN (cur.close - d7.close) / d7.close * 100
                     ELSE NULL END AS change_7d,
                CASE WHEN ytd.close > 0
                     THEN (cur.close - ytd.close) / ytd.close * 100
                     ELSE NULL END AS change_ytd,
                CASE WHEN y1.close > 0
                     THEN (cur.close - y1.close) / y1.close * 100
                     ELSE NULL END AS change_1y,
                CASE WHEN y3.close > 0
                     THEN (cur.close - y3.close) / y3.close * 100
                     ELSE NULL END AS change_3y
            FROM {SCHEMA}.company_overview co
            JOIN {SCHEMA}.history_price cur
                ON cur.ticker = co.ticker
                AND cur.trading_date = (SELECT td FROM latest_date)
            JOIN {SCHEMA}.history_price prev
                ON prev.ticker = co.ticker
                AND prev.trading_date = (SELECT td FROM prev_date)
            LEFT JOIN {SCHEMA}.history_price d7
                ON d7.ticker = co.ticker
                AND d7.trading_date = (SELECT td FROM date_7d)
            LEFT JOIN {SCHEMA}.history_price ytd
                ON ytd.ticker = co.ticker
                AND ytd.trading_date = (SELECT td FROM ytd_date)
            LEFT JOIN {SCHEMA}.history_price y1
                ON y1.ticker = co.ticker
                AND y1.trading_date = (SELECT td FROM date_1y)
            LEFT JOIN {SCHEMA}.history_price y3
                ON y3.ticker = co.ticker
                AND y3.trading_date = (SELECT td FROM date_3y)
            LEFT JOIN shares sh ON sh.ticker = co.ticker
            LEFT JOIN equity eq ON eq.ticker = co.ticker
            LEFT JOIN ttm_ni ni ON ni.ticker = co.ticker
            LEFT JOIN latest_fr fr ON fr.ticker = co.ticker
            WHERE cur.close IS NOT NULL
              AND prev.close > 0
              AND co.icb_name2 IS NOT NULL
        )
        SELECT
            sector AS name,
            COUNT(*)::int AS stock_count,
            ROUND(COALESCE(SUM(market_cap), 0)::numeric, 0) AS market_cap,
            -- Sector P/E = Σ market_cap / Σ TTM_net_income (weighted)
            CASE WHEN SUM(CASE WHEN ttm_ni_pos IS NOT NULL AND mcap_raw IS NOT NULL
                             THEN ttm_ni_pos ELSE 0 END) > 0
                THEN ROUND(
                    (SUM(CASE WHEN ttm_ni_pos IS NOT NULL AND mcap_raw IS NOT NULL
                              THEN mcap_raw ELSE 0 END)::numeric
                     / SUM(CASE WHEN ttm_ni_pos IS NOT NULL AND mcap_raw IS NOT NULL
                               THEN ttm_ni_pos ELSE 0 END)::numeric
                    ), 2)
                ELSE NULL END AS pe,
            -- Sector P/B = Σ market_cap / Σ equity (weighted)
            CASE WHEN SUM(CASE WHEN equity_pos IS NOT NULL AND mcap_raw IS NOT NULL
                             THEN equity_pos ELSE 0 END) > 0
                THEN ROUND(
                    (SUM(CASE WHEN equity_pos IS NOT NULL AND mcap_raw IS NOT NULL
                              THEN mcap_raw ELSE 0 END)::numeric
                     / SUM(CASE WHEN equity_pos IS NOT NULL AND mcap_raw IS NOT NULL
                               THEN equity_pos ELSE 0 END)::numeric
                    ), 2)
                ELSE NULL END AS pb,
            ROUND(AVG(change_1d)::numeric, 2) AS change_1d,
            ROUND(AVG(change_7d)::numeric, 2) AS change_7d,
            ROUND(AVG(change_ytd)::numeric, 2) AS change_ytd,
            ROUND(AVG(change_1y)::numeric, 2) AS change_1y,
            ROUND(AVG(change_3y)::numeric, 2) AS change_3y
        FROM stock_data
        GROUP BY sector
        ORDER BY market_cap DESC
    """)
    res = await db.execute(sql)
    rows = res.mappings().all()

    result = [
        {
            "name": r["name"],
            "stockCount": int(r["stock_count"]),
            "marketCap": _fmt_market_cap(float(r["market_cap"] or 0)),
            "pe": float(r["pe"]) if r["pe"] is not None else 0,
            "pb": float(r["pb"]) if r["pb"] is not None else 0,
            "priceChange1D": float(r["change_1d"]) if r["change_1d"] is not None else 0,
            "priceChange7D": float(r["change_7d"]) if r["change_7d"] is not None else 0,
            "priceChangeYTD": float(r["change_ytd"]) if r["change_ytd"] is not None else 0,
            "priceChange1Y": float(r["change_1y"]) if r["change_1y"] is not None else 0,
            "priceChange3Y": float(r["change_3y"]) if r["change_3y"] is not None else 0,
        }
        for r in rows
    ]
    return result


# ────────────────────────────────────────────────────────────────────
# 7. Sector Watchlist — Stocks grouped by sector
# ────────────────────────────────────────────────────────────────────
@cached("market:sector_watchlist", ttl=120)
async def get_sector_watchlist(db: AsyncSession) -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    # Query 1: count distinct tickers per sector from canonical company_overview.
    counts_sql = text(f"""
        WITH unique_co AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                BTRIM(icb_name2) AS sector
            FROM {SCHEMA}.company_overview
            WHERE ticker IS NOT NULL
              AND BTRIM(ticker) NOT IN ('', 'NaN')
              AND UPPER(BTRIM(ticker)) NOT LIKE '%INDEX'
              AND icb_name2 IS NOT NULL
              AND BTRIM(icb_name2) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(ticker)),
                CASE
                    WHEN exchange IS NOT NULL
                        AND BTRIM(exchange) NOT IN ('', 'NaN', 'DELISTED') THEN 0
                    ELSE 1
                END,
                exchange
        )
        SELECT sector, COUNT(*)::int AS stock_count
        FROM unique_co
        GROUP BY sector
        ORDER BY sector
    """)
    counts_res = await db.execute(counts_sql)
    count_rows = counts_res.mappings().all()

    if not count_rows:
        return {"sectors": [], "stocks": {}}

    # Query 2: fetch stock details and price calculations.
    details_sql = text(f"""
        WITH {_RANKED_DATES_CTE},
        unique_co AS (
            SELECT DISTINCT ON (UPPER(BTRIM(ticker)))
                UPPER(BTRIM(ticker)) AS ticker,
                BTRIM(icb_name2) AS sector,
                organ_short_name,
                CASE
                    WHEN exchange = 'HSX' THEN 'HOSE'
                    WHEN exchange IS NOT NULL AND BTRIM(exchange) NOT IN ('', 'NaN') THEN BTRIM(exchange)
                    ELSE NULL
                END AS exchange
            FROM {SCHEMA}.company_overview
            WHERE ticker IS NOT NULL
              AND BTRIM(ticker) NOT IN ('', 'NaN')
              AND UPPER(BTRIM(ticker)) NOT LIKE '%INDEX'
              AND icb_name2 IS NOT NULL
              AND BTRIM(icb_name2) NOT IN ('', 'NaN')
            ORDER BY UPPER(BTRIM(ticker)),
                CASE
                    WHEN exchange IS NOT NULL
                        AND BTRIM(exchange) NOT IN ('', 'NaN', 'DELISTED') THEN 0
                    ELSE 1
                END,
                exchange
        )
        SELECT
            co.sector,
            co.ticker,
            co.organ_short_name AS company_name,
            co.exchange,
            cur.close AS price,
            COALESCE(prev.close, 0) AS ref_price,
            CASE WHEN prev.close > 0
                 THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                 ELSE 0 END AS change,
            CASE WHEN prev.close > 0
                 THEN ROUND((cur.close - prev.close)::numeric, 2)
                 ELSE 0 END AS price_change,
            cur.volume,
            ROUND((cur.close * cur.volume)::numeric, 0) AS trade_value
        FROM unique_co co
        JOIN {SCHEMA}.history_price cur
            ON UPPER(BTRIM(cur.ticker)) = co.ticker
            AND cur.trading_date = (SELECT td FROM latest_date)
            AND cur.close IS NOT NULL
        LEFT JOIN {SCHEMA}.history_price prev
            ON UPPER(BTRIM(prev.ticker)) = co.ticker
            AND prev.trading_date = (SELECT td FROM prev_date)
        ORDER BY co.sector, trade_value DESC
    """)
    details_res = await db.execute(details_sql)
    rows = details_res.mappings().all()

    def _clean(v: Any) -> str:
        """Return empty string for None, NaN, or 'NaN' values."""
        if v is None or str(v).strip().lower() == "nan":
            return ""
        return str(v).strip()

    # Group by sector
    sector_stocks: Dict[str, List[Dict]] = {}
    for r in rows:
        sector = r["sector"]
        if sector not in sector_stocks:
            sector_stocks[sector] = []
        sector_stocks[sector].append({
            "symbol": r["ticker"],
            "companyName": _clean(r["company_name"]),
            "exchange": _clean(r["exchange"]),
            "price": float(r["price"] or 0),
            "refPrice": float(r["ref_price"] or 0),
            "priceChange": float(r["price_change"] or 0),
            "change": float(r["change"] or 0),
            "volume": int(r["volume"] or 0),
            "tradeValue": float(r["trade_value"] or 0),
        })

    # Build sectors list from count query, then attach stocks from details query.
    sectors = []
    stocks_map: Dict[str, List[Dict]] = {}
    for r in count_rows:
        sector_name = r["sector"]
        slug = _slugify(sector_name)
        sectors.append({
            "id": slug,
            "name": sector_name,
            "count": int(r["stock_count"] or 0),
        })
        stocks_map[slug] = sector_stocks.get(sector_name, [])

    result = {"sectors": sectors, "stocks": stocks_map}
    return result
