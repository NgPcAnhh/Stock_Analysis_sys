"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTOR_DATA = [
    { name: "Ngân hàng", value: 1.25 },
    { name: "BĐS", value: -0.85 },
    { name: "Thép", value: 2.15 },
    { name: "Chứng khoán", value: 0.65 },
    { name: "Dầu khí", value: -1.35 },
    { name: "Công nghệ", value: 3.25 },
];

export const SectorPerformance = () => {
    const option = {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: { type: "category", data: SECTOR_DATA.map((s) => s.name) },
        yAxis: { type: "value" },
        series: [
            {
                data: SECTOR_DATA.map((s) => ({
                    value: s.value,
                    itemStyle: { color: s.value >= 0 ? "#22c55e" : "#ef4444" },
                })),
                type: "bar",
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200 h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-gray-800">Biến động ngành</CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
                <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
            </CardContent>
        </Card>
    );
};

export default SectorPerformance;
