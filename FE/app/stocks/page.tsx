"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { STOCK_LIST_DATA, STOCK_SECTORS, STOCK_SIGNALS, type StockListItem } from "@/lib/stockListMockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Search, TrendingUp, TrendingDown, BarChart3, Filter, SlidersHorizontal, ListFilter } from "lucide-react";
import StockScreener from "@/components/stocks/StockScreener";

type SortKey = keyof StockListItem;
type SortDir = "asc" | "desc";

const formatPrice = (p: number) => p.toLocaleString("vi-VN");
const formatVolume = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
};
const formatMarketCap = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}Tr tỷ`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K tỷ`;
    return `${v.toLocaleString()}T`;
};

const signalColor: Record<string, string> = {
    "Mua": "bg-green-100 text-green-700 border-green-200",
    "Bán": "bg-red-100 text-red-700 border-red-200",
    "Nắm giữ": "bg-blue-100 text-blue-700 border-blue-200",
    "Theo dõi": "bg-amber-100 text-amber-700 border-amber-200",
};

// Sparkline mini chart component
const Sparkline = ({ data, positive }: { data: number[]; positive: boolean }) => {
    const option = {
        grid: { left: 0, right: 0, top: 0, bottom: 0 },
        xAxis: { type: "category" as const, show: false, data: data.map((_, i) => i) },
        yAxis: { type: "value" as const, show: false, min: Math.min(...data) * 0.98, max: Math.max(...data) * 1.02 },
        series: [{
            type: "line", data, smooth: true, symbol: "none",
            lineStyle: { color: positive ? "#22c55e" : "#ef4444", width: 1.5 },
            areaStyle: {
                color: {
                    type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: positive ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)" },
                        { offset: 1, color: "rgba(255,255,255,0)" },
                    ],
                },
            },
        }],
    };
    return <ReactECharts option={option} style={{ height: 32, width: 80 }} opts={{ renderer: "svg" }} />;
};

export default function StocksPage() {
    const [activeTab, setActiveTab] = useState("screener");
    const [search, setSearch] = useState("");
    const [sectorFilter, setSectorFilter] = useState("Tất cả");
    const [signalFilter, setSignalFilter] = useState("Tất cả");
    const [sortKey, setSortKey] = useState<SortKey>("marketCap");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    };

    const filtered = useMemo(() => {
        let list = [...STOCK_LIST_DATA];

        // Search
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.ticker.toLowerCase().includes(q) ||
                s.companyName.toLowerCase().includes(q)
            );
        }

        // Sector filter
        if (sectorFilter !== "Tất cả") {
            list = list.filter(s => s.sector === sectorFilter);
        }

        // Signal filter
        if (signalFilter !== "Tất cả") {
            list = list.filter(s => s.signal === signalFilter);
        }

        // Sort
        list.sort((a, b) => {
            const av = a[sortKey] ?? 0;
            const bv = b[sortKey] ?? 0;
            if (typeof av === "number" && typeof bv === "number") {
                return sortDir === "asc" ? av - bv : bv - av;
            }
            return sortDir === "asc"
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });

        return list;
    }, [search, sectorFilter, signalFilter, sortKey, sortDir]);

    // Summary stats
    const totalUp = STOCK_LIST_DATA.filter(s => s.priceChangePercent > 0).length;
    const totalDown = STOCK_LIST_DATA.filter(s => s.priceChangePercent < 0).length;
    const totalVolume = STOCK_LIST_DATA.reduce((acc, s) => acc + s.volume, 0);
    const avgPE = STOCK_LIST_DATA.filter(s => s.pe !== null).reduce((acc, s, _, arr) => acc + (s.pe ?? 0) / arr.length, 0);

    const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
        <TableHead
            className={`cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap ${className}`}
            onClick={() => toggleSort(field)}
        >
            <div className="flex items-center gap-1">
                {label}
                <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-orange-500" : "text-gray-300"}`} />
            </div>
        </TableHead>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-[1600px] mx-auto space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Bảng phân tích cổ phiếu <span className="text-orange-500">vnstock</span>
                    </h1>
                    <div className="text-sm text-gray-500">
                        {STOCK_LIST_DATA.length} mã · Cập nhật: Vừa xong
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-white border border-gray-200 shadow-sm p-1 h-auto">
                        <TabsTrigger
                            value="overview"
                            className="flex items-center gap-1.5 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md"
                        >
                            <ListFilter className="w-3.5 h-3.5" />
                            Tổng quan
                        </TabsTrigger>
                        <TabsTrigger
                            value="screener"
                            className="flex items-center gap-1.5 text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white px-4 py-2 rounded-md"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Bộ lọc cổ phiếu
                        </TabsTrigger>
                    </TabsList>

                    {/* ════ TAB 1: OVERVIEW (original) ════ */}
                    <TabsContent value="overview" className="space-y-5 mt-4">

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="shadow-sm border-gray-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Mã tăng</p>
                                <p className="text-xl font-bold text-green-600">{totalUp}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-gray-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Mã giảm</p>
                                <p className="text-xl font-bold text-red-600">{totalDown}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-gray-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Tổng KLGD</p>
                                <p className="text-xl font-bold text-gray-800">{formatVolume(totalVolume)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-gray-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Filter className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">P/E Trung bình</p>
                                <p className="text-xl font-bold text-gray-800">{avgPE.toFixed(1)}x</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="shadow-sm border-gray-200">
                    <CardContent className="p-4 space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm mã cổ phiếu hoặc tên công ty..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                            />
                        </div>

                        {/* Sector filter */}
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-gray-500 flex items-center mr-1">Ngành:</span>
                            <Badge
                                variant={sectorFilter === "Tất cả" ? "default" : "outline"}
                                className={`cursor-pointer text-xs ${sectorFilter === "Tất cả" ? "bg-orange-500 hover:bg-orange-600 text-white" : "hover:border-orange-300"}`}
                                onClick={() => setSectorFilter("Tất cả")}
                            >
                                Tất cả
                            </Badge>
                            {STOCK_SECTORS.map((s) => (
                                <Badge
                                    key={s}
                                    variant={sectorFilter === s ? "default" : "outline"}
                                    className={`cursor-pointer text-xs ${sectorFilter === s ? "bg-orange-500 hover:bg-orange-600 text-white" : "hover:border-orange-300"}`}
                                    onClick={() => setSectorFilter(s)}
                                >
                                    {s}
                                </Badge>
                            ))}
                        </div>

                        {/* Signal filter */}
                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-gray-500 flex items-center mr-1">Tín hiệu:</span>
                            {STOCK_SIGNALS.map((s) => (
                                <Badge
                                    key={s}
                                    variant={signalFilter === s ? "default" : "outline"}
                                    className={`cursor-pointer text-xs ${signalFilter === s
                                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                                        : "hover:border-orange-300"
                                        }`}
                                    onClick={() => setSignalFilter(s)}
                                >
                                    {s}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Stock Table */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold text-gray-800 flex items-center justify-between">
                            <span>Danh sách cổ phiếu ({filtered.length} mã)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 text-xs">
                                        <TableHead className="w-[130px] sticky left-0 bg-gray-50 z-10">Mã CK</TableHead>
                                        <SortHeader label="Giá" field="currentPrice" className="text-right" />
                                        <SortHeader label="Thay đổi" field="priceChangePercent" className="text-right" />
                                        <TableHead className="text-center w-[90px]">Xu hướng</TableHead>
                                        <SortHeader label="KLGD" field="volume" className="text-right" />
                                        <SortHeader label="Vốn hóa" field="marketCap" className="text-right" />
                                        <SortHeader label="P/E" field="pe" className="text-right" />
                                        <SortHeader label="P/B" field="pb" className="text-right" />
                                        <SortHeader label="EPS" field="eps" className="text-right" />
                                        <SortHeader label="ROE" field="roe" className="text-right" />
                                        <SortHeader label="52W %" field="weekChange52" className="text-right" />
                                        <SortHeader label="NN mua ròng" field="foreignNetBuy" className="text-right" />
                                        <TableHead className="text-center">Tín hiệu</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((stock) => {
                                        const isUp = stock.priceChangePercent >= 0;
                                        return (
                                            <TableRow
                                                key={stock.ticker}
                                                className="hover:bg-orange-50/50 transition-colors group"
                                            >
                                                {/* Ticker + Company */}
                                                <TableCell className="sticky left-0 bg-white group-hover:bg-orange-50/50 z-10">
                                                    <Link href={`/stock/${stock.ticker}`} className="block">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${isUp ? "bg-gradient-to-br from-green-500 to-green-700" : "bg-gradient-to-br from-red-500 to-red-700"}`}>
                                                                {stock.ticker.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm text-gray-900 group-hover:text-orange-600 transition-colors">
                                                                    {stock.ticker}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 truncate max-w-[100px]">
                                                                    {stock.sector}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </TableCell>

                                                {/* Price */}
                                                <TableCell className="text-right">
                                                    <Link href={`/stock/${stock.ticker}`} className="block">
                                                        <span className={`font-semibold text-sm ${isUp ? "text-green-600" : "text-red-600"}`}>
                                                            {formatPrice(stock.currentPrice)}
                                                        </span>
                                                    </Link>
                                                </TableCell>

                                                {/* Change */}
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-xs font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
                                                            {isUp ? "+" : ""}{formatPrice(stock.priceChange)}
                                                        </span>
                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                                            {isUp ? "+" : ""}{stock.priceChangePercent.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Sparkline */}
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center">
                                                        <Sparkline data={stock.sparkline} positive={isUp} />
                                                    </div>
                                                </TableCell>

                                                {/* Volume */}
                                                <TableCell className="text-right text-xs text-gray-700 font-medium">
                                                    {formatVolume(stock.volume)}
                                                </TableCell>

                                                {/* Market Cap */}
                                                <TableCell className="text-right text-xs text-gray-700 font-medium">
                                                    {formatMarketCap(stock.marketCap)}
                                                </TableCell>

                                                {/* P/E */}
                                                <TableCell className="text-right text-xs text-gray-700">
                                                    {stock.pe !== null ? stock.pe.toFixed(1) : "—"}
                                                </TableCell>

                                                {/* P/B */}
                                                <TableCell className="text-right text-xs text-gray-700">
                                                    {stock.pb.toFixed(1)}
                                                </TableCell>

                                                {/* EPS */}
                                                <TableCell className="text-right text-xs text-gray-700">
                                                    {stock.eps.toLocaleString()}
                                                </TableCell>

                                                {/* ROE */}
                                                <TableCell className="text-right">
                                                    <span className={`text-xs font-medium ${stock.roe >= 15 ? "text-green-600" : stock.roe >= 0 ? "text-gray-700" : "text-red-600"}`}>
                                                        {stock.roe.toFixed(1)}%
                                                    </span>
                                                </TableCell>

                                                {/* 52W Change */}
                                                <TableCell className="text-right">
                                                    <span className={`text-xs font-medium ${stock.weekChange52 >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                        {stock.weekChange52 > 0 ? "+" : ""}{stock.weekChange52.toFixed(1)}%
                                                    </span>
                                                </TableCell>

                                                {/* Foreign */}
                                                <TableCell className="text-right">
                                                    <span className={`text-xs font-medium ${stock.foreignNetBuy >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                        {stock.foreignNetBuy > 0 ? "+" : ""}{stock.foreignNetBuy}T
                                                    </span>
                                                </TableCell>

                                                {/* Signal */}
                                                <TableCell className="text-center">
                                                    <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded border ${signalColor[stock.signal]}`}>
                                                        {stock.signal}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                    </TabsContent>

                    {/* ════ TAB 2: STOCK SCREENER ════ */}
                    <TabsContent value="screener" className="mt-4">
                        <StockScreener />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
