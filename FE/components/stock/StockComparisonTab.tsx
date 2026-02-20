"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockDetail } from "@/lib/StockDetailContext";
import { STOCK_LIST_DATA, StockListItem } from "@/lib/stockListMockData";
import { getStockDetailData, StockInfo } from "@/lib/stockDetailMockData";
import { getFinancialReportData } from "@/lib/financialReportData";
import {
    Search,
    X,
    TrendingUp,
    TrendingDown,
    Minus,
    Plus,
    BarChart3,
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
    Info,
} from "lucide-react";

// ======================== TYPES ========================

interface CompareStock {
    ticker: string;
    info: StockInfo;
    listData: StockListItem;
    color: string;
}

// ======================== CONSTANTS ========================

const CHART_COLORS = [
    "#3B82F6", // blue
    "#EF4444", // red
    "#10B981", // green
    "#F59E0B", // amber
    "#8B5CF6", // violet
];

const MAX_COMPARE = 5;

// ======================== COMPONENT ========================

export default function StockComparisonTab() {
    const { stockInfo, priceHistory } = useStockDetail();
    const [compareStocks, setCompareStocks] = useState<CompareStock[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        price: true,
        valuation: true,
        financial: true,
        technical: true,
    });
    const searchRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearch(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Current stock as first entry
    const currentListData = STOCK_LIST_DATA.find((s) => s.ticker === stockInfo.ticker);
    const currentStock: CompareStock = {
        ticker: stockInfo.ticker,
        info: stockInfo,
        listData: currentListData || STOCK_LIST_DATA[0],
        color: CHART_COLORS[0],
    };

    // All stocks to compare (current + selected)
    const allStocks = useMemo(() => [currentStock, ...compareStocks], [stockInfo, compareStocks]);

    // Search results
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        const selectedTickers = new Set(allStocks.map((s) => s.ticker));
        return STOCK_LIST_DATA.filter(
            (s) =>
                !selectedTickers.has(s.ticker) &&
                (s.ticker.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q))
        ).slice(0, 8);
    }, [searchQuery, allStocks]);

    // Add stock to comparison
    const addStock = (item: StockListItem) => {
        if (compareStocks.length >= MAX_COMPARE - 1) return;
        const detail = getStockDetailData(item.ticker);
        const colorIdx = compareStocks.length + 1;
        setCompareStocks((prev) => [
            ...prev,
            {
                ticker: item.ticker,
                info: detail.stockInfo,
                listData: item,
                color: CHART_COLORS[colorIdx % CHART_COLORS.length],
            },
        ]);
        setSearchQuery("");
        setShowSearch(false);
    };

    // Remove stock
    const removeStock = (ticker: string) => {
        setCompareStocks((prev) => {
            const updated = prev.filter((s) => s.ticker !== ticker);
            // Re-assign colors
            return updated.map((s, i) => ({
                ...s,
                color: CHART_COLORS[(i + 1) % CHART_COLORS.length],
            }));
        });
    };

    // Toggle section
    const toggleSection = (key: string) => {
        setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Quick add peers from same sector
    const addPeersFromSector = () => {
        const sector = currentListData?.sector;
        if (!sector) return;
        const peers = STOCK_LIST_DATA.filter(
            (s) => s.sector === sector && s.ticker !== stockInfo.ticker && !compareStocks.find((c) => c.ticker === s.ticker)
        ).slice(0, MAX_COMPARE - 1 - compareStocks.length);
        const newStocks: CompareStock[] = peers.map((item, i) => {
            const detail = getStockDetailData(item.ticker);
            return {
                ticker: item.ticker,
                info: detail.stockInfo,
                listData: item,
                color: CHART_COLORS[(compareStocks.length + i + 1) % CHART_COLORS.length],
            };
        });
        setCompareStocks((prev) => [...prev, ...newStocks]);
    };

    // ======================== PRICE CHART DATA ========================

    const priceChartOption = useMemo(() => {
        // Generate normalized price data (% change from first day)
        const series = allStocks.map((stock) => {
            const detail = getStockDetailData(stock.ticker);
            const history = detail.priceHistory;
            if (!history.length) return { name: stock.ticker, data: [], color: stock.color };
            const basePrice = history[0].close;
            const normalized = history.map((h) => parseFloat((((h.close - basePrice) / basePrice) * 100).toFixed(2)));
            return {
                name: stock.ticker,
                data: normalized,
                color: stock.color,
            };
        });

        const dates = (() => {
            const detail = getStockDetailData(allStocks[0].ticker);
            return detail.priceHistory.map((h) => h.date);
        })();

        return {
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(255,255,255,0.95)",
                borderColor: "#e5e7eb",
                textStyle: { color: "#374151", fontSize: 12 },
                formatter: (params: any) => {
                    let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValue}</div>`;
                    params.forEach((p: any) => {
                        const val = p.value;
                        const sign = val >= 0 ? "+" : "";
                        const color = val >= 0 ? "#10B981" : "#EF4444";
                        html += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
                            ${p.marker}
                            <span>${p.seriesName}</span>
                            <span style="margin-left:auto;font-weight:600;color:${color}">${sign}${val}%</span>
                        </div>`;
                    });
                    return html;
                },
            },
            legend: {
                data: series.map((s) => s.name),
                bottom: 0,
                textStyle: { fontSize: 12 },
            },
            grid: { top: 30, right: 20, bottom: 40, left: 60 },
            xAxis: {
                type: "category",
                data: dates,
                axisLabel: {
                    fontSize: 10,
                    formatter: (v: string) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                    },
                },
                axisLine: { lineStyle: { color: "#e5e7eb" } },
            },
            yAxis: {
                type: "value",
                axisLabel: {
                    fontSize: 10,
                    formatter: (v: number) => `${v >= 0 ? "+" : ""}${v}%`,
                },
                splitLine: { lineStyle: { color: "#f3f4f6" } },
            },
            dataZoom: [
                { type: "inside", start: 60, end: 100 },
                {
                    type: "slider",
                    start: 60,
                    end: 100,
                    height: 20,
                    bottom: 30,
                    borderColor: "#e5e7eb",
                    fillerColor: "rgba(59,130,246,0.1)",
                },
            ],
            series: series.map((s) => ({
                name: s.name,
                type: "line",
                data: s.data,
                smooth: true,
                symbol: "none",
                lineStyle: { width: 2, color: s.color },
                itemStyle: { color: s.color },
            })),
        };
    }, [allStocks]);

    // ======================== RADAR CHART ========================

    const radarChartOption = useMemo(() => {
        if (allStocks.length < 2) return null;

        const indicators = [
            { name: "ROE", max: 35 },
            { name: "ROA", max: 20 },
            { name: "P/E", max: 50 },
            { name: "P/B", max: 6 },
            { name: "Tăng trưởng DT", max: 50 },
            { name: "Tăng trưởng LN", max: 60 },
        ];

        const series = allStocks.map((stock) => ({
            name: stock.ticker,
            value: [
                Math.max(0, stock.listData.roe),
                Math.max(0, stock.listData.roa),
                stock.listData.pe ? Math.min(50, Math.max(0, stock.listData.pe)) : 0,
                Math.min(6, Math.max(0, stock.listData.pb)),
                Math.max(0, stock.listData.revenueGrowth),
                Math.max(0, stock.listData.profitGrowth),
            ],
            lineStyle: { color: stock.color, width: 2 },
            areaStyle: { color: stock.color, opacity: 0.1 },
            itemStyle: { color: stock.color },
        }));

        return {
            tooltip: { trigger: "item" },
            legend: {
                data: allStocks.map((s) => s.ticker),
                bottom: 0,
                textStyle: { fontSize: 12 },
            },
            radar: {
                indicator: indicators,
                radius: "60%",
                axisName: { color: "#6B7280", fontSize: 11 },
                splitArea: { areaStyle: { color: ["#fff", "#f9fafb"] } },
                splitLine: { lineStyle: { color: "#e5e7eb" } },
            },
            series: [
                {
                    type: "radar",
                    data: series,
                },
            ],
        };
    }, [allStocks]);

    // ======================== HELPERS ========================

    const formatPrice = (v: number) => v.toLocaleString("vi-VN");
    const formatPercent = (v: number | null) => (v !== null && v !== undefined ? `${v.toFixed(1)}%` : "N/A");
    const formatBillion = (v: number) => `${v.toLocaleString("vi-VN")} tỷ`;
    const formatNumber = (v: number) => v.toLocaleString("vi-VN");

    const getChangeColor = (v: number) => (v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "text-gray-500");
    const getChangeBg = (v: number) => (v > 0 ? "bg-green-50" : v < 0 ? "bg-red-50" : "bg-gray-50");

    // ======================== COMPARISON TABLE SECTIONS ========================

    const tableRows: {
        section: string;
        sectionKey: string;
        sectionColor: string;
        rows: { label: string; key: string; format: (stock: CompareStock) => React.ReactNode; highlight?: (stock: CompareStock) => string }[];
    }[] = [
        {
            section: "Thông tin giá",
            sectionKey: "price",
            sectionColor: "bg-blue-500",
            rows: [
                {
                    label: "Giá hiện tại",
                    key: "currentPrice",
                    format: (s) => <span className="font-semibold">{formatPrice(s.info.currentPrice)}đ</span>,
                },
                {
                    label: "Thay đổi giá",
                    key: "priceChange",
                    format: (s) => (
                        <span className={`font-medium ${getChangeColor(s.info.priceChange)}`}>
                            {s.info.priceChange > 0 ? "+" : ""}{formatPrice(s.info.priceChange)}đ ({s.info.priceChangePercent > 0 ? "+" : ""}{s.info.priceChangePercent.toFixed(2)}%)
                        </span>
                    ),
                },
                {
                    label: "Biến động 52 tuần",
                    key: "weekChange52",
                    format: (s) => (
                        <span className={`font-medium ${getChangeColor(s.listData.weekChange52)}`}>
                            {s.listData.weekChange52 > 0 ? "+" : ""}{s.listData.weekChange52.toFixed(1)}%
                        </span>
                    ),
                },
                {
                    label: "Cao nhất 52 tuần",
                    key: "high52w",
                    format: (s) => <span>{formatPrice(s.listData.high52w)}đ</span>,
                },
                {
                    label: "Thấp nhất 52 tuần",
                    key: "low52w",
                    format: (s) => <span>{formatPrice(s.listData.low52w)}đ</span>,
                },
                {
                    label: "Khối lượng GD",
                    key: "volume",
                    format: (s) => <span>{formatNumber(s.listData.volume)}</span>,
                },
                {
                    label: "KL GD trung bình 10 phiên",
                    key: "avgVolume",
                    format: (s) => <span>{formatNumber(s.listData.avgVolume10d)}</span>,
                },
            ],
        },
        {
            section: "Định giá",
            sectionKey: "valuation",
            sectionColor: "bg-amber-500",
            rows: [
                {
                    label: "Vốn hóa (tỷ VND)",
                    key: "marketCap",
                    format: (s) => <span className="font-medium">{formatNumber(s.listData.marketCap)}</span>,
                    highlight: (s) => {
                        const max = Math.max(...allStocks.map(st => st.listData.marketCap));
                        return s.listData.marketCap === max ? "bg-blue-50 font-semibold" : "";
                    },
                },
                {
                    label: "P/E",
                    key: "pe",
                    format: (s) => <span>{s.listData.pe ? s.listData.pe.toFixed(1) : "N/A"}</span>,
                    highlight: (s) => {
                        if (!s.listData.pe) return "";
                        const pes = allStocks.map(st => st.listData.pe).filter(Boolean) as number[];
                        const min = Math.min(...pes);
                        return s.listData.pe === min ? "bg-green-50 font-semibold" : "";
                    },
                },
                {
                    label: "P/B",
                    key: "pb",
                    format: (s) => <span>{s.listData.pb.toFixed(2)}</span>,
                    highlight: (s) => {
                        const pbs = allStocks.map(st => st.listData.pb);
                        const min = Math.min(...pbs);
                        return s.listData.pb === min ? "bg-green-50 font-semibold" : "";
                    },
                },
                {
                    label: "EPS (VND)",
                    key: "eps",
                    format: (s) => <span>{formatNumber(s.listData.eps)}</span>,
                    highlight: (s) => {
                        const max = Math.max(...allStocks.map(st => st.listData.eps));
                        return s.listData.eps === max ? "bg-green-50 font-semibold" : "";
                    },
                },
                {
                    label: "Lợi suất cổ tức",
                    key: "dividendYield",
                    format: (s) => <span>{formatPercent(s.listData.dividendYield)}</span>,
                    highlight: (s) => {
                        const max = Math.max(...allStocks.map(st => st.listData.dividendYield));
                        return s.listData.dividendYield === max && max > 0 ? "bg-green-50 font-semibold" : "";
                    },
                },
            ],
        },
        {
            section: "Chỉ số tài chính",
            sectionKey: "financial",
            sectionColor: "bg-green-500",
            rows: [
                {
                    label: "ROE",
                    key: "roe",
                    format: (s) => (
                        <span className={getChangeColor(s.listData.roe)}>{formatPercent(s.listData.roe)}</span>
                    ),
                    highlight: (s) => {
                        const max = Math.max(...allStocks.map(st => st.listData.roe));
                        return s.listData.roe === max ? "bg-green-50 font-semibold" : "";
                    },
                },
                {
                    label: "ROA",
                    key: "roa",
                    format: (s) => (
                        <span className={getChangeColor(s.listData.roa)}>{formatPercent(s.listData.roa)}</span>
                    ),
                    highlight: (s) => {
                        const max = Math.max(...allStocks.map(st => st.listData.roa));
                        return s.listData.roa === max ? "bg-green-50 font-semibold" : "";
                    },
                },
                {
                    label: "Nợ/Vốn CSH (D/E)",
                    key: "debtToEquity",
                    format: (s) => <span>{s.listData.debtToEquity.toFixed(2)}</span>,
                    highlight: (s) => {
                        const min = Math.min(...allStocks.map(st => st.listData.debtToEquity));
                        return s.listData.debtToEquity === min ? "bg-green-50 font-semibold" : "";
                    },
                },
                {
                    label: "Tăng trưởng doanh thu",
                    key: "revenueGrowth",
                    format: (s) => (
                        <span className={getChangeColor(s.listData.revenueGrowth)}>
                            {s.listData.revenueGrowth > 0 ? "+" : ""}{formatPercent(s.listData.revenueGrowth)}
                        </span>
                    ),
                    highlight: (s) => {
                        const max = Math.max(...allStocks.map(st => st.listData.revenueGrowth));
                        return s.listData.revenueGrowth === max ? "bg-green-50 font-semibold" : "";
                    },
                },
                {
                    label: "Tăng trưởng lợi nhuận",
                    key: "profitGrowth",
                    format: (s) => (
                        <span className={getChangeColor(s.listData.profitGrowth)}>
                            {s.listData.profitGrowth > 0 ? "+" : ""}{formatPercent(s.listData.profitGrowth)}
                        </span>
                    ),
                    highlight: (s) => {
                        const max = Math.max(...allStocks.map(st => st.listData.profitGrowth));
                        return s.listData.profitGrowth === max ? "bg-green-50 font-semibold" : "";
                    },
                },
                {
                    label: "Sở hữu nước ngoài",
                    key: "foreignOwnership",
                    format: (s) => <span>{formatPercent(s.listData.foreignOwnership)}</span>,
                },
                {
                    label: "NĐTNN mua/bán ròng (tỷ)",
                    key: "foreignNetBuy",
                    format: (s) => (
                        <span className={getChangeColor(s.listData.foreignNetBuy)}>
                            {s.listData.foreignNetBuy > 0 ? "+" : ""}{s.listData.foreignNetBuy}
                        </span>
                    ),
                },
            ],
        },
        {
            section: "Phân tích kỹ thuật",
            sectionKey: "technical",
            sectionColor: "bg-purple-500",
            rows: [
                {
                    label: "Beta",
                    key: "beta",
                    format: (s) => <span>{s.listData.beta.toFixed(2)}</span>,
                },
                {
                    label: "RSI (14)",
                    key: "rsi14",
                    format: (s) => {
                        const rsi = s.listData.rsi14;
                        const color = rsi > 70 ? "text-red-600" : rsi < 30 ? "text-green-600" : "text-gray-700";
                        const label = rsi > 70 ? "Quá mua" : rsi < 30 ? "Quá bán" : "Trung tính";
                        return (
                            <span className={color}>
                                {rsi} <span className="text-xs">({label})</span>
                            </span>
                        );
                    },
                },
                {
                    label: "MACD Signal",
                    key: "macdSignal",
                    format: (s) => {
                        const sig = s.listData.macdSignal;
                        const cls = sig === "Mua" ? "text-green-600 bg-green-50" : sig === "Bán" ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-50";
                        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{sig}</span>;
                    },
                },
                {
                    label: "Xu hướng MA20",
                    key: "ma20Trend",
                    format: (s) => {
                        const trend = s.listData.ma20Trend;
                        const cls = trend === "Trên MA20" ? "text-green-600" : "text-red-600";
                        return <span className={cls}>{trend}</span>;
                    },
                },
                {
                    label: "Tín hiệu",
                    key: "signal",
                    format: (s) => {
                        const sig = s.listData.signal;
                        let cls = "text-gray-600 bg-gray-100";
                        if (sig === "Mua") cls = "text-green-700 bg-green-100";
                        else if (sig === "Bán") cls = "text-red-700 bg-red-100";
                        else if (sig === "Theo dõi") cls = "text-amber-700 bg-amber-100";
                        else if (sig === "Nắm giữ") cls = "text-blue-700 bg-blue-100";
                        return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{sig}</span>;
                    },
                },
            ],
        },
    ];

    // ======================== RENDER ========================

    return (
        <div className="space-y-6">
            {/* ── Stock Selector ── */}
            <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-blue-500" />
                        Chọn cổ phiếu so sánh
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Selected Stocks Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Current stock (fixed) */}
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-semibold"
                            style={{ borderColor: currentStock.color, backgroundColor: `${currentStock.color}10` }}
                        >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentStock.color }} />
                            <span>{stockInfo.ticker}</span>
                            <span className="text-xs text-gray-500">(Hiện tại)</span>
                        </div>

                        {/* Compared stocks */}
                        {compareStocks.map((stock) => (
                            <div
                                key={stock.ticker}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-medium group"
                                style={{ borderColor: stock.color, backgroundColor: `${stock.color}10` }}
                            >
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stock.color }} />
                                <span>{stock.ticker}</span>
                                <button
                                    onClick={() => removeStock(stock.ticker)}
                                    className="ml-1 w-4 h-4 rounded-full bg-gray-200 hover:bg-red-200 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-3 h-3 text-gray-500 hover:text-red-600" />
                                </button>
                            </div>
                        ))}

                        {/* Add button / Search */}
                        {compareStocks.length < MAX_COMPARE - 1 && (
                            <div ref={searchRef} className="relative">
                                <div
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-dashed border-gray-300 text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors"
                                    onClick={() => setShowSearch(true)}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Thêm mã</span>
                                </div>

                                {showSearch && (
                                    <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                        <div className="p-2">
                                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                                                <Search className="w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Nhập mã CK hoặc tên..."
                                                    className="flex-1 text-sm bg-transparent outline-none"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {searchResults.map((item) => (
                                                <button
                                                    key={item.ticker}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors"
                                                    onClick={() => addStock(item)}
                                                >
                                                    <span className="text-sm font-bold text-blue-600 w-12">{item.ticker}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-600 truncate">{item.companyName}</p>
                                                        <p className="text-xs text-gray-400">{item.sector} · {item.exchange}</p>
                                                    </div>
                                                    <span className={`text-xs font-medium ${getChangeColor(item.priceChangePercent)}`}>
                                                        {item.priceChangePercent > 0 ? "+" : ""}{item.priceChangePercent.toFixed(2)}%
                                                    </span>
                                                </button>
                                            ))}
                                            {searchQuery && searchResults.length === 0 && (
                                                <p className="text-sm text-gray-400 text-center py-4">Không tìm thấy mã CK</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-3 text-xs">
                        <button
                            onClick={addPeersFromSector}
                            disabled={compareStocks.length >= MAX_COMPARE - 1}
                            className="text-blue-600 hover:text-blue-700 hover:underline disabled:text-gray-400 disabled:no-underline"
                        >
                            + Thêm cùng ngành ({currentListData?.sector})
                        </button>
                        {compareStocks.length > 0 && (
                            <button
                                onClick={() => setCompareStocks([])}
                                className="text-red-500 hover:text-red-600 hover:underline"
                            >
                                Xóa tất cả
                            </button>
                        )}
                        <span className="text-gray-400 ml-auto">
                            {allStocks.length}/{MAX_COMPARE} cổ phiếu
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* ── Charts Section ── */}
            {allStocks.length >= 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Price Performance Chart */}
                    <div className="lg:col-span-7">
                        <Card className="shadow-sm border-gray-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-500" />
                                    Biến động giá tương đối (%)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ReactECharts option={priceChartOption} style={{ height: 360 }} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Radar Chart */}
                    <div className="lg:col-span-5">
                        <Card className="shadow-sm border-gray-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-purple-500" />
                                    Đa chiều chỉ số
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {radarChartOption && (
                                    <ReactECharts option={radarChartOption} style={{ height: 360 }} />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ── Empty State ── */}
            {allStocks.length < 2 && (
                <Card className="shadow-sm border-gray-200">
                    <CardContent className="py-12 text-center">
                        <ArrowUpDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-gray-500 mb-1">Chưa có cổ phiếu để so sánh</h3>
                        <p className="text-sm text-gray-400">Thêm ít nhất 1 cổ phiếu khác để bắt đầu so sánh với {stockInfo.ticker}</p>
                        <button
                            onClick={addPeersFromSector}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                            + Thêm cổ phiếu cùng ngành
                        </button>
                    </CardContent>
                </Card>
            )}

            {/* ── Comparison Table ── */}
            {allStocks.length >= 2 && (
                <Card className="shadow-sm border-gray-200 overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-green-500" />
                            Bảng so sánh chi tiết
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                {/* Header with stock tickers */}
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[180px] z-10">
                                            Chỉ tiêu
                                        </th>
                                        {allStocks.map((stock, i) => (
                                            <th key={stock.ticker} className="text-center px-4 py-3 min-w-[140px]">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className="w-3 h-3 rounded-full shrink-0"
                                                            style={{ backgroundColor: stock.color }}
                                                        />
                                                        <span className="font-bold text-gray-800">{stock.ticker}</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-normal truncate max-w-[120px]">
                                                        {stock.listData.sector}
                                                    </span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((section) => (
                                        <React.Fragment key={section.sectionKey}>
                                            {/* Section header */}
                                            <tr
                                                className="cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                                                onClick={() => toggleSection(section.sectionKey)}
                                            >
                                                <td
                                                    colSpan={allStocks.length + 1}
                                                    className="px-4 py-2.5"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-1 h-4 ${section.sectionColor} rounded-full`} />
                                                        <span className="font-semibold text-gray-700 text-sm">{section.section}</span>
                                                        {expandedSections[section.sectionKey] ? (
                                                            <ChevronUp className="w-4 h-4 text-gray-400" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Section rows */}
                                            {expandedSections[section.sectionKey] &&
                                                section.rows.map((row, rowIdx) => (
                                                    <tr
                                                        key={row.key}
                                                        className={`border-b border-gray-50 ${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-blue-50/30 transition-colors`}
                                                    >
                                                        <td className="px-4 py-2.5 text-gray-600 font-medium sticky left-0 bg-inherit z-10">
                                                            {row.label}
                                                        </td>
                                                        {allStocks.map((stock) => {
                                                            const highlightCls = row.highlight ? row.highlight(stock) : "";
                                                            return (
                                                                <td
                                                                    key={stock.ticker}
                                                                    className={`px-4 py-2.5 text-center ${highlightCls}`}
                                                                >
                                                                    {row.format(stock)}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Summary Box ── */}
            {allStocks.length >= 2 && (
                <Card className="shadow-sm border-blue-200 bg-blue-50/50">
                    <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-blue-800">Tóm tắt so sánh</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-blue-700">
                                    {/* Highest ROE */}
                                    {(() => {
                                        const best = [...allStocks].sort((a, b) => b.listData.roe - a.listData.roe)[0];
                                        return (
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                                <span>ROE cao nhất: <strong>{best.ticker}</strong> ({best.listData.roe.toFixed(1)}%)</span>
                                            </div>
                                        );
                                    })()}
                                    {/* Best P/E */}
                                    {(() => {
                                        const withPE = allStocks.filter(s => s.listData.pe && s.listData.pe > 0);
                                        if (!withPE.length) return null;
                                        const best = [...withPE].sort((a, b) => (a.listData.pe || 999) - (b.listData.pe || 999))[0];
                                        return (
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                <span>P/E thấp nhất: <strong>{best.ticker}</strong> ({best.listData.pe?.toFixed(1)})</span>
                                            </div>
                                        );
                                    })()}
                                    {/* Highest growth */}
                                    {(() => {
                                        const best = [...allStocks].sort((a, b) => b.listData.profitGrowth - a.listData.profitGrowth)[0];
                                        return (
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                <span>Tăng trưởng LN cao nhất: <strong>{best.ticker}</strong> ({best.listData.profitGrowth > 0 ? "+" : ""}{best.listData.profitGrowth.toFixed(1)}%)</span>
                                            </div>
                                        );
                                    })()}
                                    {/* Largest market cap */}
                                    {(() => {
                                        const best = [...allStocks].sort((a, b) => b.listData.marketCap - a.listData.marketCap)[0];
                                        return (
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                                <span>Vốn hóa lớn nhất: <strong>{best.ticker}</strong> ({formatNumber(best.listData.marketCap)} tỷ)</span>
                                            </div>
                                        );
                                    })()}
                                    {/* Highest dividend */}
                                    {(() => {
                                        const best = [...allStocks].sort((a, b) => b.listData.dividendYield - a.listData.dividendYield)[0];
                                        if (best.listData.dividendYield === 0) return null;
                                        return (
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                                <span>Cổ tức cao nhất: <strong>{best.ticker}</strong> ({best.listData.dividendYield.toFixed(1)}%)</span>
                                            </div>
                                        );
                                    })()}
                                    {/* Lowest risk (beta) */}
                                    {(() => {
                                        const best = [...allStocks].sort((a, b) => a.listData.beta - b.listData.beta)[0];
                                        return (
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                                                <span>Beta thấp nhất: <strong>{best.ticker}</strong> ({best.listData.beta.toFixed(2)})</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
