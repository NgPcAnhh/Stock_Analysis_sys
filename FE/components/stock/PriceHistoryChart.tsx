"use client";

import React, { useState } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Star,
    Bell,
    GitCompare,
    Pencil,
    Settings,
    Maximize2,
    TrendingUp,
    CandlestickChart,
    BarChart3,
    LineChart,
} from "lucide-react";

const PriceHistoryChart = () => {
    const { priceHistory: PRICE_HISTORY } = useStockDetail();
    const [timeframe, setTimeframe] = useState("1Y");
    const [chartType, setChartType] = useState<"line" | "candle">("line");

    const timeframes = ["1D", "1M", "3M", "1Y", "5Y", "Tất cả"];

    // Prepare data for chart
    const dates = PRICE_HISTORY.map((item) => {
        const d = new Date(item.date);
        return `Tháng ${d.getMonth() + 1}`;
    });
    const closePrices = PRICE_HISTORY.map((item) => item.close);
    const candlestickData = PRICE_HISTORY.map((item) => [item.open, item.close, item.low, item.high]);
    const volumeData = PRICE_HISTORY.map((item) => item.volume);
    const volumeColors = PRICE_HISTORY.map((item) =>
        item.close >= item.open ? "rgba(0, 192, 118, 0.5)" : "rgba(239, 68, 68, 0.5)"
    );

    const lineChartOption = {
        tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            textStyle: {
                color: "#374151",
                fontSize: 13,
            },
            formatter: function (params: any) {
                const idx = params[0].dataIndex;
                const data = PRICE_HISTORY[idx];
                return `
          <div style="font-family: 'Roboto Mono', monospace; padding: 2px; font-size: 13px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${data.date}</div>
            <div>Mở: <b>${data.open.toLocaleString()}</b></div>
            <div>Cao: <b style="color: #00C076;">${data.high.toLocaleString()}</b></div>
            <div>Thấp: <b style="color: #EF4444;">${data.low.toLocaleString()}</b></div>
            <div>Đóng: <b>${data.close.toLocaleString()}</b></div>
            <div>KL: <b>${data.volume.toLocaleString()}</b></div>
          </div>
        `;
            },
        },
        grid: {
            left: "1%",
            right: "8%",
            bottom: "5%",
            top: "5%",
            containLabel: true,
        },
        xAxis: {
            type: "category",
            data: dates,
            boundaryGap: false,
            axisLine: { lineStyle: { color: "#e5e7eb" } },
            axisLabel: {
                color: "#6b7280",
                fontSize: 12,
                interval: 30,
            },
            splitLine: { show: false },
        },
        yAxis: {
            type: "value",
            position: "right",
            scale: true,
            axisLine: { show: false },
            axisLabel: {
                color: "#6b7280",
                fontSize: 12,
                formatter: (value: number) => value.toLocaleString(),
            },
            splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
        },
        dataZoom: [
            {
                type: "inside",
                xAxisIndex: 0,
                start: 0,
                end: 100,
                zoomOnMouseWheel: true,
                moveOnMouseMove: true,
                moveOnMouseWheel: false,
            },
            {
                type: "inside",
                yAxisIndex: 0,
                zoomOnMouseWheel: false,
                moveOnMouseMove: false,
            },
        ],
        series: [
            {
                name: "Giá",
                type: "line",
                data: closePrices,
                smooth: true,
                symbol: "none",
                lineStyle: {
                    color: "#00C076",
                    width: 2,
                },
                areaStyle: {
                    color: {
                        type: "linear",
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(0, 192, 118, 0.35)" },
                            { offset: 1, color: "rgba(0, 192, 118, 0.02)" },
                        ],
                    },
                },
            },
        ],
    };

    const candleChartOption = {
        tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderColor: "#e5e7eb",
            borderWidth: 1,
            textStyle: {
                color: "#374151",
                fontSize: 13,
            },
            formatter: function (params: any) {
                const idx = params[0].dataIndex;
                const data = PRICE_HISTORY[idx];
                return `
          <div style="font-family: 'Roboto Mono', monospace; padding: 2px; font-size: 13px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${data.date}</div>
            <div>Mở: <b>${data.open.toLocaleString()}</b></div>
            <div>Cao: <b style="color: #00C076;">${data.high.toLocaleString()}</b></div>
            <div>Thấp: <b style="color: #EF4444;">${data.low.toLocaleString()}</b></div>
            <div>Đóng: <b>${data.close.toLocaleString()}</b></div>
            <div>KL: <b>${data.volume.toLocaleString()}</b></div>
          </div>
        `;
            },
        },
        grid: [
            {
                left: "1%",
                right: "8%",
                top: "5%",
                height: "58%",
                containLabel: true,
            },
            {
                left: "1%",
                right: "8%",
                top: "70%",
                height: "22%",
                containLabel: true,
            },
        ],
        xAxis: [
            {
                type: "category",
                data: dates,
                boundaryGap: true,
                axisLine: { lineStyle: { color: "#e5e7eb" } },
                axisLabel: {
                    color: "#6b7280",
                    fontSize: 12,
                    interval: 30,
                },
                splitLine: { show: false },
            },
            {
                type: "category",
                gridIndex: 1,
                data: dates,
                boundaryGap: true,
                axisLine: { lineStyle: { color: "#e5e7eb" } },
                axisLabel: { show: false },
                splitLine: { show: false },
            },
        ],
        yAxis: [
            {
                type: "value",
                position: "right",
                scale: true,
                axisLine: { show: false },
                axisLabel: {
                    color: "#6b7280",
                    fontSize: 12,
                    formatter: (value: number) => value.toLocaleString(),
                },
                splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
            },
            {
                type: "value",
                gridIndex: 1,
                position: "right",
                scale: true,
                axisLine: { show: false },
                axisLabel: {
                    color: "#6b7280",
                    fontSize: 10,
                    formatter: (value: number) => (value / 1000000).toFixed(1) + "M",
                },
                splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
            },
        ],
        dataZoom: [
            {
                type: "inside",
                xAxisIndex: [0, 1],
                start: 0,
                end: 100,
                zoomOnMouseWheel: true,
                moveOnMouseMove: true,
                moveOnMouseWheel: false,
            },
            {
                type: "inside",
                yAxisIndex: [0],
                zoomOnMouseWheel: false,
                moveOnMouseMove: false,
            },
        ],
        series: [
            {
                name: "Candlestick",
                type: "candlestick",
                data: candlestickData,
                xAxisIndex: 0,
                yAxisIndex: 0,
                itemStyle: {
                    color: "#00C076",
                    color0: "#EF4444",
                    borderColor: "#00C076",
                    borderColor0: "#EF4444",
                },
            },
            {
                name: "Volume",
                type: "bar",
                xAxisIndex: 1,
                yAxisIndex: 1,
                data: volumeData.map((v, i) => ({
                    value: v,
                    itemStyle: { color: volumeColors[i] },
                })),
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200 h-full flex flex-col">
            <CardHeader className="pb-2 pt-3 px-4">
                {/* Row 1: Title + Chart Type Toggle */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-lg font-bold text-gray-800">
                            Biểu đồ giá
                        </CardTitle>

                        {/* Chart Type Toggle */}
                        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setChartType("line")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === "line"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <LineChart className="w-3.5 h-3.5" />
                                Line
                            </button>
                            <button
                                onClick={() => setChartType("candle")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === "candle"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <CandlestickChart className="w-3.5 h-3.5" />
                                Candlestick
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Timeframe Pills */}
                        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                            {timeframes.map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${timeframe === tf
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>

                        {/* Toolbar Icons */}
                        <div className="flex items-center gap-0.5 border-l border-gray-200 pl-2">
                            <ToolbarButton icon={<Star className="w-3.5 h-3.5" />} />
                            <ToolbarButton icon={<Bell className="w-3.5 h-3.5" />} />
                            <ToolbarButton icon={<GitCompare className="w-3.5 h-3.5" />} />
                            <ToolbarButton icon={<Pencil className="w-3.5 h-3.5" />} />
                            <ToolbarButton icon={<Settings className="w-3.5 h-3.5" />} />
                            <ToolbarButton icon={<Maximize2 className="w-3.5 h-3.5" />} />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-2 flex-1">
                {chartType === "line" ? (
                    <ReactECharts
                        option={lineChartOption}
                        style={{ height: "400px", width: "100%" }}
                        notMerge={true}
                    />
                ) : (
                    <ReactECharts
                        option={candleChartOption}
                        style={{ height: "400px", width: "100%" }}
                        notMerge={true}
                    />
                )}
            </CardContent>
        </Card>
    );
};

const ToolbarButton = ({ icon }: { icon: React.ReactNode }) => (
    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
        {icon}
    </button>
);

export default PriceHistoryChart;
