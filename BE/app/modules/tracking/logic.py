"""Business logic for Tracking module — ghi log mọi hành vi người dùng."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

SYSTEM_SCHEMA = "system"


# ────────────────────────────────────────────────────────────────────
# 1. Ghi log tìm kiếm tin tức / từ khoá chung
# ────────────────────────────────────────────────────────────────────
async def track_search(
    db: AsyncSession,
    keyword: str,
    session_id: str = "anonymous",
    ip_address: Optional[str] = None,
) -> bool:
    sql = text(f"""
        INSERT INTO {SYSTEM_SCHEMA}.search_logs (keyword, session_id, ip_address)
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
        logger.error("track_search error: %s", exc)
        return False


# ────────────────────────────────────────────────────────────────────
# 2. Ghi log tìm kiếm mã cổ phiếu
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
            "keyword": keyword.strip().upper(),
            "session_id": session_id,
            "ip_address": ip_address,
        })
        return True
    except Exception as exc:
        logger.error("track_stock_search error: %s", exc)
        return False


# ────────────────────────────────────────────────────────────────────
# 3. Ghi log click vào sidebar
# ────────────────────────────────────────────────────────────────────
async def track_sidebar_click(
    db: AsyncSession,
    menu_name: str,
    menu_href: str,
    session_id: str = "anonymous",
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
) -> bool:
    sql = text(f"""
        INSERT INTO {SYSTEM_SCHEMA}.sidebar_clicks
            (menu_name, menu_href, user_id, session_id, ip_address)
        VALUES (:menu_name, :menu_href, :user_id, :session_id, :ip_address)
    """)
    try:
        await db.execute(sql, {
            "menu_name": menu_name,
            "menu_href": menu_href,
            "user_id": user_id,
            "session_id": session_id,
            "ip_address": ip_address,
        })
        return True
    except Exception as exc:
        logger.error("track_sidebar_click error: %s", exc)
        return False


# ────────────────────────────────────────────────────────────────────
# 4. Đăng nhập — ghi vào login_logs (gọi từ auth module)
# ────────────────────────────────────────────────────────────────────
async def track_login(
    db: AsyncSession,
    user_id: Optional[int],
    method: str = "local",
    success: bool = True,
    ip_address: Optional[str] = None,
    device_info: Optional[str] = None,
) -> bool:
    sql = text(f"""
        INSERT INTO {SYSTEM_SCHEMA}.login_logs
            (user_id, method, success, ip_address, device_info)
        VALUES (:user_id, :method, :success, :ip_address, :device_info)
    """)
    try:
        await db.execute(sql, {
            "user_id": user_id,
            "method": method,
            "success": success,
            "ip_address": ip_address,
            "device_info": device_info,
        })
        return True
    except Exception as exc:
        logger.error("track_login error: %s", exc)
        return False


# ────────────────────────────────────────────────────────────────────
# 5. Session management
# ────────────────────────────────────────────────────────────────────
async def session_start(
    db: AsyncSession,
    session_id: str,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> bool:
    """Tạo mới hoặc bỏ qua nếu session đã tồn tại."""
    sql = text(f"""
        INSERT INTO {SYSTEM_SCHEMA}.session_logs
            (session_id, user_id, ip_address, user_agent)
        VALUES (:session_id, :user_id, :ip_address, :user_agent)
        ON CONFLICT DO NOTHING
    """)
    try:
        await db.execute(sql, {
            "session_id": session_id,
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
        })
        return True
    except Exception as exc:
        logger.error("session_start error: %s", exc)
        return False


async def session_heartbeat(
    db: AsyncSession,
    session_id: str,
    duration_seconds: int = 0,
) -> bool:
    """Cập nhật last_seen_at và duration cho session đang hoạt động."""
    sql = text(f"""
        UPDATE {SYSTEM_SCHEMA}.session_logs
        SET last_seen_at = NOW(),
            duration_seconds = :duration_seconds
        WHERE session_id = :session_id AND ended = FALSE
    """)
    try:
        await db.execute(sql, {
            "session_id": session_id,
            "duration_seconds": duration_seconds,
        })
        return True
    except Exception as exc:
        logger.error("session_heartbeat error: %s", exc)
        return False


async def session_end(
    db: AsyncSession,
    session_id: str,
    duration_seconds: int = 0,
) -> bool:
    """Đánh dấu session kết thúc và lưu tổng thời gian."""
    sql = text(f"""
        UPDATE {SYSTEM_SCHEMA}.session_logs
        SET ended = TRUE,
            last_seen_at = NOW(),
            duration_seconds = :duration_seconds
        WHERE session_id = :session_id AND ended = FALSE
    """)
    try:
        await db.execute(sql, {
            "session_id": session_id,
            "duration_seconds": duration_seconds,
        })
        return True
    except Exception as exc:
        logger.error("session_end error: %s", exc)
        return False


# ────────────────────────────────────────────────────────────────────
# 6. Stats (admin dashboard)
# ────────────────────────────────────────────────────────────────────
async def get_tracking_stats(
    db: AsyncSession,
    days: int = 7,
    top: int = 10,
) -> Dict[str, Any]:
    """Tổng hợp số liệu theo dõi hệ thống."""
    cache_key = f"tracking:stats:{days}:{top}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    # --- Hot searches (news) ---
    hot_searches_sql = text(f"""
        SELECT keyword, COUNT(*) AS search_count
        FROM {SYSTEM_SCHEMA}.search_logs
        WHERE searched_at >= NOW() - make_interval(days => :days)
        GROUP BY keyword
        ORDER BY search_count DESC
        LIMIT :top
    """)

    # --- Hot stock searches ---
    hot_stock_sql = text(f"""
        SELECT keyword, COUNT(*) AS search_count
        FROM {SYSTEM_SCHEMA}.stock_search_logs
        WHERE searched_at >= NOW() - make_interval(days => :days)
        GROUP BY keyword
        ORDER BY search_count DESC
        LIMIT :top
    """)

    # --- Sidebar clicks ---
    sidebar_sql = text(f"""
        SELECT menu_name, menu_href, COUNT(*) AS click_count
        FROM {SYSTEM_SCHEMA}.sidebar_clicks
        WHERE clicked_at >= NOW() - make_interval(days => :days)
        GROUP BY menu_name, menu_href
        ORDER BY click_count DESC
    """)

    # --- Login stats by day ---
    login_sql = text(f"""
        SELECT
            DATE(login_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
            COUNT(*) AS login_count,
            SUM(CASE WHEN success THEN 1 ELSE 0 END) AS success_count,
            SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS fail_count
        FROM {SYSTEM_SCHEMA}.login_logs
        WHERE login_at >= NOW() - make_interval(days => :days)
        GROUP BY 1
        ORDER BY 1 DESC
    """)

    # --- Session stats by day ---
    session_sql = text(f"""
        SELECT
            DATE(started_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
            COUNT(*) AS session_count,
            AVG(duration_seconds) AS avg_duration_seconds
        FROM {SYSTEM_SCHEMA}.session_logs
        WHERE started_at >= NOW() - make_interval(days => :days)
          AND ended = TRUE
        GROUP BY 1
        ORDER BY 1 DESC
    """)

    # --- Today's summary ---
    today_sql = text(f"""
        SELECT
            (SELECT COUNT(*) FROM {SYSTEM_SCHEMA}.login_logs
             WHERE login_at >= CURRENT_DATE) AS logins_today,
            (SELECT COUNT(*) FROM {SYSTEM_SCHEMA}.session_logs
             WHERE started_at >= CURRENT_DATE) AS sessions_today,
            (SELECT AVG(duration_seconds) FROM {SYSTEM_SCHEMA}.session_logs
             WHERE started_at >= CURRENT_DATE AND ended = TRUE) AS avg_duration_today
    """)

    params = {"days": days, "top": top}

    try:
        r_hs = (await db.execute(hot_searches_sql, params)).mappings().all()
        r_ss = (await db.execute(hot_stock_sql, params)).mappings().all()
        r_sb = (await db.execute(sidebar_sql, params)).mappings().all()
        r_lg = (await db.execute(login_sql, params)).mappings().all()
        r_se = (await db.execute(session_sql, params)).mappings().all()
        r_td = (await db.execute(today_sql)).mappings().first()
    except Exception as exc:
        logger.error("get_tracking_stats error: %s", exc)
        return {}

    data = {
        "hot_searches": [
            {"keyword": r["keyword"], "search_count": r["search_count"]}
            for r in r_hs
        ],
        "hot_stock_searches": [
            {"keyword": r["keyword"], "search_count": r["search_count"]}
            for r in r_ss
        ],
        "sidebar_stats": [
            {"menu_name": r["menu_name"], "menu_href": r["menu_href"], "click_count": r["click_count"]}
            for r in r_sb
        ],
        "login_stats": [
            {
                "date": str(r["date"]),
                "login_count": r["login_count"],
                "success_count": r["success_count"],
                "fail_count": r["fail_count"],
            }
            for r in r_lg
        ],
        "session_stats": [
            {
                "date": str(r["date"]),
                "session_count": r["session_count"],
                "avg_duration_seconds": float(r["avg_duration_seconds"]) if r["avg_duration_seconds"] else None,
            }
            for r in r_se
        ],
        "total_logins_today": int(r_td["logins_today"] or 0) if r_td else 0,
        "total_sessions_today": int(r_td["sessions_today"] or 0) if r_td else 0,
        "avg_session_duration_today": float(r_td["avg_duration_today"]) if r_td and r_td["avg_duration_today"] else None,
    }

    await cache_set(cache_key, data, ttl=120)
    return data
