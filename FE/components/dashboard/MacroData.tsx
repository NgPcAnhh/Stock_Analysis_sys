"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Generate sparkline data for different timeframes
const generateSparkline = (base: number, points: number, volatility: number) =>
    Array.from({ length: points }, () => base + (Math.random() - 0.5) * volatility);

const MACRO_INDICATORS = [
    {
        name: "VN-Index",
        price: 1258.56,
        change: 12.34,
        changePct: 0.98,
        sparklines: {
            "1m": generateSparkline(1250, 20, 40),
            "3m": generateSparkline(1220, 30, 60),
            "6m": generateSparkline(1180, 40, 80),
            "1y": generateSparkline(1100, 50, 120),
        },
    },
    {
        name: "USD/VND",
        price: 24850,
        change: 15,
        changePct: 0.06,
        sparklines: {
            "1m": generateSparkline(24800, 20, 100),
            "3m": generateSparkline(24700, 30, 200),
            "6m": generateSparkline(24500, 40, 300),
            "1y": generateSparkline(24200, 50, 500),
        },
    },
    {
        name: "Lãi suất ON",
        price: 4.5,
        change: 0,
        changePct: 0,
        sparklines: {
            "1m": generateSparkline(4.5, 20, 0.3),
            "3m": generateSparkline(4.4, 30, 0.5),
            "6m": generateSparkline(4.2, 40, 0.8),
            "1y": generateSparkline(4.0, 50, 1.0),
        },
    },
    {
        name: "CPI",
        price: 3.2,
        change: -0.1,
        changePct: -3.03,
        sparklines: {
            "1m": generateSparkline(3.2, 20, 0.2),
            "3m": generateSparkline(3.3, 30, 0.4),
            "6m": generateSparkline(3.1, 40, 0.5),
            "1y": generateSparkline(3.0, 50, 0.8),
        },
    },
    {
        name: "GDP Growth",
        price: 6.5,
        change: 0.3,
        changePct: 4.84,
        sparklines: {
            "1m": generateSparkline(6.4, 20, 0.3),
            "3m": generateSparkline(6.2, 30, 0.5),
            "6m": generateSparkline(5.8, 40, 0.8),
            "1y": generateSparkline(5.5, 50, 1.2),
        },
    },
    {
        name: "Giá vàng SJC",
        price: 79.5,
        change: 0.8,
        changePct: 1.02,
        sparklines: {
            "1m": generateSparkline(78, 20, 2),
            "3m": generateSparkline(76, 30, 4),
            "6m": generateSparkline(72, 40, 6),
            "1y": generateSparkline(68, 50, 10),
        },
    },
];

type TimeFrame = "1m" | "3m" | "6m" | "1y";

const MiniSparkline = ({ data, isPositive }: { data: number[]; isPositive: boolean }) => {
    const option = {
        grid: { left: 0, right: 0, top: 0, bottom: 0 },
        xAxis: { show: false, type: "category" as const },
        yAxis: { show: false, type: "value" as const },
        series: [
            {
                type: "line",
                data,
                smooth: true,
                symbol: "none",
                lineStyle: { color: isPositive ? "#22c55e" : "#ef4444", width: 1.5 },
                areaStyle: {
                    color: {
                        type: "linear" as const,
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: isPositive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)" },
                            { offset: 1, color: isPositive ? "rgba(34,197,94,0)" : "rgba(239,68,68,0)" },
                        ],
                    },
                },
            },
        ],
    };
    return <ReactECharts option={option} style={{ height: 32, width: 80 }} opts={{ renderer: "svg" }} />;
};

export const MacroData = () => {
    const [timeFrame, setTimeFrame] = useState<TimeFrame>("1m");

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-gray-100">
                <CardTitle className="text-lg font-bold text-gray-800">
                    Chỉ số vĩ mô
                </CardTitle>
                <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)} className="w-auto">
                    <TabsList className="h-8 bg-gray-100">
                        <TabsTrigger value="1m" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">1M</TabsTrigger>
                        <TabsTrigger value="3m" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">3M</TabsTrigger>
                        <TabsTrigger value="6m" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">6M</TabsTrigger>
                        <TabsTrigger value="1y" className="text-xs px-3 h-6 data-[state=active]:bg-green-500 data-[state=active]:text-white">1Y</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">Chỉ số</TableHead>
                            <TableHead className="text-xs text-right">Giá hiện tại</TableHead>
                            <TableHead className="text-xs text-right">Thay đổi</TableHead>
                            <TableHead className="text-xs text-right">% Thay đổi</TableHead>
                            <TableHead className="text-xs text-right">Biểu đồ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {MACRO_INDICATORS.map((item) => {
                            const isPositive = item.change >= 0;
                            return (
                                <TableRow key={item.name} className="hover:bg-muted/50 border-b border-border/50">
                                    <TableCell className="font-semibold text-sm">{item.name}</TableCell>
                                    <TableCell className="text-right font-medium text-sm">
                                        {item.price.toLocaleString(undefined, { minimumFractionDigits: item.price < 100 ? 1 : 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn("text-sm font-medium", isPositive ? "text-green-500" : item.change < 0 ? "text-red-500" : "text-yellow-500")}>
                                            {isPositive && item.change > 0 ? "+" : ""}{item.change}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn("text-sm font-semibold", isPositive ? "text-green-500" : item.changePct < 0 ? "text-red-500" : "text-yellow-500")}>
                                            {isPositive && item.changePct > 0 ? "+" : ""}{item.changePct.toFixed(2)}%
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end">
                                            <MiniSparkline data={item.sparklines[timeFrame]} isPositive={isPositive} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default MacroData;
