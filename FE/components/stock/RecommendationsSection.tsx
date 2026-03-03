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
            <div className="h-[80px] flex items-center justify-center text-xs text-gray-300">
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
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-200 flex flex-col h-full">
                {/* Info: ticker name + price + change */}
                <div className="px-3 pt-3">
                    {/* Ticker row */}
                    <div className="flex items-center gap-2 mb-1.5">
                        <img
                            src={stock.logoUrl}
                            alt={stock.ticker}
                            className="w-6 h-6 rounded-full border border-gray-200 object-cover bg-gray-100"
                            onError={(e) => {
                                const el = e.currentTarget as HTMLImageElement;
                                el.style.display = "none";
                                const fb = el.nextElementSibling as HTMLElement;
                                if (fb) fb.style.display = "flex";
                            }}
                        />
                        <div
                            className="w-6 h-6 rounded-full bg-blue-600 text-white items-center justify-center text-[10px] font-bold hidden"
                        >
                            {stock.ticker.charAt(0)}
                        </div>
                        <span className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                            {stock.ticker}
                        </span>
                    </div>

                    {/* Price */}
                    <div className={`text-base font-bold tabular-nums ${positive ? "text-[#25B770]" : "text-[#EF4444]"}`}>
                        {stock.price.toLocaleString("vi-VN")}
                    </div>

                    {/* Change (below price) */}
                    <div className="flex items-center gap-1.5 mt-1">
                        {positive ? (
                            <TrendingUp className="w-3 h-3 text-[#25B770]" />
                        ) : (
                            <TrendingDown className="w-3 h-3 text-[#EF4444]" />
                        )}
                        <span className={`text-xs font-medium tabular-nums ${positive ? "text-[#25B770]" : "text-[#EF4444]"}`}>
                            {positive ? "+" : ""}{stock.priceChange.toLocaleString("vi-VN")}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            positive ? "bg-green-50 text-[#25B770]" : "bg-red-50 text-[#EF4444]"
                        }`}>
                            {positive ? "+" : ""}{stock.priceChangePercent.toFixed(2)}%
                        </span>
                    </div>
                </div>

                {/* Spacer */}
                <div className="h-3" />

                {/* Chart area */}
                <div className="px-2 pb-3">
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
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
                Không có gợi ý.
            </div>
        );
    }

    const items = recommendations.slice(0, 4);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((stock: RecommendedStock) => (
                <RecommendationCard key={stock.ticker} stock={stock} />
            ))}
        </div>
    );
};

export default RecommendationsSection;
