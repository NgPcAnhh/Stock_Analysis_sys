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
    return <Minus className="w-3 h-3 text-muted-foreground" />;
}

// Lấy period label: Q1/2025 → chỉ giữ "Q1/25"
const shortPeriod = (p: string) => p.replace("/20", "/");

// ── Section Heading ───────────────────────────────────────────────
function SectionHead({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <span className="text-base leading-none">{icon}</span>
            <div>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
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
            className={`bg-card rounded-xl border border-border/50 shadow-sm ${noPad ? "" : "p-4"} ${className}`}
        >
            {children}
        </div>
    );
}

// ── Skeleton pulse ────────────────────────────────────────────────
function Skel({ h = "h-4", w = "w-full" }: { h?: string; w?: string }) {
    return <div className={`animate-pulse bg-muted rounded ${h} ${w}`} />;
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
function KpiCard({ label, value, sub, color = "text-foreground", trend, badge }: KpiCardProps) {
    return (
        <div className="bg-card rounded-xl border border-border/50 shadow-sm px-4 py-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
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
            {sub && <span className="text-[10px] text-muted-foreground font-mono">{sub}</span>}
        </div>
    );
}

function KpiStrip({ ratios, reportData }: { ratios: FinancialRatioItem[] | null; reportData: ReturnType<typeof useFinancialReports>["data"] }) {
    const { stockInfo } = useStockDetail();
    const m = stockInfo.metrics;
    const ev = stockInfo.evaluation;

    // Latest ratio period
    const latest = ratios?.[0] ?? null;
    const prev = ratios?.[1] ?? null;

    let fallbackNetMargin: number | null = null;
    let fallbackGrossMargin: number | null = null;
    let fallbackPrevNetMargin: number | null = null;
    let fallbackPrevGrossMargin: number | null = null;

    if (reportData && reportData.incomeStatement.length > 0) {
        const is0 = reportData.incomeStatement[0];
        if (is0.revenue > 0) {
            fallbackNetMargin = is0.netProfit / is0.revenue;
            fallbackGrossMargin = is0.grossProfit / is0.revenue;
        }
    }
    if (reportData && reportData.incomeStatement.length > 1) {
        const is1 = reportData.incomeStatement[1];
        if (is1.revenue > 0) {
            fallbackPrevNetMargin = is1.netProfit / is1.revenue;
            fallbackPrevGrossMargin = is1.grossProfit / is1.revenue;
        }
    }

    const nmLatest = latest?.netMargin ?? fallbackNetMargin;
    const gmLatest = latest?.grossMargin ?? fallbackGrossMargin;
    const nmPrev = prev?.netMargin ?? fallbackPrevNetMargin;
    const gmPrev = prev?.grossMargin ?? fallbackPrevGrossMargin;

    // Evaluation badge color
    const valBadge = (txt: string) => {
        if (!txt) return "";
        const t = txt.toLowerCase();
        if (t.includes("tốt") || t.includes("cao") || t.includes("mạnh")) return "bg-green-100 text-green-700";
        if (t.includes("thấp") || t.includes("kém") || t.includes("yếu")) return "bg-red-100 text-red-700";
        return "bg-muted text-muted-foreground";
    };

    const cards: KpiCardProps[] = [
        {
            label: "Vốn hóa (tỷ VND)",
            value: m.marketCap ? m.marketCap.replace(/tỷ|Tỷ/g, "").trim() : "—",
            // sub: m.marketCap?.toLowerCase().includes("tỷ") ? " " : undefined,
            color: "text-blue-700",
        },
        {
            label: "P/E",
            value: m.pe || "—",
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
            value: nmLatest != null ? fmtPctNosign(nmLatest * 100) : "—",
            color: (nmLatest ?? 0) * 100 > 10 ? "text-green-600" : "text-muted-foreground",
            trend: trendIcon(nmLatest, nmPrev),
        },
        {
            label: "Biên gộp",
            value: gmLatest != null ? fmtPctNosign(gmLatest * 100) : "—",
            color: (gmLatest ?? 0) * 100 > 30 ? "text-green-600" : "text-muted-foreground",
            trend: trendIcon(gmLatest, gmPrev),
        },
    ];

    const cleanCards = cards;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
            {cleanCards.slice(0, 7).map((c) => (
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

        // Filter for Quarterly data only
        const sorted = [...reportData.incomeStatement].reverse().slice(-8); // Get up to last 8 quarters
        const periods = sorted.map((d) => shortPeriod(d.period.period)); // e.g., "Q1/24"
        const revenues = sorted.map((d) => +(d.revenue / 1e9).toFixed(1));
        const profits = sorted.map((d) => +(d.netProfit / 1e9).toFixed(1));

        return {
            tooltip: {
                trigger: "axis" as const,
                backgroundColor: "#1e293b",
                borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
                formatter: (params: { seriesName: string; value: number; axisValue: string }[]) => {
                    const lines = params.map(
                        (p) =>
                            `<span style="color:${p.seriesName === "Doanh thu" ? "#60a5fa" : "#34d399"}">${p.seriesName}</span>: <b>${typeof p.value === "number" ? fmtNum(p.value, 1) + " tỷ" : "—"}</b>`
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
            grid: { top: 46, bottom: 20, left: 50, right: 20 },
            xAxis: {
                type: "category" as const,
                data: periods,
                axisLabel: { fontSize: 10, color: "#94a3b8", fontFamily: "Inter,sans-serif" },
                axisLine: { lineStyle: { color: "#e2e8f0" } },
                axisTick: { show: false },
            },
            yAxis: {
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
function RatioTrendChart({ ratios, reportData }: { ratios: FinancialRatioItem[] | null; reportData: ReturnType<typeof useFinancialReports>["data"] }) {
    const option = useMemo(() => {
        if (!ratios || ratios.length < 2) return null;
        const sorted = [...ratios].reverse().slice(-8);
        const periods = sorted.map((d) => shortPeriod(`Q${d.quarter}/${d.year}`));
        const roe = sorted.map((d) => d.roe != null ? +(d.roe * 100).toFixed(1) : null);
        const roa = sorted.map((d) => d.roa != null ? +(d.roa * 100).toFixed(1) : null);

        const netMargin = sorted.map((d) => {
            if (d.netMargin != null) return +(d.netMargin * 100).toFixed(1);
            const rep = reportData?.incomeStatement.find(x => x.period.year === d.year && x.period.quarter === d.quarter);
            if (rep && rep.revenue > 0) return +((rep.netProfit / rep.revenue) * 100).toFixed(1);
            return null;
        });

        const grossMargin = sorted.map((d) => {
            if (d.grossMargin != null) return +(d.grossMargin * 100).toFixed(1);
            const rep = reportData?.incomeStatement.find(x => x.period.year === d.year && x.period.quarter === d.quarter);
            if (rep && rep.revenue > 0) return +((rep.grossProfit / rep.revenue) * 100).toFixed(1);
            return null;
        });

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
                makeSeries("Biên gộp", grossMargin, "#8b5cf6"),
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
    if (!quantData) return <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Đang tải phân tích định lượng…</div>;

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
        return "text-foreground";
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
                    <div key={k.label} className="bg-muted/50 rounded-lg border border-border/50 p-2.5">
                        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{k.label}</div>
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
                    <div key={it.label} className="flex-1 bg-muted/50 rounded-lg border border-border/50 p-2">
                        <div className="text-[9px] font-semibold text-muted-foreground uppercase">{it.label}</div>
                        <div className={`text-sm font-bold font-mono ${it.color}`}>{it.value}</div>
                    </div>
                ))}
            </div>

            {/* Wealth mini sparkline */}
            {wealthOption && (
                <div className="bg-muted/50 rounded-lg border border-border/50 p-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Lợi nhuận tích lũy</span>
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
    if (!valuationData) return <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Đang tải định giá…</div>;

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
                <div className="bg-muted/50 rounded-lg border border-border/50 p-3">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase">Giá hiện tại</span>
                    <div className="text-lg font-extrabold font-mono text-foreground mt-0.5">
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

            <div className="bg-muted/50 rounded-lg border border-border/50 p-3">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">Giá trị nội tại TB</span>
                <div className={`text-lg font-extrabold font-mono mt-0.5 ${color === "#10b981" ? "text-green-600" : color === "#ef4444" ? "text-red-500" : "text-amber-600"}`}>
                    {summary.intrinsicValue.toLocaleString("vi-VN")}
                </div>
            </div>

            {/* Method chart */}
            {methodOption && (
                <div className="bg-muted/50 rounded-lg border border-border/50 p-2">
                    <span className="text-[10px] text-muted-foreground font-medium block mb-1">So sánh phương pháp định giá</span>
                    <ReactECharts option={methodOption} style={{ height: 120 }} />
                </div>
            )}

            {/* DCF details */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-muted/50 rounded-lg border border-border/50 p-2">
                    <div className="text-[9px] text-muted-foreground uppercase font-semibold">WACC</div>
                    <div className="font-mono font-bold text-muted-foreground mt-0.5">{(valuationData.dcf.wacc * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-muted/50 rounded-lg border border-border/50 p-2">
                    <div className="text-[9px] text-muted-foreground uppercase font-semibold">Tăng trưởng dài hạn</div>
                    <div className="font-mono font-bold text-muted-foreground mt-0.5">{(valuationData.dcf.terminalGrowth * 100).toFixed(1)}%</div>
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
                    <div key={m.label} className={`rounded-lg border p-2.5 ${isNull ? "border-border/50 bg-muted/50" : isGood ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"}`}>
                        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{m.label}</div>
                        <div className={`text-base font-extrabold font-mono mt-0.5 ${isNull ? "text-muted-foreground" : isGood ? "text-green-700" : "text-red-600"}`}>
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
//  8. DRAWDOWN CHART
// ══════════════════════════════════════════════════════════════════
function DrawdownChart({ drawdownData }: { drawdownData: { date: string; value: number }[] | null | undefined }) {
    const option = useMemo(() => {
        if (!drawdownData || drawdownData.length < 5) return null;
        const dates = drawdownData.map((d) => d.date.slice(5)); // MM-DD
        const values = drawdownData.map((d) => +(d.value * 100).toFixed(2));

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
                formatter: (params: any) => `${params[0]?.axisValue}<br/>Drawdown: <b>${params[0]?.value}%</b>`,
            },
            grid: { top: 20, bottom: 28, left: 40, right: 20 },
            xAxis: {
                type: "category" as const, data: dates, boundaryGap: false,
                axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(dates.length / 6), fontFamily: "Inter,sans-serif" },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: { fontSize: 9, color: "#94a3b8", formatter: (v: number) => v.toFixed(0) + "%" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [{
                type: "line" as const, data: values, symbol: "none", smooth: true,
                lineStyle: { color: "#ef4444", width: 2 },
                areaStyle: { color: "#ef444418" },
            }],
        };
    }, [drawdownData]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu Drawdown</div>;

    const latestDt = drawdownData?.[drawdownData.length - 1];

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground font-medium">Mức sụt giảm lớn nhất</span>
                <span className="text-sm font-bold font-mono text-red-500">
                    {latestDt ? (latestDt.value * 100).toFixed(2) + "%" : "—"}
                </span>
            </div>
            <ReactECharts option={option} style={{ height: 180 }} />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  9. PEER COMPARISON
// ══════════════════════════════════════════════════════════════════
function PeerWidget() {
    const { peerStocks, stockInfo } = useStockDetail();

    if (!peerStocks || peerStocks.length === 0)
        return <div className="text-xs text-muted-foreground py-4 text-center">Không có cổ phiếu cùng ngành</div>;

    const myChange = stockInfo.priceChangePercent;

    return (
        <div className="space-y-1.5">
            {/* Self row */}
            <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <div>
                    <span className="text-xs font-bold text-blue-700">{stockInfo.ticker}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">({stockInfo.exchange})</span>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold font-mono text-foreground">
                        {stockInfo.currentPrice.toLocaleString("vi-VN")}
                    </div>
                    <div className={`text-[10px] font-mono font-semibold ${myChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {fmtPct(myChange)}
                    </div>
                </div>
            </div>

            {/* Peer rows */}
            {peerStocks.map((p) => (
                <div key={p.ticker} className="flex items-center justify-between rounded-lg hover:bg-muted/50 px-3 py-2 transition-colors cursor-pointer">
                    <span className="text-xs font-semibold text-foreground">{p.ticker}</span>
                    <div className="text-right">
                        <div className="text-xs font-mono text-muted-foreground">{p.price.toLocaleString("vi-VN")}</div>
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
//  10. DUPONT ROE DECOMPOSITION (5-Factor)
// ══════════════════════════════════════════════════════════════════
function DuPontDecomposition({ reportData }: { reportData: ReturnType<typeof useFinancialReports>["data"] }) {
    const result = useMemo(() => {
        if (!reportData) return null;
        const { incomeStatement: isList, balanceSheet: bsList } = reportData;
        if (isList.length < 1 || bsList.length < 1) return null;
        const ni = isList[0].netProfit ?? 0;
        const pbt = isList[0].profitBeforeTax ?? 0;
        // operatingProfit may be 0 from BE; fallback to grossProfit - opex
        let ebit = isList[0].operatingProfit ?? 0;
        if (!ebit) ebit = (isList[0].grossProfit ?? 0) - (isList[0].sellingExpenses ?? 0) - (isList[0].adminExpenses ?? 0);
        const rev = isList[0].revenue ?? 0;
        const ta = bsList[0].totalAssets ?? 0;
        const te = bsList[0].totalEquity ?? 0;
        if (!rev || !ta || !te || !pbt || !ebit) return null;
        return {
            taxBurden: ni / pbt,
            interestBurden: pbt / ebit,
            ebitMargin: ebit / rev,
            assetTurnover: rev / ta,
            equityMultiplier: ta / te,
            roe: (ni / pbt) * (pbt / ebit) * (ebit / rev) * (rev / ta) * (ta / te),
        };
    }, [reportData]);

    if (!result) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu DuPont</div>;
    const { taxBurden, interestBurden, ebitMargin, assetTurnover, equityMultiplier, roe } = result;

    const factors = [
        { label: "Tax Burden", desc: "NI ÷ PBT", value: taxBurden, fmt: taxBurden.toFixed(2), good: taxBurden > 0.7 },
        { label: "Interest Burden", desc: "PBT ÷ EBIT", value: interestBurden, fmt: interestBurden.toFixed(2), good: interestBurden > 0.8 },
        { label: "EBIT Margin", desc: "EBIT ÷ Revenue", value: ebitMargin, fmt: fmtPctNosign(ebitMargin * 100), good: ebitMargin > 0.1 },
        { label: "Asset Turnover", desc: "Rev ÷ Assets", value: assetTurnover, fmt: assetTurnover.toFixed(2) + "x", good: assetTurnover > 0.3 },
        { label: "Equity Mult.", desc: "Assets ÷ Equity", value: equityMultiplier, fmt: equityMultiplier.toFixed(2) + "x", good: equityMultiplier > 1 && equityMultiplier < 3 },
    ];
    const roeColor = roe > 0.15 ? "text-green-600" : roe > 0.08 ? "text-amber-600" : "text-red-500";
    const roeBg = roe > 0.15 ? "bg-green-50 border-green-200" : roe > 0.08 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

    return (
        <div className="space-y-3">
            <div className={`rounded-lg border p-3 text-center ${roeBg}`}>
                <div className="text-[9px] font-semibold text-muted-foreground uppercase">ROE (DuPont 5-Factor)</div>
                <div className={`text-2xl font-extrabold font-mono ${roeColor}`}>{fmtPctNosign(roe * 100)}</div>
            </div>
            <div className="space-y-1.5">
                {factors.map((f, i) => (
                    <div key={f.label} className="flex items-center gap-2">
                        <div className="flex-1 flex items-center justify-between bg-muted/50 rounded-lg border border-border/50 px-3 py-1.5">
                            <div>
                                <span className="text-[10px] font-semibold text-muted-foreground">{f.label}</span>
                                <span className="text-[8px] text-muted-foreground/50 ml-1">({f.desc})</span>
                            </div>
                            <span className={`text-sm font-bold font-mono ${f.good ? "text-green-600" : "text-amber-600"}`}>{f.fmt}</span>
                        </div>
                        {i < factors.length - 1 && <span className="text-muted-foreground/40 text-xs font-bold">×</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  11. ALTMAN Z-SCORE GAUGE
// ══════════════════════════════════════════════════════════════════
function AltmanZScoreGauge({ reportData, ratios }: {
    reportData: ReturnType<typeof useFinancialReports>["data"];
    ratios: FinancialRatioItem[] | null;
}) {
    const result = useMemo(() => {
        if (!reportData || !ratios || ratios.length === 0) return null;
        const bs = reportData.balanceSheet[0];
        const is0 = reportData.incomeStatement[0];
        if (!bs || !is0) return null;
        const ta = bs.totalAssets ?? 0;
        if (!ta) return null;
        const wc = (bs.currentAssets ?? 0) - (bs.currentLiabilities ?? 0);
        const re = bs.retainedEarnings ?? 0;
        // operatingProfit may be 0 from BE; fallback to grossProfit - opex
        let ebit = is0.operatingProfit ?? 0;
        if (!ebit) ebit = (is0.grossProfit ?? 0) - (is0.sellingExpenses ?? 0) - (is0.adminExpenses ?? 0);
        const tl = bs.totalLiabilities ?? 0;
        const rev = is0.revenue ?? 0;
        const mve = ratios[0]?.marketCap ?? null;
        if (mve == null || !tl) return null;

        const x1 = wc / ta;
        const x2 = re / ta;
        const x3 = ebit / ta;
        const x4 = mve / tl;
        const x5 = rev / ta;
        const z = 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5;
        return { z: +z.toFixed(2), x1, x2, x3, x4, x5 };
    }, [reportData, ratios]);

    if (!result) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu Z-Score</div>;
    const { z } = result;
    const zone = z >= 2.99 ? "safe" : z >= 1.81 ? "grey" : "distress";
    const zoneLabel = zone === "safe" ? "An toàn" : zone === "grey" ? "Cảnh báo" : "Nguy hiểm";
    const zoneColor = zone === "safe" ? "text-green-600" : zone === "grey" ? "text-amber-600" : "text-red-500";
    const zoneBg = zone === "safe" ? "bg-green-50 border-green-200" : zone === "grey" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

    const gaugeOption = useMemo(() => ({
        series: [{
            type: "gauge" as const,
            startAngle: 200,
            endAngle: -20,
            min: 0,
            max: 5,
            pointer: { length: "55%", width: 5, itemStyle: { color: "#475569" } },
            axisLine: {
                lineStyle: {
                    width: 18,
                    color: [
                        [0.362, "#ef4444"],
                        [0.598, "#f59e0b"],
                        [1, "#10b981"],
                    ],
                },
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { fontSize: 9, color: "#94a3b8", distance: -28 },
            detail: {
                valueAnimation: true,
                fontSize: 22,
                fontWeight: "bold" as const,
                fontFamily: "Roboto Mono,monospace",
                color: zone === "safe" ? "#10b981" : zone === "grey" ? "#f59e0b" : "#ef4444",
                offsetCenter: [0, "40%"],
            },
            data: [{ value: z }],
        }],
    }), [z, zone]);

    return (
        <div className="space-y-2">
            <ReactECharts option={gaugeOption} style={{ height: 170 }} />
            <div className={`rounded-lg border px-3 py-2 text-center ${zoneBg}`}>
                <span className={`text-sm font-bold ${zoneColor}`}>{zoneLabel}</span>
                <span className={`text-[10px] text-muted-foreground ml-2`}>
                    {zone === "safe" ? "> 2.99" : zone === "grey" ? "1.81 – 2.99" : "< 1.81"}
                </span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
                {[
                    { l: "WC/TA", v: result.x1 },
                    { l: "RE/TA", v: result.x2 },
                    { l: "EBIT/TA", v: result.x3 },
                    { l: "MVE/TL", v: result.x4 },
                    { l: "Rev/TA", v: result.x5 },
                ].map((it) => (
                    <div key={it.l} className="bg-muted/50 rounded border border-border/50 p-1">
                        <div className="text-[7px] text-muted-foreground uppercase font-semibold">{it.l}</div>
                        <div className="text-[10px] font-mono font-bold text-muted-foreground">{it.v.toFixed(2)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  12. PIOTROSKI F-SCORE (9 Criteria)
// ══════════════════════════════════════════════════════════════════
function PiotroskiFScore({ reportData, ratios }: {
    reportData: ReturnType<typeof useFinancialReports>["data"];
    ratios: FinancialRatioItem[] | null;
}) {
    const criteria = useMemo(() => {
        if (!reportData || !ratios || ratios.length < 2) return null;
        const { incomeStatement: is, balanceSheet: bs, cashFlow: cf } = reportData;
        if (is.length < 2 || bs.length < 2 || cf.length < 1) return null;

        const ta0 = bs[0].totalAssets ?? 1;
        const ta1 = bs[1].totalAssets ?? 1;
        const ni0 = is[0].netProfit ?? 0;
        const ni1 = is[1].netProfit ?? 0;
        const cfo0 = cf.length > 0 ? (cf[0]?.operatingCashFlow ?? 0) : 0;
        const ltDebt0 = bs[0].longTermLiabilities ?? 0;
        const ltDebt1 = bs[1].longTermLiabilities ?? 0;
        const cr0 = ratios[0]?.currentRatio ?? 0;
        const cr1 = ratios[1]?.currentRatio ?? 0;
        const shares0 = ratios[0]?.outstandingShares ?? 0;
        const shares1 = ratios[1]?.outstandingShares ?? 0;
        const gm0 = ratios[0]?.grossMargin ?? 0;
        const gm1 = ratios[1]?.grossMargin ?? 0;
        const at0 = ratios[0]?.assetTurnover ?? 0;
        const at1 = ratios[1]?.assetTurnover ?? 0;

        const roa0 = ni0 / ta0;
        const roa1 = ni1 / ta1;

        const items = [
            { group: "Lợi nhuận", name: "ROA > 0", pass: roa0 > 0 },
            { group: "Lợi nhuận", name: "CFO > 0", pass: cfo0 > 0 },
            { group: "Lợi nhuận", name: "ΔROA > 0", pass: roa0 > roa1 },
            { group: "Lợi nhuận", name: "CFO > NI (Accruals)", pass: cfo0 > ni0 },
            { group: "Đòn bẩy", name: "ΔNợ dài hạn ↓", pass: ltDebt0 / ta0 <= ltDebt1 / ta1 },
            { group: "Đòn bẩy", name: "ΔCurrent Ratio ↑", pass: cr0 >= cr1 },
            { group: "Đòn bẩy", name: "Không phát hành CP mới", pass: shares0 <= shares1 || shares1 === 0 },
            { group: "Hiệu quả", name: "ΔBiên gộp ↑", pass: gm0 >= gm1 },
            { group: "Hiệu quả", name: "ΔAsset Turnover ↑", pass: at0 >= at1 },
        ];
        return items;
    }, [reportData, ratios]);

    if (!criteria) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu F-Score</div>;
    const score = criteria.filter((c) => c.pass).length;
    const scoreColor = score >= 7 ? "text-green-600" : score >= 4 ? "text-amber-600" : "text-red-500";
    const scoreBg = score >= 7 ? "bg-green-50 border-green-200" : score >= 4 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
    const scoreLabel = score >= 7 ? "Mạnh" : score >= 4 ? "Trung bình" : "Yếu";

    const groups = ["Lợi nhuận", "Đòn bẩy", "Hiệu quả"];
    return (
        <div className="space-y-3">
            <div className={`rounded-lg border p-3 flex items-center justify-between ${scoreBg}`}>
                <div>
                    <div className="text-[9px] font-semibold text-muted-foreground uppercase">Piotroski F-Score</div>
                    <div className={`text-xs font-bold mt-0.5 ${scoreColor}`}>{scoreLabel}</div>
                </div>
                <div className={`text-3xl font-extrabold font-mono ${scoreColor}`}>{score}/9</div>
            </div>
            {groups.map((g) => (
                <div key={g}>
                    <div className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">{g}</div>
                    <div className="space-y-1">
                        {criteria.filter((c) => c.group === g).map((c) => (
                            <div key={c.name} className="flex items-center gap-2 bg-muted/50 rounded-lg border border-border/50 px-3 py-1.5">
                                <span className="text-sm">{c.pass ? "✅" : "❌"}</span>
                                <span className={`text-[11px] font-medium ${c.pass ? "text-foreground" : "text-muted-foreground"}`}>{c.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  13. CASH CONVERSION CYCLE
// ══════════════════════════════════════════════════════════════════
function CashConversionCycleChart({ ratios }: { ratios: FinancialRatioItem[] | null }) {
    const option = useMemo(() => {
        if (!ratios || ratios.length < 3) return null;
        const sorted = [...ratios].reverse().slice(-8);
        const hasData = sorted.some((d) => d.receivableDays != null || d.inventoryDays != null);
        if (!hasData) return null;
        const periods = sorted.map((d) => shortPeriod(`Q${d.quarter}/${d.year}`));
        const recDays = sorted.map((d) => d.receivableDays ?? null);
        const invDays = sorted.map((d) => d.inventoryDays ?? null);
        const payDays = sorted.map((d) => d.payableDays ?? null);
        const ccc = sorted.map((d) => d.cashConversionCycle ?? null);

        const mkLine = (name: string, data: (number | null)[], color: string, dash = false) => ({
            name, type: "line" as const, data, symbol: "circle", symbolSize: 4,
            lineStyle: { color, width: 2, type: (dash ? "dashed" : "solid") as "dashed" | "solid" },
            itemStyle: { color }, connectNulls: true,
        });

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
                formatter: (params: { seriesName: string; value: number }[]) =>
                    params.map((p) => `${p.seriesName}: <b>${p.value != null ? p.value.toFixed(0) + " ngày" : "—"}</b>`).join("<br/>"),
            },
            legend: {
                bottom: 0, left: "center", textStyle: { fontSize: 9, color: "#64748b" },
                icon: "roundRect", itemWidth: 10, itemHeight: 5,
            },
            grid: { top: 12, bottom: 40, left: 42, right: 10 },
            xAxis: {
                type: "category" as const, data: periods,
                axisLabel: { fontSize: 9, color: "#94a3b8", rotate: 20 },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const, name: "Ngày",
                nameTextStyle: { fontSize: 9, color: "#94a3b8" },
                axisLabel: { fontSize: 9, color: "#94a3b8" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [
                mkLine("Thu tiền", recDays, "#3b82f6"),
                mkLine("Tồn kho", invDays, "#f97316"),
                mkLine("Trả nợ", payDays, "#8b5cf6", true),
                mkLine("CCC", ccc, "#ef4444"),
            ],
        };
    }, [ratios]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu CCC</div>;
    return <ReactECharts option={option} style={{ height: 230 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  14. DIVIDEND ANALYSIS
// ══════════════════════════════════════════════════════════════════
function DividendAnalysis({ ratios }: { ratios: FinancialRatioItem[] | null }) {
    const option = useMemo(() => {
        if (!ratios || ratios.length < 3) return null;
        const annual = [...ratios].reverse().filter((d) => d.dividendYield != null);
        if (annual.length < 2) return null;
        const periods = annual.map((d) => shortPeriod(`Q${d.quarter}/${d.year}`)).slice(-8);
        const yields = annual.map((d) => d.dividendYield != null ? +(d.dividendYield * 100).toFixed(2) : null).slice(-8);
        const eps = annual.map((d) => d.eps).slice(-8);

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
            },
            legend: {
                bottom: 0, left: "center", textStyle: { fontSize: 9, color: "#64748b" },
                icon: "roundRect", itemWidth: 10, itemHeight: 5,
            },
            grid: { top: 16, bottom: 40, left: 46, right: 46 },
            xAxis: {
                type: "category" as const, data: periods,
                axisLabel: { fontSize: 9, color: "#94a3b8", rotate: 20 },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: [
                {
                    type: "value" as const, name: "Yield %",
                    nameTextStyle: { fontSize: 9, color: "#10b981" },
                    axisLabel: { fontSize: 9, color: "#10b981", formatter: (v: number) => v.toFixed(1) + "%" },
                    splitLine: { lineStyle: { color: "#f1f5f9" } },
                },
                {
                    type: "value" as const, name: "EPS",
                    nameTextStyle: { fontSize: 9, color: "#3b82f6" },
                    axisLabel: { fontSize: 9, color: "#3b82f6", formatter: (v: number) => fmtNum(v, 0) },
                    splitLine: { show: false },
                },
            ],
            series: [
                {
                    name: "Dividend Yield", type: "bar" as const, data: yields,
                    barMaxWidth: 24, yAxisIndex: 0,
                    itemStyle: { color: "#10b981", borderRadius: [3, 3, 0, 0] },
                },
                {
                    name: "EPS", type: "line" as const, data: eps, yAxisIndex: 1,
                    symbol: "circle", symbolSize: 5,
                    lineStyle: { color: "#3b82f6", width: 2 },
                    itemStyle: { color: "#3b82f6" }, connectNulls: true,
                },
            ],
        };
    }, [ratios]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không có dữ liệu cổ tức</div>;
    return <ReactECharts option={option} style={{ height: 220 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  15. YTD PERFORMANCE
// ══════════════════════════════════════════════════════════════════
function YtdPerformance() {
    const { priceHistory, stockInfo } = useStockDetail();
    const option = useMemo(() => {
        if (!priceHistory || priceHistory.length < 10) return null;
        const currentYear = new Date().getFullYear();
        const ytdPrices = priceHistory.filter((p) => {
            const y = parseInt(p.date.slice(0, 4), 10);
            return y === currentYear;
        });
        if (ytdPrices.length < 5) return null;
        const basePrice = ytdPrices[0].close;
        if (!basePrice) return null;
        const dates = ytdPrices.map((p) => p.date.slice(5)); // MM-DD
        const cumReturn = ytdPrices.map((p) => +((p.close / basePrice - 1) * 100).toFixed(2));
        const lastReturn = cumReturn[cumReturn.length - 1] ?? 0;
        const lineColor = lastReturn >= 0 ? "#10b981" : "#ef4444";

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
                formatter: (params: { axisValue: string; value: number }[]) =>
                    `${params[0]?.axisValue}<br/>Lợi nhuận: <b>${fmtPct(params[0]?.value)}</b>`,
            },
            grid: { top: 20, bottom: 28, left: 50, right: 20 },
            xAxis: {
                type: "category" as const, data: dates, boundaryGap: false,
                axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(dates.length / 6) },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const,
                axisLabel: { fontSize: 9, color: "#94a3b8", formatter: (v: number) => v.toFixed(0) + "%" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [{
                type: "line" as const, data: cumReturn, symbol: "none", smooth: true,
                lineStyle: { color: lineColor, width: 2 },
                areaStyle: { color: lineColor + "18" },
                markLine: {
                    silent: true,
                    data: [{ yAxis: 0 }],
                    lineStyle: { color: "#94a3b8", type: "dashed" as const, width: 1 },
                    label: { show: false },
                    symbol: ["none", "none"],
                },
            }],
        };
    }, [priceHistory]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu YTD</div>;
    const ytdPrices = priceHistory.filter((p) => parseInt(p.date.slice(0, 4), 10) === new Date().getFullYear());
    const basePrice = ytdPrices[0]?.close ?? 1;
    const lastPrice = ytdPrices[ytdPrices.length - 1]?.close ?? basePrice;
    const ytdReturn = ((lastPrice / basePrice - 1) * 100);

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground font-medium">Lợi nhuận từ đầu năm {new Date().getFullYear()}</span>
                <span className={`text-sm font-bold font-mono ${ytdReturn >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {fmtPct(ytdReturn)}
                </span>
            </div>
            <ReactECharts option={option} style={{ height: 180 }} />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
//  16. REVENUE ⟶ NET PROFIT WATERFALL
// ══════════════════════════════════════════════════════════════════
function RevenueWaterfall({ reportData }: { reportData: ReturnType<typeof useFinancialReports>["data"] }) {
    const option = useMemo(() => {
        if (!reportData) return null;
        const is = reportData.incomeStatement;
        if (is.length < 1) return null;
        const d = is[0];
        const rev = d.revenue ?? 0;
        if (!rev) return null;
        const cogs = Math.abs(d.costOfGoodsSold ?? 0);
        const gross = d.grossProfit ?? 0;
        const sell = Math.abs(d.sellingExpenses ?? 0);
        const admin = Math.abs(d.adminExpenses ?? 0);
        let opProfit = d.operatingProfit ?? 0;
        if (!opProfit) opProfit = gross - sell - admin;
        const finInc = d.financialIncome ?? 0;
        const finExp = Math.abs(d.financialExpenses ?? 0);
        const pbt = d.profitBeforeTax ?? 0;
        const tax = Math.abs(d.incomeTax ?? 0);
        const ni = d.netProfit ?? 0;
        const toTy = (v: number) => +(v / 1e9).toFixed(1);

        // Waterfall: [transparent_base, visible_value]
        const items = [
            { name: "Doanh thu", value: toTy(rev), base: 0, color: "#3b82f6" },
            { name: "Giá vốn", value: -toTy(cogs), base: toTy(rev) + (-toTy(cogs)), color: "#ef4444" },
            { name: "LN gộp", value: toTy(gross), base: 0, color: "#10b981", isSum: true },
            { name: "CP bán hàng", value: -toTy(sell), base: toTy(gross) + (-toTy(sell)), color: "#f97316" },
            { name: "CP quản lý", value: -toTy(admin), base: toTy(gross) - toTy(sell) + (-toTy(admin)), color: "#f97316" },
            { name: "LN HĐKD", value: toTy(opProfit), base: 0, color: "#10b981", isSum: true },
            { name: "Thu tài chính", value: toTy(finInc), base: toTy(opProfit), color: "#06b6d4" },
            { name: "CP tài chính", value: -toTy(finExp), base: toTy(opProfit) + toTy(finInc) + (-toTy(finExp)), color: "#ef4444" },
            { name: "LN trước thuế", value: toTy(pbt), base: 0, color: "#8b5cf6", isSum: true },
            { name: "Thuế TNDN", value: -toTy(tax), base: toTy(pbt) + (-toTy(tax)), color: "#ef4444" },
            { name: "LNST", value: toTy(ni), base: 0, color: ni >= 0 ? "#10b981" : "#ef4444", isSum: true },
        ];

        const baseData = items.map((it) => (it.isSum ? 0 : Math.max(0, (it.value >= 0 ? it.base : it.base))));
        const visibleData = items.map((it) => ({
            value: Math.abs(it.value),
            itemStyle: { color: it.color, borderRadius: it.value >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] },
        }));

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Inter,sans-serif" },
                formatter: (params: { seriesIndex: number; name: string; value: number }[]) => {
                    const p = params.find((x) => x.seriesIndex === 1);
                    if (!p) return "";
                    const it = items.find((x) => x.name === p.name);
                    const sign = (it?.value ?? 0) < 0 ? "-" : "+";
                    const pct = rev ? ((Math.abs(it?.value ?? 0) / toTy(rev)) * 100).toFixed(1) : "0";
                    return `<b>${p.name}</b><br/>Giá trị: <b>${it?.value ?? 0} tỷ</b> (${sign}${pct}% DT)`;
                },
            },
            grid: { top: 16, bottom: 60, left: 50, right: 10 },
            xAxis: {
                type: "category" as const, data: items.map((it) => it.name),
                axisLabel: { fontSize: 8, color: "#64748b", interval: 0, rotate: 35, fontFamily: "Inter,sans-serif" },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const, name: "Tỷ VND",
                nameTextStyle: { fontSize: 9, color: "#94a3b8" },
                axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono,monospace" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [
                { name: "base", type: "bar" as const, stack: "wf", data: baseData, itemStyle: { color: "transparent" }, emphasis: { itemStyle: { color: "transparent" } } },
                {
                    name: "value", type: "bar" as const, stack: "wf", data: visibleData, barMaxWidth: 28,
                    label: {
                        show: true, position: "top" as const, fontSize: 8, color: "#64748b", fontFamily: "Roboto Mono,monospace",
                        formatter: (p: { value: number; dataIndex: number }) => {
                            const it = items[p.dataIndex];
                            return it ? (it.value >= 0 ? "+" : "") + it.value.toFixed(0) : "";
                        },
                    },
                },
            ],
        };
    }, [reportData]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu Waterfall</div>;
    return <ReactECharts option={option} style={{ height: 280 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  17. DAILY RETURN HISTOGRAM
// ══════════════════════════════════════════════════════════════════
function ReturnHistogram() {
    const { priceHistory } = useStockDetail();
    const option = useMemo(() => {
        if (!priceHistory || priceHistory.length < 30) return null;
        // Compute daily returns
        const closes = priceHistory.map((p) => p.close).filter(Boolean);
        const returns: number[] = [];
        for (let i = 1; i < closes.length; i++) {
            returns.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
        }
        if (returns.length < 20) return null;

        // Stats
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
        const std = Math.sqrt(variance);
        const n = returns.length;
        const skewness = returns.reduce((a, b) => a + ((b - mean) / std) ** 3, 0) / n;
        const kurtosis = returns.reduce((a, b) => a + ((b - mean) / std) ** 4, 0) / n - 3;

        // Histogram bins
        const binCount = 25;
        const min = Math.min(...returns);
        const max = Math.max(...returns);
        const binWidth = (max - min) / binCount;
        const bins: { center: number; count: number }[] = [];
        for (let i = 0; i < binCount; i++) {
            const lo = min + i * binWidth;
            const hi = lo + binWidth;
            const center = +(lo + binWidth / 2).toFixed(2);
            const count = returns.filter((r) => r >= lo && (i === binCount - 1 ? r <= hi : r < hi)).length;
            bins.push({ center, count });
        }

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
                formatter: (params: { name: string; value: number }[]) => {
                    const p = params[0];
                    return `Return: <b>${p?.name}%</b><br/>Tần suất: <b>${p?.value} ngày</b>`;
                },
            },
            grid: { top: 36, bottom: 28, left: 44, right: 10 },
            xAxis: {
                type: "category" as const, data: bins.map((b) => b.center.toFixed(1)),
                axisLabel: { fontSize: 8, color: "#94a3b8", interval: 3, fontFamily: "Roboto Mono,monospace" },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
                name: "% Return", nameTextStyle: { fontSize: 9, color: "#94a3b8" },
            },
            yAxis: {
                type: "value" as const, name: "Số ngày",
                nameTextStyle: { fontSize: 9, color: "#94a3b8" },
                axisLabel: { fontSize: 9, color: "#94a3b8" },
                splitLine: { lineStyle: { color: "#f1f5f9" } },
            },
            series: [{
                type: "bar" as const, data: bins.map((b) => ({
                    value: b.count,
                    itemStyle: {
                        color: b.center >= 0 ? "#10b981" : "#ef4444",
                        borderRadius: [2, 2, 0, 0],
                    },
                })),
                barCategoryGap: "10%",
                markLine: {
                    silent: true,
                    data: [
                        { xAxis: bins.findIndex((b) => b.center >= mean).toString(), lineStyle: { color: "#3b82f6", width: 2 } },
                    ],
                    label: { show: true, formatter: `μ=${mean.toFixed(2)}%`, fontSize: 9, color: "#3b82f6" },
                    symbol: ["none", "none"],
                },
            }],
            graphic: [{
                type: "text" as const,
                left: 54, top: 8,
                style: {
                    text: `μ=${mean.toFixed(2)}%  σ=${std.toFixed(2)}%  Skew=${skewness.toFixed(2)}  Kurt=${kurtosis.toFixed(2)}`,
                    fontSize: 9, fill: "#94a3b8", fontFamily: "Roboto Mono,monospace",
                },
            }],
        };
    }, [priceHistory]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu Histogram</div>;
    return <ReactECharts option={option} style={{ height: 260 }} />;
}

// ══════════════════════════════════════════════════════════════════
//  18. PRICE SENSITIVITY DENSITY (KDE + VaR markers)
// ══════════════════════════════════════════════════════════════════
function PriceSensitivityDensity() {
    const { priceHistory, stockInfo } = useStockDetail();
    const option = useMemo(() => {
        if (!priceHistory || priceHistory.length < 30) return null;
        const closes = priceHistory.map((p) => p.close).filter(Boolean);
        const returns: number[] = [];
        for (let i = 1; i < closes.length; i++) {
            returns.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
        }
        if (returns.length < 20) return null;

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const std = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length);
        const sorted = [...returns].sort((a, b) => a - b);
        const var95 = sorted[Math.floor(returns.length * 0.05)];
        const var99 = sorted[Math.floor(returns.length * 0.01)];

        // Kernel density estimation (Gaussian)
        const bandwidth = std * 0.5;
        const minX = mean - 4 * std;
        const maxX = mean + 4 * std;
        const steps = 80;
        const dx = (maxX - minX) / steps;
        const kdePoints: { x: number; y: number }[] = [];
        for (let i = 0; i <= steps; i++) {
            const x = minX + i * dx;
            let density = 0;
            for (const r of returns) {
                density += Math.exp(-0.5 * ((x - r) / bandwidth) ** 2);
            }
            density /= returns.length * bandwidth * Math.sqrt(2 * Math.PI);
            kdePoints.push({ x: +x.toFixed(3), y: +density.toFixed(6) });
        }

        // Normal distribution overlay
        const normalPoints = kdePoints.map((p) => {
            const z = (p.x - mean) / std;
            return +(Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI))).toFixed(6);
        });

        return {
            tooltip: {
                trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
                textStyle: { color: "#f1f5f9", fontSize: 11 },
                formatter: (params: { seriesName: string; value: number; name: string }[]) => {
                    const lines = params.map((p) =>
                        `${p.seriesName}: <b>${(p.value * 100).toFixed(2)}%</b>`
                    );
                    return `Return: <b>${params[0]?.name}%</b><br/>${lines.join("<br/>")}`;
                },
            },
            legend: {
                top: 0, right: 0, textStyle: { fontSize: 9, color: "#64748b" },
                icon: "roundRect", itemWidth: 10, itemHeight: 5,
            },
            grid: { top: 30, bottom: 28, left: 10, right: 10 },
            xAxis: {
                type: "category" as const, data: kdePoints.map((p) => p.x.toFixed(1)),
                axisLabel: { fontSize: 8, color: "#94a3b8", interval: Math.floor(steps / 8), fontFamily: "Roboto Mono,monospace" },
                axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false },
            },
            yAxis: {
                type: "value" as const, show: false,
            },
            series: [
                {
                    name: "Mật độ thực tế", type: "line" as const,
                    data: kdePoints.map((p) => p.y), symbol: "none", smooth: true,
                    lineStyle: { color: "#3b82f6", width: 2.5 },
                    areaStyle: { color: "#3b82f622" },
                },
                {
                    name: "Phân phối chuẩn", type: "line" as const,
                    data: normalPoints, symbol: "none", smooth: true,
                    lineStyle: { color: "#f59e0b", width: 1.5, type: "dashed" as const },
                },
            ],
            markLine: {
                silent: true,
                data: [
                    { xAxis: kdePoints.findIndex((p) => p.x >= var95).toString() },
                    { xAxis: kdePoints.findIndex((p) => p.x >= var99).toString() },
                ],
            },
        };
    }, [priceHistory]);

    if (!option) return <div className="py-6 text-center text-xs text-muted-foreground">Không đủ dữ liệu Density</div>;

    // Compute stats for display
    const closes = priceHistory.map((p) => p.close).filter(Boolean);
    const rets: number[] = [];
    for (let i = 1; i < closes.length; i++) rets.push(((closes[i] - closes[i - 1]) / closes[i - 1]) * 100);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const std = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length);
    const sorted = [...rets].sort((a, b) => a - b);
    const var95 = sorted[Math.floor(rets.length * 0.05)];
    const var99 = sorted[Math.floor(rets.length * 0.01)];

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: "TB Return", value: `${mean.toFixed(2)}%`, color: mean >= 0 ? "text-green-600" : "text-red-500" },
                    { label: "Biến động (σ)", value: `${std.toFixed(2)}%`, color: std < 2 ? "text-green-600" : std < 3.5 ? "text-amber-600" : "text-red-500" },
                    { label: "VaR 95%", value: `${var95.toFixed(2)}%`, color: "text-amber-600" },
                    { label: "VaR 99%", value: `${var99.toFixed(2)}%`, color: "text-red-500" },
                ].map((it) => (
                    <div key={it.label} className="bg-muted/50 rounded-lg border border-border/50 p-2 text-center">
                        <div className="text-[8px] font-semibold text-muted-foreground uppercase">{it.label}</div>
                        <div className={`text-sm font-bold font-mono mt-0.5 ${it.color}`}>{it.value}</div>
                    </div>
                ))}
            </div>
            <ReactECharts option={option} style={{ height: 220 }} />
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
        <div className="space-y-6 font-sans pb-12">            {/* ── PHẦN 1: HEADER & KPI ── */}
            <div className="py-2 mb-4 border-b">
                <div className="flex flex-col gap-3">
                    {/* Header info */}
                    <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                Dashboard — <span className="text-blue-600">{ticker}</span>
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
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

                    {/* KPI Strip */}
                    <div className="w-full">
                        {ratioLoading && !ratios
                            ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">{Array(7).fill(0).map((_, i) => <Skel key={i} h="h-16" />)}</div>
                            : <KpiStrip ratios={ratios ?? null} reportData={reportData ?? null} />
                        }
                    </div>
                </div>
            </div>

            {/* ── PHẦN 2: PHÂN TÍCH CƠ BẢN (CHƯƠNG 1 & 2) ── */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-2 uppercase tracking-wider">
                    <span className="bg-primary/10 text-primary p-1 rounded">1</span>
                    Khả năng Sinh lời & Sức khỏe Tài chính
                </h3>

                {/* Nửa trên (Kinh doanh) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <Card className="lg:col-span-7 flex flex-col">
                        <SectionHead icon="📊" title="Doanh thu & Lợi nhuận" sub="8 quý gần nhất — tỷ VND" />
                        <div className="flex-1 -mb-4">
                            {reportLoading && !reportData
                                ? <Skel h="h-52" />
                                : <RevenueProfitChart reportData={reportData ?? null} />
                            }
                        </div>
                    </Card>
                    <Card className="lg:col-span-5 flex flex-col">
                        <SectionHead icon="📉" title="Xu hướng tỷ suất sinh lời" sub="ROE / ROA / Biên LN ròng / Biên gộp" />
                        <div className="flex-1">
                            {ratioLoading && !ratios
                                ? <Skel h="h-44" />
                                : <RatioTrendChart ratios={ratios ?? null} reportData={reportData ?? null} />
                            }
                        </div>
                        {/* Health scorecard mini at bottom corner */}
                        {latestRatio && (
                            <div className="mt-auto pt-3 border-t">
                                <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Chỉ số sức khỏe tài chính</p>
                                <HealthScorecard ratios={ratios ?? null} />
                            </div>
                        )}
                    </Card>
                </div>

                {/* Nửa dưới (Sức khỏe) - Piotroski bên trái, Altman & DuPont xếp dọc bên phải */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* LEFT COLUMN: Piotroski F-Score */}
                    <Card className="lg:col-span-6 flex flex-col">
                        <SectionHead icon="�" title="Piotroski F-Score" sub="Chấm điểm cơ bản 9 tiêu chí" />
                        <div className="flex-1">
                            {(reportLoading || ratioLoading) && !reportData
                                ? <Skel h="h-48" />
                                : <PiotroskiFScore reportData={reportData ?? null} ratios={ratios ?? null} />
                            }
                        </div>
                    </Card>

                    {/* RIGHT COLUMN: Stacked Altman & DuPont */}
                    <div className="lg:col-span-6 flex flex-col gap-4">
                        <Card className="flex-1 flex flex-col">
                            <SectionHead icon="📐" title="Altman Z-Score" sub="Rủi ro phá sản" />
                            <div className="flex-1 flex items-center justify-center">
                                {(reportLoading || ratioLoading) && !reportData
                                    ? <Skel h="h-48" />
                                    : <AltmanZScoreGauge reportData={reportData ?? null} ratios={ratios ?? null} />
                                }
                            </div>
                        </Card>
                        <Card className="flex-1 flex flex-col">
                            <SectionHead icon="🧮" title="DuPont ROE" sub="Phân rã 5 nhân tố" />
                            <div className="flex-1">
                                {reportLoading && !reportData
                                    ? <Skel h="h-48" />
                                    : <DuPontDecomposition reportData={reportData ?? null} />
                                }
                            </div>
                        </Card>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <Card className="lg:col-span-7">
                        <SectionHead icon="🔄" title="Chu kỳ chuyển đổi tiền mặt" sub="Receivable · Inventory · Payable Days" />
                        {ratioLoading && !ratios
                            ? <Skel h="h-44" />
                            : <CashConversionCycleChart ratios={ratios ?? null} />
                        }
                    </Card>
                    <Card className="lg:col-span-5">
                        <SectionHead icon="💎" title="Phân tích cổ tức" sub="Dividend Yield · EPS" />
                        {ratioLoading && !ratios
                            ? <Skel h="h-44" />
                            : <DividendAnalysis ratios={ratios ?? null} />
                        }
                    </Card>
                </div>
            </div>

            {/* ── PHẦN 3: ĐỊNH GIÁ & THỊ TRƯỜNG (CHƯƠNG 3) ── */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-2 uppercase tracking-wider">
                    <span className="bg-primary/10 text-primary p-1 rounded">2</span>
                    Định giá & Thị trường
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Bên trái (60%): Bội số định giá */}
                    <Card className="lg:col-span-7">
                        <SectionHead icon="💹" title="Bội số định giá" sub="P/E · P/B · EV/EBITDA" />
                        {ratioLoading && !ratios
                            ? <Skel h="h-40" />
                            : <ValuationRatioChart ratios={ratios ?? null} />
                        }
                    </Card>
                    {/* Bên phải (40%): Định giá tổng hợp */}
                    <Card className="lg:col-span-5">
                        <SectionHead icon="🎯" title="Định giá tổng hợp" sub="DCF · DDM · So sánh ngành" />
                        {valuationLoading && !valuationData
                            ? <div className="space-y-2">{Array(4).fill(0).map((_, i) => <Skel key={i} h="h-12" />)}</div>
                            : <ValuationSnapshot valuationData={valuationData ?? null} />
                        }
                    </Card>
                </div>

                <Card>
                    <SectionHead icon="🏢" title="So sánh cùng ngành" sub="Biến động giá và Cấu trúc vốn" />
                    <PeerWidget />
                </Card>
            </div>

            {/* ── PHẦN 4: RỦI RO ĐỊNH LƯỢNG (CHƯƠNG 4) ── */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-2 uppercase tracking-wider">
                    <span className="bg-primary/10 text-primary p-1 rounded">3</span>
                    Rủi ro & Định lượng (Quants)
                </h3>

                {/* Hàng đầu: YTD và Rủi ro */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <Card className="lg:col-span-6">
                        <SectionHead icon="📈" title="Hiệu suất từ đầu năm (YTD)" sub={`${stockInfo.ticker} — Lợi nhuận tích lũy ${new Date().getFullYear()}`} />
                        <YtdPerformance />
                    </Card>
                    <Card className="lg:col-span-6">
                        <SectionHead icon="⚠️" title="Phân tích rủi ro" sub="Quant metrics · VaR · Drawdown" />
                        {quantLoading && !quantData
                            ? <div className="animate-pulse space-y-2">{Array(4).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div>
                            : <QuantSnapshot quantData={quantData ?? null} />
                        }
                    </Card>
                </div>

                {/* Hàng giữa: Drawdown */}
                <Card>
                    <SectionHead icon="📉" title="Biểu đồ Drawdown" sub="Mức sụt giảm từ đỉnh gần nhất" />
                    {quantLoading && !quantData
                        ? <Skel h="h-52" />
                        : <DrawdownChart drawdownData={quantData?.drawdownData} />
                    }
                </Card>

                {/* Hàng cuối: KDE & Histogram */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <Card className="lg:col-span-6">
                        <SectionHead icon="🔬" title="Mật độ nhạy cảm giá" sub="KDE vs Phân phối chuẩn · VaR markers" />
                        <PriceSensitivityDensity />
                    </Card>
                    <Card className="lg:col-span-6">
                        <SectionHead icon="📊" title="Phân phối lợi nhuận ngày" sub="Histogram — thống kê μ, σ, Skew, Kurtosis" />
                        <ReturnHistogram />
                    </Card>
                </div>
            </div>

        </div>
    );
}
