"""Test valuation endpoint for data quality."""
import asyncio
import json
from app.database.database import AsyncSessionLocal
from app.modules.stock.logic import get_valuation


async def test_valuation(ticker: str = "VIC"):
    async with AsyncSessionLocal() as db:
        result = await get_valuation(db, ticker=ticker)

        s = result.get("summary", {})
        print("=== SUMMARY ===")
        print(f"  Current Price  : {s.get('currentPrice', 0):,.0f}")
        print(f"  Intrinsic Value: {s.get('intrinsicValue', 0):,.0f}")
        print(f"  Upside         : {s.get('upside', 0):.2f}%")
        for m in s.get("methods", []):
            print(f"    {m['method']}: {m['value']:,.0f}")

        dcf = result.get("dcf", {})
        print("\n=== DCF ===")
        print(f"  WACC           : {dcf.get('wacc', 0)*100:.2f}%")
        print(f"  Terminal Growth : {dcf.get('terminalGrowth', 0)*100:.1f}%")
        print(f"  DCF Intrinsic  : {dcf.get('intrinsicValue', 0):,.0f}")
        print(f"  Projections ({len(dcf.get('projections', []))} years):")
        for p in dcf.get("projections", []):
            print(f"    Y{p['year']}: FCF={p['fcf']:,.2f} ty, PV={p['pv']:,.2f} ty")
        print(f"  Sensitivity ({len(dcf.get('sensitivityMatrix', []))} rows):")
        for i, row in enumerate(dcf.get("sensitivityMatrix", [])):
            print(f"    Row {i}: {[f'{v:,.0f}' for v in row]}")

        ddm = result.get("ddm", {})
        print("\n=== DDM ===")
        print(f"  DDM Intrinsic  : {ddm.get('intrinsicValue', 0):,.0f}")
        print(f"  DPS            : {ddm.get('dividendPerShare', 0):,.0f}")
        print(f"  Ke             : {ddm.get('costOfEquity', 0)*100:.2f}%")
        print(f"  g              : {ddm.get('growthRate', 0)*100:.2f}%")

        pe = result.get("peBand", {})
        print("\n=== PE BAND ===")
        print(f"  Data points    : {len(pe.get('dates', []))}")
        if pe.get("prices"):
            print(f"  Price range    : {min(pe['prices']):,.0f} - {max(pe['prices']):,.0f}")
            print(f"  High band last : {pe['highBand'][-1]:,.0f}")
            print(f"  Avg band last  : {pe['avgBand'][-1]:,.0f}")
            print(f"  Low band last  : {pe['lowBand'][-1]:,.0f}")

        pb = result.get("pbBand", {})
        print("\n=== PB BAND ===")
        print(f"  Data points    : {len(pb.get('dates', []))}")
        if pb.get("prices"):
            print(f"  Price range    : {min(pb['prices']):,.0f} - {max(pb['prices']):,.0f}")
            print(f"  High band last : {pb['highBand'][-1]:,.0f}")
            print(f"  Avg band last  : {pb['avgBand'][-1]:,.0f}")
            print(f"  Low band last  : {pb['lowBand'][-1]:,.0f}")

        peers = result.get("peerValuation", [])
        print(f"\n=== PEER VALUATION ({len(peers)} peers) ===")
        for p in peers:
            pe_str = f"{p['pe']:>8.2f}" if p.get('pe') is not None else "    N/A"
            pb_str = f"{p['pb']:>8.2f}" if p.get('pb') is not None else "    N/A"
            roe_str = f"{p['roe']:>8.2f}" if p.get('roe') is not None else "    N/A"
            mcap_str = f"{p['marketCap']:>12,.0f}" if p.get('marketCap') is not None else "         N/A"
            print(f"  {p['ticker']:6s} PE={pe_str} PB={pb_str} ROE={roe_str} MCap={mcap_str}")

        ff = result.get("footballField", [])
        print(f"\n=== FOOTBALL FIELD ({len(ff)} methods) ===")
        for f in ff:
            print(f"  {f['method']:15s}: {f['low']:>12,.0f} - {f['mid']:>12,.0f} - {f['high']:>12,.0f}")

        # Validation checks
        print("\n=== VALIDATION CHECKS ===")
        errors = []
        cp = s.get("currentPrice", 0)
        iv = s.get("intrinsicValue", 0)
        
        if cp <= 0:
            errors.append("FAIL: Current price is 0 or negative")
        else:
            print(f"  OK: Current price = {cp:,.0f}")

        if iv <= 0:
            errors.append("WARN: Intrinsic value is 0 (DCF might have no data)")
        else:
            print(f"  OK: Intrinsic value = {iv:,.0f}")
            ratio = iv / cp if cp > 0 else 0
            if ratio > 10 or ratio < 0.1:
                errors.append(f"WARN: IV/Price ratio = {ratio:.2f} (seems extreme)")
            else:
                print(f"  OK: IV/Price ratio = {ratio:.2f} (reasonable)")

        dcf_iv = dcf.get("intrinsicValue", 0)
        if dcf_iv > 0:
            print(f"  OK: DCF model produced value = {dcf_iv:,.0f}")
            wacc_pct = dcf.get("wacc", 0) * 100
            if wacc_pct < 5 or wacc_pct > 25:
                errors.append(f"WARN: WACC = {wacc_pct:.1f}% (unusual range)")
            else:
                print(f"  OK: WACC = {wacc_pct:.1f}% (reasonable 5-25%)")
        else:
            errors.append("WARN: DCF model produced no value")

        ddm_iv = ddm.get("intrinsicValue", 0)
        if ddm_iv > 0:
            print(f"  OK: DDM model produced value = {ddm_iv:,.0f}")
        else:
            print(f"  INFO: DDM model N/A (no dividends or insufficient data)")

        if len(pe.get("dates", [])) > 0:
            print(f"  OK: PE Band has {len(pe['dates'])} data points")
        else:
            errors.append("WARN: PE Band has no data")

        if len(pb.get("dates", [])) > 0:
            print(f"  OK: PB Band has {len(pb['dates'])} data points")
        else:
            errors.append("WARN: PB Band has no data")

        if len(peers) > 0:
            print(f"  OK: {len(peers)} peer companies found")
        else:
            errors.append("WARN: No peer companies found")

        if len(ff) > 0:
            print(f"  OK: Football field has {len(ff)} methods")
        else:
            errors.append("WARN: Football field empty")

        if errors:
            print("\n  ISSUES:")
            for e in errors:
                print(f"    {e}")
        else:
            print("\n  ALL CHECKS PASSED!")

        return result


if __name__ == "__main__":
    async def main():
        for ticker in ("VIC", "FPT", "VCB"):
            print(f"Testing {ticker}...")
            await test_valuation(ticker)
            print("\n" + "=" * 60 + "\n")
    asyncio.run(main())
