"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { usePriceHistory, type PriceHistoryPeriod, type PriceHistoryItem } from "@/hooks/useStockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Star,
    Bell,
    GitCompare,
    Pencil,
    Settings,
    Maximize2,
    LineChart,
    CandlestickChart,
} from "lucide-react";

/* Period UI labels */
const PERIODS: { label: string; value: PriceHistoryPeriod }[] = [
    { label: "1D", value: "1D" },
    { label: "1W", value: "1W" },
    { label: "1M", value: "1M" },
    { label: "3M", value: "3M" },
    { label: "6M", value: "6M" },
    { label: "1Y", value: "1Y" },
    { label: "5Y", value: "5Y" },
    { label: "Tất cả", value: "ALL" },
];

/* Smart date label depending on period */
function formatDateLabel(dateStr: string, period: PriceHistoryPeriod): string {
    const d = new Date(dateStr);
    if (period === "1D" || period === "1W") {
        return `${d.getDate()}/${d.getMonth() + 1}`;
    }
    if (period === "1M" || period === "3M") {
        return `${d.getDate()}/${d.getMonth() + 1}`;
    }
    if (period === "6M" || period === "1Y") {
        return `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
    }
    // 5Y, ALL
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

/* Compute reasonable axis label interval */
function computeInterval(count: number): number {
    if (count <= 30) return 0;
    if (count <= 100) return Math.floor(count / 10);
    if (count <= 400) return Math.floor(count / 12);
    return Math.floor(count / 15);
}

const PriceHistoryChart = () => {
    const { ticker, priceHistory: contextHistory } = useStockDetail();
    const [period, setPeriod] = useState<PriceHistoryPeriod>("1Y");
    const [chartType, setChartType] = useState<"line" | "candle">("line");

    /* Fetch price data for the selected period */
    const { data: apiData, loading } = usePriceHistory(ticker, period);

    /* Use API data when available, context data as initial fallback */
    const priceData: PriceHistoryItem[] = useMemo(
        () => apiData ?? contextHistory ?? [],
        [apiData, contextHistory],
    );

    /* Derived chart arrays — memoized for performance */
    const { dates, closePrices, candlestickData, volumeData, volumeColors } = useMemo(() => {
        const d = priceData.map((item) => formatDateLabel(item.date, period));
        const c = priceData.map((item) => item.close);
        const cd = priceData.map((item) => [item.open, item.close, item.low, item.high]);
        const v = priceData.map((item) => item.volume);
        const vc = priceData.map((item) =>
            item.close >= item.open ? "rgba(0, 192, 118, 0.5)" : "rgba(239, 68, 68, 0.5)"
        );
        return { dates: d, closePrices: c, candlestickData: cd, volumeData: v, volumeColors: vc };
    }, [priceData, period]);

    const axisInterval = useMemo(() => computeInterval(dates.length), [dates.length]);

    /* Tooltip formatter shared by both chart types */
    const tooltipFormatter = (params: any) => {
        const idx = params[0]?.dataIndex ?? 0;
        const item = priceData[idx];
        if (!item) return "";
        return `
            <div style="font-family: 'Roboto Mono', monospace; padding: 2px; font-size: 13px;">
                <div style="font-weight: bold; margin-bottom: 4px;">${item.date}</div>
                <div>Mở: <b>${item.open.toLocaleString()}</b></div>
                <div>Cao: <b style="color: #00C076;">${item.high.toLocaleString()}</b></div>
                <div>Thấp: <b style="color: #EF4444;">${item.low.toLocaleString()}</b></div>
                <div>Đóng: <b>${item.close.toLocaleString()}</b></div>
                <div>KL: <b>${item.volume.toLocaleString()}</b></div>
            </div>`;
    };

    const lineChartOption = useMemo(
        () => ({
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderColor: "#e5e7eb",
                borderWidth: 1,
                textStyle: { color: "#374151", fontSize: 13 },
                formatter: tooltipFormatter,
            },
            grid: { left: "1%", right: "8%", bottom: "5%", top: "5%", containLabel: true },
            xAxis: {
                type: "category",
                data: dates,
                boundaryGap: false,
                axisLine: { lineStyle: { color: "#e5e7eb" } },
                axisLabel: { color: "#6b7280", fontSize: 12, interval: axisInterval },
                splitLine: { show: false },
            },
            yAxis: {
                type: "value",
                position: "right",
                scale: true,
                axisLine: { show: false },
                axisLabel: { color: "#6b7280", fontSize: 12, formatter: (v: number) => v.toLocaleString() },
                splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
            },
            dataZoom: [
                { type: "inside", xAxisIndex: 0, start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false },
                { type: "inside", yAxisIndex: 0, zoomOnMouseWheel: false, moveOnMouseMove: false },
            ],
            series: [
                {
                    name: "Giá",
                    type: "line",
                    data: closePrices,
                    smooth: true,
                    symbol: "none",
                    lineStyle: { color: "#00C076", width: 2 },
                    areaStyle: {
                        color: {
                            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: "rgba(0, 192, 118, 0.35)" },
                                { offset: 1, color: "rgba(0, 192, 118, 0.02)" },
                            ],
                        },
                    },
                },
            ],
        }),
        [dates, closePrices, axisInterval],
    );

    const candleChartOption = useMemo(
        () => ({
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderColor: "#e5e7eb",
                borderWidth: 1,
                textStyle: { color: "#374151", fontSize: 13 },
                formatter: tooltipFormatter,
            },
            grid: [
                { left: "1%", right: "8%", top: "5%", height: "58%", containLabel: true },
                { left: "1%", right: "8%", top: "70%", height: "22%", containLabel: true },
            ],
            xAxis: [
                {
                    type: "category", data: dates, boundaryGap: true,
                    axisLine: { lineStyle: { color: "#e5e7eb" } },
                    axisLabel: { color: "#6b7280", fontSize: 12, interval: axisInterval },
                    splitLine: { show: false },
                },
                {
                    type: "category", gridIndex: 1, data: dates, boundaryGap: true,
                    axisLine: { lineStyle: { color: "#e5e7eb" } },
                    axisLabel: { show: false },
                    splitLine: { show: false },
                },
            ],
            yAxis: [
                {
                    type: "value", position: "right", scale: true,
                    axisLine: { show: false },
                    axisLabel: { color: "#6b7280", fontSize: 12, formatter: (v: number) => v.toLocaleString() },
                    splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
                },
                {
                    type: "value", gridIndex: 1, position: "right", scale: true,
                    axisLine: { show: false },
                    axisLabel: { color: "#6b7280", fontSize: 10, formatter: (v: number) => (v / 1000000).toFixed(1) + "M" },
                    splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
                },
            ],
            dataZoom: [
                { type: "inside", xAxisIndex: [0, 1], start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true, moveOnMouseWheel: false },
                { type: "inside", yAxisIndex: [0], zoomOnMouseWheel: false, moveOnMouseMove: false },
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
        }),
        [dates, candlestickData, volumeData, volumeColors, axisInterval],
    );

    return (
        <Card className="shadow-sm border-border h-full flex flex-col">
            <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-lg font-bold text-foreground">
                            Biểu đồ giá
                        </CardTitle>
                        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                            <button
                                onClick={() => setChartType("line")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === "line" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <LineChart className="w-3.5 h-3.5" />
                                Line
                            </button>
                            <button
                                onClick={() => setChartType("candle")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === "candle" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <CandlestickChart className="w-3.5 h-3.5" />
                                Candlestick
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Period Pills */}
                        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                            {PERIODS.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPeriod(p.value)}
                                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${period === p.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-0.5 border-l border-border/50 pl-2">
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
            <CardContent className="p-2 flex-1 relative">
                {loading && !apiData && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    </div>
                )}
                {priceData.length === 0 && !loading ? (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
                        Không có dữ liệu giá cho khoảng thời gian này
                    </div>
                ) : chartType === "line" ? (
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
    <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
        {icon}
    </button>
);

export default PriceHistoryChart;
