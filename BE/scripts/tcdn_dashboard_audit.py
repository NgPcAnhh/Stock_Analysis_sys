#!/usr/bin/env python3
"""Automated audit for Stock Detail TCDN dashboards (Insurance + Finco).

Goals:
- Fast: one-command API-driven audit.
- Accurate: run business-aware checks with pragmatic grading (pass/proxy/fail).
- Compact insights: generate markdown + json reports with action items.

Usage:
    python BE/scripts/tcdn_dashboard_audit.py
    python BE/scripts/tcdn_dashboard_audit.py --base-url http://localhost:8000/api/v1
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "http://localhost:8000/api/v1"
REQUEST_TIMEOUT = 8
PROBE_LIMIT = 8

# Known liquid VN ticker candidates for insurance / finance-like coverage probing.
INSURANCE_CANDIDATES = ["BVH", "BMI", "BIC", "PVI", "MIG", "PGI", "PTI", "VNR", "ABI"]
FINCO_CANDIDATES = ["EVF", "SSI", "HCM", "VCI", "VIX", "MBS", "SHS", "FTS", "BSI", "CTS", "AGR", "VDS", "ORS", "BVS", "APG"]


@dataclass
class CheckResult:
    code: str
    status: str  # pass | proxy | fail
    message: str
    evidence: str


@dataclass
class TickerAuditResult:
    ticker: str
    dashboard: str
    sector: str
    industry: str
    score: float
    checks: List[CheckResult]
    insights: List[str]
    risks: List[str]
    fallback_recommendations: List[str]


def get_json(url: str, timeout: Optional[int] = None) -> Tuple[Optional[Any], Optional[str]]:
    if timeout is None:
        timeout = REQUEST_TIMEOUT
    req = Request(url=url, headers={"Accept": "application/json"}, method="GET")
    try:
        with urlopen(req, timeout=timeout) as resp:
            payload = resp.read().decode("utf-8", errors="replace")
            return json.loads(payload), None
    except HTTPError as exc:
        return None, f"HTTP {exc.code} for {url}"
    except URLError as exc:
        return None, f"Network error for {url}: {exc.reason}"
    except TimeoutError:
        return None, f"Timeout for {url}"
    except json.JSONDecodeError as exc:
        return None, f"Invalid JSON from {url}: {exc}"


def safe_num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        num = float(value)
    except (ValueError, TypeError):
        return None
    if num != num:  # NaN
        return None
    return num


def non_zero(value: Any) -> bool:
    num = safe_num(value)
    return num is not None and abs(num) > 1e-9


def classify_industry(sector: str, industry: str) -> str:
    text = f"{sector} {industry}".lower()
    if any(k in text for k in ("bao hiem", "bảo hiểm", "insurance")):
        return "insurance"
    if any(k in text for k in ("ngan hang", "ngân hàng", "bank")):
        return "bank"
    if any(k in text for k in ("tai chinh", "tài chính", "financial", "finco", "dịch vụ tài chính")):
        return "finco"
    return "other"


def fetch_profile(base_url: str, ticker: str) -> Tuple[Dict[str, Any], Optional[str]]:
    url = f"{base_url}/stock/{quote(ticker)}/profile"
    data, err = get_json(url)
    if err or not isinstance(data, dict):
        return {}, err or "profile payload is not an object"
    return data, None


def fetch_financial_reports(base_url: str, ticker: str, periods: int = 20) -> Tuple[Dict[str, Any], Optional[str]]:
    url = f"{base_url}/stock/{quote(ticker)}/financial-reports?periods={periods}"
    data, err = get_json(url)
    if err or not isinstance(data, dict):
        return {}, err or "financial-reports payload is not an object"
    return data, None


def fetch_financial_ratios(base_url: str, ticker: str, periods: int = 20) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    url = f"{base_url}/stock/{quote(ticker)}/financial-ratios?periods={periods}"
    data, err = get_json(url)
    if err or not isinstance(data, list):
        return [], err or "financial-ratios payload is not a list"
    return [x for x in data if isinstance(x, dict)], None


def fetch_insurance_tcdn(base_url: str, ticker: str) -> Tuple[Dict[str, Any], Optional[str]]:
    url = f"{base_url}/stock/{quote(ticker)}/insurance-tcdn?scenario=adverse"
    data, err = get_json(url)
    if err or not isinstance(data, dict):
        return {}, err or "insurance-tcdn payload is not an object"
    return data, None


def extract_profile_fields(profile: Dict[str, Any]) -> Tuple[str, str]:
    overview = profile.get("overview") if isinstance(profile.get("overview"), dict) else {}
    sector = str(overview.get("sector") or "").strip()
    industry = str(overview.get("industry") or "").strip()
    return sector, industry


def compute_data_score(reports: Dict[str, Any], ratios: List[Dict[str, Any]]) -> float:
    income = reports.get("incomeStatement") if isinstance(reports.get("incomeStatement"), list) else []
    balance = reports.get("balanceSheet") if isinstance(reports.get("balanceSheet"), list) else []
    cash = reports.get("cashFlow") if isinstance(reports.get("cashFlow"), list) else []

    period_score = min(len(income), 12) * 0.8 + min(len(balance), 12) * 0.8 + min(len(cash), 12) * 0.4

    key_hits = 0
    if income:
        key_hits += sum(1 for f in ("revenue", "profitBeforeTax", "netProfit", "operatingExpenses", "provisionExpenses", "netInterestIncome") if non_zero(income[0].get(f)))
    if balance:
        key_hits += sum(1 for f in ("totalAssets", "totalEquity", "totalLiabilities", "cash", "shortTermInvestments", "loansToCustomers", "shortTermReceivables", "loanLossReserves") if non_zero(balance[0].get(f)))
    ratio_hits = 0
    if ratios:
        ratio_hits += sum(1 for f in ("roe", "roa", "currentRatio", "quickRatio", "debtToEquity") if ratios[0].get(f) is not None)

    return period_score + key_hits * 1.2 + ratio_hits * 0.8


def pick_top_tickers(base_url: str, candidates: List[str], expected_kind: str, max_count: int) -> List[Tuple[str, Dict[str, Any], Dict[str, Any], List[Dict[str, Any]], float]]:
    rows: List[Tuple[str, Dict[str, Any], Dict[str, Any], List[Dict[str, Any]], float]] = []
    for ticker in candidates[:PROBE_LIMIT]:
        profile, profile_err = fetch_profile(base_url, ticker)
        if profile_err:
            continue
        sector, industry = extract_profile_fields(profile)
        kind = classify_industry(sector, industry)
        if expected_kind == "finco":
            if kind != "finco":
                continue
        elif expected_kind == "insurance":
            if kind != "insurance":
                continue

        reports, reports_err = fetch_financial_reports(base_url, ticker, periods=20)
        ratios, ratios_err = fetch_financial_ratios(base_url, ticker, periods=20)
        if reports_err and ratios_err:
            continue
        score = compute_data_score(reports, ratios)
        rows.append((ticker, profile, reports, ratios, score))

    rows.sort(key=lambda x: x[4], reverse=True)
    return rows[:max_count]


def build_insurance_checks(
    ticker: str,
    profile: Dict[str, Any],
    reports: Dict[str, Any],
    ratios: List[Dict[str, Any]],
    score: float,
    insurance_payload: Dict[str, Any],
    insurance_payload_err: Optional[str],
) -> TickerAuditResult:
    checks: List[CheckResult] = []
    insights: List[str] = []
    risks: List[str] = []
    fallback_recs: List[str] = []

    sector, industry = extract_profile_fields(profile)

    income = reports.get("incomeStatement") if isinstance(reports.get("incomeStatement"), list) else []
    balance = reports.get("balanceSheet") if isinstance(reports.get("balanceSheet"), list) else []

    # Check 1: data presence
    has_core_reports = len(income) >= 4 and len(balance) >= 4
    checks.append(CheckResult(
        code="INS_DATA_PRESENCE",
        status="pass" if has_core_reports else "fail",
        message="Insurance core timeseries available (>=4 periods).",
        evidence=f"income={len(income)}, balance={len(balance)}",
    ))

    # Check 2: specialized payload availability
    has_special_payload = insurance_payload_err is None and bool(insurance_payload)
    checks.append(CheckResult(
        code="INS_SPECIAL_ENDPOINT",
        status="pass" if has_special_payload else "proxy",
        message="insurance-tcdn specialized payload reachable.",
        evidence=insurance_payload_err or "ok",
    ))

    # Check 3: KPI confidence quality if payload exists
    proxy_ratio = None
    if has_special_payload and isinstance(insurance_payload.get("kpis"), dict):
        kpis = insurance_payload["kpis"]
        metric_keys = ["totalAssets", "totalEquity", "technicalProvisions", "netEarnedPremium", "combinedRatioPct", "solvencyCoverage"]
        present = 0
        proxy = 0
        for key in metric_keys:
            payload = kpis.get(key)
            if isinstance(payload, dict):
                value = payload.get("value")
                if value is not None:
                    present += 1
                confidence = str(payload.get("confidence") or "").lower()
                if confidence == "proxy":
                    proxy += 1
        proxy_ratio = (proxy / present) if present else None
        checks.append(CheckResult(
            code="INS_KPI_CONFIDENCE",
            status="pass" if present >= 5 and (proxy_ratio or 0) <= 0.5 else "proxy",
            message="Insurance KPI coverage and confidence quality.",
            evidence=f"present={present}/{len(metric_keys)}, proxy_ratio={proxy_ratio if proxy_ratio is not None else 'n/a'}",
        ))
    else:
        checks.append(CheckResult(
            code="INS_KPI_CONFIDENCE",
            status="proxy",
            message="KPI confidence unavailable; fallback to generic reports.",
            evidence="special payload missing",
        ))

    # Check 4: combined ratio computability from generic reports
    if income:
        row = income[0]
        nep = safe_num(row.get("revenue"))
        claims = safe_num(row.get("costOfGoodsSold"))
        opex = safe_num(row.get("operatingExpenses"))
        combined = None
        has_claim_signal = non_zero(claims)
        has_opex_signal = non_zero(opex)
        if nep and abs(nep) > 1e-9:
            combined = ((claims or 0.0) + abs(opex or 0.0)) / abs(nep) * 100.0
        combined_status = "pass" if (combined is not None and (has_claim_signal or has_opex_signal)) else "proxy"
        checks.append(CheckResult(
            code="INS_COMBINED_RATIO_COMPUTABLE",
            status=combined_status,
            message="Combined Ratio can be derived from available IS fields.",
            evidence=f"nep={nep}, claims={claims}, opex={opex}, combined={combined}",
        ))
        if combined is not None and combined > 100 and combined_status == "pass":
            risks.append(f"Combined Ratio high at {combined:.1f}% (potential underwriting pressure).")
        elif combined is not None and combined_status == "pass":
            insights.append(f"Combined Ratio around {combined:.1f}% indicates manageable underwriting quality.")
        elif combined_status == "proxy":
            fallback_recs.append("Combined Ratio lacks claim/opex signal; use solvency + liquidity trend charts as primary insight layer.")
    else:
        checks.append(CheckResult(
            code="INS_COMBINED_RATIO_COMPUTABLE",
            status="fail",
            message="No income statement rows for combined ratio.",
            evidence="income rows empty",
        ))

    # Check 5: stress test payload availability
    stress = insurance_payload.get("stress") if isinstance(insurance_payload, dict) else None
    stress_ok = isinstance(stress, dict) and isinstance(stress.get("days"), list) and len(stress.get("days")) >= 30
    checks.append(CheckResult(
        code="INS_STRESS_TEST_READY",
        status="pass" if stress_ok else "proxy",
        message="Stress-test series is available for liquidity risk insights.",
        evidence="ok" if stress_ok else "missing stress.days/cumulativeOutflows",
    ))

    # Fallback recommendations
    if insurance_payload_err:
        fallback_recs.append("Use balance-structure + ROE/ROA trend fallback charts when insurance-tcdn endpoint is unavailable.")
    if not has_core_reports:
        fallback_recs.append("Prioritize financial_ratio-based trend charts (ROE/ROA/currentRatio) until >=4 report periods are available.")
    if has_core_reports and not non_zero(balance[0].get("cash")):
        fallback_recs.append("Replace stress curve with solvency and leverage gauges when liquid asset fields are missing.")

    # High-level insights
    if has_core_reports:
        insights.append("Core financial reports are present, enabling baseline insurance dashboard analysis.")
    else:
        risks.append("Insufficient historical report depth for reliable insurance trend analysis.")

    if proxy_ratio is not None and proxy_ratio > 0.5:
        risks.append("More than half of key insurance KPIs are proxy-based; interpretation should be cautious.")

    if not fallback_recs:
        fallback_recs.append("Fallbacks not required for current payload quality.")

    return TickerAuditResult(
        ticker=ticker,
        dashboard="insurance",
        sector=sector,
        industry=industry,
        score=score,
        checks=checks,
        insights=insights[:3],
        risks=risks[:3],
        fallback_recommendations=fallback_recs[:3],
    )


def build_finco_checks(
    ticker: str,
    profile: Dict[str, Any],
    reports: Dict[str, Any],
    ratios: List[Dict[str, Any]],
    score: float,
) -> TickerAuditResult:
    checks: List[CheckResult] = []
    insights: List[str] = []
    risks: List[str] = []
    fallback_recs: List[str] = []

    sector, industry = extract_profile_fields(profile)
    income = reports.get("incomeStatement") if isinstance(reports.get("incomeStatement"), list) else []
    balance = reports.get("balanceSheet") if isinstance(reports.get("balanceSheet"), list) else []

    has_depth = len(income) >= 4 and len(balance) >= 4
    checks.append(CheckResult(
        code="FINCO_DATA_PRESENCE",
        status="pass" if has_depth else "fail",
        message="Finco core timeseries available (>=4 periods).",
        evidence=f"income={len(income)}, balance={len(balance)}",
    ))

    latest_income = income[0] if income else {}
    latest_balance = balance[0] if balance else {}

    loans = safe_num(latest_balance.get("loansToCustomers"))
    recv = safe_num(latest_balance.get("shortTermReceivables"))
    has_loan_proxy = (loans is not None and abs(loans) > 1e-9) or (recv is not None and abs(recv) > 1e-9)
    checks.append(CheckResult(
        code="FINCO_LOAN_BASE",
        status="pass" if non_zero(loans) else ("proxy" if has_loan_proxy else "fail"),
        message="Loan base available for credit metrics (loan book preferred, receivables proxy allowed).",
        evidence=f"loans={loans}, receivables={recv}",
    ))

    provision = safe_num(latest_income.get("provisionExpenses"))
    ppop = None
    toi = safe_num(latest_income.get("totalOperatingIncome")) or safe_num(latest_income.get("revenue"))
    opex = safe_num(latest_income.get("operatingExpenses"))
    if toi is not None and opex is not None:
        ppop = toi - abs(opex)
    provision_ready = provision is not None and has_loan_proxy
    checks.append(CheckResult(
        code="FINCO_CREDIT_COST_READY",
        status="pass" if provision_ready and non_zero(loans) else ("proxy" if provision_ready else "fail"),
        message="Credit-cost/provision burden can be computed.",
        evidence=f"provision={provision}, ppop={ppop}, loans={loans}, receivables={recv}",
    ))

    nim_base = safe_num(latest_income.get("netInterestIncome"))
    assets = safe_num(latest_balance.get("totalAssets"))
    nim = None
    if nim_base is not None and assets and abs(assets) > 1e-9:
        nim = nim_base * 4.0 / abs(assets) * 100.0
    checks.append(CheckResult(
        code="FINCO_NIM_OR_MARGIN",
        status="pass" if nim is not None else "proxy",
        message="NIM-like earning metric can be derived (or fallback to net margin).",
        evidence=f"netInterestIncome={nim_base}, totalAssets={assets}, nim={nim}",
    ))

    de = None
    liabilities = safe_num(latest_balance.get("totalLiabilities"))
    equity = safe_num(latest_balance.get("totalEquity"))
    if liabilities is not None and equity and abs(equity) > 1e-9:
        de = liabilities / equity
    liq_ratio = None
    current_assets = safe_num(latest_balance.get("currentAssets"))
    current_liabilities = safe_num(latest_balance.get("currentLiabilities"))
    if current_assets is not None and current_liabilities and abs(current_liabilities) > 1e-9:
        liq_ratio = current_assets / current_liabilities
    checks.append(CheckResult(
        code="FINCO_LIQUIDITY_LEVERAGE",
        status="pass" if (de is not None and liq_ratio is not None) else "proxy",
        message="Leverage and liquidity lenses are available for ALM proxy insights.",
        evidence=f"de={de}, current_ratio={liq_ratio}",
    ))

    # Insights / risks
    if de is not None:
        if de > 8:
            risks.append(f"High leverage D/E={de:.2f}x vs typical Finco comfort range.")
        else:
            insights.append(f"Leverage D/E={de:.2f}x is within a manageable range for finance operators.")
    if liq_ratio is not None:
        if liq_ratio < 1:
            risks.append(f"Current ratio={liq_ratio:.2f}x suggests short-term liquidity pressure.")
        else:
            insights.append(f"Current ratio={liq_ratio:.2f}x indicates acceptable short-term coverage.")
    if provision_ready and ppop is not None and ppop != 0 and provision is not None:
        burden = abs(provision) / abs(ppop) * 100.0
        if burden > 85:
            risks.append(f"Provision burden at {burden:.1f}% of PPOP, potentially compressing earnings quality.")
        else:
            insights.append(f"Provision burden at {burden:.1f}% of PPOP remains controllable.")

    # Fallback recommendations
    if not non_zero(loans) and non_zero(recv):
        fallback_recs.append("Use receivables-based credit proxy charts and label them explicitly as proxy.")
    if not non_zero(provision):
        fallback_recs.append("Replace credit-cost chart with leverage + ROE/ROA trend from financial_ratios.")
    if nim is None:
        fallback_recs.append("Use net margin and ROE decomposition instead of NIM where netInterestIncome is absent.")
    if not fallback_recs:
        fallback_recs.append("Fallbacks not required for current payload quality.")

    return TickerAuditResult(
        ticker=ticker,
        dashboard="finco",
        sector=sector,
        industry=industry,
        score=score,
        checks=checks,
        insights=insights[:3],
        risks=risks[:3],
        fallback_recommendations=fallback_recs[:3],
    )


def render_markdown(results: List[TickerAuditResult], base_url: str, generated_at: str) -> str:
    lines: List[str] = []
    lines.append("# TCDN Dashboard Audit Report")
    lines.append("")
    lines.append(f"- Generated at: {generated_at}")
    lines.append(f"- Base URL: {base_url}")
    lines.append("- Mode: pragmatic (pass/proxy/fail)")
    lines.append("")

    # Summary table
    lines.append("## Summary")
    lines.append("")
    lines.append("| Ticker | Dashboard | Score | Pass | Proxy | Fail |")
    lines.append("|---|---:|---:|---:|---:|---:|")
    for r in results:
        pass_n = sum(1 for c in r.checks if c.status == "pass")
        proxy_n = sum(1 for c in r.checks if c.status == "proxy")
        fail_n = sum(1 for c in r.checks if c.status == "fail")
        lines.append(f"| {r.ticker} | {r.dashboard} | {r.score:.1f} | {pass_n} | {proxy_n} | {fail_n} |")
    lines.append("")

    # Details per ticker
    for r in results:
        lines.append(f"## {r.ticker} ({r.dashboard})")
        lines.append("")
        lines.append(f"- Sector/Industry: {r.sector} / {r.industry}")
        lines.append(f"- Data score: {r.score:.1f}")
        lines.append("")
        lines.append("### Checks")
        lines.append("")
        lines.append("| Code | Status | Message | Evidence |")
        lines.append("|---|---|---|---|")
        for c in r.checks:
            lines.append(f"| {c.code} | {c.status} | {c.message} | {c.evidence} |")
        lines.append("")

        lines.append("### Insights")
        lines.append("")
        if r.insights:
            for item in r.insights:
                lines.append(f"- {item}")
        else:
            lines.append("- No strong positive insight generated.")
        lines.append("")

        lines.append("### Risks")
        lines.append("")
        if r.risks:
            for item in r.risks:
                lines.append(f"- {item}")
        else:
            lines.append("- No critical risk detected by current checks.")
        lines.append("")

        lines.append("### Fallback Recommendations")
        lines.append("")
        for item in r.fallback_recommendations:
            lines.append(f"- {item}")
        lines.append("")

    lines.append("## Next Actions")
    lines.append("")
    lines.append("1. Prioritize tickers with fail checks for immediate formula/routing remediation.")
    lines.append("2. For proxy-heavy tickers, expose confidence/source labels directly in dashboard UI.")
    lines.append("3. Promote fallback charts that preserve business meaning before showing empty states.")
    lines.append("")
    return "\n".join(lines)


def run_audit(base_url: str) -> Dict[str, Any]:
    errors: List[str] = []
    results: List[TickerAuditResult] = []

    # Fast preflight to avoid long sequential timeouts when API is down.
    _, preflight_err = get_json(f"{base_url}/stock/BVH/profile", timeout=min(REQUEST_TIMEOUT, 5))
    if preflight_err:
        errors.append(f"API preflight failed: {preflight_err}")
        return {
            "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "baseUrl": base_url,
            "mode": "pragmatic",
            "errors": errors,
            "results": [],
        }

    # Insurance selection: keep BVH mandatory when reachable + top insurance candidates.
    insurance_rows = pick_top_tickers(base_url, INSURANCE_CANDIDATES, expected_kind="insurance", max_count=3)
    if not any(row[0] == "BVH" for row in insurance_rows):
        bvh_profile, bvh_p_err = fetch_profile(base_url, "BVH")
        bvh_reports, bvh_r_err = fetch_financial_reports(base_url, "BVH", periods=20)
        bvh_ratios, bvh_ra_err = fetch_financial_ratios(base_url, "BVH", periods=20)
        if not bvh_p_err:
            insurance_rows.insert(0, ("BVH", bvh_profile, bvh_reports, bvh_ratios, compute_data_score(bvh_reports, bvh_ratios)))
        else:
            errors.append(f"BVH profile unavailable: {bvh_p_err}")

    insurance_rows = insurance_rows[:3]

    for ticker, profile, reports, ratios, score in insurance_rows:
        payload, payload_err = fetch_insurance_tcdn(base_url, ticker)
        results.append(build_insurance_checks(ticker, profile, reports, ratios, score, payload, payload_err))

    # Finco selection from real industry tags + coverage
    finco_rows = pick_top_tickers(base_url, FINCO_CANDIDATES, expected_kind="finco", max_count=3)
    for ticker, profile, reports, ratios, score in finco_rows:
        results.append(build_finco_checks(ticker, profile, reports, ratios, score))

    # Guardrail when no result found
    if not results:
        errors.append("No ticker passed discovery for insurance/finco. Check API/DB coverage.")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return {
        "generatedAt": timestamp,
        "baseUrl": base_url,
        "mode": "pragmatic",
        "errors": errors,
        "results": [
            {
                **{k: v for k, v in asdict(r).items() if k != "checks"},
                "checks": [asdict(c) for c in r.checks],
            }
            for r in results
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit TCDN dashboards (Insurance + Finco)")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="API base URL, default: http://localhost:8000/api/v1")
    parser.add_argument("--out-dir", default="md/audit", help="Output directory for reports")
    parser.add_argument("--timeout", type=int, default=8, help="Request timeout in seconds (default: 8)")
    parser.add_argument("--probe-limit", type=int, default=8, help="Max candidate tickers to probe per dashboard (default: 8)")
    args = parser.parse_args()

    global REQUEST_TIMEOUT, PROBE_LIMIT
    REQUEST_TIMEOUT = max(2, int(args.timeout))
    PROBE_LIMIT = max(1, int(args.probe_limit))

    payload = run_audit(args.base_url.rstrip("/"))

    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    out_dir = os.path.join(workspace_root, args.out_dir.replace("/", os.sep))
    os.makedirs(out_dir, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = os.path.join(out_dir, f"tcdn_audit_{stamp}.json")
    md_path = os.path.join(out_dir, f"tcdn_audit_{stamp}.md")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    results = []
    for row in payload.get("results", []):
        checks = [CheckResult(**c) for c in row.get("checks", [])]
        results.append(
            TickerAuditResult(
                ticker=row.get("ticker", ""),
                dashboard=row.get("dashboard", ""),
                sector=row.get("sector", ""),
                industry=row.get("industry", ""),
                score=float(row.get("score", 0.0)),
                checks=checks,
                insights=row.get("insights", []),
                risks=row.get("risks", []),
                fallback_recommendations=row.get("fallback_recommendations", []),
            )
        )

    markdown = render_markdown(results, payload.get("baseUrl", ""), payload.get("generatedAt", ""))
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(markdown)

    print(f"[tcdn-audit] JSON report: {json_path}")
    print(f"[tcdn-audit] Markdown report: {md_path}")

    errors = payload.get("errors", [])
    if errors:
        print("[tcdn-audit] warnings:")
        for err in errors:
            print(f"  - {err}")

    # Non-zero exit only when no audit result at all.
    if not payload.get("results"):
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
