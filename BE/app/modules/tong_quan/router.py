from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.modules.tong_quan import logic
from app.modules.tong_quan.schemas import (
    HeatmapSector,
    LiquidityPoint,
    MacroIndicatorItem,
    MarketBreadthData,
    MarketComparisonItem,
    MarketIndexCard,
    NewsItem,
    OHLCVData,
    OHLCVPaginatedResponse,
    SectorPerformanceItem,
    TickerSlideItem,
    TopStockItem,
    ValuationPoint,
)

router = APIRouter(prefix="/tong-quan", tags=["Tổng quan"])


# ── 0. Ticker Slide ────────────────────────────────────────────────
@router.get("/ticker-slide", response_model=List[TickerSlideItem])
def ticker_slide(db: Session = Depends(get_db)):
    """Dữ liệu thanh trượt: 4 chỉ số + top 10 tăng + top 10 giảm."""
    return logic.get_ticker_slide(db)


# ── 1. Market Index Cards ──────────────────────────────────────────
@router.get("/market-index-cards", response_model=List[MarketIndexCard])
def market_index_cards(db: Session = Depends(get_db)):
    """Thẻ chỉ số chính: VNINDEX, VN30, HNX, UPCOM."""
    return logic.get_market_index_cards(db)


# ── 2. Market Chart (đã tối ưu: Redis cache + downsampling + phân trang) ────
@router.get("/market-chart/{ticker}", response_model=OHLCVPaginatedResponse)
def market_chart(
    ticker: str = "VNINDEX",
    period: str = Query("1Y", regex="^(1W|1M|3M|6M|1Y|ALL)$"),
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    page_size: int = Query(
        0, ge=0, le=500,
        description="Số bản ghi / trang. 0 = trả hết (dùng khi đã downsampled)",
    ),
    db: Session = Depends(get_db),
):
    """Biểu đồ OHLCV cho chỉ số thị trường.

    - Dữ liệu được cache bằng Redis, tự động downsampled theo period.
    - Hỗ trợ phân trang: truyền page_size > 0 để nhận từng trang.
    """
    return logic.get_market_chart(
        db, ticker=ticker.upper(), period=period,
        page=page, page_size=page_size,
    )


# ── 3. Sector Performance ─────────────────────────────────────────
@router.get("/sector-performance", response_model=List[SectorPerformanceItem])
def sector_performance(db: Session = Depends(get_db)):
    """Biến động ngành — % thay đổi trung bình theo nhóm ngành."""
    return logic.get_sector_performance(db)


# ── 4. Market Comparison ──────────────────────────────────────────
@router.get("/market-comparison", response_model=List[MarketComparisonItem])
def market_comparison(db: Session = Depends(get_db)):
    """So sánh thị trường quốc tế & tài sản vĩ mô."""
    return logic.get_market_comparison(db)


# ── 5. Market Breadth ─────────────────────────────────────────────
@router.get("/market-breadth", response_model=MarketBreadthData)
def market_breadth(db: Session = Depends(get_db)):
    """Độ rộng thị trường — số mã tăng / giảm / đứng giá."""
    return logic.get_market_breadth(db)


# ── 6. Top Stocks ─────────────────────────────────────────────────
@router.get("/top-stocks", response_model=List[TopStockItem])
def top_stocks(
    category: str = Query("gainers", regex="^(gainers|losers|foreign)$"),
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """Top cổ phiếu tăng giá / giảm giá / giao dịch nước ngoài."""
    return logic.get_top_stocks(db, category=category, limit=limit)


# ── 7. Market Heatmap ─────────────────────────────────────────────
@router.get("/market-heatmap", response_model=List[HeatmapSector])
def market_heatmap(
    exchange: str = Query("all", regex="^(all|HOSE|HNX|UPCOM)$"),
    db: Session = Depends(get_db),
):
    """Bản đồ nhiệt thị trường — treemap theo ngành & mã."""
    return logic.get_market_heatmap(db, exchange=exchange)


# ── 8. Macro Data ─────────────────────────────────────────────────
@router.get("/macro-data", response_model=List[MacroIndicatorItem])
def macro_data(db: Session = Depends(get_db)):
    """Chỉ số vĩ mô với sparkline."""
    return logic.get_macro_data(db)


# ── 9. News ───────────────────────────────────────────────────────
@router.get("/news", response_model=List[NewsItem])
def news(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Tin tức mới nhất."""
    return logic.get_news(db, limit=limit, offset=offset)


# ── 10. Valuation P/E ─────────────────────────────────────────────
@router.get("/valuation-pe", response_model=List[ValuationPoint])
def valuation_pe(db: Session = Depends(get_db)):
    """P/E trung bình theo quý."""
    return logic.get_valuation_pe(db)


# ── 11. Liquidity ─────────────────────────────────────────────────
@router.get("/liquidity", response_model=List[LiquidityPoint])
def liquidity(
    days: int = Query(20, ge=1, le=60),
    db: Session = Depends(get_db),
):
    """Thanh khoản thị trường — tổng GTGD theo ngày."""
    return logic.get_liquidity(db, days=days)
