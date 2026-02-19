"use client";

import React, { useState } from "react";
import ReactECharts from "echarts-for-react";
import { MARKET_HEATMAP_DATA } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Color scheme: ceiling (purple) > up (green) > ref (yellow) > down (red) > floor (blue)
const getStockColor = (pChange: number) => {
    if (pChange >= 6.9) return "#c026d3";       // trần - purple
    if (pChange >= 2) return "#16a34a";          // tăng mạnh - dark green
    if (pChange > 0) return "#22c55e";           // tăng - green
    if (pChange === 0) return "#eab308";         // tham chiếu - yellow
    if (pChange > -2) return "#ef4444";          // giảm - red
    if (pChange > -6.9) return "#dc2626";        // giảm mạnh - dark red
    return "#2563eb";                            // sàn - blue
};

const MarketHeatmap = () => {
    const [exchange, setExchange] = useState("HOSE");

    const option = {
        tooltip: {
            formatter: function (info: any) {
                const value = info.value;
                if (!value || value.length < 3) return info.name;
                const treePathInfo = info.treePathInfo;
                const sector = treePathInfo.length >= 2 ? treePathInfo[1].name : "";
                const changeColor = value[1] >= 0 ? "#22c55e" : "#ef4444";
                const sign = value[1] > 0 ? "+" : "";
                return `
                    <div style="padding:4px 2px;min-width:160px">
                        <div style="font-weight:700;font-size:14px;margin-bottom:4px">${info.name}</div>
                        <div style="color:#999;font-size:11px;margin-bottom:6px">${sector}</div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                            <span style="color:#888">Thay đổi</span>
                            <span style="color:${changeColor};font-weight:600">${sign}${value[1]}%</span>
                        </div>
                        <div style="display:flex;justify-content:space-between">
                            <span style="color:#888">Khối lượng</span>
                            <span style="font-weight:500">${(value[2] / 1000000).toFixed(1)}M</span>
                        </div>
                    </div>`;
            },
        },
        series: [
            {
                name: "Market Heatmap",
                type: "treemap",
                roam: false,
                nodeClick: false,
                breadcrumb: { show: false },
                label: {
                    show: true,
                    formatter: "{b}",
                    color: "#1a1a1a",
                    fontSize: 13,
                    fontWeight: "bold",
                },
                upperLabel: {
                    show: true,
                    height: 28,
                    color: "#1a1a1a",
                    fontSize: 13,
                    fontWeight: "bold",
                    borderColor: "transparent",
                },                
                itemStyle: {
                    borderColor: "rgba(255,255,255,0.6)",
                    borderWidth: 1.5,
                    gapWidth: 2,
                },
                levels: [
                    {
                        // Level 0 – sector group header
                        itemStyle: {
                            borderColor: "#fff",
                            borderWidth: 3,
                            gapWidth: 3,
                        },
                        upperLabel: {
                            show: true,
                            height: 30,
                            padding: [4, 8],
                            fontSize: 13,
                            fontWeight: "bold",
                            color: "#1a1a1a",
                            backgroundColor: "rgba(255,255,255,0.6)",
                            borderRadius: [4, 4, 0, 0],
                        },
                    },
                    {
                        // Level 1 – individual stocks
                        itemStyle: {
                            borderColor: "rgba(255,255,255,0.4)",
                            borderWidth: 1,
                            gapWidth: 1,
                        },
                        label: {
                            show: true,
                        },
                    },
                ],
                data: MARKET_HEATMAP_DATA.map((sector) => ({
                    name: sector.name,
                    children: sector.children.map((stock) => ({
                        name: stock.name,
                        value: [stock.value, stock.pChange, stock.volume],
                        itemStyle: {
                            color: getStockColor(stock.pChange),
                        },
                    })),
                })),
            },
        ],
    };

    // Summary stats
    const allStocks = MARKET_HEATMAP_DATA.flatMap((s) => s.children);
    const up = allStocks.filter((s) => s.pChange > 0).length;
    const down = allStocks.filter((s) => s.pChange < 0).length;
    const unchanged = allStocks.filter((s) => s.pChange === 0).length;

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-4">
                    <CardTitle className="text-lg font-bold text-gray-800">
                        Bản đồ thị trường
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                            Tăng: <b className="text-green-600">{up}</b>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                            Giảm: <b className="text-red-600">{down}</b>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />
                            TC: <b className="text-yellow-600">{unchanged}</b>
                        </span>
                    </div>
                </div>
                <Tabs defaultValue="HOSE" className="w-[300px]" onValueChange={setExchange}>
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100">
                        <TabsTrigger value="HOSE" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs">HOSE</TabsTrigger>
                        <TabsTrigger value="HNX" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs">HNX</TabsTrigger>
                        <TabsTrigger value="UPCOM" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs">UPCOM</TabsTrigger>
                        <TabsTrigger value="TONG" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs">TỔNG</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="px-2 pb-2">
                {/* Color legend */}
                <div className="flex items-center justify-center gap-1 mb-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded text-white font-semibold" style={{ background: "#2563eb" }}>Sàn</span>
                    <span className="px-2 py-0.5 rounded text-white font-semibold" style={{ background: "#dc2626" }}>Giảm mạnh</span>
                    <span className="px-2 py-0.5 rounded text-white font-semibold" style={{ background: "#ef4444" }}>Giảm</span>
                    <span className="px-2 py-0.5 rounded text-black font-semibold" style={{ background: "#eab308" }}>TC</span>
                    <span className="px-2 py-0.5 rounded text-black font-semibold" style={{ background: "#22c55e" }}>Tăng</span>
                    <span className="px-2 py-0.5 rounded text-white font-semibold" style={{ background: "#16a34a" }}>Tăng mạnh</span>
                    <span className="px-2 py-0.5 rounded text-white font-semibold" style={{ background: "#c026d3" }}>Trần</span>
                </div>
                <ReactECharts option={option} style={{ height: "520px", width: "100%" }} />
            </CardContent>
        </Card>
    );
};

export default MarketHeatmap;
