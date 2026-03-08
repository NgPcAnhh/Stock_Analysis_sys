"""Pydantic schemas for Tracking module."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Inbound: sự kiện gửi từ FE ────────────────────────────────────

class TrackSearchRequest(BaseModel):
    """Ghi log tìm kiếm (news / general)."""
    keyword: str = Field(..., min_length=1, max_length=255)
    session_id: str = Field(default="anonymous", max_length=64)


class TrackStockSearchRequest(BaseModel):
    """Ghi log tìm kiếm mã cổ phiếu."""
    keyword: str = Field(..., min_length=1, max_length=255)
    session_id: str = Field(default="anonymous", max_length=64)


class TrackSidebarClickRequest(BaseModel):
    """Ghi log click vào sidebar."""
    menu_name: str = Field(..., max_length=50)
    menu_href: str = Field(..., max_length=100)
    session_id: str = Field(default="anonymous", max_length=64)
    user_id: Optional[int] = None


class SessionStartRequest(BaseModel):
    """Bắt đầu theo dõi phiên làm việc."""
    session_id: str = Field(..., max_length=64)
    user_id: Optional[int] = None


class SessionHeartbeatRequest(BaseModel):
    """Cập nhật last_seen_at cho phiên đang hoạt động."""
    session_id: str = Field(..., max_length=64)
    duration_seconds: int = Field(default=0, ge=0)


class SessionEndRequest(BaseModel):
    """Kết thúc phiên làm việc."""
    session_id: str = Field(..., max_length=64)
    duration_seconds: int = Field(default=0, ge=0)


# ── Outbound: response ─────────────────────────────────────────────

class TrackResponse(BaseModel):
    success: bool
    message: str = ""


# ── Stats (admin) ──────────────────────────────────────────────────

class SearchStat(BaseModel):
    keyword: str
    search_count: int


class SidebarStat(BaseModel):
    menu_name: str
    menu_href: str
    click_count: int


class LoginStat(BaseModel):
    date: str
    login_count: int
    success_count: int
    fail_count: int


class SessionStat(BaseModel):
    date: str
    session_count: int
    avg_duration_seconds: Optional[float]


class TrackingStatsResponse(BaseModel):
    hot_searches: list[SearchStat]
    hot_stock_searches: list[SearchStat]
    sidebar_stats: list[SidebarStat]
    login_stats: list[LoginStat]
    session_stats: list[SessionStat]
    total_logins_today: int
    total_sessions_today: int
    avg_session_duration_today: Optional[float]
