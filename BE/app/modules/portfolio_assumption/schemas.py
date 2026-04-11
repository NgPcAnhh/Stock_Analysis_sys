from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class PortfolioAssetInput(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    weight: Optional[float] = Field(default=None, ge=0, le=100)
    amount: Optional[float] = Field(default=None, ge=0)
    expected_return: Optional[float] = Field(default=None, ge=-1, le=5)
    volatility: Optional[float] = Field(default=None, ge=0, le=5)


class PortfolioAssumptionRequest(BaseModel):
    total_capital: float = Field(..., gt=0)
    risk_free_rate: float = Field(default=0.04, ge=0, le=1)
    confidence_level: float = Field(default=0.95, ge=0.8, le=0.999)
    trading_days: int = Field(default=252, ge=50, le=365)
    simulations: int = Field(default=50, ge=10, le=500)
    assets: List[PortfolioAssetInput] = Field(..., min_length=2, max_length=30)

    @model_validator(mode="after")
    def validate_assets(self) -> "PortfolioAssumptionRequest":
        has_weight = any(a.weight is not None for a in self.assets)
        has_amount = any(a.amount is not None for a in self.assets)
        if not has_weight and not has_amount:
            raise ValueError("Each portfolio needs weight (%) or amount (VND) inputs")
        return self


class PortfolioAllocation(BaseModel):
    ticker: str
    weight: float
    amount: float
    expected_return: float
    volatility: float


class PortfolioKPI(BaseModel):
    expected_return: float
    volatility: float
    sharpe_ratio: float
    var_95: float
    var_95_amount: float
    cvar_95: float = 0
    cvar_95_amount: float = 0
    lvar_95_amount: float = 0
    days_to_liquidate: float = 0


class FrontierPoint(BaseModel):
    expected_return: float
    volatility: float
    sharpe_ratio: float


class MonteCarloPath(BaseModel):
    name: str
    values: List[float]


class MonteCarloSummary(BaseModel):
    best_case_end: float
    median_end: float
    worst_case_end: float
    var_95_end: float
    paths: List[MonteCarloPath]


class FundamentalSnapshotItem(BaseModel):
    ticker: str
    pe: Optional[float] = None
    pb: Optional[float] = None
    roe: Optional[float] = None
    debt_to_equity: Optional[float] = None


class MatrixHeatmap(BaseModel):
    labels: List[str]
    values: List[List[float]]


class DistributionBin(BaseModel):
    center: float
    count: int
    normal_count: float


class FactorContribution(BaseModel):
    name: str
    exposure: float
    contribution_pct: float


class MacroStressPoint(BaseModel):
    scenario: str
    pnl_pct: float


class LiquidityTier(BaseModel):
    tier: str
    value: float


class LiquidityItem(BaseModel):
    ticker: str
    adv: float
    spread_estimate: float
    days_to_liquidate: float


class BLPosteriorItem(BaseModel):
    ticker: str
    implied_return: float
    posterior_return: float


class MonteCarloBandPoint(BaseModel):
    day: int
    p10: float
    p50: float
    p90: float
    p95: float
    p99: float


class PortfolioAssumptionResponse(BaseModel):
    allocations: List[PortfolioAllocation]
    kpis: PortfolioKPI
    frontier: List[FrontierPoint]
    optimal_sharpe_weights: List[PortfolioAllocation]
    monte_carlo: MonteCarloSummary
    fundamentals: List[FundamentalSnapshotItem]

    # Enterprise V2.0 extensions
    correlation_heatmap: MatrixHeatmap = Field(default_factory=lambda: MatrixHeatmap(labels=[], values=[]))
    drawdown_series: List[dict] = Field(default_factory=list)
    return_distribution: List[DistributionBin] = Field(default_factory=list)
    factor_risk_contribution: List[FactorContribution] = Field(default_factory=list)
    macro_stress_test: List[MacroStressPoint] = Field(default_factory=list)
    bl_posterior_returns: List[BLPosteriorItem] = Field(default_factory=list)
    bl_frontier: List[FrontierPoint] = Field(default_factory=list)
    liquidity_tiers: List[LiquidityTier] = Field(default_factory=list)
    liquidity_details: List[LiquidityItem] = Field(default_factory=list)
    monte_carlo_heston_bands: List[MonteCarloBandPoint] = Field(default_factory=list)
