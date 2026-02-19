"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { RecommendedStock } from "@/lib/stockDetailMockData";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

interface StockRecommendationCardProps {
    stock: RecommendedStock;
}

const StockRecommendationCard = ({ stock }: StockRecommendationCardProps) => {
    const isPositive = stock.priceChange >= 0;

    // Mini area chart - no axes, gradient fill
    const chartOption = {
        grid: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
        },
        xAxis: {
            type: "category",
            show: false,
            data: stock.chartData.map((_, i) => i),
        },
        yAxis: {
            type: "value",
            show: false,
            min: Math.min(...stock.chartData) * 0.95,
            max: Math.max(...stock.chartData) * 1.05,
        },
        series: [
            {
                type: "line",
                data: stock.chartData,
                smooth: true,
                symbol: "none",
                lineStyle: {
                    color: isPositive ? "#00C076" : "#EF4444",
                    width: 1.5,
                },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: isPositive ? "rgba(0, 192, 118, 0.3)" : "rgba(239, 68, 68, 0.3)" },
                            { offset: 1, color: isPositive ? "rgba(0, 192, 118, 0.02)" : "rgba(239, 68, 68, 0.02)" },
                        ],
                    },
                },
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group flex flex-col">
            {/* Header */}
            <div className="p-3 pb-2 flex-shrink-0">
                <div className="flex items-start gap-2">
                    {/* Logo */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs ${isPositive ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-gradient-to-br from-gray-500 to-gray-700'
                        }`}>
                        {stock.ticker.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                                {stock.ticker}
                            </span>
                            <span className="text-[10px] text-gray-400">({stock.exchange})</span>
                            {stock.isFavorite && (
                                <Star className="w-3.5 h-3.5 text-amber-500" fill="currentColor" />
                            )}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{stock.companyName}</p>
                    </div>
                </div>

                {/* Price Row */}
                <div className="flex items-baseline gap-2 mt-2">
                    <span
                        className={`text-xl font-bold font-[var(--font-roboto-mono)] ${isPositive ? "text-[#00C076]" : "text-[#EF4444]"
                            }`}
                    >
                        {stock.price.toLocaleString()}
                    </span>
                    <span
                        className={`text-xs font-medium font-[var(--font-roboto-mono)] ${isPositive ? "text-[#00C076]" : "text-[#EF4444]"
                            }`}
                    >
                        {isPositive ? "+" : ""}
                        {stock.priceChange.toLocaleString()}
                    </span>
                    <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isPositive ? "bg-green-50 text-[#00C076]" : "bg-red-50 text-[#EF4444]"
                            }`}
                    >
                        {isPositive ? "+" : ""}
                        {stock.priceChangePercent.toFixed(2)}%
                    </span>
                </div>
            </div>

            {/* Mini Chart */}
            <div className="h-14 flex-shrink-0">
                <ReactECharts
                    option={chartOption}
                    style={{ height: "100%", width: "100%" }}
                    opts={{ renderer: "svg" }}
                />
            </div>

            {/* Footer Stats */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 bg-gray-50/50 text-center flex-shrink-0">
                <StatItem label="Vốn hóa" value={stock.marketCap} />
                <StatItem label="Khối lượng giao dịch" value={stock.volume} />
                <StatItem label="P/E" value={stock.pe} />
            </div>
        </Card>
    );
};

const StatItem = ({ label, value }: { label: string; value: string }) => (
    <div className="py-2 px-1">
        <div className="text-[9px] text-gray-400 truncate">{label}</div>
        <div className="text-[11px] font-semibold text-gray-700 font-[var(--font-roboto-mono)]">
            {value}
        </div>
    </div>
);

export default StockRecommendationCard;
