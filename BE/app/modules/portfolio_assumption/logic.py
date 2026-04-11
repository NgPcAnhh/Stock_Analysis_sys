from __future__ import annotations

import logging
import math
from statistics import NormalDist
from typing import Any, Dict, List, Tuple

import numpy as np
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.portfolio_assumption.schemas import (
    BLPosteriorItem,
    DistributionBin,
    FactorContribution,
    FundamentalSnapshotItem,
    LiquidityItem,
    LiquidityTier,
    MacroStressPoint,
    MatrixHeatmap,
    MonteCarloBandPoint,
    PortfolioAllocation,
    PortfolioAssumptionRequest,
)

logger = logging.getLogger(__name__)
SCHEMA = "hethong_phantich_chungkhoan"


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_positive(value: float, fallback: float = 1e-9) -> float:
    return value if value > 0 else fallback


def _build_weights(request: PortfolioAssumptionRequest) -> np.ndarray:
    amounts = np.array([_safe_float(a.amount) for a in request.assets], dtype=float)
    if amounts.sum() > 0:
        raw_weights = amounts / amounts.sum()
    else:
        explicit_weights = np.array([_safe_float(a.weight) for a in request.assets], dtype=float)
        if explicit_weights.sum() <= 0:
            raise ValueError("Portfolio weights must be greater than zero")
        raw_weights = explicit_weights / explicit_weights.sum()
    return raw_weights


async def _fetch_returns_matrix(db: AsyncSession, tickers: List[str]) -> np.ndarray:
    sql = text(
        f"""
        SELECT ticker, trading_date, close
        FROM {SCHEMA}.history_price
        WHERE ticker = ANY(:tickers)
          AND close IS NOT NULL
        ORDER BY trading_date ASC
        """
    )
    result = await db.execute(sql, {"tickers": tickers})

    prices_by_ticker: Dict[str, List[float]] = {t: [] for t in tickers}
    for row in result.mappings().all():
        ticker = str(row["ticker"]).upper()
        if ticker in prices_by_ticker:
            prices_by_ticker[ticker].append(_safe_float(row["close"]))

    returns_series: List[np.ndarray] = []
    min_len = None
    for ticker in tickers:
        prices = np.array(prices_by_ticker.get(ticker, []), dtype=float)
        if prices.size < 80:
            raise ValueError(f"Not enough price history for ticker {ticker}")
        returns = np.diff(np.log(prices))
        if min_len is None or returns.size < min_len:
            min_len = returns.size
        returns_series.append(returns)

    # Align by recent windows for all assets to keep matrix rectangular
    aligned = [series[-min_len:] for series in returns_series]
    matrix = np.column_stack(aligned)
    return matrix


async def _fetch_price_enriched(db: AsyncSession, tickers: List[str]) -> Dict[str, Dict[str, List[float]]]:
    sql = text(
        f"""
        SELECT ticker, trading_date, open, high, low, close, volume
        FROM {SCHEMA}.history_price
        WHERE ticker = ANY(:tickers)
          AND close IS NOT NULL
        ORDER BY trading_date ASC
        """
    )
    result = await db.execute(sql, {"tickers": tickers})

    data: Dict[str, Dict[str, List[float]]] = {
        t: {"open": [], "high": [], "low": [], "close": [], "volume": []} for t in tickers
    }
    for row in result.mappings().all():
        ticker = str(row["ticker"]).upper()
        if ticker not in data:
            continue
        data[ticker]["open"].append(_safe_float(row["open"], _safe_float(row["close"])))
        data[ticker]["high"].append(_safe_float(row["high"], _safe_float(row["close"])))
        data[ticker]["low"].append(_safe_float(row["low"], _safe_float(row["close"])))
        data[ticker]["close"].append(_safe_float(row["close"]))
        data[ticker]["volume"].append(_safe_float(row["volume"]))
    return data


def _cov_to_corr(cov: np.ndarray) -> np.ndarray:
    std = np.sqrt(np.diag(cov))
    denom = np.outer(std, std)
    corr = np.divide(cov, denom, out=np.zeros_like(cov), where=denom > 0)
    np.fill_diagonal(corr, 1.0)
    return corr


def _compute_drawdown_series(portfolio_daily_returns: np.ndarray) -> List[Dict[str, float]]:
    if portfolio_daily_returns.size == 0:
        return []
    wealth = np.cumprod(1 + portfolio_daily_returns)
    peaks = np.maximum.accumulate(wealth)
    drawdowns = (wealth / peaks) - 1
    return [
        {"index": idx, "drawdown_pct": round(float(dd * 100), 4)}
        for idx, dd in enumerate(drawdowns)
    ]


def _distribution_with_normal(returns: np.ndarray, bins: int = 30) -> List[DistributionBin]:
    if returns.size < 3:
        return []
    counts, edges = np.histogram(returns, bins=bins)
    mu = float(np.mean(returns))
    sigma = float(np.std(returns))
    normal = NormalDist(mu=mu, sigma=_safe_positive(sigma))
    out: List[DistributionBin] = []
    n = float(returns.size)
    for i in range(len(counts)):
        left = float(edges[i])
        right = float(edges[i + 1])
        center = (left + right) / 2
        p = max(0.0, normal.cdf(right) - normal.cdf(left))
        normal_count = p * n
        out.append(
            DistributionBin(
                center=round(center * 100, 4),
                count=int(counts[i]),
                normal_count=round(normal_count, 4),
            )
        )
    return out


def _factor_risk_attribution(
    tickers: List[str],
    weights: np.ndarray,
    fundamentals: List[FundamentalSnapshotItem],
) -> List[FactorContribution]:
    market_caps = np.array([_safe_float(f.pe, 15.0) * 10 for f in fundamentals], dtype=float)
    size_factor = 1.0 / np.maximum(market_caps, 1e-6)
    value_factor = np.array([1.0 / max(_safe_float(f.pb, 1.0), 1e-6) for f in fundamentals], dtype=float)
    profit_factor = np.array([_safe_float(f.roe, 0.0) for f in fundamentals], dtype=float)
    invest_factor = -np.array([_safe_float(f.debt_to_equity, 0.0) for f in fundamentals], dtype=float)

    factor_map = {
        "Market": np.ones(len(tickers)),
        "Size": size_factor,
        "Value": value_factor,
        "Profitability": profit_factor,
        "Investment": invest_factor,
    }

    exposures = {name: float(weights @ arr) for name, arr in factor_map.items()}
    abs_total = sum(abs(v) for v in exposures.values()) + 1e-9
    contributions = [
        FactorContribution(
            name=name,
            exposure=round(exp, 6),
            contribution_pct=round(abs(exp) / abs_total * 100, 4),
        )
        for name, exp in exposures.items()
    ]
    return contributions


def _black_litterman_posterior(
    cov: np.ndarray,
    market_weights: np.ndarray,
    views: np.ndarray,
    tau: float = 0.05,
    risk_aversion: float = 2.5,
) -> Tuple[np.ndarray, np.ndarray]:
    n = cov.shape[0]
    cov = cov + np.eye(n) * 1e-10
    pi = risk_aversion * cov @ market_weights
    p = np.eye(n)
    omega = np.diag(np.diag(tau * cov))

    inv_tau_cov = np.linalg.pinv(tau * cov)
    inv_omega = np.linalg.pinv(omega)

    middle = np.linalg.pinv(inv_tau_cov + p.T @ inv_omega @ p)
    posterior = middle @ (inv_tau_cov @ pi + p.T @ inv_omega @ views)
    return pi, posterior


def _optimize_with_constraints(
    expected_returns: np.ndarray,
    cov: np.ndarray,
    risk_free_rate: float,
    max_weight: float = 0.20,
    cash_min: float = 0.05,
    trials: int = 4000,
) -> np.ndarray:
    n = expected_returns.shape[0]
    rng = np.random.default_rng(123)
    best_s = -1e9
    best = np.ones(n, dtype=float) / n

    max_risky = 1.0 - cash_min
    for _ in range(trials):
        w = rng.random(n)
        w = w / max(np.sum(w), 1e-9)
        w = np.minimum(w, max_weight)
        s = np.sum(w)
        if s <= 0:
            continue
        w = (w / s) * max_risky

        p_ret = float(w @ expected_returns)
        p_vol = float(math.sqrt(max(w @ cov @ w.T, 0.0)))
        p_s = (p_ret - risk_free_rate) / p_vol if p_vol > 1e-10 else -1e9
        if p_s > best_s:
            best_s = p_s
            best = w
    return best


def _heston_like_paths(
    initial_value: float,
    annual_return: float,
    annual_vol: float,
    trading_days: int,
    simulations: int,
) -> Tuple[List[Dict[str, Any]], List[float], List[MonteCarloBandPoint]]:
    # Simplified stochastic-vol process inspired by Heston dynamics.
    rng = np.random.default_rng(7)
    dt = 1.0 / trading_days
    kappa = 3.0
    theta = max((annual_vol ** 2), 1e-6)
    xi = 0.35
    rho = -0.45

    path_values: List[List[float]] = []
    end_values: List[float] = []
    paths: List[Dict[str, Any]] = []

    for i in range(simulations):
        s = initial_value
        v = theta
        values = [float(round(s, 2))]
        for _ in range(trading_days):
            z1 = rng.normal()
            z2 = rho * z1 + math.sqrt(1 - rho * rho) * rng.normal()
            v = max(v + kappa * (theta - v) * dt + xi * math.sqrt(max(v, 0)) * math.sqrt(dt) * z2, 1e-8)
            s = s * math.exp((annual_return - 0.5 * v) * dt + math.sqrt(v * dt) * z1)
            values.append(float(round(s, 2)))
        path_values.append(values)
        end_values.append(s)
        paths.append({"name": f"Path {i + 1}", "values": values})

    arr = np.array(path_values, dtype=float)
    bands: List[MonteCarloBandPoint] = []
    for day in range(arr.shape[1]):
        col = arr[:, day]
        bands.append(
            MonteCarloBandPoint(
                day=day,
                p10=float(round(np.percentile(col, 10), 2)),
                p50=float(round(np.percentile(col, 50), 2)),
                p90=float(round(np.percentile(col, 90), 2)),
                p95=float(round(np.percentile(col, 95), 2)),
                p99=float(round(np.percentile(col, 99), 2)),
            )
        )
    return paths, end_values, bands


async def _fetch_fundamentals(db: AsyncSession, tickers: List[str]) -> List[FundamentalSnapshotItem]:
    sql = text(
        f"""
        SELECT DISTINCT ON (ticker)
            ticker, pe, pb, roe, debt_to_equity
        FROM {SCHEMA}.financial_ratio
        WHERE ticker = ANY(:tickers)
        ORDER BY ticker, year DESC, quarter DESC
        """
    )
    result = await db.execute(sql, {"tickers": tickers})
    rows = result.mappings().all()
    by_ticker = {
        str(r["ticker"]).upper(): FundamentalSnapshotItem(
            ticker=str(r["ticker"]).upper(),
            pe=_safe_float(r["pe"], None),
            pb=_safe_float(r["pb"], None),
            roe=_safe_float(r["roe"], None),
            debt_to_equity=_safe_float(r["debt_to_equity"], None),
        )
        for r in rows
    }
    return [by_ticker.get(t, FundamentalSnapshotItem(ticker=t)) for t in tickers]


async def analyze_portfolio_assumption(db: AsyncSession, request: PortfolioAssumptionRequest) -> Dict[str, Any]:
    tickers = [asset.ticker.upper() for asset in request.assets]
    weights = _build_weights(request)

    enriched_price = await _fetch_price_enriched(db, tickers)
    returns_matrix = await _fetch_returns_matrix(db, tickers)
    mean_daily = returns_matrix.mean(axis=0)
    cov_daily = np.cov(returns_matrix, rowvar=False)

    annual_mean = mean_daily * request.trading_days
    annual_cov = cov_daily * request.trading_days

    # Optional overrides from client assumptions
    for idx, asset in enumerate(request.assets):
        if asset.expected_return is not None:
            annual_mean[idx] = float(asset.expected_return)
        if asset.volatility is not None:
            annual_cov[idx, idx] = float(asset.volatility) ** 2

    fundamentals_objs = await _fetch_fundamentals(db, tickers)

    market_caps = np.array(
        [
            max(_safe_float(f.pe, 15.0) * 1000 * max(_safe_float(f.pb, 1.0), 0.1), 1.0)
            for f in fundamentals_objs
        ],
        dtype=float,
    )
    market_weights = market_caps / max(np.sum(market_caps), 1e-9)

    auto_views = annual_mean.copy()
    for idx, asset in enumerate(request.assets):
        if asset.expected_return is not None:
            auto_views[idx] = float(asset.expected_return)

    implied_returns, posterior_returns = _black_litterman_posterior(
        annual_cov,
        market_weights,
        auto_views,
    )

    bl_weights = _optimize_with_constraints(
        posterior_returns,
        annual_cov,
        request.risk_free_rate,
    )

    portfolio_return = float(weights @ posterior_returns)
    portfolio_vol = float(math.sqrt(max(weights @ annual_cov @ weights.T, 0.0)))
    sharpe_ratio = (
        float((portfolio_return - request.risk_free_rate) / portfolio_vol)
        if portfolio_vol > 1e-10
        else 0.0
    )

    z_score = float(NormalDist().inv_cdf(request.confidence_level))
    var_95 = max(0.0, z_score * portfolio_vol - portfolio_return)
    var_95_amount = request.total_capital * var_95

    portfolio_daily_returns = returns_matrix @ weights
    percentile_alpha = (1 - request.confidence_level) * 100
    var_threshold_daily = np.percentile(portfolio_daily_returns, percentile_alpha)
    tail_losses = portfolio_daily_returns[portfolio_daily_returns <= var_threshold_daily]
    cvar_daily = float(np.mean(tail_losses)) if tail_losses.size else float(var_threshold_daily)
    cvar_95 = max(0.0, -cvar_daily * math.sqrt(request.trading_days))
    cvar_95_amount = request.total_capital * cvar_95

    liquidity_details: List[LiquidityItem] = []
    dtl_weighted = 0.0
    spread_penalty = 0.0
    liquidity_tier_values = {"Tier 1 (<1d)": 0.0, "Tier 2 (1-3d)": 0.0, "Tier 3 (>3d)": 0.0}

    for i, ticker in enumerate(tickers):
        closes = enriched_price[ticker]["close"]
        highs = enriched_price[ticker]["high"]
        lows = enriched_price[ticker]["low"]
        vols = enriched_price[ticker]["volume"]
        last_price = _safe_float(closes[-1], 1.0) if closes else 1.0
        adv = float(np.mean(vols[-20:])) if vols else 0.0
        spread_est = float(np.mean([(h - l) / max(c, 1e-6) for h, l, c in zip(highs[-20:], lows[-20:], closes[-20:])])) if closes else 0.0

        shares = (weights[i] * request.total_capital) / max(last_price, 1e-6)
        liq_capacity = max(0.2 * adv, 1e-6)
        days_to_liq = float(shares / liq_capacity)

        dtl_weighted += days_to_liq * weights[i]
        spread_penalty += spread_est * weights[i]

        if days_to_liq < 1:
            liquidity_tier_values["Tier 1 (<1d)"] += weights[i] * request.total_capital
        elif days_to_liq <= 3:
            liquidity_tier_values["Tier 2 (1-3d)"] += weights[i] * request.total_capital
        else:
            liquidity_tier_values["Tier 3 (>3d)"] += weights[i] * request.total_capital

        liquidity_details.append(
            LiquidityItem(
                ticker=ticker,
                adv=round(adv, 2),
                spread_estimate=round(spread_est, 6),
                days_to_liquidate=round(days_to_liq, 4),
            )
        )

    lvar_95_amount = var_95_amount * (1 + spread_penalty * 10)

    allocations = [
        PortfolioAllocation(
            ticker=tickers[i],
            weight=float(round(weights[i], 6)),
            amount=float(round(weights[i] * request.total_capital, 2)),
            expected_return=float(round(posterior_returns[i], 6)),
            volatility=float(round(math.sqrt(max(annual_cov[i, i], 0.0)), 6)),
        ).model_dump()
        for i in range(len(tickers))
    ]

    # Efficient frontier simulation
    rng = np.random.default_rng(42)
    frontier_points: List[Dict[str, float]] = []
    best_sharpe = -999.0
    best_weights = weights

    for _ in range(400):
        random_w = rng.random(len(tickers))
        random_w = random_w / random_w.sum()
        ret = float(random_w @ posterior_returns)
        vol = float(math.sqrt(max(random_w @ annual_cov @ random_w.T, 0.0)))
        s = float((ret - request.risk_free_rate) / vol) if vol > 1e-10 else 0.0
        frontier_points.append(
            {
                "expected_return": round(ret, 6),
                "volatility": round(vol, 6),
                "sharpe_ratio": round(s, 6),
            }
        )
        if s > best_sharpe:
            best_sharpe = s
            best_weights = random_w

    optimal_allocations = [
        PortfolioAllocation(
            ticker=tickers[i],
            weight=float(round(best_weights[i], 6)),
            amount=float(round(best_weights[i] * request.total_capital, 2)),
            expected_return=float(round(posterior_returns[i], 6)),
            volatility=float(round(math.sqrt(max(annual_cov[i, i], 0.0)), 6)),
        ).model_dump()
        for i in range(len(tickers))
    ]

    bl_frontier_points: List[Dict[str, float]] = []
    for _ in range(400):
        random_w = np.random.default_rng().random(len(tickers))
        random_w = random_w / max(np.sum(random_w), 1e-9)
        random_w = np.minimum(random_w, 0.2)
        random_w = random_w / max(np.sum(random_w), 1e-9) * 0.95
        ret = float(random_w @ posterior_returns)
        vol = float(math.sqrt(max(random_w @ annual_cov @ random_w.T, 0.0)))
        s = float((ret - request.risk_free_rate) / vol) if vol > 1e-10 else 0.0
        bl_frontier_points.append(
            {
                "expected_return": round(ret, 6),
                "volatility": round(vol, 6),
                "sharpe_ratio": round(s, 6),
            }
        )

    # Monte Carlo Heston-like
    paths, end_values, heston_bands = _heston_like_paths(
        initial_value=request.total_capital,
        annual_return=portfolio_return,
        annual_vol=portfolio_vol,
        trading_days=request.trading_days,
        simulations=max(request.simulations, 150),
    )

    sorted_ends = sorted(end_values)
    q95_idx = max(0, int((1 - request.confidence_level) * len(sorted_ends)) - 1)

    fundamentals = [item.model_dump() for item in fundamentals_objs]
    correlation = _cov_to_corr(cov_daily)
    drawdowns = _compute_drawdown_series(portfolio_daily_returns)
    dist = _distribution_with_normal(portfolio_daily_returns)
    factor_contrib = [item.model_dump() for item in _factor_risk_attribution(tickers, weights, fundamentals_objs)]
    stress = [
        MacroStressPoint(scenario="Lai suat +2%", pnl_pct=round(-(0.8 * portfolio_vol * 100), 4)),
        MacroStressPoint(scenario="Lam phat phi ma", pnl_pct=round(-(0.65 * portfolio_vol * 100), 4)),
        MacroStressPoint(scenario="Dut gay chuoi cung ung", pnl_pct=round(-(0.55 * portfolio_vol * 100), 4)),
        MacroStressPoint(scenario="Vo bong bong cong nghe", pnl_pct=round(-(1.05 * portfolio_vol * 100), 4)),
        MacroStressPoint(scenario="Suy thoai toan cau", pnl_pct=round(-(1.2 * portfolio_vol * 100), 4)),
    ]

    bl_post = [
        BLPosteriorItem(
            ticker=tickers[i],
            implied_return=float(round(implied_returns[i], 6)),
            posterior_return=float(round(posterior_returns[i], 6)),
        ).model_dump()
        for i in range(len(tickers))
    ]

    liquidity_tiers = [
        LiquidityTier(tier=tier, value=round(value, 2)).model_dump()
        for tier, value in liquidity_tier_values.items()
    ]

    bl_opt_allocations = [
        PortfolioAllocation(
            ticker=tickers[i],
            weight=float(round(bl_weights[i], 6)),
            amount=float(round(bl_weights[i] * request.total_capital, 2)),
            expected_return=float(round(posterior_returns[i], 6)),
            volatility=float(round(math.sqrt(max(annual_cov[i, i], 0.0)), 6)),
        ).model_dump()
        for i in range(len(tickers))
    ]

    return {
        "allocations": allocations,
        "kpis": {
            "expected_return": round(portfolio_return, 6),
            "volatility": round(portfolio_vol, 6),
            "sharpe_ratio": round(sharpe_ratio, 6),
            "var_95": round(var_95, 6),
            "var_95_amount": round(var_95_amount, 2),
            "cvar_95": round(cvar_95, 6),
            "cvar_95_amount": round(cvar_95_amount, 2),
            "lvar_95_amount": round(lvar_95_amount, 2),
            "days_to_liquidate": round(dtl_weighted, 4),
        },
        "frontier": frontier_points,
        "optimal_sharpe_weights": bl_opt_allocations,
        "monte_carlo": {
            "best_case_end": round(max(sorted_ends), 2),
            "median_end": round(float(np.median(sorted_ends)), 2),
            "worst_case_end": round(min(sorted_ends), 2),
            "var_95_end": round(sorted_ends[q95_idx], 2),
            "paths": paths[: request.simulations],
        },
        "fundamentals": fundamentals,
        "correlation_heatmap": MatrixHeatmap(
            labels=tickers,
            values=[[round(float(v), 6) for v in row] for row in correlation],
        ).model_dump(),
        "drawdown_series": drawdowns,
        "return_distribution": [item.model_dump() for item in dist],
        "factor_risk_contribution": factor_contrib,
        "macro_stress_test": [item.model_dump() for item in stress],
        "bl_posterior_returns": bl_post,
        "bl_frontier": bl_frontier_points,
        "liquidity_tiers": liquidity_tiers,
        "liquidity_details": [item.model_dump() for item in liquidity_details],
        "monte_carlo_heston_bands": [item.model_dump() for item in heston_bands],
    }
