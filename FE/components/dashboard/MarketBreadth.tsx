"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const MarketBreadth = () => {
    const advancing = 245;
    const declining = 187;
    const unchanged = 68;
    const total = advancing + declining + unchanged;

    const option = {
        tooltip: {
            trigger: "item",
            formatter: (params: any) =>
                `<b>${params.name}</b><br/>Số mã: <b>${params.value}</b><br/>Tỷ lệ: <b>${params.percent}%</b>`,
        },
        legend: {
            bottom: 0,
            itemWidth: 12,
            itemHeight: 12,
            textStyle: { fontSize: 13, color: "#555" },
        },
        graphic: [
            {
                type: "text",
                left: "center",
                top: "38%",
                style: {
                    text: `${total}`,
                    fontSize: 32,
                    fontWeight: "bold",
                    fill: "#1f2937",
                    textAlign: "center",
                },
            },
            {
                type: "text",
                left: "center",
                top: "50%",
                style: {
                    text: "Tổng mã",
                    fontSize: 13,
                    fill: "#9ca3af",
                    textAlign: "center",
                },
            },
        ],
        series: [
            {
                type: "pie",
                radius: ["55%", "80%"],
                center: ["50%", "45%"],
                avoidLabelOverlap: false,
                padAngle: 3,
                itemStyle: { borderRadius: 6 },
                label: { show: false },
                emphasis: {
                    scale: true,
                    scaleSize: 6,
                    itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0, 0, 0, 0.15)" },
                },
                labelLine: { show: false },
                data: [
                    { value: advancing, name: "Tăng", itemStyle: { color: "#22c55e" } },
                    { value: unchanged, name: "Đứng giá", itemStyle: { color: "#eab308" } },
                    { value: declining, name: "Giảm", itemStyle: { color: "#ef4444" } },
                ],
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200 h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-gray-800">Độ rộng thị trường</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-60px)]">
                <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
            </CardContent>
        </Card>
    );
};

export default MarketBreadth;
