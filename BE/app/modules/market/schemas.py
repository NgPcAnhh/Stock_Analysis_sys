"""Pydantic response schemas for the Market module."""
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ── 1. Market Heatmap ─────────────────────────────────────────────
class HeatmapStock(BaseModel):
    name: str = Field(..., description="Ticker")
    value: float = Field(..., description="Trade value proxy (price * vol / 1e6)")
    pChange: float = Field(..., description="Percent price change")
    volume: int


class HeatmapSector(BaseModel):
    name: str = Field(..., description="Sector name (icb_name2)")
    children: List[HeatmapStock]


# ── 2. Cash Flow Distribution ─────────────────────────────────────
class CashFlowData(BaseModel):
    advancingValue: float = Field(..., description="Total value of advancing stocks (tỷ VND)")
    unchangedValue: float = Field(..., description="Total value of unchanged stocks (tỷ VND)")
    decliningValue: float = Field(..., description="Total value of declining stocks (tỷ VND)")
    advancingCount: int = Field(..., description="Number of advancing stocks")
    unchangedCount: int = Field(..., description="Number of unchanged stocks")
    decliningCount: int = Field(..., description="Number of declining stocks")


# ── 3. Index Impact ───────────────────────────────────────────────
class IndexImpactItem(BaseModel):
    ticker: str
    impact: float = Field(..., description="Contribution to index change (points)")


# ── 4. Foreign Flow ───────────────────────────────────────────────
class ForeignFlowItem(BaseModel):
    date: str = Field(..., description="Trading date dd/MM")
    netVal: float = Field(..., description="Net foreign value in tỷ VND")


# ── 5. Sector Overview ────────────────────────────────────────────
class SectorOverviewItem(BaseModel):
    name: str = Field(..., description="Sector name (icb_name2)")
    change: float = Field(..., description="Average % change")
    volume: int = Field(..., description="Total volume")
    value: float = Field(..., description="Total trade value in tỷ VND")
    cashFlow: float = Field(..., description="Net cash flow proxy in tỷ VND")


# ── 6. Sector Analysis Table ──────────────────────────────────────
class SectorAnalysisItem(BaseModel):
    name: str
    stockCount: int
    marketCap: str = Field(..., description="Formatted market cap, e.g. '3,550,712T'")
    pe: float
    pb: float
    priceChange1D: float
    priceChange7D: float
    priceChangeYTD: float
    priceChange1Y: float
    priceChange3Y: float


# ── 7. Sector Watchlist ───────────────────────────────────────────
class WatchlistStock(BaseModel):
    symbol: str
    companyName: str = ""
    exchange: str = ""
    price: float
    refPrice: float = 0.0
    priceChange: float = 0.0
    change: float = Field(..., description="Percent change")
    volume: int = 0
    tradeValue: float = 0.0


class WatchlistSector(BaseModel):
    id: str = Field(..., description="Sector slug/id")
    name: str = Field(..., description="Sector display name")
    count: int = Field(..., description="Number of stocks in sector")


class SectorWatchlistData(BaseModel):
    sectors: List[WatchlistSector]
    stocks: Dict[str, List[WatchlistStock]] = Field(
        ..., description="Map: sector_id -> list of stocks"
    )
