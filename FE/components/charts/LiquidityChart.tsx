"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LIQUIDITY_DATA = [
    { date: "16/01", value: 18500 },
    { date: "17/01", value: 22300 },
    { date: "18/01", value: 19800 },
    { date: "19/01", value: 25400 },
    { date: "20/01", value: 21200 },
    { date: "21/01", value: 23800 },
    { date: "22/01", value: 28500 },
    { date: "23/01", value: 26200 },
];

export const LiquidityChart = () => {
    const option = {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: { type: "category", data: LIQUIDITY_DATA.map((d) => d.date) },
        yAxis: {
            type: "value",
            axisLabel: { formatter: (val: number) => `${(val / 1000).toFixed(0)}K` }
        },
        series: [
            {
                name: "GTGD (tỷ)",
                type: "bar",
                data: LIQUIDITY_DATA.map((d) => d.value),
                itemStyle: {
                    color: {
                        type: "linear",
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: "#22c55e" },
                            { offset: 1, color: "#16a34a" },
                        ],
                    },
                },
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200 h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-gray-800">Thanh khoản thị trường</CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
                <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
            </CardContent>
        </Card>
    );
};

export default LiquidityChart;
