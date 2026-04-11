from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.portfolio_assumption.logic import analyze_portfolio_assumption
from app.modules.portfolio_assumption.schemas import (
    PortfolioAssumptionRequest,
    PortfolioAssumptionResponse,
)

router = APIRouter(prefix="/portfolio-assumption", tags=["Gia dinh danh muc"])


@router.post("/analyze", response_model=PortfolioAssumptionResponse)
async def analyze(
    payload: PortfolioAssumptionRequest,
    db: AsyncSession = Depends(get_db),
):
    return await analyze_portfolio_assumption(db, payload)
