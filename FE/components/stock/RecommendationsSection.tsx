"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useStockDetail } from "@/lib/StockDetailContext";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { RecommendedStock } from "@/hooks/useStockData";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

/* ── Sparkline chart (6 months) ── */
function SparklineChart({ data, positive }: { data: number[]; positive: boolean }) {
    const option = useMemo(() => {
        const color = positive ? "#25B770" : "#EF4444";
        const gradientTop = positive ? "rgba(37,183,112,0.25)" : "rgba(239,68,68,0.18)";
        const gradientBottom = positive ? "rgba(37,183,112,0.02)" : "rgba(239,68,68,0.02)";
        return {
            grid: { top: 6, right: 0, bottom: 2, left: 0 },
            xAxis: { type: "category" as const, show: false, data: data.map((_, i) => i) },
            yAxis: { type: "value" as const, show: false, min: "dataMin", max: "dataMax" },
            tooltip: {
                trigger: "axis" as const,
                formatter: (params: any) => {
                    const v = params?.[0]?.value;
                    return v != null
                        ? `<span style="font-weight:600">${Number(v).toLocaleString("vi-VN")}</span>`
                        : "";
                },
                backgroundColor: "#fff",
                borderColor: "#e5e7eb",
                borderWidth: 1,
                textStyle: { fontSize: 11, color: "#374151" },
                padding: [4, 8],
            },
            series: [
                {
                    type: "line" as const,
                    data,
                    smooth: true,
                    symbol: "none",
                    lineStyle: { width: 1.5, color },
                    areaStyle: {
                        color: {
                            type: "linear" as const,
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: gradientTop },
                                { offset: 1, color: gradientBottom },
                            ],
                        },
                    },
                },
            ],
        };
    }, [data, positive]);

    if (!data.length) {
        return (
            <div className="h-[80px] flex items-center justify-center text-xs text-muted-foreground/50">
                Chưa có dữ liệu
            </div>
        );
    }

    return <ReactECharts option={option} style={{ height: 80, width: "100%" }} opts={{ renderer: "svg" }} />;
}

/* ── Single recommendation card: chart on top, info below ── */
function RecommendationCard({ stock }: { stock: RecommendedStock }) {
    const positive = stock.priceChange >= 0;
    return (
        <Link href={`/stock/${stock.ticker}`} className="block">
            <div className="group rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-sm overflow-hidden shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_30px_rgba(15,23,42,0.16)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full">
                {/* Info: ticker name + price + change */}
                <div className="px-4 pt-4">
                    {/* Ticker row */}
                    <div className="flex items-center gap-2.5 mb-2">
                        <img
                            src={stock.logoUrl}
                            alt={stock.ticker}
                            className="w-7 h-7 rounded-full border border-slate-200 object-cover bg-slate-100"
                            onError={(e) => {
                                const el = e.currentTarget as HTMLImageElement;
                                el.style.display = "none";
                                const fb = el.nextElementSibling as HTMLElement;
                                if (fb) fb.style.display = "flex";
                            }}
                        />
                        <div
                            className="w-7 h-7 rounded-full bg-sky-600 text-white items-center justify-center text-[10px] font-bold hidden"
                        >
                            {stock.ticker.charAt(0)}
                        </div>
                        <span className="font-bold text-sm text-slate-900 group-hover:text-sky-700 transition-colors">
                            {stock.ticker}
                        </span>
                    </div>

                    {/* Price */}
                    <div className={`text-lg font-extrabold tabular-nums tracking-tight ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                        {stock.price.toLocaleString("vi-VN")}
                    </div>

                    {/* Change (below price) */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                        {positive ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span className={`text-xs font-semibold tabular-nums ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                            {positive ? "+" : ""}{stock.priceChange.toLocaleString("vi-VN")}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        }`}>
                            {positive ? "+" : ""}{stock.priceChangePercent.toFixed(2)}%
                        </span>
                    </div>
                </div>

                {/* Spacer */}
                <div className="h-4" />

                {/* Chart area */}
                <div className="px-3 pb-3 bg-gradient-to-b from-white to-slate-50/80 border-t border-slate-100">
                    <SparklineChart data={stock.chartData} positive={positive} />
                </div>
            </div>
        </Link>
    );
}

/* ── Main section: 4 columns, no slider ── */
const RecommendationsSection = () => {
    const { recommendations } = useStockDetail();

    if (!recommendations.length) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Không có gợi ý.
            </div>
        );
    }

    const items = recommendations.slice(0, 4);

    return (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50/60 p-4 sm:p-5">
            <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-sky-200/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-10 h-52 w-52 rounded-full bg-emerald-200/20 blur-3xl" />

            <div className="relative mb-4 sm:mb-5">
                <p className="text-[11px] sm:text-xs uppercase tracking-[0.16em] text-slate-500 font-semibold">Gợi ý cùng nhịp thị trường</p>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 mt-1 leading-relaxed">Các mã có thanh khoản cao và xu hướng giá đáng chú ý</h3>
            </div>

            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((stock: RecommendedStock) => (
                    <RecommendationCard key={stock.ticker} stock={stock} />
                ))}
            </div>
        </div>
    );
};

export default RecommendationsSection;
