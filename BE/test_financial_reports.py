"""
Test script: Validate financial-reports API data for chart consumption.
Tests multiple tickers to ensure data is correctly returned from BCTC table.
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# ── Adjust these if needed ──
TICKERS = ["VNM", "FPT", "HPG", "VCB", "MBB"]
PERIODS = 8


async def main():
    from app.core.config import get_settings
    settings = get_settings()
    db_url = settings.DATABASE_URL.replace("psycopg2", "asyncpg")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    from app.modules.stock.logic import get_financial_reports

    passed = 0
    failed = 0

    for ticker in TICKERS:
        print(f"\n{'='*60}")
        print(f"  Testing: {ticker}")
        print(f"{'='*60}")

        async with async_session() as db:
            try:
                result = await get_financial_reports(db, ticker=ticker, periods=PERIODS)
            except Exception as e:
                print(f"  ❌ ERROR: {e}")
                failed += 1
                continue

        is_data = result.get("incomeStatement", [])
        bs_data = result.get("balanceSheet", [])
        cf_data = result.get("cashFlow", [])

        # Basic checks
        errors = []
        if not is_data:
            errors.append("incomeStatement is empty")
        if not bs_data:
            errors.append("balanceSheet is empty")
        if not cf_data:
            errors.append("cashFlow is empty")

        if errors:
            for e in errors:
                print(f"  ⚠️  {e}")
            failed += 1
            continue

        # Check IS structure
        latest_is = is_data[0]
        required_is_keys = ["period", "year", "quarter", "revenue", "costOfGoodsSold",
                            "grossProfit", "netProfit", "operatingProfit", "profitBeforeTax"]
        for key in required_is_keys:
            if key not in latest_is:
                errors.append(f"IS missing key: {key}")

        # Check BS structure
        latest_bs = bs_data[0]
        required_bs_keys = ["period", "totalAssets", "currentAssets", "totalLiabilities",
                            "totalEquity", "cash", "inventory"]
        for key in required_bs_keys:
            if key not in latest_bs:
                errors.append(f"BS missing key: {key}")

        # Check CF structure
        latest_cf = cf_data[0]
        required_cf_keys = ["period", "operatingCashFlow", "investingCashFlow",
                            "financingCashFlow", "netCashChange"]
        for key in required_cf_keys:
            if key not in latest_cf:
                errors.append(f"CF missing key: {key}")

        # Value sanity checks
        rev = latest_is.get("revenue", 0)
        # Some tickers may not have data for latest quarter (e.g. data lag)
        # Accept if at least some periods have revenue
        any_revenue = any(d.get("revenue", 0) != 0 for d in is_data)
        if not any_revenue:
            errors.append(f"No revenue data in any period")

        total_assets = latest_bs.get("totalAssets", 0)
        total_le = latest_bs.get("totalLiabilitiesAndEquity", 0)
        if total_assets > 0 and total_le > 0:
            diff_pct = abs(total_assets - total_le) / total_assets * 100
            if diff_pct > 1:
                errors.append(f"BS imbalance: totalAssets={total_assets:.0f} vs L+E={total_le:.0f} (diff={diff_pct:.2f}%)")

        # GP check only for non-bank tickers (banks don't have COGS)
        gross_profit = latest_is.get("grossProfit", 0)
        cogs = latest_is.get("costOfGoodsSold", 0)
        is_bank = (cogs == 0 and gross_profit > 0 and rev > 0)
        if not is_bank and rev != 0 and cogs != 0:
            expected_gp = rev + cogs  # cogs is negative
            if abs(expected_gp - gross_profit) / abs(rev) > 0.01:
                errors.append(f"GP check: revenue({rev:.0f}) + COGS({cogs:.0f}) = {expected_gp:.0f} vs grossProfit={gross_profit:.0f}")

        if errors:
            for e in errors:
                print(f"  ❌ {e}")
            failed += 1
        else:
            # Print summary
            ty = lambda v: f"{v / 1e9:,.1f} tỷ"
            print(f"  ✅ Periods: {len(is_data)} IS, {len(bs_data)} BS, {len(cf_data)} CF")
            print(f"  Latest: {latest_is.get('period', 'N/A')}")
            print(f"  Revenue:      {ty(rev)}")
            print(f"  Gross Profit: {ty(gross_profit)}")
            print(f"  Net Profit:   {ty(latest_is.get('netProfit', 0))}")
            print(f"  Total Assets: {ty(total_assets)}")
            print(f"  Total Equity: {ty(latest_bs.get('totalEquity', 0))}")
            print(f"  Op.Cash Flow: {ty(latest_cf.get('operatingCashFlow', 0))}")
            
            # Gross margin
            gm = (gross_profit / rev * 100) if rev else 0
            nm = (latest_is.get("netProfit", 0) / rev * 100) if rev else 0
            de = (latest_bs.get("totalLiabilities", 0) / latest_bs.get("totalEquity", 1))
            print(f"  Gross Margin: {gm:.1f}%  |  Net Margin: {nm:.1f}%  |  D/E: {de:.2f}x")
            passed += 1

    print(f"\n{'='*60}")
    print(f"  RESULTS: {passed} passed, {failed} failed out of {len(TICKERS)}")
    print(f"{'='*60}")

    await engine.dispose()
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    code = asyncio.run(main())
    sys.exit(code)
