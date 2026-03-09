"use client";

import React from "react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

const HistoricalDataTable = () => {
    const { historicalData: HISTORICAL_DATA } = useStockDetail();
    return (
        <Card className="shadow-sm border-border h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg font-bold text-foreground">
                        Dữ liệu lịch sử
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-green-600 text-green-600 text-xs font-medium rounded-md hover:bg-green-50 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                            Xuất file Metastock
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-green-600 text-green-600 text-xs font-medium rounded-md hover:bg-green-50 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                            Xuất file Excel
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                {/* Table */}
                <div className="overflow-x-auto overflow-y-auto max-h-[320px]">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-muted/50 border-y border-border/50">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ngày</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Giá mở cửa</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Giá cao nhất</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Giá thấp nhất</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Giá đóng cửa</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Thay đổi giá</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">% thay đổi</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Khối lượng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {HISTORICAL_DATA.map((row, index) => {
                                const isPositive = row.change >= 0;
                                return (
                                    <tr
                                        key={index}
                                        className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? "bg-card" : "bg-muted/30"
                                            }`}
                                    >
                                        <td className="px-4 py-3 text-muted-foreground font-medium">{row.date}</td>
                                        <td className="px-4 py-3 text-right text-foreground font-[var(--font-roboto-mono)]">
                                            {row.open.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-foreground font-[var(--font-roboto-mono)]">
                                            {row.high.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-foreground font-[var(--font-roboto-mono)]">
                                            {row.low.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-foreground font-semibold font-[var(--font-roboto-mono)]">
                                            {row.close.toLocaleString()}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-semibold font-[var(--font-roboto-mono)] ${isPositive ? "text-[#00C076]" : "text-[#EF4444]"
                                                }`}
                                        >
                                            {isPositive ? "+" : ""}
                                            {row.change.toLocaleString()}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-semibold font-[var(--font-roboto-mono)] ${isPositive ? "text-[#00C076]" : "text-[#EF4444]"
                                                }`}
                                        >
                                            {isPositive ? "" : ""}
                                            {row.changePercent.toFixed(2)}%
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground font-[var(--font-roboto-mono)]">
                                            {row.volume.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default HistoricalDataTable;
