"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import {
    useFinancialRatios,
    useFinancialReports,
    useQuantAnalysis,
    useValuation,
    type FinancialRatioItem,
} from "@/hooks/useStockData";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const fmtNum = (v: number | null | undefined, decimals = 1): string => {
    if (v == null || isNaN(v)) return "—";
    if (Math.abs(v) >= 1_000_000_000_000)
        return `${(v / 1_000_000_000_000).toFixed(1)}N`;
    if (Math.abs(v) >= 1_000_000_000)
        return `${(v / 1_000_000_000).toFixed(1)}T`;
    if (Math.abs(v) >= 1_000_000)
        return `${(v / 1_000_000).toFixed(0)}M`;
    return v.toFixed(decimals);
};

const fmtPct = (v: number | null | undefined): string => {
    if (v == null || isNaN(v)) return "—";
    return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
};

const fmtPctNosign = (v: number | null | undefined): string => {
    if (v == null || isNaN(v)) return "—";
    return `${v.toFixed(1)}%`;
};

function trendIcon(current: number | null | undefined, previous: number | null | undefined) {
    if (current == null || previous == null) return null;
    if (current > previous * 1.02)
        return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (current < previous * 0.98)
        return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
}

// Lấy period label: Q1/2025 → chỉ giữ "Q1/25"
const shortPeriod = (p: string) => p.replace("/20", "/");

// ── Section Heading ───────────────────────────────────────────────
function SectionHead({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <span className="text-base leading-none">{icon}</span>
            <div>
                <h3 className="text-sm font-bold text-gray-800">{title}</h3>
                {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
            </div>
        </div>
    );
}

// ── Card Wrapper ──────────────────────────────────────────────────
function Card({
    children,
    className = "",
    noPad = false,
}: {
    children: React.ReactNode;
    className?: string;
    noPad?: boolean;
}) {
    return (
        <div
            className={`bg-white rounded-xl border border-gray-100 shadow-sm ${noPad ? "" : "p-4"} ${className}`}
        >
            {children}
        </div>
    );
}

// ── Skeleton pulse ────────────────────────────────────────────────
function Skel({ h = "h-4", w = "w-full" }: { h?: string; w?: string }) {
    return <div className={`animate-pulse bg-gray-100 rounded ${h} ${w}`} />;
}

// ══════════════════════════════════════════════════════════════════
//  1. KPI STRIP
// ══════════════════════════════════════════════════════════════════
interface KpiCardProps {
    label: string;
    value: string;
    sub?: string;
    color?: string;
    trend?: React.ReactNode;
    badge?: { text: string; color: string };
}
function KpiCard({ label, value, sub, color = "text-gray-900", trend, badge }: KpiCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                {label}
                {badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${badge.color}`}>
                        {badge.text}
                    </span>
                )}
            </span>
            <div className="flex items-end gap-1.5">
                <span className={`text-xl font-extrabold font-mono leading-tight ${color}`}>{value}</span>
                {trend}
            </div>
            {sub && <span className="text-[10px] text-gray-400 font-mono">{sub}</span>}
        </div>
    );
}

function KpiStrip({ ratios }: { ratios: FinancialRatioItem[] | null }) {
    const { stockInfo } = useStockDetail();
    const m = stockInfo.metrics;
    const ev = stockInfo.evaluation;

    // Latest ratio period
    const latest = ratios?.[0] ?? null;
    const prev = ratios?.[1] ?? null;

    // Evaluation badge color
    const valBadge = (txt: string) => {
        if (!txt) return "";
        const t = txt.toLowerCase();
        if (t.includes("tốt") || t.includes("cao") || t.includes("mạnh")) return "bg-green-100 text-green-700";
        if (t.includes("thấp") || t.includes("kém") || t.includes("yếu")) return "bg-red-100 text-red-700";
        return "bg-gray-100 text-gray-600";
    };

    const cards: KpiCardProps[] = [
        {
            label: "Vốn hóa",
            value: m.marketCap || "—",
            color: "text-blue-700",
        },
        {
            label: "P/E",
            value: m.pe || "—",
            sub: `Xếp hạng #${m.peRank || "—"}`,
            trend: trendIcon(latest?.pe, prev?.pe),
        },
        {
            label: "P/B",
            value: m.pb || "—",
            trend: trendIcon(latest?.pb, prev?.pb),
        },
        {
            label: "EPS",
            value: m.eps || "—",
            trend: trendIcon(latest?.eps, prev?.eps),
        },
        {
            label: "ROE",
            value: m.roe ? `${m.roe}` : latest?.roe != null ? fmtPctNosign(latest.roe * 100) : "—",
            color:
                (latest?.roe ?? 0) * 100 > 15
                    ? "text-green-600"
                    : (latest?.roe ?? 0) * 100 > 8
                    ? "text-amber-600"
                    : "text-red-500",
            trend: trendIcon(latest?.roe, prev?.roe),
        },
        {
            label: "Biên LN ròng",
            value: latest?.netMargin != null ? fmtPctNosign(latest.netMargin * 100) : "—",
            color: (latest?.netMargin ?? 0) * 100 > 10 ? "text-green-600" : "text-gray-700",
            trend: trendIcon(latest?.netMargin, prev?.netMargin),
        },
        {
            label: "Biên gộp",
            value: latest?.grossMargin != null ? fmtPctNosign(latest.grossMargin * 100) : "—",
            color: (latest?.grossMargin ?? 0) * 100 > 30 ? "text-green-600" : "text-gray-700",
            trend: trendIcon(latest?.grossMargin, prev?.grossMargin),
        },
        {
            label: "Định giá",
            value: ev.valuation || "—",
        },
        {
            label: "Rủi ro",
            value: ev.risk || "—",
        },
    ];

    const cleanCards = cards;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
            {cleanCards.slice(0, 9).map((c) => (
                <KpiCard key={c.label} {...c} />
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  2. REVENUE & PROFIT TREND
// ══════════════════════════════════════════════════════════════════
function RevenueProfitChart({ reportData }: { reportData: ReturnType<typeof useFinancialReports>["data"] }) {
    const option = useMemo(() => {
        if (!reportData || reportData.incomeStatement.length < 2) return null;
        const sorted = [...reportData.incomeStatement].reverse().slice(-8);
        const periods = sorted.map((d) => shortPeriod(d.period.period));
        const revenues = sorted.map((d) => +(d.revenue / 1e9).toFixed(1));
        const profits = sorted.map((d) => +(d.netProfit / 1e9).toFixed(1));

        // YoY growth % (so sánh cùng quý năm trước nếu đủ data, không thì QQQ)
        const allSorted = [...reportData.incomeStatement].reverse();
        const growthArr = sorted.map((d, i) => {
            const idx = allSorted.findIndex(
                (x) => x.period.period === d.period.period
            );
            const prevYear = allSorted[idx + 4]; // same quarter last year
            if (!prevYear || prevYear.revenue === 0) return null;
            return +((( d.revenue - prevYear.revenue) / Math.abs(prevYear.revenue)) * 100).toFixed(1);
        });

        return {
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
                formatter: (params: { seriesName: string; value: number; axisValue: string }[]) => {
                    const lines = params.map(
                        (p) =>
                            `<span style="color:${p.seriesName === "Doanh thu" ? "#60a5fa" : p.seriesName === "LNST" ? "#34d399" : "#f97316"}">${p.seriesName}</span>: <b>${typeof p.value === "number" ? (p.seriesName === "Tăng trưởng YoY" ? fmtPct(p.value) : fmtNum(p.value, 1) + " tỷ") : "—"}</b>`
                    );
                    return `<b>${params[0]?.axisValue}</b><br/>${lines.join("<br/>")}`;
                },
            },
            legend: {
                top: 0,
                right: 0,
                textStyle: { fontSize: 11, color: "#64748b", fontFamily: "Inter,sans-serif" },
                icon: "roundRect",
                itemWidth: 12,
                itemHeight: 6,
            },
            grid: { top: 36, bottom: 28, left: 50, right: 60 },
            xAxis: {
                type: "category" as const,
                data: periods,
                axisLabel: { fontSize: 10, color: "#94a3b8", fontFamily: "Inter,sans-serif" },
                axisLine: { lineStyle: { color: "#e2e8f0" } },
                axisTick: { show: false },
            },
            yAxis: [
                {
                    type: "value" as const,
                    name: "Tỷ VND",
                    nameTextStyle: { fontSize: 9, color: "#94a3b8" },
                    axisLabel: {
                        fontSize: 9,
                        color: "#94a3b8",
                        fontFamily: "Roboto Mono,monospace",
                        formatter: (v: number) => fmtNum(v, 0),
                    },
                    splitLine: { lineStyle: { color: "#f1f5f9" } },
                },
                {
                    type: "value" as const,
                    name: "%",
                    nameTextStyle: { fontSize: 9, color: "#f97316" },
                    axisLabel: { fontSize: 9, color: "#f97316", fontFamily: "Roboto Mono,monospace", formatter: (v: number) => v + "%" },
                    splitLine: { show: false },
                },
            ],
            series: [
                {
                    name: "Doanh thu",
                    type: "bar" as const,
                    data: revenues,
                    barMaxWidth: 28,
                    itemStyle: { color: "#3b82f6", borderRadius: [3, 3, 0, 0] },
                },
                {
                    name: "LNST",
                    type: "bar" as const,
                    data: profits,
                    barMaxWidth: 28,
                    itemStyle: {
                        borderRadius: [3, 3, 0, 0],
                        color: (p: { value: number }) => (p.value >= 0 ? "#10b981" : "#ef4444"),
                    },
                },
                {
                    name: "Tăng trưởng YoY",
                    type: "line" as const,
                    yAxisIndex: 1,
                    data: growthArr,
                    symbol: "circle",
                    symbolSize: 5,
                    lineStyle: { color: "#f97316", width: 2 },
                    itemStyle: { color: "#f97316" },
                    connectNulls: true,
                },
            ],
        };
    }, [reportData]);

    if (!option)
        return (
            <div className="flex flex-col gap-2 py-4">
                <Skel h="h-4" w="w-1/2" />
                <Skel h="h-32" />
            </div>
        );

    return <ReactECharts option={option} style={{ height: 250 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  3. RATIO TRENDS  (ROE / Net Margin / Gross Margin over time)
// ══════════════════════════════════════════════════════════════════
function RatioTrendChart({ ratios }: { ratios: FinancialRatioItem[] | null }) {
    const option = useMemo(() => {
        if (!ratios || ratios.length < 2) return null;
        const sorted = [...ratios].reverse().slice(-8);
        const periods = sorted.map((d) => shortPeriod(`Q${d.quarter}/${d.year}`));
        const roe = sorted.map((d) => d.roe != null ? +(d.roe * 100).toFixed(1) : null);
        const roa = sorted.map((d) => d.roa != null ? +(d.roa * 100).toFixed(1) : null);
        const netMargin = sorted.map((d) => d.netMargin != null ? +(d.netMargin * 100).toFixed(1) : null);

        const makeSeries = (name: string, data: (number | null)[], color: string) => ({
            name,
            type: "line" as const,
            data,
            symbol: "circle",
            symbolSize: 5,
            lineStyle: { color, width: 2 },
            itemStyle: { color },
            connectNulls: true,
        });

        return {
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
                formatter: (params: { seriesName: string; value: number; axisValue: string }[]) =>
                    (params[0]?.axisValue ?? "") +
                    "<br/>" +
                    params.map((p) => `${p.seriesName}: <b>${p.value != null ? fmtPctNosign(p.value) : "—"}</b>`).join("<br/>"),
            },
            legend: {
                bottom: 0,
                left: "center",
                textStyle: { fontSize: 10, color: "#64748b", fontFamily: "Inter,sans-serif" },
                icon: "roundRect",
                itemWidth: 10,
                itemHeight: 5,
            },
            grid: { top: 12, bottom: 40, left: 42, right: 10 },
            xAxis: {
                type: "category" as const,
                data: periods,
                axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Inter,sans-serif", rotate: 30 },
                axisLine: { lineStyle: { color: "#e2e8f0" } },
                axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: {
                    fontSize: 9,
                    color: "#94a3b8",
                    formatter: (v: number) => v.toFixed(0) + "%",
                },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [
                makeSeries("ROE", roe, "#f97316"),
                makeSeries("ROA", roa, "#3b82f6"),
                makeSeries("Biên LN ròng", netMargin, "#10b981"),
            ],
        };
    }, [ratios]);

    if (!option)
        return (
            <div className="flex flex-col gap-2 py-4">
                <Skel h="h-32" />
            </div>
        );

    return <ReactECharts option={option} style={{ height: 220 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  4. QUANT RISK SNAPSHOT
// ══════════════════════════════════════════════════════════════════
function QuantSnapshot({ quantData }: { quantData: ReturnType<typeof useQuantAnalysis>["data"] }) {
    if (!quantData) return <div className="py-6 text-center text-xs text-gray-400 animate-pulse">Đang tải phân tích định lượng…</div>;

    const { kpis, wealthIndex, varData } = quantData;

    const kpiOrder = ["Sharpe Ratio", "Sortino Ratio", "Max Drawdown", "Ann. Return", "Ann. Volatility", "Beta"];
    const displayKpis = kpiOrder.map((k) => kpis.find((x) => x.label === k)).filter(Boolean) as typeof kpis;

    const kpiColor = (label: string, value: number) => {
        if (label === "Sharpe Ratio" || label === "Sortino Ratio")
            return value >= 1 ? "text-green-600" : value >= 0.5 ? "text-amber-600" : "text-red-500";
        if (label === "Max Drawdown")
            return value > -15 ? "text-green-600" : value > -30 ? "text-amber-600" : "text-red-500";
        if (label === "Ann. Return")
            return value > 0 ? "text-green-600" : "text-red-500";
        return "text-gray-800";
    };

    // Wealth index mini sparkline
    const wealthOption = useMemo(() => {
        if (!wealthIndex || wealthIndex.length < 5) return null;
        const vals = wealthIndex.slice(-60).map((d) => d.value);
        const lastVal = vals[vals.length - 1] ?? 1;
        const color = lastVal >= 1 ? "#10b981" : "#ef4444";
        return {
            grid: { top: 4, bottom: 4, left: 4, right: 4 },
            xAxis: { type: "category" as const, show: false },
            yAxis: { type: "value" as const, show: false },
            series: [{
                type: "line" as const,
                data: vals,
                symbol: "none",
                smooth: true,
                lineStyle: { color, width: 2 },
                areaStyle: { color: `${color}22` },
            }],
        };
    }, [wealthIndex]);

    const lastWealth = wealthIndex?.[wealthIndex.length - 1]?.value ?? 1;
    const totalReturn = (lastWealth - 1) * 100;

    return (
        <div className="space-y-3">
            {/* KPI chips */}
            <div className="grid grid-cols-3 gap-2">
                {displayKpis.map((k) => (
                    <div key={k.label} className="bg-gray-50 rounded-lg border border-gray-100 p-2.5">
                        <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">{k.label}</div>
                        <div className={`text-base font-extrabold font-mono mt-0.5 ${kpiColor(k.label, k.value)}`}>
                            {k.value}{k.suffix}
                        </div>
                    </div>
                ))}
            </div>

            {/* VaR row */}
            <div className="flex gap-2">
                {[
                    { label: "VaR 95%", value: `${varData.var95}%`, color: "text-amber-600" },
                    { label: "VaR 99%", value: `${varData.var99}%`, color: "text-red-500" },
                    { label: "CVaR 95%", value: `${varData.cvar95}%`, color: "text-red-600" },
                ].map((it) => (
                    <div key={it.label} className="flex-1 bg-gray-50 rounded-lg border border-gray-100 p-2">
                        <div className="text-[9px] font-semibold text-gray-400 uppercase">{it.label}</div>
                        <div className={`text-sm font-bold font-mono ${it.color}`}>{it.value}</div>
                    </div>
                ))}
            </div>

            {/* Wealth mini sparkline */}
            {wealthOption && (
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-gray-500 font-medium">Lợi nhuận tích lũy</span>
                        <span className={`text-xs font-bold font-mono ${totalReturn >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {fmtPct(totalReturn)}
                        </span>
                    </div>
                    <ReactECharts option={wealthOption} style={{ height: 52 }} />
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  5. VALUATION SNAPSHOT
// ══════════════════════════════════════════════════════════════════
function ValuationSnapshot({ valuationData }: { valuationData: ReturnType<typeof useValuation>["data"] }) {
    if (!valuationData) return <div className="py-6 text-center text-xs text-gray-400 animate-pulse">Đang tải định giá…</div>;

    const { summary } = valuationData;
    const upsidePct = summary.upside;
    const upside = upsidePct > 5 ? "positive" : upsidePct < -5 ? "negative" : "neutral";
    const upsideColor = upside === "positive" ? "text-green-600 bg-green-50 border-green-200" : upside === "negative" ? "text-red-500 bg-red-50 border-red-200" : "text-amber-600 bg-amber-50 border-amber-200";
    const upsideLabel = upside === "positive" ? "Tiềm năng tăng" : upside === "negative" ? "Rủi ro giảm" : "Gần giá trị hợp lý";

    const color = upside === "positive" ? "#10b981" : upside === "negative" ? "#ef4444" : "#f59e0b";

    // Bar chart: method vs intrinsic
    const methodOption = useMemo(() => {
        if (!summary.methods || summary.methods.length === 0) return null;
        const names = summary.methods.map((m) => m.method);
        const vals = summary.methods.map((m) => m.value);
        return {
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "#1e293b",
                textStyle: { color: "#f1f5f9", fontSize: 10, fontFamily: "Roboto Mono,monospace" },
            },
            grid: { top: 8, bottom: 40, left: 10, right: 10 },
            xAxis: {
                type: "category" as const,
                data: names,
                axisLabel: { fontSize: 9, color: "#94a3b8", rotate: 20, fontFamily: "Inter,sans-serif" },
                axisLine: { lineStyle: { color: "#e2e8f0" } },
                axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono,monospace" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [
                {
                    type: "bar" as const,
                    data: vals.map((v) => ({
                        value: v,
                        itemStyle: { color: color + "cc", borderRadius: [4, 4, 0, 0] },
                    })),
                    barMaxWidth: 32,
                },
                {
                    type: "line" as const,
                    data: vals.map(() => summary.currentPrice),
                    symbol: "none",
                    lineStyle: { color: "#94a3b8", type: "dashed" as const, width: 1.5 },
                    silent: true,
                    tooltip: { show: false },
                },
            ],
        };
    }, [summary, color]);

    return (
        <div className="space-y-3">
            {/* Hero: intrinsic vs current */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                    <span className="text-[9px] font-semibold text-gray-400 uppercase">Giá hiện tại</span>
                    <div className="text-lg font-extrabold font-mono text-gray-800 mt-0.5">
                        {summary.currentPrice.toLocaleString("vi-VN")}
                    </div>
                </div>
                <div className={`rounded-lg border px-3 py-2 ${upsideColor}`}>
                    <span className="text-[9px] font-semibold uppercase">{upsideLabel}</span>
                    <div className="text-lg font-extrabold font-mono mt-0.5">
                        {upsidePct > 0 ? "+" : ""}{upsidePct.toFixed(1)}%
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                <span className="text-[9px] font-semibold text-gray-400 uppercase">Giá trị nội tại TB</span>
                <div className={`text-lg font-extrabold font-mono mt-0.5 ${color === "#10b981" ? "text-green-600" : color === "#ef4444" ? "text-red-500" : "text-amber-600"}`}>
                    {summary.intrinsicValue.toLocaleString("vi-VN")}
                </div>
            </div>

            {/* Method chart */}
            {methodOption && (
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-2">
                    <span className="text-[10px] text-gray-500 font-medium block mb-1">So sánh phương pháp định giá</span>
                    <ReactECharts option={methodOption} style={{ height: 120 }} />
                </div>
            )}

            {/* DCF details */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-2">
                    <div className="text-[9px] text-gray-400 uppercase font-semibold">WACC</div>
                    <div className="font-mono font-bold text-gray-700 mt-0.5">{(valuationData.dcf.wacc * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-2">
                    <div className="text-[9px] text-gray-400 uppercase font-semibold">Tăng trưởng dài hạn</div>
                    <div className="font-mono font-bold text-gray-700 mt-0.5">{(valuationData.dcf.terminalGrowth * 100).toFixed(1)}%</div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  6. FINANCIAL HEALTH SCORECARD
// ══════════════════════════════════════════════════════════════════
function HealthScorecard({ ratios }: { ratios: FinancialRatioItem[] | null }) {
    if (!ratios || ratios.length === 0) return null;
    const r = ratios[0];

    type Metric = { label: string; value: number | null; good: (v: number) => boolean; fmt: (v: number) => string };
    const metrics: Metric[] = [
        { label: "D/E Ratio", value: r.debtToEquity, good: (v) => v < 1.5, fmt: (v) => v.toFixed(2) + "x" },
        { label: "Current Ratio", value: r.currentRatio, good: (v) => v >= 1.5, fmt: (v) => v.toFixed(2) + "x" },
        { label: "Quick Ratio", value: r.quickRatio, good: (v) => v >= 1, fmt: (v) => v.toFixed(2) + "x" },
        { label: "Interest Coverage", value: r.interestCoverageRatio, good: (v) => v >= 3, fmt: (v) => v.toFixed(1) + "x" },
        { label: "Asset Turnover", value: r.assetTurnover, good: (v) => v >= 0.5, fmt: (v) => v.toFixed(2) + "x" },
        { label: "Dividend Yield", value: r.dividendYield, good: (v) => v > 0, fmt: (v) => fmtPctNosign(v) },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metrics.map((m) => {
                const val = m.value;
                const isGood = val != null && m.good(val);
                const isNull = val == null;
                return (
                    <div key={m.label} className={`rounded-lg border p-2.5 ${isNull ? "border-gray-100 bg-gray-50" : isGood ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"}`}>
                        <div className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">{m.label}</div>
                        <div className={`text-base font-extrabold font-mono mt-0.5 ${isNull ? "text-gray-400" : isGood ? "text-green-700" : "text-red-600"}`}>
                            {val != null ? m.fmt(val) : "—"}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  7. VALUATION RATIO TREND  (PE / PB over time)
// ══════════════════════════════════════════════════════════════════
function ValuationRatioChart({ ratios }: { ratios: FinancialRatioItem[] | null }) {
    const option = useMemo(() => {
        if (!ratios || ratios.length < 2) return null;
        const sorted = [...ratios].reverse().slice(-8);
        const periods = sorted.map((d) => shortPeriod(`Q${d.quarter}/${d.year}`));
        const pe = sorted.map((d) => d.pe ?? null);
        const pb = sorted.map((d) => d.pb ?? null);
        const evEbitda = sorted.map((d) => d.evEbitda ?? null);

        const makeS = (name: string, data: (number | null)[], color: string) => ({
            name,
            type: "line" as const,
            data,
            symbol: "circle",
            symbolSize: 4,
            lineStyle: { color, width: 2 },
            itemStyle: { color },
            connectNulls: true,
        });

        return {
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
            },
            legend: {
                bottom: 0, left: "center",
                textStyle: { fontSize: 10, color: "#64748b", fontFamily: "Inter,sans-serif" },
                icon: "roundRect", itemWidth: 10, itemHeight: 5,
            },
            grid: { top: 12, bottom: 36, left: 36, right: 10 },
            xAxis: {
                type: "category" as const, data: periods,
                axisLabel: { fontSize: 9, color: "#94a3b8", rotate: 20, fontFamily: "Inter,sans-serif" },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono,monospace" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [makeS("P/E", pe, "#3b82f6"), makeS("P/B", pb, "#f97316"), makeS("EV/EBITDA", evEbitda, "#8b5cf6")],
        };
    }, [ratios]);

    if (!option) return <Skel h="h-28" />;
    return <ReactECharts option={option} style={{ height: 200 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  8. LATEST NEWS
// ══════════════════════════════════════════════════════════════════
function NewsWidget() {
    const { corporateNews } = useStockDetail();
    const news = corporateNews.slice(0, 6);

    if (news.length === 0) {
        return <div className="text-xs text-gray-400 py-4 text-center">Không có tin tức</div>;
    }

    const catColor = (cat: string) => {
        const c = cat.toLowerCase();
        if (c.includes("cổ tức") || c.includes("dividend")) return "bg-green-100 text-green-700";
        if (c.includes("kết quả") || c.includes("earnings")) return "bg-blue-100 text-blue-700";
        if (c.includes("tặng") || c.includes("thưởng")) return "bg-amber-100 text-amber-700";
        if (c.includes("họp") || c.includes("đhcđ")) return "bg-purple-100 text-purple-700";
        return "bg-gray-100 text-gray-600";
    };

    return (
        <div className="divide-y divide-gray-50">
            {news.map((n) => (
                <div key={n.id} className="flex items-start gap-3 py-2.5 hover:bg-gray-50/50 rounded-lg px-1 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 leading-relaxed line-clamp-2">{n.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${catColor(n.category)}`}>{n.category}</span>
                            <span className="text-[10px] text-gray-400">{n.time}</span>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] text-gray-400">{n.source}</span>
                        </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-gray-300 flex-shrink-0 mt-0.5" />
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  9. PEER COMPARISON
// ══════════════════════════════════════════════════════════════════
function PeerWidget() {
    const { peerStocks, stockInfo } = useStockDetail();

    if (!peerStocks || peerStocks.length === 0)
        return <div className="text-xs text-gray-400 py-4 text-center">Không có cổ phiếu cùng ngành</div>;

    const myChange = stockInfo.priceChangePercent;

    return (
        <div className="space-y-1.5">
            {/* Self row */}
            <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <div>
                    <span className="text-xs font-bold text-blue-700">{stockInfo.ticker}</span>
                    <span className="text-[10px] text-gray-400 ml-1.5">({stockInfo.exchange})</span>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold font-mono text-gray-800">
                        {stockInfo.currentPrice.toLocaleString("vi-VN")}
                    </div>
                    <div className={`text-[10px] font-mono font-semibold ${myChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {fmtPct(myChange)}
                    </div>
                </div>
            </div>

            {/* Peer rows */}
            {peerStocks.map((p) => (
                <div key={p.ticker} className="flex items-center justify-between rounded-lg hover:bg-gray-50 px-3 py-2 transition-colors cursor-pointer">
                    <span className="text-xs font-semibold text-gray-700">{p.ticker}</span>
                    <div className="text-right">
                        <div className="text-xs font-mono text-gray-700">{p.price.toLocaleString("vi-VN")}</div>
                        <div className={`text-[10px] font-mono font-semibold ${p.priceChangePercent >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {fmtPct(p.priceChangePercent)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════════
export default function DashboardTab() {
    const { ticker, stockInfo } = useStockDetail();
    const { data: ratios, loading: ratioLoading } = useFinancialRatios(ticker, 12);
    const { data: reportData, loading: reportLoading } = useFinancialReports(ticker, 10);
    const { data: quantData, loading: quantLoading } = useQuantAnalysis(ticker);
    const { data: valuationData, loading: valuationLoading } = useValuation(ticker);

    const latestRatio = (ratios && ratios.length > 0) ? ratios[0] : null;

    return (
        <div className="space-y-4 font-sans">

            {/* ── Header ── */}
            <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">
                        Dashboard — <span className="text-blue-600">{ticker}</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {stockInfo.companyName} • {stockInfo.exchange}
                        {stockInfo.sector ? ` • ${stockInfo.sector}` : ""}
                    </p>
                </div>
                {/* Evaluation badges */}
                <div className="flex flex-wrap gap-1.5">
                    {stockInfo.evaluation.fundamentalAnalysis && (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            📊 Cơ bản: {stockInfo.evaluation.fundamentalAnalysis}
                        </span>
                    )}
                    {stockInfo.evaluation.technicalAnalysis && (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                            📈 Kỹ thuật: {stockInfo.evaluation.technicalAnalysis}
                        </span>
                    )}
                    {stockInfo.evaluation.valuation && (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                            💰 Định giá: {stockInfo.evaluation.valuation}
                        </span>
                    )}
                </div>
            </div>

            {/* ── KPI Strip ── */}
            {ratioLoading && !ratios
                ? <div className="grid grid-cols-5 xl:grid-cols-9 gap-2">{Array(9).fill(0).map((_, i) => <Skel key={i} h="h-16" />)}</div>
                : <KpiStrip ratios={ratios ?? null} />
            }

            {/* ── Row 1: Revenue/Profit | Ratio Trends ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <Card className="lg:col-span-7">
                    <SectionHead icon="📊" title="Doanh thu & Lợi nhuận" sub="8 quý gần nhất — tỷ VND" />
                    {reportLoading && !reportData
                        ? <Skel h="h-52" />
                        : <RevenueProfitChart reportData={reportData ?? null} />
                    }
                </Card>
                <Card className="lg:col-span-5">
                    <SectionHead icon="📉" title="Xu hướng tỷ suất sinh lời" sub="ROE / ROA / Biên LN ròng" />
                    {ratioLoading && !ratios
                        ? <Skel h="h-44" />
                        : <RatioTrendChart ratios={ratios ?? null} />
                    }
                    {/* Health scorecard mini */}
                    {latestRatio && (
                        <div className="mt-3">
                            <p className="text-[10px] text-gray-400 mb-2 font-semibold uppercase tracking-wide">Chỉ số sức khỏe tài chính</p>
                            <HealthScorecard ratios={ratios ?? null} />
                        </div>
                    )}
                </Card>
            </div>

            {/* ── Row 2: Valuation Ratio Trends | Quant Snapshot | Valuation ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Valuation multiples trend */}
                <Card className="lg:col-span-4">
                    <SectionHead icon="💹" title="Bội số định giá" sub="P/E · P/B · EV/EBITDA" />
                    {ratioLoading && !ratios
                        ? <Skel h="h-40" />
                        : <ValuationRatioChart ratios={ratios ?? null} />
                    }
                </Card>

                {/* Quant risk snapshot */}
                <Card className="lg:col-span-4">
                    <SectionHead icon="⚠️" title="Phân tích rủi ro" sub="Quant metrics · VaR · Drawdown" />
                    {quantLoading && !quantData
                        ? <div className="animate-pulse space-y-2">{Array(4).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div>
                        : <QuantSnapshot quantData={quantData ?? null} />
                    }
                </Card>

                {/* Valuation snapshot */}
                <Card className="lg:col-span-4">
                    <SectionHead icon="🎯" title="Định giá" sub="DCF · DDM · So sánh ngành" />
                    {valuationLoading && !valuationData
                        ? <div className="space-y-2">{Array(4).fill(0).map((_, i) => <Skel key={i} h="h-12" />)}</div>
                        : <ValuationSnapshot valuationData={valuationData ?? null} />
                    }
                </Card>
            </div>

            {/* ── Row 3: News | Peers ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <Card className="lg:col-span-8">
                    <SectionHead icon="📰" title="Tin tức doanh nghiệp" sub="Sự kiện gần nhất" />
                    <NewsWidget />
                </Card>
                <Card className="lg:col-span-4">
                    <SectionHead icon="🏢" title="Cùng ngành" sub="Biến động giá" />
                    <PeerWidget />
                </Card>
            </div>

        </div>
    );
}
