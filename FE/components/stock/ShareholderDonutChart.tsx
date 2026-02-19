"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";

const ShareholderDonutChart = () => {
    const { shareholderStructure: SHAREHOLDER_STRUCTURE } = useStockDetail();
    // 4 segments as per specification
    const option = {
        tooltip: {
            trigger: "item",
            formatter: "{b}: {c}%",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            textStyle: {
                color: "#374151",
                fontSize: 11,
            },
        },
        legend: {
            show: false,
        },
        series: [
            {
                name: "Cơ cấu cổ đông",
                type: "pie",
                radius: ["55%", "78%"],
                center: ["50%", "50%"],
                avoidLabelOverlap: false,
                label: {
                    show: true,
                    position: "center",
                    formatter: () => `{a|${SHAREHOLDER_STRUCTURE.domestic}%}`,
                    rich: {
                        a: {
                            fontSize: 20,
                            fontWeight: "bold",
                            color: "#1f2937",
                            fontFamily: "Roboto Mono, monospace",
                        },
                    },
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 18,
                        fontWeight: "bold",
                    },
                },
                labelLine: {
                    show: false,
                },
                data: [
                    {
                        value: SHAREHOLDER_STRUCTURE.domestic,
                        name: "Cổ đông thông thường",
                        itemStyle: { color: "#F59E0B" }, // Orange
                    },
                    {
                        value: SHAREHOLDER_STRUCTURE.strategic,
                        name: "Cổ đông chiến lược",
                        itemStyle: { color: "#2563EB" }, // Blue
                    },
                    {
                        value: SHAREHOLDER_STRUCTURE.individual,
                        name: "Cá nhân",
                        itemStyle: { color: "#10B981" }, // Green
                    },
                ],
            },
        ],
    };

    return (
        <div className="flex flex-col items-center w-full">
            {/* Chart */}
            <ReactECharts
                option={option}
                style={{ height: "320px", width: "100%" }}
                opts={{ renderer: "svg" }}
            />

            {/* Legend */}
            <div className="flex flex-col gap-2 mt-3 text-sm w-full max-w-xs">
                <LegendItem
                    color="#F59E0B"
                    label="Cổ đông thông thường"
                    value={`${SHAREHOLDER_STRUCTURE.domestic}%`}
                />
                <LegendItem
                    color="#2563EB"
                    label="Cổ đông chiến lược"
                    value={`${SHAREHOLDER_STRUCTURE.strategic}%`}
                />
                <LegendItem
                    color="#10B981"
                    label="Cá nhân"
                    value={`${SHAREHOLDER_STRUCTURE.individual}%`}
                />
            </div>
        </div>
    );
};

const LegendItem = ({ color, label, value }: { color: string; label: string; value: string }) => (
    <div className="flex items-center gap-2">
        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-gray-600 flex-1">{label}</span>
        <span className="font-semibold text-gray-800 font-[var(--font-roboto-mono)]">{value}</span>
    </div>
);

export default ShareholderDonutChart;
