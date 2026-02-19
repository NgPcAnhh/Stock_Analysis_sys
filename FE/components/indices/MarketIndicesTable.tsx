"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { MarketIndex } from "@/lib/indicesData";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";

type SortKey = keyof MarketIndex | "";
type SortDir = "asc" | "desc";

const colorClass = (v: number) =>
    v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "text-gray-600";

const colorBg = (v: number) =>
    v > 0
        ? "bg-green-50 text-green-700"
        : v < 0
            ? "bg-red-50 text-red-700"
            : "bg-gray-50 text-gray-600";

const fmt = (v: number) => {
    const s = v > 0 ? "+" : "";
    return `${s}${v.toFixed(2)}%`;
};

function SparklineChart({ data, positive }: { data: number[]; positive: boolean }) {
    const option = useMemo(
        () => ({
            grid: { top: 2, bottom: 2, left: 2, right: 2 },
            xAxis: { type: "category" as const, show: false, data: data.map((_, i) => i) },
            yAxis: { type: "value" as const, show: false, min: Math.min(...data) * 0.999, max: Math.max(...data) * 1.001 },
            series: [
                {
                    type: "line",
                    data,
                    smooth: true,
                    symbol: "none",
                    lineStyle: { width: 1.5, color: positive ? "#16a34a" : "#dc2626" },
                    areaStyle: {
                        color: {
                            type: "linear",
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: positive ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)" },
                                { offset: 1, color: "rgba(255,255,255,0)" },
                            ],
                        },
                    },
                },
            ],
            tooltip: { show: false },
        }),
        [data, positive]
    );

    return <ReactECharts option={option} style={{ height: 36, width: 120 }} opts={{ renderer: "svg" }} />;
}

interface MarketIndicesTableProps {
    title: string;
    data: MarketIndex[];
    description?: string;
}

export default function MarketIndicesTable({ title, data, description }: MarketIndicesTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>("");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const sorted = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const av = a[sortKey as keyof MarketIndex];
            const bv = b[sortKey as keyof MarketIndex];
            if (typeof av === "number" && typeof bv === "number") {
                return sortDir === "asc" ? av - bv : bv - av;
            }
            return sortDir === "asc"
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });
    }, [data, sortKey, sortDir]);

    const SortableHead = ({
        label,
        colKey,
        className = "",
    }: {
        label: string;
        colKey: SortKey;
        className?: string;
    }) => (
        <TableHead
            className={`text-right cursor-pointer select-none hover:bg-gray-100/80 transition-colors whitespace-nowrap px-4 ${className}`}
            onClick={() => handleSort(colKey)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <ArrowUpDown
                    className={`h-3 w-3 ${sortKey === colKey ? "text-orange-500" : "text-gray-400"}`}
                />
            </span>
        </TableHead>
    );

    return (
        <Card className="shadow-sm border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b bg-white">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                {description && (
                    <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                )}
            </div>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/80">
                                <TableHead
                                    className="sticky left-0 bg-gray-50/80 z-10 min-w-[160px] cursor-pointer select-none hover:bg-gray-100/80 transition-colors px-4"
                                    onClick={() => handleSort("name")}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        Tên chỉ số
                                        <ArrowUpDown
                                            className={`h-3 w-3 ${sortKey === "name" ? "text-orange-500" : "text-gray-400"}`}
                                        />
                                    </span>
                                </TableHead>
                                <TableHead className="text-center whitespace-nowrap px-4 min-w-[140px]">
                                    Biểu đồ giá 30D
                                </TableHead>
                                <SortableHead label="Giá trị" colKey="value" />
                                <SortableHead label="Thay đổi" colKey="change" />
                                <SortableHead label="% thay đổi" colKey="changePercent" />
                                <SortableHead label="7 ngày" colKey="week1" />
                                <SortableHead label="Từ đầu năm" colKey="ytd" />
                                <SortableHead label="1 năm" colKey="year1" />
                                <SortableHead label="3 năm" colKey="year3" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.map((row) => (
                                <TableRow
                                    key={row.name}
                                    className="hover:bg-orange-50/40 transition-colors h-[68px]"
                                >
                                    <TableCell className="sticky left-0 bg-white z-10 px-4">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-xl leading-none">{row.flag}</span>
                                            <span className="font-bold text-gray-900 text-sm">
                                                {row.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4">
                                        <div className="flex justify-center">
                                            <SparklineChart
                                                data={row.sparkline}
                                                positive={row.change >= 0}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-gray-900 px-4 tabular-nums">
                                        {row.value.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right px-4">
                                        <span
                                            className={`inline-flex items-center gap-1 font-semibold text-sm ${colorClass(row.change)}`}
                                        >
                                            {row.change > 0 ? (
                                                <TrendingUp className="h-3.5 w-3.5" />
                                            ) : row.change < 0 ? (
                                                <TrendingDown className="h-3.5 w-3.5" />
                                            ) : null}
                                            {row.change > 0 ? "+" : ""}
                                            {row.change.toFixed(2)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right px-4">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colorBg(row.changePercent)}`}
                                        >
                                            {fmt(row.changePercent)}
                                        </span>
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-medium px-4 ${colorClass(row.week1)}`}
                                    >
                                        {fmt(row.week1)}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-medium px-4 ${colorClass(row.ytd)}`}
                                    >
                                        {fmt(row.ytd)}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-medium px-4 ${colorClass(row.year1)}`}
                                    >
                                        {fmt(row.year1)}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-medium px-4 ${colorClass(row.year3)}`}
                                    >
                                        {fmt(row.year3)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
