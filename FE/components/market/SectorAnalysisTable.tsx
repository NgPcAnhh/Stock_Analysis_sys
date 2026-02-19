"use client";

import React, { useState } from "react";
import { SECTOR_TABLE_DATA, SectorTableRow } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";

type SortKey = keyof SectorTableRow;
type SortDir = "asc" | "desc";

const colorClass = (v: number) =>
    v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "text-gray-600";

const fmt = (v: number) => {
    const s = v > 0 ? "+" : "";
    return `${s}${v.toFixed(2)}%`;
};

export default function SectorAnalysisTable() {
    const [sortKey, setSortKey] = useState<SortKey>("marketCap");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const sorted = [...SECTOR_TABLE_DATA].sort((a, b) => {
        let av: number | string = a[sortKey];
        let bv: number | string = b[sortKey];
        // parse marketCap string for numeric sort
        if (sortKey === "marketCap") {
            av = parseFloat(String(av).replace(/,/g, ""));
            bv = parseFloat(String(bv).replace(/,/g, ""));
        }
        if (typeof av === "string") av = av.toLowerCase();
        if (typeof bv === "string") bv = bv.toLowerCase();
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
    });

    const SortableHead = ({ label, colKey, className = "" }: { label: string; colKey: SortKey; className?: string }) => (
        <TableHead
            className={`text-right cursor-pointer select-none hover:bg-gray-100 transition-colors whitespace-nowrap ${className}`}
            onClick={() => handleSort(colKey)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <ArrowUpDown className={`h-3 w-3 ${sortKey === colKey ? "text-orange-500" : "text-gray-400"}`} />
            </span>
        </TableHead>
    );

    return (
        <Card className="shadow-sm border-gray-200">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead
                                    className="sticky left-0 bg-gray-50 z-10 min-w-[160px] cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort("name")}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        Nhóm ngành
                                        <ArrowUpDown className={`h-3 w-3 ${sortKey === "name" ? "text-orange-500" : "text-gray-400"}`} />
                                    </span>
                                </TableHead>
                                <SortableHead label="Số lượng cổ phiếu" colKey="stockCount" />
                                <SortableHead label="Vốn hóa" colKey="marketCap" />
                                <SortableHead label="P/E" colKey="pe" />
                                <SortableHead label="P/B" colKey="pb" />
                                <SortableHead label="Tỷ suất cổ tức" colKey="dividendYield" />
                                <SortableHead label="T.trưởng LNST 3 năm dự phóng" colKey="lnstGrowth3Y" />
                                <SortableHead label="% Giá 1D" colKey="priceChange1D" />
                                <SortableHead label="% Giá 7D" colKey="priceChange7D" />
                                <SortableHead label="% Giá YTD" colKey="priceChangeYTD" />
                                <SortableHead label="% Giá 1Y" colKey="priceChange1Y" />
                                <SortableHead label="% Giá 3Y" colKey="priceChange3Y" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.map((row) => (
                                <TableRow key={row.name} className="hover:bg-gray-50/80 transition-colors">
                                    <TableCell className="sticky left-0 bg-white font-semibold text-gray-900 min-w-[160px] z-10">
                                        {row.name}
                                    </TableCell>
                                    <TableCell className="text-right text-gray-700">{row.stockCount}</TableCell>
                                    <TableCell className="text-right text-gray-700 font-medium">{row.marketCap}</TableCell>
                                    <TableCell className="text-right text-gray-700">{row.pe.toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-gray-700">{row.pb.toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-gray-700">{row.dividendYield.toFixed(2)}%</TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.lnstGrowth3Y)}`}>
                                        {fmt(row.lnstGrowth3Y)}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.priceChange1D)}`}>
                                        {fmt(row.priceChange1D)}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.priceChange7D)}`}>
                                        {fmt(row.priceChange7D)}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.priceChangeYTD)}`}>
                                        {fmt(row.priceChangeYTD)}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.priceChange1Y)}`}>
                                        {fmt(row.priceChange1Y)}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${colorClass(row.priceChange3Y)}`}>
                                        {fmt(row.priceChange3Y)}
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
