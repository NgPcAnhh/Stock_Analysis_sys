"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { SECTOR_OVERVIEW_DATA } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const SectorMarketOverview = () => {
    const chartOption = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
        },
        grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            containLabel: true,
        },
        xAxis: {
            type: "value",
            position: "top",
            splitLine: { lineStyle: { type: "dashed" } },
        },
        yAxis: {
            type: "category",
            axisLine: { show: false },
            axisLabel: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            data: SECTOR_OVERVIEW_DATA.map((item) => item.name),
        },
        series: [
            {
                name: "Thay đổi %",
                type: "bar",
                stack: "Total",
                label: {
                    show: true,
                    position: "right", // Dynamic position based on value would be better but simple for now
                    formatter: "{b}",
                },
                data: SECTOR_OVERVIEW_DATA.map((item) => ({
                    value: item.change,
                    itemStyle: {
                        color: item.change >= 0 ? "#22c55e" : "#ef4444"
                    },
                    label: {
                        position: item.change >= 0 ? "left" : "right"
                    }
                })),
            },
        ],
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-gray-800">
                        Biến động ngành
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ReactECharts option={chartOption} style={{ height: "350px" }} />
                </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-gray-800">
                        Chi tiết ngành
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-auto max-h-[350px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Ngành</TableHead>
                                    <TableHead className="text-right">Thay đổi</TableHead>
                                    <TableHead className="text-right">Dòng tiền</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {SECTOR_OVERVIEW_DATA.map((item) => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell
                                            className={`text-right font-bold ${item.change >= 0 ? "text-green-600" : "text-red-600"
                                                }`}
                                        >
                                            {item.change}%
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.cashFlow.toLocaleString()} Tỷ
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SectorMarketOverview;
