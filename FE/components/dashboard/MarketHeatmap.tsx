"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { MARKET_HEATMAP_DATA } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as echarts from "echarts";

// Define which sectors belong to which exchange
const EXCHANGE_MAP: Record<string, string[]> = {
    all: [],
    HOSE: ["Ngân hàng", "Bất động sản", "Thép", "Chứng khoán"],
    HNX: ["Ngân hàng", "Chứng khoán"],
    UPCOM: ["Bất động sản", "Thép"],
};

export const MarketHeatmap = () => {
    const [exchange, setExchange] = useState("all");

    const filteredData = useMemo(() => {
        if (exchange === "all") return MARKET_HEATMAP_DATA;
        const allowedSectors = EXCHANGE_MAP[exchange] || [];
        return MARKET_HEATMAP_DATA.filter((s) => allowedSectors.includes(s.name));
    }, [exchange]);

    const option = {
        tooltip: {
            formatter: function (info: any) {
                const value = info.value;
                const treePathInfo = info.treePathInfo;
                const treePath = [];
                for (let i = 1; i < treePathInfo.length; i++) {
                    treePath.push(treePathInfo[i].name);
                }
                const change = value[1];
                const changeColor = change > 0 ? "#22c55e" : change < 0 ? "#ef4444" : "#eab308";
                return `<b>${echarts.format.encodeHTML(treePath.join(" / "))}</b><br/>Thay đổi: <span style="color:${changeColor};font-weight:bold">${change > 0 ? "+" : ""}${change}%</span><br/>Vốn hóa: <b>${value[0].toLocaleString()}</b>`;
            },
        },
        series: [
            {
                name: "Market Heatmap",
                type: "treemap",
                visibleMin: 300,
                label: {
                    show: true,
                    formatter: (params: any) => {
                        const change = params.value[1];
                        return `${params.name}\n${change > 0 ? "+" : ""}${change}%`;
                    },
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: "bold",
                },
                itemStyle: {
                    borderColor: "#fff",
                    borderWidth: 1,
                    gapWidth: 1,
                },
                data: filteredData.map((sector) => ({
                    name: sector.name,
                    children: sector.children.map((stock) => ({
                        name: stock.name,
                        value: [stock.value, stock.pChange, stock.volume],
                        itemStyle: {
                            color:
                                stock.pChange > 0
                                    ? "#22c55e"
                                    : stock.pChange < 0
                                        ? "#ef4444"
                                        : "#eab308",
                        },
                    })),
                })),
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200 h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-100">
                <CardTitle className="text-lg font-bold text-gray-800">Cấu trúc thị trường</CardTitle>
                <Tabs value={exchange} onValueChange={setExchange} className="w-auto">
                    <TabsList className="h-8 bg-gray-100">
                        <TabsTrigger value="all" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">Tất cả</TabsTrigger>
                        <TabsTrigger value="HOSE" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">HOSE</TabsTrigger>
                        <TabsTrigger value="HNX" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">HNX</TabsTrigger>
                        <TabsTrigger value="UPCOM" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">UPCOM</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="h-[480px]">
                <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge={true} />
            </CardContent>
        </Card>
    );
};

export default MarketHeatmap;
