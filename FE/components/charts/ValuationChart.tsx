"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PE_DATA = [
    { month: "T1", value: 14.2 },
    { month: "T2", value: 14.5 },
    { month: "T3", value: 15.1 },
    { month: "T4", value: 14.8 },
    { month: "T5", value: 15.3 },
    { month: "T6", value: 15.8 },
    { month: "T7", value: 15.2 },
    { month: "T8", value: 14.9 },
    { month: "T9", value: 15.5 },
    { month: "T10", value: 16.1 },
    { month: "T11", value: 16.5 },
    { month: "T12", value: 16.2 },
];

export const ValuationChart = () => {
    const option = {
        tooltip: { trigger: "axis" },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: { type: "category", data: PE_DATA.map((d) => d.month) },
        yAxis: { type: "value", min: 13, max: 18 },
        series: [
            {
                name: "P/E",
                type: "line",
                data: PE_DATA.map((d) => d.value),
                smooth: true,
                lineStyle: { color: "#f97316", width: 2 },
                itemStyle: { color: "#f97316" },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(249, 115, 22, 0.3)" },
                            { offset: 1, color: "rgba(249, 115, 22, 0.02)" },
                        ],
                    },
                },
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200 h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-gray-800">P/E VN-Index</CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
                <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
            </CardContent>
        </Card>
    );
};

export default ValuationChart;
