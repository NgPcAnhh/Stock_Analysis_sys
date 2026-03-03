"""
SQL queries and business logic for the Stock module.

Endpoints:
  1. get_stock_overview   — mega endpoint (overview tab)
  2. get_price_history    — OHLCV chart data
  3. get_financial_ratios — ratio table (pe, pb, roe, …)
  4. get_financial_reports — IS, BS, CF from BCTC table
  5. get_company_profile  — company info + events + owners
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cached

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────
# Constants (shared with analysis module via import)
# ────────────────────────────────────────────────────────────────────
_STMT_TIMEOUT = text("SET LOCAL statement_timeout = '15000'")
SCHEMA = "hethong_phantich_chungkhoan"

# CTEs for latest trading dates
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


# ────────────────────────────────────────────────────────────────────
# BCTC ind_code mappings for financial statements
# (Vietnamese-encoded names as stored in DB)
# ────────────────────────────────────────────────────────────────────
# Income Statement
IS_CODES: Dict[str, str] = {
    "revenue":          "DOANH_THU_THU_N",                           # Doanh thu thuần
    "costOfGoodsSold":  "GI_V_N_H_NG_B_N",                           # Giá vốn hàng bán
    "grossProfit":      "L_I_G_P",                                    # Lợi nhuận gộp
    "sellingExpenses":  "CHI_PH_B_N_H_NG",                            # Chi phí bán hàng
    "adminExpenses":    "CHI_PH_QU_N_L_DN",                           # Chi phí quản lý DN
    "operatingProfit":  "L_I_L_T_HO_T_NG_KINH_DOANH",                # LN từ HĐKD
    "financialIncome":  "THU_NH_P_T_I_CH_NH",                         # Thu nhập tài chính
    "financialExpenses":"CHI_PH_T_I_CH_NH",                           # Chi phí tài chính
    "interestExpenses": "CHI_PH_TI_N_L_I_VAY",                        # Chi phí lãi vay
    "profitBeforeTax":  "LN_TR_C_THU",                                # LNTT
    "incomeTax":        "CHI_PH_THU_TNDN_HI_N_H_NH",                  # Thuế TNDN hiện hành
    "netProfit":        "L_I_NHU_N_THU_N",                            # LNST
    "netProfitParent":  "L_I_NHU_N_SAU_THU_C_A_C_NG_C_NG_TY_M_NG",   # LNST của CTMN
    "basicEps":         "L_I_C_B_N_TR_N_C_PHI_U",                     # EPS cơ bản (VND/share)
}

# Balance Sheet
BS_CODES: Dict[str, str] = {
    "totalAssets":          "T_NG_C_NG_T_I_S_N_NG",           # Tổng cộng tài sản
    "currentAssets":        "T_I_S_N_NG_N_H_N_NG",            # TS ngắn hạn
    "cash":                 "TI_N_V_T_NG_NG_TI_N_NG",         # Tiền và tương đương tiền
    "shortTermInvestments": "GI_TR_THU_N_U_T_NG_N_H_N_NG",    # Đầu tư ngắn hạn
    "shortTermReceivables": "C_C_KHO_N_PH_I_THU_NG_N_H_N_NG", # Phải thu ngắn hạn
    "inventory":            "H_NG_T_N_KHO_R_NG_NG",            # Hàng tồn kho
    "nonCurrentAssets":     "T_I_S_N_D_I_H_N_NG",             # TS dài hạn
    "fixedAssets":          "GI_TR_R_NG_T_I_S_N_U_T",         # TSCĐ
    "longTermInvestments":  "U_T_D_I_H_N_NG",                  # Đầu tư dài hạn
    "totalLiabilities":     "N_PH_I_TR_NG",                    # Tổng nợ phải trả
    "currentLiabilities":   "N_NG_N_H_N_NG",                   # Nợ ngắn hạn
    "longTermLiabilities":  "N_D_I_H_N_NG",                    # Nợ dài hạn
    "totalEquity":          "V_N_CH_S_H_U_NG",                 # Vốn chủ sở hữu
    "charterCapital":       "V_N_G_P_C_A_CH_S_H_U_NG",        # Vốn góp
    "retainedEarnings":     "L_I_CH_A_PH_N_PH_I_NG",          # LN chưa phân phối
    "outstandingSharesPar": "C_PHI_U_PH_TH_NG_NG",             # CP phổ thông (par value)
}

# Cash Flow
CF_CODES: Dict[str, str] = {
    "operatingCashFlow":     "L_U_CHUY_N_TI_N_T_R_NG_T_C_C_HO_T_NG_SXKD",          # LCTT từ HĐSXKD
    "profitBeforeTax":       "LN_TR_C_THU",                                           # LNTT
    "depreciationAmortization": "KH_U_HAO_TSC",                                       # Khấu hao TSCĐ
    "provisionsAndReserves": "D_PH_NG_RR_T_N_D_NG",                                   # Dự phòng rủi ro
    "workingCapitalChanges": "L_U_CHUY_N_TI_N_THU_N_T_H_KD_TR_C_THAY_I_VL",          # LCTT thuần trước thay đổi VLĐ
    "interestPaid":          "CHI_PH_L_I_VAY_TR",                                     # Chi phí lãi vay trả
    "incomeTaxPaid":         "TI_N_THU_NH_P_DOANH_NGHI_P_TR",                         # Thuế TNDN trả
    "investingCashFlow":     "L_U_CHUY_N_T_HO_T_NG_U_T",                              # LCTT từ HĐĐT
    "purchaseOfFixedAssets": "MUA_S_M_TSC",                                            # Mua sắm TSCĐ
    "proceedsFromDisposal":  "TI_N_THU_C_T_THANH_L_T_I_S_N_C_NH",                     # Thu từ thanh lý TSCĐ
    "investmentInSubsidiaries":"U_T_V_O_C_C_DOANH_NGHI_P_KH_C",                      # Đầu tư vào DN khác
    "financingCashFlow":     "L_U_CHUY_N_TI_N_T_HO_T_NG_T_I_CH_NH",                   # LCTT từ HĐTC
    "proceedsFromBorrowing": "TI_N_THU_C_C_C_KHO_N_I_VAY",                             # Thu từ vay
    "repaymentOfBorrowing":  "TI_N_TR_C_C_KHO_N_I_VAY",                                # Trả nợ vay
    "dividendsPaid":         "C_T_C_TR",                                                # Cổ tức trả
    "proceedsFromEquity":    "T_NG_V_N_C_PH_N_T_G_P_V_N_V_HO_C_PH_T_H_NH_C_PHI_U",   # Tăng vốn cổ phần
    "netCashChange":         "L_U_CHUY_N_TI_N_THU_N_TRONG_K",                          # LC tiền thuần trong kỳ
    "beginningCash":         "TI_N_V_T_NG_NG_TI_N",                                    # Tiền đầu kỳ
    "endingCash":            "TI_N_V_T_NG_NG_TI_N_CU_I_K",                              # Tiền cuối kỳ
}

# ── Bank / securities-firm IS fallback codes ──
# Banks don't have DOANH_THU_THU_N, GI_V_N_H_NG_B_N, etc.
# Map to bank-specific equivalents so charts still render for bank tickers.
IS_BANK_FALLBACKS: Dict[str, str] = {
    "revenue":          "DOANH_THU_NG",                    # Doanh thu (đồng) — fallback
    "grossProfit":      "T_NG_THU_NH_P_HO_T_NG",          # Tổng thu nhập hoạt động
    "operatingProfit":  "LN_T_H_KD_TR_C_CF_D_PH_NG",     # LN từ HĐKD trước CF dự phòng
    "financialIncome":  "THU_NH_P_L_I_THU_N",              # Thu nhập lãi thuần
    "financialExpenses":"CHI_PH_L_I_V_C_C_KHO_N_T_NG_T",  # Chi phí lãi và tương tự
    "incomeTax":        "THU_TNDN",                         # Thuế TNDN (bank-aggregate)
}


# ────────────────────────────────────────────────────────────────────
# Helpers (shared with analysis module via import)
# ────────────────────────────────────────────────────────────────────
def _fmt_market_cap(v: Optional[float]) -> str:
    if not v or v <= 0:
        return "N/A"
    if v >= 1e12:
        return f"{v / 1e12:,.0f} N tỷ"
    if v >= 1e9:
        return f"{v / 1e9:,.1f} tỷ"
    return f"{v:,.0f}"


def _fmt_volume(v: Optional[int]) -> str:
    if not v:
        return "0"
    if v >= 1e6:
        return f"{v / 1e6:,.1f}M"
    if v >= 1e3:
        return f"{v / 1e3:,.1f}K"
    return str(v)


def _safe_float(v: Any, default: float = 0.0) -> float:
    if v is None:
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def _safe_int(v: Any, default: int = 0) -> int:
    if v is None:
        return default
    try:
        return int(v)
    except (ValueError, TypeError):
        return default


def _safe_round(v: Any, ndigits: int = 2) -> Optional[float]:
    if v is None:
        return None
    try:
        return round(float(v), ndigits)
    except (ValueError, TypeError):
        return None


def _compute_evaluation(ratio: Dict, current_price: float, ref_price: float) -> Dict[str, str]:
    """Compute evaluation ratings from actual financial ratio data.

    Rating logic (each dimension: Tốt / Khá / Trung bình / Yếu):
      - risk: based on debt_to_equity & current_ratio
      - valuation: based on PE & PB vs typical thresholds
      - fundamentalAnalysis: based on ROE & net_margin
      - technicalAnalysis: based on price trend (current vs ref)
    """
    def _rate3(good: bool, bad: bool) -> str:
        if good:
            return "Tốt"
        if bad:
            return "Yếu"
        return "Trung bình"

    # ── Risk (debt & liquidity) ──
    de = _safe_float(ratio.get("debt_to_equity"))
    cr = _safe_float(ratio.get("current_ratio"))
    if de > 0 and cr > 0:
        risk = _rate3(de < 0.5 and cr > 2, de > 2 or cr < 0.8)
    elif de > 0:
        risk = _rate3(de < 0.5, de > 2)
    else:
        risk = "N/A"

    # ── Valuation (PE & PB) ──
    pe = _safe_float(ratio.get("pe"))
    pb = _safe_float(ratio.get("pb"))
    if pe > 0 and pb > 0:
        val = _rate3(pe < 10 and pb < 1.5, pe > 25 or pb > 4)
    elif pe > 0:
        val = _rate3(pe < 10, pe > 25)
    else:
        val = "N/A"

    # ── Fundamental (profitability) ──
    roe = _safe_float(ratio.get("roe"))
    nm = _safe_float(ratio.get("net_margin"))
    if roe != 0:
        fund = _rate3(roe > 15 and nm > 10, roe < 5 or nm < 2)
    else:
        fund = "N/A"

    # ── Technical (simple price momentum) ──
    if current_price > 0 and ref_price > 0:
        chg_pct = (current_price - ref_price) / ref_price * 100
        tech = _rate3(chg_pct > 1, chg_pct < -1)
    else:
        tech = "N/A"

    return {
        "risk": risk,
        "valuation": val,
        "fundamentalAnalysis": fund,
        "technicalAnalysis": tech,
    }


# ────────────────────────────────────────────────────────────────────
# 1. Stock Overview — Mega endpoint
# ────────────────────────────────────────────────────────────────────
@cached("stock:overview", ttl=60)
async def get_stock_overview(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    """Aggregate overview data for a single stock ticker."""
    await db.execute(_STMT_TIMEOUT)

    ticker = ticker.upper()

    # Run sub-queries in parallel
    (
        info_row,
        price_rows,
        order_rows,
        hist_rows,
        holders,
        peers_rows,
        news_rows,
        ratio_row,
    ) = await asyncio.gather(
        _query_stock_info(db, ticker),
        _query_price_history(db, ticker, days=90),
        _query_order_book(db, ticker),
        _query_historical_data(db, ticker, days=30),
        _query_shareholders(db, ticker),
        _query_peer_stocks(db, ticker),
        _query_stock_events(db, ticker, limit=12),
        _query_latest_ratio(db, ticker),
    )

    # Build stockInfo
    info = info_row or {}
    ratio = ratio_row or {}

    current_price = _safe_float(info.get("match_price") or info.get("close"))
    ref_price = _safe_float(info.get("ref_price"))
    change = current_price - ref_price if ref_price > 0 else 0
    change_pct = (change / ref_price * 100) if ref_price > 0 else 0
    market_cap = _safe_float(ratio.get("market_cap"))
    eps = _safe_float(ratio.get("eps"))

    stock_info = {
        "ticker": ticker,
        "exchange": info.get("exchange", ""),
        "companyName": info.get("organ_name", "") or info.get("organ_short_name", ""),
        "companyNameFull": info.get("organ_name", ""),
        "logoUrl": f"https://cdn.simplize.vn/simplizevn/logo/{ticker}.jpeg",
        "tags": [t for t in [
            info.get("exchange", ""),
            info.get("icb_name2", ""),
            info.get("icb_name3", ""),
        ] if t],
        "overview": info.get("overview") or info.get("organ_name") or "",
        "website": "",
        "currentPrice": current_price,
        "priceChange": round(change, 2),
        "priceChangePercent": round(change_pct, 2),
        "dayLow": _safe_float(info.get("lowest_price") or info.get("low")),
        "dayHigh": _safe_float(info.get("highest_price") or info.get("high")),
        "referencePrice": ref_price,
        "ceilingPrice": _safe_float(info.get("ceil_price")),
        "floorPrice": _safe_float(info.get("floor_price")),
        "metrics": {
            "marketCap": _fmt_market_cap(market_cap),
            "marketCapRank": 0,
            "volume": _fmt_volume(_safe_int(info.get("accumulated_volume") or info.get("volume"))),
            "pe": str(_safe_round(ratio.get("pe")) or "N/A"),
            "peRank": 0,
            "eps": f"{eps:,.0f}" if eps else "N/A",
            "pb": str(_safe_round(ratio.get("pb")) or "N/A"),
            "evEbitda": str(_safe_round(ratio.get("ev_ebitda")) or "N/A"),
            "outstandingShares": _fmt_volume(_safe_int(ratio.get("outstanding_shares"))),
            "roe": f"{_safe_float(ratio.get('roe')):.1f}%" if ratio.get("roe") else "N/A",
            "bvps": f"{_safe_float(ratio.get('bvps')):,.0f}" if ratio.get("bvps") else "N/A",
        },
        "evaluation": _compute_evaluation(ratio, current_price, ref_price),
    }

    # Price history
    price_history = [
        {
            "date": r["trading_date"],
            "open": _safe_float(r["open"]),
            "high": _safe_float(r["high"]),
            "low": _safe_float(r["low"]),
            "close": _safe_float(r["close"]),
            "volume": _safe_int(r["volume"]),
        }
        for r in (price_rows or [])
    ]

    # Order book (from realtime_quotes)
    order_book = [
        {
            "time": r.get("ts", ""),
            "volume": _safe_int(r.get("last_volume")),
            "price": _safe_float(r.get("last_price")),
            "side": "Mua" if _safe_float(r.get("change_value")) >= 0 else "Bán",
            "change": _safe_float(r.get("change_value")),
        }
        for r in (order_rows or [])
    ]

    # Historical data
    historical_data = []
    for i, r in enumerate(hist_rows or []):
        close = _safe_float(r["close"])
        prev_close = _safe_float((hist_rows or [])[i + 1]["close"]) if i + 1 < len(hist_rows or []) else close
        ch = close - prev_close
        ch_pct = (ch / prev_close * 100) if prev_close > 0 else 0
        historical_data.append({
            "date": r["trading_date"],
            "open": _safe_float(r["open"]),
            "high": _safe_float(r["high"]),
            "low": _safe_float(r["low"]),
            "close": close,
            "change": round(ch, 2),
            "changePercent": round(ch_pct, 2),
            "volume": _safe_int(r["volume"]),
        })

    # Shareholders
    shareholders = [
        {
            "name": r.get("name", ""),
            "role": r.get("position", "") or "",
            "shares": str(r.get("percent", "0")),
            "percentage": _safe_float(r.get("percent")),
        }
        for r in (holders or [])
    ]

    # Shareholder structure (from owner table)
    structure = _build_shareholder_structure(holders)

    # Peer stocks (same sector)
    peer_stocks = [
        {
            "ticker": r["ticker"],
            "price": _safe_float(r.get("close")),
            "priceChange": round(_safe_float(r.get("close")) - _safe_float(r.get("ref_price")), 2),
            "priceChangePercent": round(
                ((_safe_float(r.get("close")) - _safe_float(r.get("ref_price")))
                 / _safe_float(r.get("ref_price")) * 100)
                if _safe_float(r.get("ref_price")) > 0 else 0, 2
            ),
            "volume": _safe_int(r.get("volume")),
            "sparklineData": [],
        }
        for r in (peers_rows or [])
    ]

    # Corporate news (from event table)
    corp_news = [
        {
            "id": str(i),
            "title": r.get("event_title", ""),
            "time": r.get("public_date", ""),
            "source": r.get("source_url", ""),
            "category": r.get("event_list_name", ""),
            "ticker": ticker,
        }
        for i, r in enumerate(news_rows or [])
    ]

    # Recommendations — pick top-4 peers by trading volume (most liquid)
    _sorted_peers = sorted(peer_stocks, key=lambda p: p.get("volume", 0) or 0, reverse=True)
    _top4 = _sorted_peers[:4]
    _top4_tickers = [p["ticker"] for p in _top4]

    # Fetch sparkline data + latest electric_board prices in parallel
    sparklines, rec_eb_rows = await asyncio.gather(
        _query_sparklines(db, _top4_tickers, days=180),
        _query_rec_latest_prices(db, _top4_tickers),
    )
    # Map ticker → {match_price, ref_price} from electric_board
    _eb_map: Dict[str, Dict] = {r["ticker"]: r for r in (rec_eb_rows or [])}

    recommendations = []
    for p in _top4:
        spark = sparklines.get(p["ticker"], [])
        eb = _eb_map.get(p["ticker"], {})

        # Best price: electric_board match_price > peer close > sparkline last
        price = (
            _safe_float(eb.get("match_price"))
            or p["price"]
            or (spark[-1] if spark else 0)
        )
        # Reference price for daily change
        ref = _safe_float(eb.get("ref_price"))
        if ref > 0 and price > 0:
            change = round(price - ref, 2)
            change_pct = round(change / ref * 100, 2)
        elif len(spark) >= 2:
            # Fallback: last two sparkline closes
            change = round(spark[-1] - spark[-2], 2)
            change_pct = round(change / spark[-2] * 100, 2) if spark[-2] > 0 else 0
        else:
            change = 0
            change_pct = 0.0

        recommendations.append({
            "ticker": p["ticker"],
            "exchange": "",
            "companyName": "",
            "logoUrl": f"https://cdn.simplize.vn/simplizevn/logo/{p['ticker']}.jpeg",
            "price": price,
            "priceChange": change,
            "priceChangePercent": change_pct,
            "marketCap": "",
            "volume": str(p.get("volume", "")),
            "pe": "",
            "chartData": spark,
        })

    return {
        "stockInfo": stock_info,
        "priceHistory": price_history,
        "orderBook": order_book,
        "historicalData": historical_data,
        "shareholders": shareholders,
        "shareholderStructure": structure,
        "peerStocks": peer_stocks,
        "corporateNews": corp_news,
        "recommendations": recommendations,
    }


# ── Sub-queries for overview ──────────────────────────────────────

async def _query_stock_info(db: AsyncSession, ticker: str) -> Optional[Dict]:
    """Get current stock info from electric_board + company_overview."""
    sql = text(f"""
        WITH {_EB_RANKED_DATES_CTE}
        SELECT
            co.ticker, co.exchange, co.organ_short_name, co.organ_name,
            co.icb_name2, co.icb_name3, co.overview,
            eb.match_price, eb.ref_price, eb.accumulated_volume,
            eb.highest_price, eb.lowest_price,
            eb.bid_1_price, eb.bid_1_volume, eb.bid_2_price, eb.bid_2_volume,
            eb.bid_3_price, eb.bid_3_volume,
            eb.ask_1_price, eb.ask_1_volume, eb.ask_2_price, eb.ask_2_volume,
            eb.ask_3_price, eb.ask_3_volume,
            hp.close, hp.high, hp.low, hp.volume
        FROM {SCHEMA}.company_overview co
        LEFT JOIN {SCHEMA}.electric_board eb
            ON eb.ticker = co.ticker
            AND eb.trading_date = (SELECT td FROM eb_latest)
        LEFT JOIN (
            SELECT ticker, close, high, low, volume
            FROM {SCHEMA}.history_price
            WHERE ticker = :ticker
            ORDER BY trading_date DESC
            LIMIT 1
        ) hp ON hp.ticker = co.ticker
        WHERE co.ticker = :ticker
        LIMIT 1
    """)
    res = await db.execute(sql, {"ticker": ticker})
    row = res.mappings().first()
    return dict(row) if row else None


# Period → approximate calendar days mapping
_PERIOD_DAYS = {
    "1D": 1,
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
    "5Y": 1825,
}

# Max data points to return per period (prevents huge payloads)
_MAX_POINTS = {
    "1D": 500,
    "1W": 500,
    "1M": 500,
    "3M": 500,
    "6M": 500,
    "1Y": 500,
    "5Y": 1000,
    "ALL": 8000,
}


async def _query_price_history(db: AsyncSession, ticker: str, days: int = 90) -> List[Dict]:
    """OHLCV price history for chart (legacy, LIMIT-based)."""
    sql = text(f"""
        SELECT trading_date, open, high, low, close, volume
        FROM {SCHEMA}.history_price
        WHERE ticker = :ticker AND close IS NOT NULL
        ORDER BY trading_date DESC
        LIMIT :limit
    """)
    res = await db.execute(sql, {"ticker": ticker, "limit": days})
    rows = res.mappings().all()
    return [dict(r) for r in reversed(rows)]  # chronological order


async def _query_price_history_by_period(
    db: AsyncSession, ticker: str, period: str = "1Y",
) -> List[Dict]:
    """OHLCV price history filtered by period with smart sampling."""
    if period == "ALL":
        sql = text(f"""
            SELECT trading_date, open, high, low, close, volume
            FROM {SCHEMA}.history_price
            WHERE ticker = :ticker AND close IS NOT NULL
            ORDER BY trading_date ASC
        """)
        res = await db.execute(sql, {"ticker": ticker})
    else:
        days = _PERIOD_DAYS.get(period, 365)
        cutoff = (date.today() - timedelta(days=days)).isoformat()
        sql = text(f"""
            SELECT trading_date, open, high, low, close, volume
            FROM {SCHEMA}.history_price
            WHERE ticker = :ticker AND close IS NOT NULL
              AND trading_date >= :cutoff
            ORDER BY trading_date ASC
        """)
        res = await db.execute(sql, {"ticker": ticker, "cutoff": cutoff})

    rows = [dict(r) for r in res.mappings().all()]

    # Sample if too many points
    max_pts = _MAX_POINTS.get(period, 500)
    if len(rows) > max_pts:
        # Always keep first, last, and evenly-spaced points
        step = len(rows) / max_pts
        indices = {0, len(rows) - 1}
        i = 0.0
        while i < len(rows):
            indices.add(int(i))
            i += step
        rows = [rows[idx] for idx in sorted(indices)]

    return rows


async def _query_order_book(db: AsyncSession, ticker: str) -> List[Dict]:
    """Recent trades from realtime_quotes."""
    sql = text(f"""
        SELECT ts, last_price, last_volume, change_value, change_percent
        FROM {SCHEMA}.realtime_quotes
        WHERE symbol = :ticker
        ORDER BY ts DESC
        LIMIT 20
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


async def _query_historical_data(db: AsyncSession, ticker: str, days: int = 30) -> List[Dict]:
    """Recent OHLCV rows for the historical data table."""
    sql = text(f"""
        SELECT trading_date, open, high, low, close, volume
        FROM {SCHEMA}.history_price
        WHERE ticker = :ticker AND close IS NOT NULL
        ORDER BY trading_date DESC
        LIMIT :limit
    """)
    res = await db.execute(sql, {"ticker": ticker, "limit": days})
    return [dict(r) for r in res.mappings().all()]


async def _query_shareholders(db: AsyncSession, ticker: str) -> List[Dict]:
    """Shareholder list from owner table."""
    sql = text(f"""
        SELECT name, position, percent, type
        FROM {SCHEMA}.owner
        WHERE ticker = :ticker
        ORDER BY percent::numeric DESC NULLS LAST
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


def _build_shareholder_structure(holders: List[Dict]) -> List[Dict]:
    """Phân tích cơ cấu cổ đông từ bảng owner, nhóm theo position.

    Trả về danh sách [{"position": ..., "percent": ..., "members": [...]}]
    để FE vẽ biểu đồ donut theo chức vụ với tooltip chi tiết.
    """
    from collections import defaultdict
    groups: Dict[str, Dict] = defaultdict(lambda: {"percent": 0.0, "members": []})
    for h in (holders or []):
        pos = (h.get("position") or "Khác").strip()
        pct = _safe_float(h.get("percent"))
        groups[pos]["percent"] = round(groups[pos]["percent"] + pct, 2)
        groups[pos]["members"].append({
            "name": h.get("name", ""),
            "percent": pct,
        })
    result = [
        {"position": pos, "percent": data["percent"], "members": data["members"]}
        for pos, data in groups.items()
        if data["percent"] > 0
    ]
    result.sort(key=lambda x: x["percent"], reverse=True)
    return result


async def _query_peer_stocks(db: AsyncSession, ticker: str) -> List[Dict]:
    """Find stocks in the same sector (icb_name2) with latest price."""
    sql = text(f"""
        WITH sector AS (
            SELECT icb_name2 FROM {SCHEMA}.company_overview
            WHERE ticker = :ticker LIMIT 1
        )
        SELECT DISTINCT ON (hp.ticker)
            hp.ticker, hp.close, hp.volume,
            eb.ref_price
        FROM {SCHEMA}.history_price hp
        JOIN {SCHEMA}.company_overview co ON co.ticker = hp.ticker
        LEFT JOIN {SCHEMA}.electric_board eb
            ON eb.ticker = hp.ticker
            AND eb.trading_date = (
                SELECT MAX(trading_date) FROM {SCHEMA}.electric_board
                WHERE ticker = hp.ticker
            )
        WHERE co.icb_name2 = (SELECT icb_name2 FROM sector)
          AND hp.ticker != :ticker
          AND hp.close IS NOT NULL
        ORDER BY hp.ticker, hp.trading_date DESC
        LIMIT 10
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


async def _query_sparklines(db: AsyncSession, tickers: List[str], days: int = 90) -> Dict[str, List[float]]:
    """Fetch recent close prices for multiple tickers (for sparkline charts)."""
    if not tickers:
        return {}
    placeholders = ", ".join(f":t{i}" for i in range(len(tickers)))
    params = {f"t{i}": t for i, t in enumerate(tickers)}
    params["days"] = days
    sql = text(f"""
        SELECT ticker, trading_date, close
        FROM {SCHEMA}.history_price
        WHERE ticker IN ({placeholders})
          AND close IS NOT NULL
        ORDER BY ticker, trading_date DESC
    """)
    res = await db.execute(sql, params)
    rows = res.mappings().all()
    # Group by ticker, keep last N days, chronological
    from collections import defaultdict
    grouped: Dict[str, List[float]] = defaultdict(list)
    counts: Dict[str, int] = defaultdict(int)
    for r in rows:
        t = r["ticker"]
        if counts[t] < days:
            grouped[t].append(float(r["close"]))
            counts[t] += 1
    # Reverse to chronological order
    return {t: list(reversed(v)) for t, v in grouped.items()}


async def _query_rec_latest_prices(db: AsyncSession, tickers: List[str]) -> List[Dict]:
    """Fetch latest match_price & ref_price from electric_board for multiple tickers."""
    if not tickers:
        return []
    placeholders = ", ".join(f":t{i}" for i in range(len(tickers)))
    params = {f"t{i}": t for i, t in enumerate(tickers)}
    sql = text(f"""
        WITH {_EB_RANKED_DATES_CTE}
        SELECT eb.ticker, eb.match_price, eb.ref_price
        FROM {SCHEMA}.electric_board eb
        WHERE eb.ticker IN ({placeholders})
          AND eb.trading_date = (SELECT td FROM eb_latest)
    """)
    res = await db.execute(sql, params)
    return [dict(r) for r in res.mappings().all()]


async def _query_stock_events(db: AsyncSession, ticker: str, limit: int = 12) -> List[Dict]:
    """Corporate events from the event table for a given ticker (title starts with ticker)."""
    sql = text(f"""
        SELECT event_title, public_date, source_url, event_list_name
        FROM {SCHEMA}.event
        WHERE event_title ILIKE :pattern
        ORDER BY public_date DESC NULLS LAST
        LIMIT :limit
    """)
    res = await db.execute(sql, {"pattern": f"{ticker}%", "limit": limit})
    return [dict(r) for r in res.mappings().all()]


async def _query_latest_ratio(db: AsyncSession, ticker: str) -> Optional[Dict]:
    """Latest financial ratios for a ticker — BCTC-computed PE/PB/EPS with FR fallback."""
    sql = text(f"""
        WITH latest_fr AS (
            SELECT pe, pb, ps, eps, bvps, roe, roa, roic,
                   gross_margin, net_margin, ebit_margin,
                   debt_to_equity, current_ratio, quick_ratio, cash_ratio,
                   interest_coverage_ratio, asset_turnover, inventory_turnover,
                   receivable_days, inventory_days, payable_days,
                   cash_conversion_cycle, ev_ebitda, dividend_yield,
                   market_cap, outstanding_shares, p_cashflow
            FROM {SCHEMA}.financial_ratio
            WHERE ticker = :ticker
            ORDER BY year DESC, quarter DESC
            LIMIT 1
        ),
        -- BCTC: outstanding shares (fallback to contributed capital for banks)
        bctc_shares AS (
            SELECT DISTINCT ON (ticker)
                ticker, value / 10000.0 AS shares
            FROM (
                SELECT ticker, value, year, quarter, 1 AS priority
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'C_PHI_U_PH_TH_NG_NG'
                  AND ticker = :ticker AND value IS NOT NULL AND value > 0
                UNION ALL
                SELECT ticker, value, year, quarter, 2 AS priority
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'V_N_G_P_C_A_CH_S_H_U_NG'
                  AND ticker = :ticker AND value IS NOT NULL AND value > 0
            ) combined
            ORDER BY ticker, priority, year DESC, quarter DESC
        ),
        -- BCTC: equity (latest)
        bctc_equity AS (
            SELECT value AS equity
            FROM {SCHEMA}.bctc
            WHERE ind_code = 'V_N_CH_S_H_U_NG'
              AND ticker = :ticker AND value IS NOT NULL AND value > 0
            ORDER BY year DESC, quarter DESC
            LIMIT 1
        ),
        -- BCTC: TTM net income (sum of last 4 quarters)
        ranked_ni AS (
            SELECT value,
                ROW_NUMBER() OVER (ORDER BY year DESC, quarter DESC) AS rn
            FROM {SCHEMA}.bctc
            WHERE ind_code = 'L_I_NHU_N_SAU_THU_C_A_C_NG_C_NG_TY_M_NG'
              AND ticker = :ticker AND value IS NOT NULL AND value != 0
        ),
        ttm_ni AS (
            SELECT SUM(value) AS ttm_ni
            FROM ranked_ni WHERE rn <= 4
            HAVING COUNT(*) >= 2
        ),
        latest_price AS (
            SELECT close
            FROM {SCHEMA}.history_price
            WHERE ticker = :ticker AND close IS NOT NULL
            ORDER BY trading_date DESC
            LIMIT 1
        )
        SELECT
            fr.*,
            -- BCTC-computed PE
            COALESCE(
                CASE WHEN ni.ttm_ni IS NOT NULL AND sh.shares > 0
                          AND (ni.ttm_ni / sh.shares) > 0
                          AND (lp.close * 1000 / (ni.ttm_ni / sh.shares)) BETWEEN 0.1 AND 500
                     THEN lp.close * 1000 / (ni.ttm_ni / sh.shares)
                     ELSE NULL END,
                fr.pe
            ) AS computed_pe,
            -- BCTC-computed PB
            COALESCE(
                CASE WHEN eq.equity > 0 AND sh.shares > 0
                          AND (lp.close * 1000 * sh.shares / eq.equity) BETWEEN 0.01 AND 100
                     THEN lp.close * 1000 * sh.shares / eq.equity
                     ELSE NULL END,
                fr.pb
            ) AS computed_pb,
            -- BCTC-computed EPS
            COALESCE(
                CASE WHEN ni.ttm_ni IS NOT NULL AND sh.shares > 0
                     THEN ni.ttm_ni / sh.shares
                     ELSE NULL END,
                fr.eps
            ) AS computed_eps,
            -- BCTC-computed market_cap
            COALESCE(
                CASE WHEN sh.shares > 0 AND lp.close > 0
                     THEN lp.close * 1000 * sh.shares END,
                fr.market_cap
            ) AS computed_market_cap,
            -- BCTC shares
            sh.shares AS computed_shares
        FROM (SELECT 1) AS _dummy
        LEFT JOIN latest_fr fr ON TRUE
        LEFT JOIN bctc_shares sh ON TRUE
        LEFT JOIN bctc_equity eq ON TRUE
        LEFT JOIN ttm_ni ni ON TRUE
        LEFT JOIN latest_price lp ON TRUE
    """)
    res = await db.execute(sql, {"ticker": ticker})
    row = res.mappings().first()
    if not row:
        return None
    result = dict(row)
    # Override FR values with BCTC-computed values
    if result.get("computed_pe") is not None:
        result["pe"] = result["computed_pe"]
    if result.get("computed_pb") is not None:
        result["pb"] = result["computed_pb"]
    if result.get("computed_eps") is not None:
        result["eps"] = result["computed_eps"]
    if result.get("computed_market_cap") is not None:
        result["market_cap"] = result["computed_market_cap"]
    if result.get("computed_shares") is not None:
        result["outstanding_shares"] = result["computed_shares"]
    return result


# ────────────────────────────────────────────────────────────────────
# 2. Price History (separate endpoint for charting)
# ────────────────────────────────────────────────────────────────────
@cached("stock:price", ttl=120)
async def get_price_history(
    db: AsyncSession,
    ticker: str = "VIC",
    days: int = 365,
    period: Optional[str] = None,
) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    if period:
        rows = await _query_price_history_by_period(db, ticker.upper(), period)
    else:
        rows = await _query_price_history(db, ticker.upper(), days)
    return [
        {
            "date": r["trading_date"],
            "open": _safe_float(r["open"]),
            "high": _safe_float(r["high"]),
            "low": _safe_float(r["low"]),
            "close": _safe_float(r["close"]),
            "volume": _safe_int(r["volume"]),
        }
        for r in rows
    ]


# ────────────────────────────────────────────────────────────────────
# 3. Financial Ratios
# ────────────────────────────────────────────────────────────────────
@cached("stock:ratios", ttl=300)
async def get_financial_ratios(db: AsyncSession, ticker: str = "VIC", periods: int = 20) -> List[Dict[str, Any]]:
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Fetch FR rows (base data)
    fr_sql = text(f"""
        SELECT year, quarter,
               pe, pb, ps, eps, bvps, roe, roa, roic,
               gross_margin, net_margin, ebit_margin,
               debt_to_equity, current_ratio, quick_ratio, cash_ratio,
               interest_coverage_ratio, asset_turnover, inventory_turnover,
               receivable_days, inventory_days, payable_days,
               cash_conversion_cycle, ev_ebitda, dividend_yield,
               market_cap, outstanding_shares, p_cashflow
        FROM {SCHEMA}.financial_ratio
        WHERE ticker = :ticker
        ORDER BY year DESC, quarter DESC
        LIMIT :limit
    """)
    fr_res = await db.execute(fr_sql, {"ticker": ticker, "limit": periods})
    fr_rows = fr_res.mappings().all()

    # Fetch BCTC data for computing PE/PB/EPS per quarter
    bctc_sql = text(f"""
        WITH shares_data AS (
            SELECT year, quarter, value / 10000.0 AS shares, 1 AS priority
            FROM {SCHEMA}.bctc
            WHERE ind_code = 'C_PHI_U_PH_TH_NG_NG'
              AND ticker = :ticker AND value IS NOT NULL AND value > 0
            UNION ALL
            SELECT year, quarter, value / 10000.0 AS shares, 2 AS priority
            FROM {SCHEMA}.bctc
            WHERE ind_code = 'V_N_G_P_C_A_CH_S_H_U_NG'
              AND ticker = :ticker AND value IS NOT NULL AND value > 0
        ),
        ranked_shares AS (
            SELECT year, quarter, shares,
                ROW_NUMBER() OVER (PARTITION BY year, quarter ORDER BY priority) AS rn
            FROM shares_data
        )
        SELECT
            COALESCE(sh.year, eq.year, ni.year) AS year,
            COALESCE(sh.quarter, eq.quarter, ni.quarter) AS quarter,
            sh.shares,
            eq.equity,
            ni.net_income
        FROM (
            SELECT year, quarter, shares FROM ranked_shares WHERE rn = 1
        ) sh
        FULL OUTER JOIN (
            SELECT year, quarter, value AS equity
            FROM {SCHEMA}.bctc
            WHERE ind_code = 'V_N_CH_S_H_U_NG'
              AND ticker = :ticker AND value IS NOT NULL AND value > 0
        ) eq ON eq.year = sh.year AND eq.quarter = sh.quarter
        FULL OUTER JOIN (
            SELECT year, quarter, value AS net_income
            FROM {SCHEMA}.bctc
            WHERE ind_code = 'L_I_NHU_N_SAU_THU_C_A_C_NG_C_NG_TY_M_NG'
              AND ticker = :ticker AND value IS NOT NULL AND value != 0
        ) ni ON ni.year = COALESCE(sh.year, eq.year) AND ni.quarter = COALESCE(sh.quarter, eq.quarter)
    """)
    bctc_res = await db.execute(bctc_sql, {"ticker": ticker})
    bctc_rows = bctc_res.mappings().all()

    # Build BCTC lookup: (year, quarter) -> {shares, equity, net_income}
    bctc_map: Dict[Tuple, Dict] = {}
    for b in bctc_rows:
        key = (int(b["year"]), int(b["quarter"]))
        bctc_map[key] = {
            "shares": _safe_float(b.get("shares")),
            "equity": _safe_float(b.get("equity")),
            "net_income": _safe_float(b.get("net_income")),
        }

    # Fetch price at each quarter-end for PE/PB computation
    price_sql = text(f"""
        SELECT DISTINCT ON (EXTRACT(YEAR FROM trading_date::date), EXTRACT(QUARTER FROM trading_date::date))
            EXTRACT(YEAR FROM trading_date::date)::int AS year,
            EXTRACT(QUARTER FROM trading_date::date)::int AS quarter,
            close
        FROM {SCHEMA}.history_price
        WHERE ticker = :ticker AND close IS NOT NULL
        ORDER BY EXTRACT(YEAR FROM trading_date::date) DESC,
                 EXTRACT(QUARTER FROM trading_date::date) DESC,
                 trading_date DESC
    """)
    price_res = await db.execute(price_sql, {"ticker": ticker})
    price_map: Dict[Tuple, float] = {}
    for p in price_res.mappings().all():
        price_map[(int(p["year"]), int(p["quarter"]))] = _safe_float(p["close"])

    result = []
    for r in fr_rows:
        year = int(r["year"])
        quarter = int(r["quarter"])
        key = (year, quarter)
        bctc = bctc_map.get(key, {})
        close = price_map.get(key, 0)

        # Compute PE, PB, EPS from BCTC when FR values are missing
        fr_pe = _safe_round(r["pe"])
        fr_pb = _safe_round(r["pb"])
        fr_eps = _safe_round(r["eps"])
        fr_mcap = _safe_round(r["market_cap"])

        shares = bctc.get("shares", 0)
        equity = bctc.get("equity", 0)
        net_income = bctc.get("net_income", 0)

        # EPS from BCTC
        computed_eps = None
        if net_income != 0 and shares > 0:
            computed_eps = round(net_income / shares, 2)

        # PE from BCTC (annualized: multiply quarterly NI by 4)
        computed_pe = None
        if close > 0 and net_income != 0 and shares > 0:
            annualized_eps = (net_income * 4) / shares
            if annualized_eps > 0:
                pe_val = close * 1000 / annualized_eps
                if 0.1 <= pe_val <= 500:
                    computed_pe = round(pe_val, 2)

        # PB from BCTC
        computed_pb = None
        if close > 0 and equity > 0 and shares > 0:
            pb_val = close * 1000 * shares / equity
            if 0.01 <= pb_val <= 100:
                computed_pb = round(pb_val, 2)

        # Market cap from BCTC
        computed_mcap = None
        if close > 0 and shares > 0:
            computed_mcap = round(close * 1000 * shares, 0)

        result.append({
            "year": year,
            "quarter": quarter,
            "pe": computed_pe if fr_pe is None else fr_pe,
            "pb": computed_pb if fr_pb is None else fr_pb,
            "ps": _safe_round(r["ps"]),
            "eps": computed_eps if fr_eps is None else fr_eps,
            "bvps": _safe_round(r["bvps"]),
            "roe": _safe_round(r["roe"]),
            "roa": _safe_round(r["roa"]),
            "roic": _safe_round(r["roic"]),
            "grossMargin": _safe_round(r["gross_margin"]),
            "netMargin": _safe_round(r["net_margin"]),
            "ebitMargin": _safe_round(r["ebit_margin"]),
            "debtToEquity": _safe_round(r["debt_to_equity"]),
            "currentRatio": _safe_round(r["current_ratio"]),
            "quickRatio": _safe_round(r["quick_ratio"]),
            "cashRatio": _safe_round(r["cash_ratio"]),
            "interestCoverageRatio": _safe_round(r["interest_coverage_ratio"]),
            "assetTurnover": _safe_round(r["asset_turnover"]),
            "inventoryTurnover": _safe_round(r["inventory_turnover"]),
            "receivableDays": _safe_round(r["receivable_days"]),
            "inventoryDays": _safe_round(r["inventory_days"]),
            "payableDays": _safe_round(r["payable_days"]),
            "cashConversionCycle": _safe_round(r["cash_conversion_cycle"]),
            "evEbitda": _safe_round(r["ev_ebitda"]),
            "dividendYield": _safe_round(r["dividend_yield"]),
            "marketCap": computed_mcap if fr_mcap is None else fr_mcap,
            "outstandingShares": _safe_round(r["outstanding_shares"]),
            "pCashflow": _safe_round(r["p_cashflow"]),
        })

    return result


# ────────────────────────────────────────────────────────────────────
# 4. Financial Reports (IS, BS, CF from BCTC table)
# ────────────────────────────────────────────────────────────────────
@cached("stock:reports", ttl=300)
async def get_financial_reports(db: AsyncSession, ticker: str = "VIC", periods: int = 12) -> Dict[str, Any]:
    """Fetch IS, BS, CF from bctc table, pivoting ind_code rows into columns."""
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Collect all needed ind_codes (including bank fallbacks)
    all_codes = set()
    for mapping in (IS_CODES, BS_CODES, CF_CODES, IS_BANK_FALLBACKS):
        all_codes.update(mapping.values())

    # Single query for all financial data — efficient pivot
    sql = text(f"""
        SELECT year, quarter, ind_code, value
        FROM {SCHEMA}.bctc
        WHERE ticker = :ticker
          AND ind_code = ANY(:codes)
        ORDER BY year DESC, quarter DESC
    """)
    res = await db.execute(sql, {"ticker": ticker, "codes": list(all_codes)})
    rows = res.mappings().all()

    # Pivot: {(year, quarter)} -> {ind_code: value}
    pivot: Dict[Tuple[int, str], Dict[str, float]] = {}
    for r in rows:
        key = (int(r["year"]), str(r["quarter"]))
        if key not in pivot:
            pivot[key] = {}
        pivot[key][r["ind_code"]] = _safe_float(r["value"])

    # Sort periods descending, take latest N
    sorted_periods = sorted(pivot.keys(), key=lambda x: (x[0], x[1]), reverse=True)[:periods]

    def _build_period(year: int, quarter: str) -> Dict:
        return {"period": f"Q{quarter}/{year}", "year": year, "quarter": int(quarter) if quarter.isdigit() else 0}

    # Build IS (with bank fallback logic)
    income_statement = []
    for year, quarter in sorted_periods:
        data = pivot.get((year, quarter), {})
        item = _build_period(year, quarter)
        for field, code in IS_CODES.items():
            val = data.get(code, 0)
            # If primary code is 0, try bank fallback
            if val == 0 and field in IS_BANK_FALLBACKS:
                val = data.get(IS_BANK_FALLBACKS[field], 0)
            item[field] = val
        # Compute EPS from net profit parent if available
        item["eps"] = 0  # Would need outstanding shares; use ratio endpoint
        income_statement.append(item)

    # Build BS
    balance_sheet = []
    for year, quarter in sorted_periods:
        data = pivot.get((year, quarter), {})
        item = _build_period(year, quarter)
        for field, code in BS_CODES.items():
            item[field] = data.get(code, 0)
        item["totalLiabilitiesAndEquity"] = item.get("totalLiabilities", 0) + item.get("totalEquity", 0)
        balance_sheet.append(item)

    # Build CF
    cash_flow = []
    for year, quarter in sorted_periods:
        data = pivot.get((year, quarter), {})
        item = _build_period(year, quarter)
        for field, code in CF_CODES.items():
            item[field] = data.get(code, 0)
        cash_flow.append(item)

    return {
        "incomeStatement": income_statement,
        "balanceSheet": balance_sheet,
        "cashFlow": cash_flow,
    }


# ────────────────────────────────────────────────────────────────────
# 5. Company Profile
# ────────────────────────────────────────────────────────────────────
@cached("stock:profile", ttl=600)
async def get_company_profile(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Run sub-queries in parallel
    info_res, holders_res, events_res = await asyncio.gather(
        _query_company_info(db, ticker),
        _query_shareholders(db, ticker),
        _query_events(db, ticker),
    )

    info = info_res or {}
    overview = {
        "ticker": ticker,
        "companyName": info.get("organ_short_name", ""),
        "companyNameFull": info.get("organ_name", ""),
        "exchange": info.get("exchange", ""),
        "industry": info.get("icb_name2", ""),
        "subIndustry": info.get("icb_name3", ""),
        "sector": info.get("icb_name1", ""),
        "description": info.get("overview", ""),
        "taxCode": "",
        "charterCapital": None,
        "outstandingShares": None,
        "website": "",
    }

    shareholders = [
        {
            "name": r.get("name", ""),
            "role": r.get("position", "") or "",
            "shares": str(r.get("percent", "0")),
            "percentage": _safe_float(r.get("percent")),
        }
        for r in (holders_res or [])
    ]

    events = [
        {
            "title": r.get("event_title", ""),
            "date": r.get("public_date", ""),
            "source": r.get("source_url", ""),
            "category": r.get("event_list_name", ""),
        }
        for r in (events_res or [])
    ]

    return {
        "overview": overview,
        "shareholders": shareholders,
        "events": events,
        "dividendHistory": [],
    }


async def _query_company_info(db: AsyncSession, ticker: str) -> Optional[Dict]:
    sql = text(f"""
        SELECT ticker, exchange, organ_short_name, organ_name,
               icb_name1, icb_name2, icb_name3, overview, type_info
        FROM {SCHEMA}.company_overview
        WHERE ticker = :ticker
        LIMIT 1
    """)
    res = await db.execute(sql, {"ticker": ticker})
    row = res.mappings().first()
    return dict(row) if row else None


async def _query_events(db: AsyncSession, ticker: str) -> List[Dict]:
    sql = text(f"""
        SELECT event_title, public_date, source_url, event_list_name
        FROM {SCHEMA}.event
        WHERE event_title ILIKE :pattern
        ORDER BY public_date DESC NULLS LAST
        LIMIT 50
    """)
    res = await db.execute(sql, {"pattern": f"{ticker}%"})
    return [dict(r) for r in res.mappings().all()]


# ────────────────────────────────────────────────────────────────────
# 6. Stock Comparison
# ────────────────────────────────────────────────────────────────────
@cached("stock:compare", ttl=300)
async def get_stock_comparison(
    db: AsyncSession, ticker: str = "VIC", peers: str = ""
) -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    # Resolve peer list — always include same-sector peers, plus any custom
    extra_list = [p.strip().upper() for p in peers.split(",") if p.strip()] if peers else []

    sql = text(f"""
        WITH sector AS (
            SELECT icb_name2 FROM {SCHEMA}.company_overview
            WHERE ticker = :ticker LIMIT 1
        )
        SELECT ticker FROM {SCHEMA}.company_overview
        WHERE icb_name2 = (SELECT icb_name2 FROM sector)
          AND ticker != :ticker
        LIMIT 5
    """)
    res = await db.execute(sql, {"ticker": ticker})
    sector_peers = [r["ticker"] for r in res.mappings().all()]

    # Merge: sector peers first, then extra (deduplicated, excluding main ticker)
    seen = {ticker}
    peer_list: list[str] = []
    for t in sector_peers + extra_list:
        if t not in seen:
            seen.add(t)
            peer_list.append(t)

    all_tickers = [ticker] + peer_list

    # ── Main query: latest price, financial ratios ──
    sql = text(f"""
        WITH latest_fr AS (
            SELECT DISTINCT ON (ticker)
                ticker, pe, pb, roe, roa, gross_margin, net_margin,
                debt_to_equity, market_cap, eps, dividend_yield,
                outstanding_shares
            FROM {SCHEMA}.financial_ratio
            WHERE ticker = ANY(:tickers)
            ORDER BY ticker, year DESC, quarter DESC
        ),
        latest_hp AS (
            SELECT DISTINCT ON (ticker)
                ticker, close, trading_date
            FROM {SCHEMA}.history_price
            WHERE ticker = ANY(:tickers) AND close IS NOT NULL
            ORDER BY ticker, trading_date DESC
        ),
        latest_eb AS (
            SELECT DISTINCT ON (ticker)
                ticker, ref_price, match_price
            FROM {SCHEMA}.electric_board
            WHERE ticker = ANY(:tickers)
            ORDER BY ticker, trading_date DESC
        ),
        latest_co AS (
            SELECT DISTINCT ON (ticker)
                ticker, organ_short_name, organ_name, exchange
            FROM {SCHEMA}.company_overview
            WHERE ticker = ANY(:tickers)
            ORDER BY ticker,
                CASE WHEN organ_short_name IS NOT NULL
                     AND organ_short_name != 'NaN' THEN 0 ELSE 1 END
        )
        SELECT
            hp.ticker,
            co.organ_short_name AS company_name,
            co.exchange,
            hp.close AS hp_close,
            eb.match_price AS eb_match,
            eb.ref_price AS eb_ref,
            COALESCE(eb.match_price / 1000.0, hp.close) AS price,
            COALESCE(eb.ref_price / 1000.0, hp.close) AS ref_price,
            fr.pe, fr.pb, fr.roe, fr.roa,
            fr.gross_margin, fr.net_margin,
            fr.debt_to_equity, fr.market_cap,
            fr.eps, fr.dividend_yield,
            fr.outstanding_shares
        FROM latest_hp hp
        JOIN latest_co co ON co.ticker = hp.ticker
        LEFT JOIN latest_fr fr ON fr.ticker = hp.ticker
        LEFT JOIN latest_eb eb ON eb.ticker = hp.ticker
    """)
    res = await db.execute(sql, {"tickers": all_tickers})
    rows = {r["ticker"]: dict(r) for r in res.mappings().all()}

    # ── Price history (last 90 trading days) for all tickers ──
    sql_hist = text(f"""
        SELECT ticker, trading_date AS date, open, high, low, close, volume
        FROM {SCHEMA}.history_price
        WHERE ticker = ANY(:tickers) AND close IS NOT NULL
          AND trading_date >= (
              SELECT trading_date FROM (
                  SELECT DISTINCT trading_date
                  FROM {SCHEMA}.history_price
                  WHERE close IS NOT NULL
                  ORDER BY trading_date DESC
                  LIMIT 90
              ) sub ORDER BY trading_date LIMIT 1
          )
        ORDER BY ticker, trading_date
    """)
    res_hist = await db.execute(sql_hist, {"tickers": all_tickers})
    hist_map: Dict[str, List[Dict]] = {t: [] for t in all_tickers}
    for h in res_hist.mappings().all():
        t = h["ticker"]
        if t in hist_map:
            hist_map[t].append({
                "date": str(h["date"]),
                "open": float(h["open"] or 0),
                "high": float(h["high"] or 0),
                "low": float(h["low"] or 0),
                "close": float(h["close"] or 0),
                "volume": int(h["volume"] or 0),
            })

    # ── BCTC fallback: compute missing financial metrics ──
    # Gather tickers that have null metrics from financial_ratio
    tickers_needing_bctc = [
        t for t in all_tickers
        if t in rows and any(
            rows[t].get(col) is None
            for col in ("pe", "pb", "roe", "roa", "gross_margin", "net_margin",
                        "debt_to_equity", "eps", "market_cap")
        )
    ]

    bctc_data: Dict[str, Dict] = {}
    if tickers_needing_bctc:
        sql_bctc = text(f"""
            WITH
            -- Outstanding shares (prefer C_PHI_U_PH_TH_NG_NG, fallback charter capital)
            shares AS (
                SELECT DISTINCT ON (ticker)
                    ticker, value / 10000.0 AS shares
                FROM (
                    SELECT ticker, value, year, quarter, 1 AS priority
                    FROM {SCHEMA}.bctc
                    WHERE ind_code = 'C_PHI_U_PH_TH_NG_NG'
                      AND ticker = ANY(:tickers) AND value IS NOT NULL AND value > 0
                    UNION ALL
                    SELECT ticker, value, year, quarter, 2 AS priority
                    FROM {SCHEMA}.bctc
                    WHERE ind_code = 'V_N_G_P_C_A_CH_S_H_U_NG'
                      AND ticker = ANY(:tickers) AND value IS NOT NULL AND value > 0
                ) combined
                ORDER BY ticker, priority, year DESC, quarter DESC
            ),
            -- Equity (latest)
            equity AS (
                SELECT DISTINCT ON (ticker) ticker, value AS equity
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'V_N_CH_S_H_U_NG'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL AND value > 0
                ORDER BY ticker, year DESC, quarter DESC
            ),
            -- Total assets (latest)
            assets AS (
                SELECT DISTINCT ON (ticker) ticker, value AS total_assets
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'T_NG_C_NG_T_I_S_N_NG'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL AND value > 0
                ORDER BY ticker, year DESC, quarter DESC
            ),
            -- Total liabilities (latest)
            liabilities AS (
                SELECT DISTINCT ON (ticker) ticker, value AS total_liabilities
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'N_PH_I_TR_NG'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL
                ORDER BY ticker, year DESC, quarter DESC
            ),
            -- Revenue TTM (sum of last 4 quarters)
            rev_ranked AS (
                SELECT ticker, value,
                    ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'DOANH_THU_THU_N'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL AND value != 0
            ),
            revenue_ttm AS (
                SELECT ticker, SUM(value) AS revenue
                FROM rev_ranked WHERE rn <= 4
                GROUP BY ticker HAVING COUNT(*) >= 2
            ),
            -- Gross profit TTM
            gp_ranked AS (
                SELECT ticker, value,
                    ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'L_I_G_P'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL
            ),
            gross_profit_ttm AS (
                SELECT ticker, SUM(value) AS gross_profit
                FROM gp_ranked WHERE rn <= 4
                GROUP BY ticker HAVING COUNT(*) >= 2
            ),
            -- Net income TTM (parent)
            ni_ranked AS (
                SELECT ticker, value,
                    ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY year DESC, quarter DESC) AS rn
                FROM {SCHEMA}.bctc
                WHERE ind_code = 'L_I_NHU_N_SAU_THU_C_A_C_NG_C_NG_TY_M_NG'
                  AND ticker = ANY(:tickers) AND value IS NOT NULL AND value != 0
            ),
            net_income_ttm AS (
                SELECT ticker, SUM(value) AS net_income
                FROM ni_ranked WHERE rn <= 4
                GROUP BY ticker HAVING COUNT(*) >= 2
            )
            SELECT
                sh.ticker,
                sh.shares,
                eq.equity,
                ast.total_assets,
                li.total_liabilities,
                rev.revenue,
                gp.gross_profit,
                ni.net_income
            FROM shares sh
            LEFT JOIN equity eq ON eq.ticker = sh.ticker
            LEFT JOIN assets ast ON ast.ticker = sh.ticker
            LEFT JOIN liabilities li ON li.ticker = sh.ticker
            LEFT JOIN revenue_ttm rev ON rev.ticker = sh.ticker
            LEFT JOIN gross_profit_ttm gp ON gp.ticker = sh.ticker
            LEFT JOIN net_income_ttm ni ON ni.ticker = sh.ticker
        """)
        res_bctc = await db.execute(sql_bctc, {"tickers": tickers_needing_bctc})
        for b in res_bctc.mappings().all():
            bctc_data[b["ticker"]] = dict(b)

    def _build_comparison(t: str) -> Dict:
        r = rows.get(t, {})
        price = _safe_float(r.get("price"))
        ref = _safe_float(r.get("ref_price"))
        change = price - ref if ref > 0 else 0
        change_pct = (change / ref * 100) if ref > 0 else 0

        # Start with financial_ratio values
        pe = _safe_round(r.get("pe"))
        pb = _safe_round(r.get("pb"))
        roe = _safe_round(r.get("roe"))
        roa = _safe_round(r.get("roa"))
        gross_margin = _safe_round(r.get("gross_margin"))
        net_margin = _safe_round(r.get("net_margin"))
        debt_to_equity = _safe_round(r.get("debt_to_equity"))
        market_cap = _safe_round(r.get("market_cap"))
        eps = _safe_round(r.get("eps"))
        dividend_yield = _safe_round(r.get("dividend_yield"))

        # financial_ratio stores ROE/ROA as decimals (0.3 = 30%), convert to %
        if roe is not None:
            roe = _safe_round(roe * 100)
        if roa is not None:
            roa = _safe_round(roa * 100)

        # BCTC fallback for null values
        # Use hp_close (in 1000 VND) for BCTC calculations
        hp_close = _safe_float(r.get("hp_close"))
        bctc = bctc_data.get(t)
        if bctc and hp_close > 0:
            shares = _safe_float(bctc.get("shares"), 0)
            equity_val = _safe_float(bctc.get("equity"), 0)
            total_assets = _safe_float(bctc.get("total_assets"), 0)
            total_liab = _safe_float(bctc.get("total_liabilities"), 0)
            revenue = _safe_float(bctc.get("revenue"), 0)
            gross_profit = _safe_float(bctc.get("gross_profit"), 0)
            net_income = _safe_float(bctc.get("net_income"), 0)
            price_vnd = hp_close * 1000  # convert to VND

            if eps is None and net_income != 0 and shares > 0:
                eps = _safe_round(net_income / shares)

            if pe is None and net_income != 0 and shares > 0:
                computed_eps = net_income / shares
                if computed_eps > 0:
                    pe_val = price_vnd / computed_eps
                    if 0.1 <= pe_val <= 500:
                        pe = _safe_round(pe_val)

            if pb is None and equity_val > 0 and shares > 0:
                pb_val = price_vnd * shares / equity_val
                if 0.01 <= pb_val <= 100:
                    pb = _safe_round(pb_val)

            if market_cap is None and shares > 0:
                market_cap = _safe_round(price_vnd * shares)

            if roe is None and net_income != 0 and equity_val > 0:
                roe = _safe_round(net_income / equity_val * 100)

            if roa is None and net_income != 0 and total_assets > 0:
                roa = _safe_round(net_income / total_assets * 100)

            if gross_margin is None and revenue > 0 and gross_profit != 0:
                gross_margin = _safe_round(gross_profit / revenue * 100)

            if net_margin is None and revenue > 0 and net_income != 0:
                net_margin = _safe_round(net_income / revenue * 100)

            if debt_to_equity is None and equity_val > 0:
                debt_to_equity = _safe_round(total_liab / equity_val)

        return {
            "ticker": t,
            "companyName": r.get("company_name", ""),
            "exchange": r.get("exchange", ""),
            "price": price,
            "priceChange": round(change, 2),
            "priceChangePercent": round(change_pct, 2),
            "pe": pe,
            "pb": pb,
            "roe": roe,
            "roa": roa,
            "grossMargin": gross_margin,
            "netMargin": net_margin,
            "debtToEquity": debt_to_equity,
            "marketCap": market_cap,
            "eps": eps,
            "dividendYield": dividend_yield,
            "priceHistory": hist_map.get(t, []),
        }

    main_data = _build_comparison(ticker)
    peers_data = [_build_comparison(t) for t in peer_list if t in rows]

    return {"main": main_data, "peers": peers_data}


# ────────────────────────────────────────────────────────────────────
# 7. Deep Analysis (Balance Sheet, Income Statement, Cash Flow)
# ────────────────────────────────────────────────────────────────────
@cached("stock:deep", ttl=300)
async def get_deep_analysis(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    reports_res, ratios_res = await asyncio.gather(
        _query_annual_bctc(db, ticker, years=5),
        _query_annual_ratios(db, ticker, years=5),
    )

    reports = reports_res
    ratios = ratios_res

    bs_analysis = _build_bs_analysis(reports, ratios)
    is_analysis = _build_is_analysis(reports, ratios)
    cf_analysis = _build_cf_analysis(reports, ratios)

    return {
        "balanceSheet": bs_analysis,
        "incomeStatement": is_analysis,
        "cashFlow": cf_analysis,
    }


async def _query_annual_bctc(db: AsyncSession, ticker: str, years: int = 5) -> Dict:
    """Get annual (Q5=full year or Q4) BCTC data for multiple years."""
    all_codes = set()
    for mapping in (IS_CODES, BS_CODES, CF_CODES):
        all_codes.update(mapping.values())

    sql = text(f"""
        SELECT year, quarter, ind_code, value
        FROM {SCHEMA}.bctc
        WHERE ticker = :ticker
          AND ind_code = ANY(:codes)
        ORDER BY year DESC, quarter DESC
    """)
    res = await db.execute(sql, {"ticker": ticker, "codes": list(all_codes)})
    rows = res.mappings().all()

    pivot: Dict[Tuple[int, str], Dict[str, float]] = {}
    for r in rows:
        key = (int(r["year"]), str(r["quarter"]))
        if key not in pivot:
            pivot[key] = {}
        pivot[key][r["ind_code"]] = _safe_float(r["value"])

    return pivot


async def _query_annual_ratios(db: AsyncSession, ticker: str, years: int = 5) -> List[Dict]:
    """Get annual financial ratios."""
    sql = text(f"""
        SELECT year, quarter,
               pe, pb, roe, roa, roic,
               gross_margin, net_margin, ebit_margin,
               debt_to_equity, current_ratio, quick_ratio, cash_ratio,
               interest_coverage_ratio, asset_turnover,
               financial_leverage, market_cap, eps
        FROM {SCHEMA}.financial_ratio
        WHERE ticker = :ticker
        ORDER BY year DESC, quarter DESC
        LIMIT :limit
    """)
    res = await db.execute(sql, {"ticker": ticker, "limit": years * 4 + 4})
    return [dict(r) for r in res.mappings().all()]


def _build_bs_analysis(reports: Dict, ratios: List[Dict]) -> Dict:
    """Build balance sheet analysis data."""
    years_set = set()
    for (y, q) in reports.keys():
        years_set.add(y)
    years = sorted(years_set)[-5:]

    # Trends
    trends = []
    for year in years:
        year_data = {}
        for q in ["5", "4", "3", "2", "1"]:
            if (year, q) in reports:
                year_data = reports[(year, q)]
                break
        if not year_data:
            continue

        trends.append({
            "year": year,
            "totalAssets": year_data.get(BS_CODES["totalAssets"]),
            "currentAssets": year_data.get(BS_CODES["currentAssets"]),
            "nonCurrentAssets": year_data.get(BS_CODES["nonCurrentAssets"]),
            "totalLiabilities": year_data.get(BS_CODES["totalLiabilities"]),
            "currentLiabilities": year_data.get(BS_CODES["currentLiabilities"]),
            "longTermLiabilities": year_data.get(BS_CODES["longTermLiabilities"]),
            "equity": year_data.get(BS_CODES["totalEquity"]),
        })

    # Health indicators from latest ratio
    latest_r = ratios[0] if ratios else {}
    current_ratio_val = _safe_float(latest_r.get("current_ratio"))
    de_val = _safe_float(latest_r.get("debt_to_equity"))
    quick_ratio_val = _safe_float(latest_r.get("quick_ratio"))

    health_indicators = [
        {
            "name": "Hệ số thanh toán hiện hành",
            "value": current_ratio_val,
            "status": "good" if current_ratio_val >= 1.5 else ("warning" if current_ratio_val >= 1 else "danger"),
            "description": f"Khả năng thanh toán nợ ngắn hạn: {current_ratio_val:.2f}x",
            "threshold": ">= 1.5",
        },
        {
            "name": "Hệ số nợ/vốn chủ sở hữu",
            "value": de_val,
            "status": "good" if de_val <= 1 else ("warning" if de_val <= 2 else "danger"),
            "description": f"Đòn bẩy tài chính: {de_val:.2f}x",
            "threshold": "<= 1.0",
        },
        {
            "name": "Hệ số thanh toán nhanh",
            "value": quick_ratio_val,
            "status": "good" if quick_ratio_val >= 1 else ("warning" if quick_ratio_val >= 0.5 else "danger"),
            "description": f"Thanh khoản nhanh: {quick_ratio_val:.2f}x",
            "threshold": ">= 1.0",
        },
    ]

    # Overview stats
    latest_bs = {}
    for q in ["5", "4", "3", "2", "1"]:
        if years and (years[-1], q) in reports:
            latest_bs = reports[(years[-1], q)]
            break

    total_assets = latest_bs.get(BS_CODES["totalAssets"], 0)
    total_equity = latest_bs.get(BS_CODES["totalEquity"], 0)
    total_liab = latest_bs.get(BS_CODES["totalLiabilities"], 0)

    overview_stats = [
        {"label": "Tổng tài sản", "value": _fmt_market_cap(total_assets), "subLabel": "", "trend": ""},
        {"label": "Vốn chủ sở hữu", "value": _fmt_market_cap(total_equity), "subLabel": "", "trend": ""},
        {"label": "Tổng nợ", "value": _fmt_market_cap(total_liab), "subLabel": "", "trend": ""},
        {"label": "D/E", "value": f"{de_val:.2f}x", "subLabel": "", "trend": ""},
    ]

    # Leverage data
    leverage_data = []
    for t in trends:
        equity = t.get("equity") or 0
        liab = (t.get("totalLiabilities") or 0)
        leverage_data.append({
            "year": t["year"],
            "equity": equity,
            "liabilities": liab,
            "deRatio": round(liab / equity, 2) if equity > 0 else 0,
        })

    # Liquidity data
    liquidity_data = []
    for r in ratios:
        if r.get("current_ratio") is not None:
            liquidity_data.append({
                "year": r.get("year"),
                "quarter": r.get("quarter"),
                "currentRatio": _safe_round(r.get("current_ratio")),
                "quickRatio": _safe_round(r.get("quick_ratio")),
                "cashRatio": _safe_round(r.get("cash_ratio")),
            })

    return {
        "overviewStats": overview_stats,
        "healthIndicators": health_indicators,
        "trends": trends,
        "leverageData": leverage_data[:5],
        "liquidityData": liquidity_data[:8],
    }


def _build_is_analysis(reports: Dict, ratios: List[Dict]) -> Dict:
    """Build income statement analysis data."""
    years_set = set()
    for (y, q) in reports.keys():
        years_set.add(y)
    years = sorted(years_set)[-5:]

    # DuPont analysis from latest ratio
    latest_r = ratios[0] if ratios else {}
    prior_r = ratios[4] if len(ratios) > 4 else {}

    dupont = [
        {"name": "ROE", "value": _safe_float(latest_r.get("roe")), "prior": _safe_float(prior_r.get("roe"))},
        {"name": "Biên lợi nhuận ròng", "value": _safe_float(latest_r.get("net_margin")), "prior": _safe_float(prior_r.get("net_margin"))},
        {"name": "Vòng quay tổng tài sản", "value": _safe_float(latest_r.get("asset_turnover")), "prior": _safe_float(prior_r.get("asset_turnover"))},
        {"name": "Đòn bẩy tài chính", "value": _safe_float(latest_r.get("financial_leverage")), "prior": _safe_float(prior_r.get("financial_leverage"))},
    ]

    # Margin trends
    margin_trends = []
    for r in ratios:
        if r.get("gross_margin") is not None:
            margin_trends.append({
                "year": r.get("year"),
                "quarter": r.get("quarter"),
                "grossMargin": _safe_round(r.get("gross_margin")),
                "netMargin": _safe_round(r.get("net_margin")),
                "ebitMargin": _safe_round(r.get("ebit_margin")),
            })

    # Cost structure from BCTC
    cost_structure = []
    for year in years:
        year_data = {}
        for q in ["5", "4", "3", "2", "1"]:
            if (year, q) in reports:
                year_data = reports[(year, q)]
                break
        if not year_data:
            continue
        revenue = year_data.get(IS_CODES["revenue"], 0)
        cogs = year_data.get(IS_CODES["costOfGoodsSold"], 0)
        selling = year_data.get(IS_CODES["sellingExpenses"], 0)
        admin = year_data.get(IS_CODES["adminExpenses"], 0)
        fin_exp = year_data.get(IS_CODES["financialExpenses"], 0)
        cost_structure.append({
            "year": year,
            "revenue": revenue,
            "cogs": abs(cogs),
            "selling": abs(selling),
            "admin": abs(admin),
            "financial": abs(fin_exp),
        })

    # Growth data
    growth_data = []
    for i, year in enumerate(years):
        if i == 0:
            continue
        cur_data = {}
        prev_data = {}
        for q in ["5", "4", "3", "2", "1"]:
            if (year, q) in reports:
                cur_data = reports[(year, q)]
                break
        for q in ["5", "4", "3", "2", "1"]:
            if (years[i - 1], q) in reports:
                prev_data = reports[(years[i - 1], q)]
                break

        cur_rev = cur_data.get(IS_CODES["revenue"], 0)
        prev_rev = prev_data.get(IS_CODES["revenue"], 0)
        cur_ni = cur_data.get(IS_CODES["netProfit"], 0)
        prev_ni = prev_data.get(IS_CODES["netProfit"], 0)

        rev_growth = ((cur_rev - prev_rev) / abs(prev_rev) * 100) if prev_rev else 0
        ni_growth = ((cur_ni - prev_ni) / abs(prev_ni) * 100) if prev_ni else 0

        growth_data.append({
            "year": year,
            "revenueGrowth": round(rev_growth, 2),
            "netProfitGrowth": round(ni_growth, 2),
        })

    # Overview stats
    overview_stats = [
        {"label": "ROE", "value": f"{_safe_float(latest_r.get('roe')):.1f}%", "subLabel": "", "trend": ""},
        {"label": "Biên LN ròng", "value": f"{_safe_float(latest_r.get('net_margin')):.1f}%", "subLabel": "", "trend": ""},
        {"label": "EPS", "value": f"{_safe_float(latest_r.get('eps')):,.0f}", "subLabel": "", "trend": ""},
        {"label": "P/E", "value": f"{_safe_float(latest_r.get('pe')):.1f}", "subLabel": "", "trend": ""},
    ]

    return {
        "overviewStats": overview_stats,
        "dupont": dupont,
        "marginTrends": margin_trends[:8],
        "costStructure": cost_structure,
        "growthData": growth_data,
        "revenueBreakdown": [],
    }


def _build_cf_analysis(reports: Dict, ratios: List[Dict]) -> Dict:
    """Build cash flow analysis data."""
    years_set = set()
    for (y, q) in reports.keys():
        years_set.add(y)
    years = sorted(years_set)[-5:]

    # Trends
    trends = []
    for year in years:
        year_data = {}
        for q in ["5", "4", "3", "2", "1"]:
            if (year, q) in reports:
                year_data = reports[(year, q)]
                break
        if not year_data:
            continue
        trends.append({
            "year": year,
            "operatingCashFlow": year_data.get(CF_CODES["operatingCashFlow"]),
            "investingCashFlow": year_data.get(CF_CODES["investingCashFlow"]),
            "financingCashFlow": year_data.get(CF_CODES["financingCashFlow"]),
            "revenue": year_data.get(IS_CODES["revenue"]),
            "netProfit": year_data.get(IS_CODES["netProfit"]),
        })

    # Overview stats
    latest_cf = {}
    for q in ["5", "4", "3", "2", "1"]:
        if years and (years[-1], q) in reports:
            latest_cf = reports[(years[-1], q)]
            break

    ocf = latest_cf.get(CF_CODES["operatingCashFlow"], 0)
    icf = latest_cf.get(CF_CODES["investingCashFlow"], 0)
    fcf = latest_cf.get(CF_CODES["financingCashFlow"], 0)

    overview_stats = [
        {"label": "CF HĐKD", "value": _fmt_market_cap(ocf), "subLabel": "", "trend": "up" if ocf > 0 else "down"},
        {"label": "CF HĐĐT", "value": _fmt_market_cap(icf), "subLabel": "", "trend": "down" if icf < 0 else "up"},
        {"label": "CF HĐTC", "value": _fmt_market_cap(fcf), "subLabel": "", "trend": ""},
        {"label": "FCF", "value": _fmt_market_cap(ocf + icf), "subLabel": "", "trend": "up" if (ocf + icf) > 0 else "down"},
    ]

    # Efficiency metrics
    efficiency_metrics = []
    for t in trends:
        rev = t.get("revenue") or 0
        ocf_val = t.get("operatingCashFlow") or 0
        ni = t.get("netProfit") or 0
        efficiency_metrics.append({
            "year": t["year"],
            "cfToRevenue": round(ocf_val / rev * 100, 2) if rev else 0,
            "cfToNetProfit": round(ocf_val / ni * 100, 2) if ni else 0,
        })

    # Self-funding data
    self_funding = []
    for t in trends:
        ocf_val = t.get("operatingCashFlow") or 0
        icf_val = t.get("investingCashFlow") or 0
        self_funding.append({
            "year": t["year"],
            "operatingCF": ocf_val,
            "investingCF": icf_val,
            "selfFundingRatio": round(ocf_val / abs(icf_val) * 100, 2) if icf_val else 0,
        })

    # Earnings quality (CF vs profit)
    earnings_quality = []
    for t in trends:
        ocf_val = t.get("operatingCashFlow") or 0
        ni = t.get("netProfit") or 0
        earnings_quality.append({
            "year": t["year"],
            "netProfit": ni,
            "operatingCF": ocf_val,
            "ratio": round(ocf_val / ni * 100, 2) if ni else 0,
        })

    # Waterfall for latest year
    waterfall = []
    if latest_cf:
        waterfall = [
            {"name": "CF HĐKD", "value": ocf},
            {"name": "CF HĐĐT", "value": icf},
            {"name": "CF HĐTC", "value": fcf},
            {"name": "Thay đổi ròng", "value": ocf + icf + fcf},
        ]

    return {
        "overviewStats": overview_stats,
        "efficiencyMetrics": efficiency_metrics,
        "selfFundingData": self_funding,
        "earningsQuality": earnings_quality,
        "trends": trends,
        "waterfall": waterfall,
    }


# ────────────────────────────────────────────────────────────────────
# 8. Quant Analysis
# ────────────────────────────────────────────────────────────────────
@cached("stock:quant", ttl=600)
async def get_quant_analysis(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    """Quantitative analysis using numpy on price history."""
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    sql = text(f"""
        SELECT trading_date, close, volume
        FROM {SCHEMA}.history_price
        WHERE ticker = :ticker AND close IS NOT NULL
        ORDER BY trading_date ASC
    """)
    res = await db.execute(sql, {"ticker": ticker})
    rows = res.mappings().all()

    if len(rows) < 30:
        return _empty_quant()

    dates = [r["trading_date"] for r in rows]
    closes = np.array([float(r["close"]) for r in rows])
    volumes = np.array([float(r["volume"] or 0) for r in rows])

    # Daily returns
    returns = np.diff(closes) / closes[:-1]
    returns = returns[np.isfinite(returns)]

    if len(returns) < 20:
        return _empty_quant()

    # ── KPIs ──
    total_return = (closes[-1] / closes[0] - 1) * 100
    ann_return = ((closes[-1] / closes[0]) ** (252 / len(closes)) - 1) * 100
    ann_vol = float(np.std(returns) * np.sqrt(252) * 100)
    rf = 0.045  # risk-free rate ~4.5%
    sharpe = (ann_return / 100 - rf) / (ann_vol / 100) if ann_vol > 0 else 0

    # Max drawdown
    cummax = np.maximum.accumulate(closes)
    drawdowns = (closes - cummax) / cummax
    max_dd = float(np.min(drawdowns) * 100)

    # Sortino ratio
    daily_rf = rf / 252
    downside_diff = np.minimum(returns - daily_rf, 0)
    downside_vol = float(np.sqrt(np.mean(downside_diff ** 2)) * np.sqrt(252))
    sortino = (ann_return / 100 - rf) / downside_vol if downside_vol > 0 else 0

    kpis = [
        {"label": "Tổng lợi nhuận", "value": round(total_return, 2), "suffix": "%"},
        {"label": "LN hàng năm", "value": round(ann_return, 2), "suffix": "%"},
        {"label": "Biến động (σ)", "value": round(ann_vol, 2), "suffix": "%"},
        {"label": "Sharpe Ratio", "value": round(sharpe, 2), "suffix": ""},
        {"label": "Sortino Ratio", "value": round(sortino, 2), "suffix": ""},
        {"label": "Max Drawdown", "value": round(max_dd, 2), "suffix": "%"},
    ]

    # ── Wealth Index ──
    wealth = np.cumprod(1 + returns)
    wealth_index = [
        {"date": dates[i + 1], "value": round(float(wealth[i]), 4)}
        for i in range(0, len(wealth), max(1, len(wealth) // 200))
    ]

    # ── Monthly Returns heatmap ──
    monthly_returns = _compute_monthly_returns(dates[1:], returns)

    # ── Drawdown chart ──
    dd_sample = max(1, len(drawdowns) // 200)
    drawdown_data = [
        {"date": dates[i], "value": round(float(drawdowns[i]) * 100, 2)}
        for i in range(0, len(drawdowns), dd_sample)
    ]

    # ── Rolling Volatility (60-day window) ──
    window = 60
    rolling_vol_data = []
    if len(returns) > window:
        for i in range(window, len(returns), max(1, (len(returns) - window) // 150)):
            vol = float(np.std(returns[i - window:i]) * np.sqrt(252) * 100)
            rolling_vol_data.append({"date": dates[i + 1], "value": round(vol, 2)})

    # ── Histogram ──
    hist_counts, bin_edges = np.histogram(returns * 100, bins=50)
    histogram = [
        {"bin": round(float((bin_edges[i] + bin_edges[i + 1]) / 2), 2), "count": int(hist_counts[i])}
        for i in range(len(hist_counts))
    ]

    # ── Rolling Sharpe (120-day) ──
    sharpe_window = 120
    rolling_sharpe_data = []
    if len(returns) > sharpe_window:
        daily_rf_val = rf / 252
        for i in range(sharpe_window, len(returns), max(1, (len(returns) - sharpe_window) // 100)):
            window_ret = returns[i - sharpe_window:i]
            w_mean = float(np.mean(window_ret))
            w_std = float(np.std(window_ret))
            s = ((w_mean - daily_rf_val) / w_std * np.sqrt(252)) if w_std > 0 else 0
            rolling_sharpe_data.append({"date": dates[i + 1], "value": round(s, 2)})

    # ── VaR (Value at Risk) ──
    var_95 = float(np.percentile(returns, 5) * 100)
    var_99 = float(np.percentile(returns, 1) * 100)
    cvar_95 = float(np.mean(returns[returns <= np.percentile(returns, 5)]) * 100)
    var_data = {
        "var95": round(var_95, 2),
        "var99": round(var_99, 2),
        "cvar95": round(cvar_95, 2),
        "distribution": histogram[:20],
    }

    # ── Radar metrics ──
    ret_score = max(0, min(100, ann_return / 0.30 * 100))
    vol_score = max(0, min(100, (1 - ann_vol / 50) * 100))
    sharpe_score = max(0, min(100, sharpe / 3 * 100))
    dd_score = max(0, min(100, (1 + max_dd / 50) * 100))
    sortino_score = max(0, min(100, sortino / 3 * 100))

    if len(returns) > 20:
        monthly_means = []
        chunk = max(1, len(returns) // 12)
        for ci in range(0, len(returns), chunk):
            monthly_means.append(float(np.mean(returns[ci:ci + chunk])))
        cv = float(np.std(monthly_means) / (abs(np.mean(monthly_means)) + 1e-10))
        consistency = max(0, min(100, (1 - min(cv, 5) / 5) * 100))
    else:
        consistency = 50

    radar_metrics = [
        {"axis": "Lợi nhuận", "value": round(ret_score, 1)},
        {"axis": "Rủi ro thấp", "value": round(vol_score, 1)},
        {"axis": "Sharpe", "value": round(sharpe_score, 1)},
        {"axis": "Drawdown thấp", "value": round(dd_score, 1)},
        {"axis": "Sortino", "value": round(sortino_score, 1)},
        {"axis": "Tính nhất quán", "value": round(consistency, 1)},
    ]

    # ── Monte Carlo Simulation ──
    monte_carlo = _run_monte_carlo(closes[-1], returns, days=252, simulations=500)

    return {
        "kpis": kpis,
        "wealthIndex": wealth_index,
        "monthlyReturns": monthly_returns,
        "drawdownData": drawdown_data,
        "rollingVolatility": rolling_vol_data,
        "histogram": histogram,
        "rollingSharpe": rolling_sharpe_data,
        "varData": var_data,
        "radarMetrics": radar_metrics,
        "monteCarlo": monte_carlo,
    }


def _empty_quant() -> Dict:
    return {
        "kpis": [], "wealthIndex": [], "monthlyReturns": [],
        "drawdownData": [], "rollingVolatility": [], "histogram": [],
        "rollingSharpe": [], "varData": {}, "radarMetrics": [],
        "monteCarlo": {},
    }


def _compute_monthly_returns(dates: List[str], returns: np.ndarray) -> List[Dict]:
    """Aggregate daily returns into monthly returns for heatmap."""
    monthly: Dict[str, float] = {}
    for i, d in enumerate(dates):
        if i >= len(returns):
            break
        try:
            if "-" in d:
                ym = d[:7]
            else:
                parts = d.split("/")
                ym = f"{parts[2]}-{parts[1]}"
        except (IndexError, AttributeError):
            continue
        if ym not in monthly:
            monthly[ym] = 1.0
        monthly[ym] *= (1 + float(returns[i]))

    result = []
    for ym, cum in sorted(monthly.items()):
        parts = ym.split("-")
        if len(parts) == 2:
            result.append({
                "year": int(parts[0]),
                "month": int(parts[1]),
                "return": round((cum - 1) * 100, 2),
            })
    return result


def _run_monte_carlo(
    last_price: float,
    returns: np.ndarray,
    days: int = 252,
    simulations: int = 500,
) -> Dict[str, Any]:
    """Run Monte Carlo simulation on stock returns."""
    if len(returns) < 20:
        return {}

    mu = float(np.mean(returns))
    sigma = float(np.std(returns))

    rng = np.random.default_rng(abs(hash(str(last_price))) % (2**31))
    random_returns = rng.normal(mu, sigma, (simulations, days))
    price_paths = last_price * np.cumprod(1 + random_returns, axis=1)

    percentiles = {}
    for p in [5, 25, 50, 75, 95]:
        pct_values = np.percentile(price_paths, p, axis=0)
        sample = max(1, days // 50)
        percentiles[f"p{p}"] = [
            round(float(pct_values[i]), 2)
            for i in range(0, days, sample)
        ]

    final_prices = price_paths[:, -1]
    expected = round(float(np.mean(final_prices)), 2)
    p5 = round(float(np.percentile(final_prices, 5)), 2)
    p95 = round(float(np.percentile(final_prices, 95)), 2)

    return {
        "simulations": simulations,
        "days": days,
        "expectedPrice": expected,
        "p5": p5,
        "p95": p95,
        "percentiles": percentiles,
        "probUp": round(float(np.mean(final_prices > last_price) * 100), 1),
    }


# ────────────────────────────────────────────────────────────────────
# 9. Valuation
# ────────────────────────────────────────────────────────────────────

# PAR value per share in VND (standard for Vietnam stock market)
_VN_PAR_VALUE = 10_000


@cached("stock:valuation", ttl=600)
async def get_valuation(db: AsyncSession, ticker: str = "VIC") -> Dict[str, Any]:
    """Valuation models: DCF, DDM, PE/PB bands, peer valuation."""
    await db.execute(_STMT_TIMEOUT)
    ticker = ticker.upper()

    ratio_res, bctc_res, price_res, peers_res = await asyncio.gather(
        _query_valuation_ratios(db, ticker),
        _query_valuation_bctc(db, ticker),
        _query_price_history(db, ticker, days=1500),
        _query_valuation_peers(db, ticker),
    )

    ratios = ratio_res or []
    bctc = bctc_res
    prices = price_res or []
    peers = peers_res or []

    # history_price.close is in 1000 VND — convert to VND
    for p in prices:
        p["close"] = float(p["close"]) * 1000

    current_price = float(prices[-1]["close"]) if prices else 0

    # ── Derive PE, PB, EPS, BVPS, outstanding shares from BCTC ──
    derived = _derive_financial_metrics(bctc, ratios, current_price)
    enriched_ratios = _enrich_ratios_with_derived(ratios, derived)
    shares = derived.get("outstanding_shares", 0)

    dcf = _compute_dcf(bctc, enriched_ratios, current_price)
    ddm = _compute_ddm(enriched_ratios, current_price)
    pe_band = _compute_pe_pb_band(prices, bctc, shares, "pe")
    pb_band = _compute_pe_pb_band(prices, bctc, shares, "pb")

    peer_valuation = [
        {
            "ticker": r["ticker"],
            "companyName": r.get("company_name", ""),
            "pe": _safe_round(r.get("pe")),
            "pb": _safe_round(r.get("pb")),
            "evEbitda": _safe_round(r.get("ev_ebitda")),
            "roe": _safe_round(r.get("roe")),
            "marketCap": _safe_round(r.get("market_cap")),
        }
        for r in peers
    ]

    # Build summary from all available methods
    dcf_val = dcf.get("intrinsicValue", 0)
    ddm_val = ddm.get("intrinsicValue", 0)

    # PE-based valuation from peers
    peer_pe_val = 0
    target_eps = derived.get("eps", 0)
    peer_pes = [p.get("pe") for p in peer_valuation if p.get("pe") and p["pe"] > 0]
    if peer_pes and target_eps > 0:
        avg_peer_pe = sum(peer_pes) / len(peer_pes)
        peer_pe_val = round(avg_peer_pe * target_eps, 0)

    # PB-based valuation from peers
    peer_pb_val = 0
    target_bvps = derived.get("bvps", 0)
    peer_pbs = [p.get("pb") for p in peer_valuation if p.get("pb") and p["pb"] > 0]
    if peer_pbs and target_bvps > 0:
        avg_peer_pb = sum(peer_pbs) / len(peer_pbs)
        peer_pb_val = round(avg_peer_pb * target_bvps, 0)

    # Collect all valid valuations (exclude negative values)
    methods = []
    method_values = []
    if dcf_val > 0:
        methods.append({"method": "DCF", "value": dcf_val})
        method_values.append(dcf_val)
    if ddm_val > 0:
        methods.append({"method": "DDM (Gordon)", "value": ddm_val})
        method_values.append(ddm_val)
    if pe_band.get("avgBand") and pe_band["avgBand"]:
        pe_band_val = pe_band["avgBand"][-1]
        methods.append({"method": "P/E Band", "value": round(pe_band_val, 0)})
        method_values.append(pe_band_val)
    if pb_band.get("avgBand") and pb_band["avgBand"]:
        pb_band_val = pb_band["avgBand"][-1]
        methods.append({"method": "P/B Band", "value": round(pb_band_val, 0)})
        method_values.append(pb_band_val)
    if peer_pe_val > 0:
        methods.append({"method": "Peer P/E", "value": peer_pe_val})
        method_values.append(peer_pe_val)
    if peer_pb_val > 0:
        methods.append({"method": "Peer P/B", "value": peer_pb_val})
        method_values.append(peer_pb_val)

    # Weighted intrinsic value: DCF weighted higher
    if method_values:
        # Weight DCF more if available
        if dcf_val > 0:
            intrinsic = dcf_val * 0.35
            rest = [v for v in method_values if v != dcf_val]
            if rest:
                intrinsic += sum(rest) / len(rest) * 0.65
            else:
                intrinsic = dcf_val
        else:
            intrinsic = sum(method_values) / len(method_values)
    else:
        intrinsic = 0

    upside = ((intrinsic - current_price) / current_price * 100) if current_price > 0 and intrinsic > 0 else 0

    summary = {
        "intrinsicValue": round(intrinsic, 0),
        "currentPrice": current_price,
        "upside": round(upside, 2),
        "methods": methods,
    }

    football_field = _compute_football_field(dcf, ddm, pe_band, pb_band, peer_valuation, current_price, target_eps)

    return {
        "summary": summary,
        "dcf": dcf,
        "ddm": ddm,
        "peBand": pe_band,
        "pbBand": pb_band,
        "peerValuation": peer_valuation,
        "footballField": football_field,
    }


def _derive_financial_metrics(bctc: Dict, ratios: List[Dict], current_price: float) -> Dict:
    """Derive EPS, BVPS, PE, PB, outstanding shares, dividendYield from BCTC data.

    This compensates for financial_ratio table having NULL values for these metrics.
    Uses TTM (trailing twelve months) by summing the last 4 quarters for flow items.
    Handles banks and non-bank companies differently for share counts and EPS.
    """
    result: Dict[str, float] = {}

    if not bctc:
        return result

    # Sort periods descending
    sorted_keys = sorted(bctc.keys(), key=lambda x: (x[0], int(x[1]) if str(x[1]).isdigit() else 0), reverse=True)

    # ─── Outstanding shares ───
    # 1) Try C_PHI_U_PH_TH_NG (par value amount) / 10,000
    shares = 0
    for k in sorted_keys:
        par_value = bctc[k].get(BS_CODES.get("outstandingSharesPar", ""), 0)
        if par_value > 0:
            shares = par_value / _VN_PAR_VALUE
            break

    # 2) Fallback: charterCapital / 10,000 (works for banks like VCB)
    if shares <= 0:
        for k in sorted_keys:
            charter = bctc[k].get(BS_CODES.get("charterCapital", ""), 0)
            if charter > 0:
                shares = charter / _VN_PAR_VALUE
                break

    # 3) Fallback: financial_ratio table
    if shares <= 0 and ratios:
        shares = _safe_float(ratios[0].get("outstanding_shares"))

    if shares > 0:
        result["outstanding_shares"] = shares

    # ─── EPS ───
    # 1) Try direct EPS from BCTC (L_I_C_B_N_TR_N_C_PHI_U = basic EPS, available for banks)
    direct_eps_code = IS_CODES.get("basicEps", "")
    ttm_direct_eps = _compute_ttm(bctc, sorted_keys, direct_eps_code) if direct_eps_code else 0

    # 2) Compute from net profit parent / shares
    ttm_net_profit = _compute_ttm(bctc, sorted_keys, IS_CODES.get("netProfitParent", ""))
    computed_eps = (ttm_net_profit / shares) if shares > 0 and ttm_net_profit != 0 else 0

    # Use direct EPS if available, otherwise computed
    eps = ttm_direct_eps if ttm_direct_eps > 0 else computed_eps
    if eps != 0:
        result["eps"] = eps
        if current_price > 0 and eps > 0:
            result["pe"] = current_price / eps

    # ─── BVPS from Equity ───
    for k in sorted_keys:
        equity = bctc[k].get(BS_CODES.get("totalEquity", ""), 0)
        if equity > 0 and shares > 0:
            bvps = equity / shares
            result["bvps"] = bvps
            if current_price > 0 and bvps > 0:
                result["pb"] = current_price / bvps
            break

    # ─── Market Cap ───
    if current_price > 0 and shares > 0:
        result["market_cap"] = current_price * shares

    # ─── Dividend yield ───
    # From dividends paid (negative) in cash flow
    ttm_dividends_paid = abs(_compute_ttm(bctc, sorted_keys, CF_CODES.get("dividendsPaid", "")))
    if ttm_dividends_paid > 0 and shares > 0:
        dps = ttm_dividends_paid / shares
        result["dps"] = dps
        if current_price > 0:
            result["dividend_yield"] = (dps / current_price) * 100

    # ─── D/E ratio ───
    for k in sorted_keys:
        total_liab = bctc[k].get(BS_CODES.get("totalLiabilities", ""), 0)
        equity = bctc[k].get(BS_CODES.get("totalEquity", ""), 0)
        if equity > 0:
            result["debt_to_equity"] = total_liab / equity
            break

    return result


def _compute_ttm(bctc: Dict, sorted_keys: List, ind_code: str) -> float:
    """Compute trailing twelve months value by summing last 4 quarterly values."""
    # Check if there's annual data (quarter 5) first
    for k in sorted_keys:
        if str(k[1]) in ("5", "0"):
            val = bctc[k].get(ind_code, 0)
            if val != 0:
                return val

    # Sum last 4 quarters
    values = []
    for k in sorted_keys:
        q = str(k[1])
        if not q.isdigit() or q in ("5", "0"):
            continue
        val = bctc[k].get(ind_code, 0)
        if val != 0:
            values.append(val)
        if len(values) >= 4:
            break

    return sum(values) if len(values) >= 2 else (values[0] if values else 0)


def _enrich_ratios_with_derived(ratios: List[Dict], derived: Dict) -> List[Dict]:
    """Inject derived PE/PB/EPS into ratio objects where they are NULL."""
    if not ratios:
        # Create a synthetic ratio entry
        return [{
            "year": 2025, "quarter": 4,
            "pe": derived.get("pe"),
            "pb": derived.get("pb"),
            "eps": derived.get("eps"),
            "roe": None,
            "market_cap": derived.get("market_cap"),
            "outstanding_shares": derived.get("outstanding_shares"),
            "dividend_yield": derived.get("dividend_yield"),
            "debt_to_equity": derived.get("debt_to_equity"),
        }]

    enriched = []
    for r in ratios:
        r2 = dict(r)
        if not r2.get("pe") and derived.get("pe"):
            r2["pe"] = derived["pe"]
        if not r2.get("pb") and derived.get("pb"):
            r2["pb"] = derived["pb"]
        if not r2.get("eps") and derived.get("eps"):
            r2["eps"] = derived["eps"]
        if not r2.get("market_cap") and derived.get("market_cap"):
            r2["market_cap"] = derived["market_cap"]
        if not r2.get("outstanding_shares") and derived.get("outstanding_shares"):
            r2["outstanding_shares"] = derived["outstanding_shares"]
        if not r2.get("dividend_yield") and derived.get("dividend_yield"):
            r2["dividend_yield"] = derived["dividend_yield"]
        if not r2.get("debt_to_equity") and derived.get("debt_to_equity"):
            r2["debt_to_equity"] = derived["debt_to_equity"]
        enriched.append(r2)
    return enriched


async def _query_valuation_ratios(db: AsyncSession, ticker: str) -> List[Dict]:
    sql = text(f"""
        SELECT year, quarter, pe, pb, eps, roe, roa,
               market_cap, outstanding_shares, ev_ebitda,
               dividend_yield, net_margin, debt_to_equity
        FROM {SCHEMA}.financial_ratio
        WHERE ticker = :ticker
        ORDER BY year DESC, quarter DESC
        LIMIT 20
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


async def _query_valuation_bctc(db: AsyncSession, ticker: str) -> Dict:
    codes = list(set(IS_CODES.values()) | set(CF_CODES.values()) | set(BS_CODES.values()))
    sql = text(f"""
        SELECT year, quarter, ind_code, value
        FROM {SCHEMA}.bctc
        WHERE ticker = :ticker AND ind_code = ANY(:codes)
        ORDER BY year DESC, quarter DESC
    """)
    res = await db.execute(sql, {"ticker": ticker, "codes": codes})
    rows = res.mappings().all()

    pivot: Dict[Tuple[int, str], Dict[str, float]] = {}
    for r in rows:
        key = (int(r["year"]), str(r["quarter"]))
        if key not in pivot:
            pivot[key] = {}
        pivot[key][r["ind_code"]] = _safe_float(r["value"])
    return pivot


async def _query_valuation_peers(db: AsyncSession, ticker: str) -> List[Dict]:
    sql = text(f"""
        WITH sector AS (
            SELECT icb_name2 FROM {SCHEMA}.company_overview
            WHERE ticker = :ticker LIMIT 1
        ),
        peer_ratios AS (
            SELECT DISTINCT ON (fr.ticker)
                fr.ticker, co.organ_short_name AS company_name,
                fr.pe, fr.pb, fr.ev_ebitda, fr.roe, fr.market_cap
            FROM {SCHEMA}.financial_ratio fr
            JOIN {SCHEMA}.company_overview co ON co.ticker = fr.ticker
            WHERE co.icb_name2 = (SELECT icb_name2 FROM sector)
              AND fr.ticker != :ticker
            ORDER BY fr.ticker, fr.year DESC, fr.quarter DESC
        )
        SELECT * FROM peer_ratios LIMIT 10
    """)
    res = await db.execute(sql, {"ticker": ticker})
    return [dict(r) for r in res.mappings().all()]


def _compute_dcf(bctc: Dict, ratios: List[Dict], current_price: float) -> Dict:
    """DCF model: use annual FCF, derive WACC from data where possible."""
    yearly_fcf: Dict[int, float] = {}
    annual_years: set = set()

    # First pass: collect annual (quarter=5 or 0) FCF
    for (yr, q), data in bctc.items():
        if str(q) not in ("5", "0"):
            continue
        ocf = data.get(CF_CODES.get("operatingCashFlow", ""), 0)
        capex = abs(data.get(CF_CODES.get("purchaseOfFixedAssets", ""), 0))
        if ocf == 0:
            continue
        yearly_fcf[yr] = ocf - capex
        annual_years.add(yr)

    # Second pass: accumulate quarterly FCF for years without annual data
    for (yr, q), data in bctc.items():
        if str(q) in ("5", "0") or yr in annual_years:
            continue
        ocf = data.get(CF_CODES.get("operatingCashFlow", ""), 0)
        capex = abs(data.get(CF_CODES.get("purchaseOfFixedAssets", ""), 0))
        if ocf == 0:
            continue
        yearly_fcf.setdefault(yr, 0)
        yearly_fcf[yr] += ocf - capex

    if not yearly_fcf:
        return {"wacc": 0, "terminalGrowth": 0, "projections": [], "sensitivityMatrix": [], "intrinsicValue": 0}

    sorted_years = sorted(yearly_fcf.keys(), reverse=True)
    base_fcf = yearly_fcf[sorted_years[0]]

    # Estimate growth rate from historical FCF CAGR
    growth_rate = 0.08
    if len(sorted_years) >= 3:
        oldest_yr = sorted_years[min(4, len(sorted_years) - 1)]
        old_fcf = yearly_fcf[oldest_yr]
        if old_fcf > 0 and base_fcf > 0:
            n = sorted_years[0] - oldest_yr
            if n > 0:
                cagr = (base_fcf / old_fcf) ** (1 / n) - 1
                growth_rate = max(-0.05, min(0.30, cagr))

    # Estimate WACC
    wacc = 0.12
    if ratios:
        roe = _safe_float(ratios[0].get("roe")) / 100 if ratios[0].get("roe") else 0
        de = _safe_float(ratios[0].get("debt_to_equity"))
        if roe > 0 and de >= 0:
            ke = max(0.08, min(0.25, roe))
            kd = 0.06
            tax_rate = 0.20
            e_weight = 1 / (1 + de)
            d_weight = de / (1 + de)
            wacc = ke * e_weight + kd * (1 - tax_rate) * d_weight
            wacc = max(0.08, min(0.20, wacc))

    terminal_growth = 0.03

    shares = _safe_float(ratios[0].get("outstanding_shares")) if ratios else 0
    projections_display = []
    cum_pv_full = 0.0
    for i in range(1, 6):
        projected_fcf = base_fcf * (1 + growth_rate) ** i
        pv = projected_fcf / (1 + wacc) ** i
        cum_pv_full += pv
        projections_display.append({
            "year": i,
            "fcf": round(projected_fcf / 1e9, 2),
            "pv": round(pv / 1e9, 2),
        })

    terminal_fcf = base_fcf * (1 + growth_rate) ** 5 * (1 + terminal_growth)
    terminal_value = terminal_fcf / (wacc - terminal_growth) if wacc > terminal_growth else 0
    pv_terminal = terminal_value / (1 + wacc) ** 5

    ev = cum_pv_full + pv_terminal
    intrinsic = (ev / shares) if shares > 0 else 0

    # Sensitivity matrix
    waccs = [round(wacc - 0.02, 3), round(wacc - 0.01, 3), round(wacc, 3), round(wacc + 0.01, 3), round(wacc + 0.02, 3)]
    growths = [0.02, 0.025, 0.03, 0.035, 0.04]
    sensitivity = []
    for w in waccs:
        row = []
        for g in growths:
            if w <= g:
                row.append(0)
                continue
            tv = base_fcf * (1 + growth_rate) ** 5 * (1 + g) / (w - g)
            pv_tv = tv / (1 + w) ** 5
            cum_pv = sum(base_fcf * (1 + growth_rate) ** yr / (1 + w) ** yr for yr in range(1, 6))
            val = (cum_pv + pv_tv) / shares if shares > 0 else 0
            row.append(round(val, 0))
        sensitivity.append(row)

    return {
        "wacc": round(wacc, 4),
        "terminalGrowth": terminal_growth,
        "projections": projections_display,
        "sensitivityMatrix": sensitivity,
        "intrinsicValue": round(intrinsic, 0),
    }


def _compute_ddm(ratios: List[Dict], current_price: float) -> Dict:
    """Gordon Growth Model (DDM)."""
    if not ratios:
        return {"intrinsicValue": 0}

    div_yield = _safe_float(ratios[0].get("dividend_yield"))
    eps = _safe_float(ratios[0].get("eps"))
    roe = _safe_float(ratios[0].get("roe")) / 100 if ratios[0].get("roe") else 0

    if eps <= 0:
        return {"intrinsicValue": 0, "dividendPerShare": 0, "costOfEquity": 0, "growthRate": 0}

    if div_yield > 0 and current_price > 0:
        payout_ratio = min(1.0, (div_yield / 100) * current_price / eps)
    else:
        payout_ratio = 0.3
    dividend = eps * payout_ratio

    if dividend <= 0:
        return {"intrinsicValue": 0, "dividendPerShare": 0, "costOfEquity": 0, "growthRate": 0}

    cost_of_equity = max(0.08, min(0.20, roe if roe > 0 else 0.12))

    retention = 1 - payout_ratio
    growth = max(0.02, min(0.10, roe * retention)) if roe > 0 else 0.05

    if cost_of_equity <= growth:
        growth = cost_of_equity - 0.02

    intrinsic = dividend * (1 + growth) / (cost_of_equity - growth)

    return {
        "intrinsicValue": round(intrinsic, 0),
        "dividendPerShare": round(dividend, 0),
        "costOfEquity": round(cost_of_equity, 4),
        "growthRate": round(growth, 4),
    }


def _compute_pe_pb_band(prices: List[Dict], bctc: Dict, shares: float, metric: str = "pe") -> Dict:
    """Compute PE or PB band chart from BCTC + price data.

    Instead of relying on financial_ratio (which has NULL PE/PB),
    we derive annual EPS/BVPS from BCTC and compute historical multiples
    from year-end prices.
    """
    _empty = {"dates": [], "prices": [], "highBand": [], "midBand": [], "lowBand": [], "avgBand": []}
    if not prices or not bctc or shares <= 0:
        return _empty

    sorted_keys = sorted(bctc.keys(), key=lambda x: (x[0], int(x[1]) if str(x[1]).isdigit() else 0))

    # ── Build annual base values (EPS or BVPS) from BCTC ──
    annual_base: Dict[int, float] = {}

    if metric == "pe":
        code = IS_CODES.get("netProfitParent", "")
        eps_code = IS_CODES.get("basicEps", "")
        # Prefer annual (q=5 or 0) - net profit / shares
        for yr, q in sorted_keys:
            if str(q) in ("5", "0") and yr not in annual_base:
                val = bctc[(yr, q)].get(code, 0)
                if val > 0:
                    annual_base[yr] = val / shares
        # For banks: try direct EPS (basicEps) summed across quarters
        if not annual_base and eps_code:
            q_eps_acc: Dict[int, float] = {}
            q_eps_cnt: Dict[int, int] = {}
            for yr, q in sorted_keys:
                if str(q) not in ("5", "0"):
                    val = bctc[(yr, q)].get(eps_code, 0)
                    if val > 0:
                        q_eps_acc.setdefault(yr, 0)
                        q_eps_cnt.setdefault(yr, 0)
                        q_eps_acc[yr] += val
                        q_eps_cnt[yr] += 1
            for yr, total in q_eps_acc.items():
                if q_eps_cnt.get(yr, 0) >= 2 and total > 0:
                    annual_base[yr] = total
        # Fallback: sum quarterly net profit for years without annual
        q_acc: Dict[int, float] = {}
        q_cnt: Dict[int, int] = {}
        for yr, q in sorted_keys:
            if str(q) not in ("5", "0") and yr not in annual_base:
                val = bctc[(yr, q)].get(code, 0)
                if val != 0:
                    q_acc.setdefault(yr, 0)
                    q_cnt.setdefault(yr, 0)
                    q_acc[yr] += val
                    q_cnt[yr] += 1
        for yr, total in q_acc.items():
            if q_cnt.get(yr, 0) >= 2 and total > 0:
                annual_base[yr] = total / shares
    else:
        code = BS_CODES.get("totalEquity", "")
        # For PB, equity is a balance-sheet item — take latest per year
        seen_years: set = set()
        for yr, q in reversed(sorted_keys):
            if yr not in seen_years:
                val = bctc[(yr, q)].get(code, 0)
                if val > 0:
                    annual_base[yr] = val / shares
                    seen_years.add(yr)

    if not annual_base:
        return _empty

    # ── Compute historical multiples from year-end prices ──
    year_end_prices: Dict[int, float] = {}
    for p in prices:
        d = str(p["trading_date"])
        try:
            yr = int(d[:4])
            year_end_prices[yr] = float(p["close"])
        except (ValueError, IndexError):
            continue

    multiples = []
    for yr, base_val in annual_base.items():
        price = year_end_prices.get(yr)
        if price and price > 0 and base_val > 0:
            mult = price / base_val
            if 0 < mult < 500:     # sanity check
                multiples.append(mult)

    # Fallback: compute from current price if not enough history
    if len(multiples) < 2:
        latest_yr = max(annual_base.keys())
        latest_base = annual_base[latest_yr]
        if latest_base > 0:
            current_price = float(prices[-1]["close"])
            cm = current_price / latest_base
            multiples = [cm * 0.6, cm * 0.8, cm, cm * 1.2, cm * 1.4]

    if not multiples:
        return _empty

    high_mult = max(multiples)
    low_mult = min(multiples)
    avg_mult = sum(multiples) / len(multiples)
    sorted_m = sorted(multiples)
    mid_mult = sorted_m[len(sorted_m) // 2]

    # ── Build time-varying base lookup ──
    years_sorted = sorted(annual_base.keys())

    def _find_base(date_str: str) -> float:
        try:
            yr = int(str(date_str)[:4])
        except (ValueError, IndexError):
            return annual_base[years_sorted[-1]]
        best = annual_base[years_sorted[0]]
        for y in years_sorted:
            if y <= yr:
                best = annual_base[y]
        return best

    # ── Sample prices for chart ──
    sample = max(1, len(prices) // 200)
    sampled = [prices[i] for i in range(0, len(prices), sample)]

    dates = [str(p["trading_date"]) for p in sampled]
    price_vals = [float(p["close"]) for p in sampled]

    high_band, mid_band, low_band, avg_band = [], [], [], []
    for d in dates:
        bv = _find_base(d)
        high_band.append(round(high_mult * bv, 2))
        mid_band.append(round(mid_mult * bv, 2))
        low_band.append(round(low_mult * bv, 2))
        avg_band.append(round(avg_mult * bv, 2))

    return {
        "dates": dates,
        "prices": price_vals,
        "highBand": high_band,
        "midBand": mid_band,
        "lowBand": low_band,
        "avgBand": avg_band,
    }


def _compute_football_field(dcf: Dict, ddm: Dict, pe_band: Dict, pb_band: Dict,
                             peer_valuation: List[Dict], current_price: float,
                             target_eps: float = 0) -> List[Dict]:
    """Compute football field chart data showing valuation ranges."""
    result = []

    # DCF
    if dcf.get("sensitivityMatrix"):
        flat = [v for row in dcf["sensitivityMatrix"] for v in row if v > 0]
        if flat:
            result.append({"method": "DCF", "low": min(flat), "mid": dcf.get("intrinsicValue", 0), "high": max(flat)})

    # DDM
    ddm_val = ddm.get("intrinsicValue", 0)
    dps = ddm.get("dividendPerShare", 0)
    ke = ddm.get("costOfEquity", 0)
    g = ddm.get("growthRate", 0)
    if ddm_val > 0 and dps > 0 and ke > 0:
        ddm_low = dps * (1 + max(0.01, g - 0.01)) / (min(0.25, ke + 0.02) - max(0.01, g - 0.01)) if (ke + 0.02) > (g - 0.01) else ddm_val * 0.7
        ddm_high = dps * (1 + min(0.15, g + 0.01)) / (max(0.06, ke - 0.02) - min(0.15, g + 0.01)) if (ke - 0.02) > (g + 0.01) else ddm_val * 1.3
        result.append({"method": "DDM", "low": round(min(ddm_low, ddm_val), 0), "mid": ddm_val, "high": round(max(ddm_high, ddm_val), 0)})

    # PE Band
    if pe_band.get("lowBand") and pe_band["lowBand"]:
        result.append({"method": "P/E Band", "low": pe_band["lowBand"][-1], "mid": pe_band["avgBand"][-1], "high": pe_band["highBand"][-1]})

    # PB Band
    if pb_band.get("lowBand") and pb_band["lowBand"]:
        result.append({"method": "P/B Band", "low": pb_band["lowBand"][-1], "mid": pb_band["avgBand"][-1], "high": pb_band["highBand"][-1]})

    # Peer comparison
    peer_pes = [p.get("pe") for p in peer_valuation if p.get("pe") and p["pe"] > 0]
    if peer_pes and target_eps > 0:
        result.append({
            "method": "Peer P/E",
            "low": round(min(peer_pes) * target_eps, 0),
            "mid": round(sum(peer_pes) / len(peer_pes) * target_eps, 0),
            "high": round(max(peer_pes) * target_eps, 0),
        })

    # Current price marker
    if result:
        result.append({"method": "Giá hiện tại", "low": current_price, "mid": current_price, "high": current_price})

    return result
