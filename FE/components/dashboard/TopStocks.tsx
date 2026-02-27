"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface StockItem {
    symbol: string;
    price: number;
    change: number;
    volume: string;
}

type Category = "gainers" | "losers" | "foreign";

const LIMITS: Record<Category, number> = {
    gainers: 10,
    losers: 10,
    foreign: 5,
};

export function TopStocks() {
    const [filter, setFilter] = useState<Category>("gainers");
    const [data, setData] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(
        async (cat: Category) => {
            try {
                setError(null);
                setLoading(true);
                const limit = LIMITS[cat];
                const res = await fetch(
                    `${API_BASE}/api/v1/tong-quan/top-stocks?category=${cat}&limit=${limit}`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json: StockItem[] = await res.json();
                setData(json);
            } catch (err: unknown) {
                console.error("Failed to fetch top stocks:", err);
                setError("Không thể tải dữ liệu");
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchData(filter);
        const interval = setInterval(() => fetchData(filter), 120_000);
        return () => clearInterval(interval);
    }, [filter, fetchData]);

    const handleTabChange = (v: string) => {
        setFilter(v as Category);
    };

    // Label cho cột KL/GT tùy tab
    const volumeLabel = filter === "foreign" ? "KL GD" : "KL/GT";

    return (
        <Card className="h-full shadow-sm flex flex-col">
            <CardHeader className="pb-2 border-b border-border/50 flex flex-row items-center justify-between shrink-0">
                <CardTitle className="text-base font-semibold">
                    Top Cổ Phiếu
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Tabs
                        value={filter}
                        onValueChange={handleTabChange}
                        className="w-auto"
                    >
                        <TabsList className="h-8">
                            <TabsTrigger
                                value="gainers"
                                className="text-xs px-2 h-6"
                            >
                                Tăng giá
                            </TabsTrigger>
                            <TabsTrigger
                                value="losers"
                                className="text-xs px-2 h-6"
                            >
                                Giảm giá
                            </TabsTrigger>
                            <TabsTrigger
                                value="foreign"
                                className="text-xs px-2 h-6"
                            >
                                Nước ngoài
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {!loading && (
                        <button
                            onClick={() => fetchData(filter)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Làm mới"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-y-auto relative">
                {loading && data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <p className="text-sm text-red-500">{error}</p>
                        <button
                            onClick={() => fetchData(filter)}
                            className="text-xs text-blue-500 hover:underline"
                        >
                            Thử lại
                        </button>
                    </div>
                ) : data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                            Không có dữ liệu
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="h-9 text-xs w-8">
                                    #
                                </TableHead>
                                <TableHead className="h-9 text-xs">
                                    Mã
                                </TableHead>
                                <TableHead className="h-9 text-xs text-right">
                                    Giá
                                </TableHead>
                                <TableHead className="h-9 text-xs text-right">
                                    +/-
                                </TableHead>
                                {filter === "foreign" && (
                                    <TableHead className="h-9 text-xs text-right">
                                        {volumeLabel}
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item, idx) => (
                                <TableRow
                                    key={item.symbol}
                                    className="hover:bg-muted/50 border-b border-border/50"
                                >
                                    <TableCell className="py-2 text-xs text-muted-foreground">
                                        {idx + 1}
                                    </TableCell>
                                    <TableCell className="py-2 text-xs font-semibold">
                                        {item.symbol}
                                    </TableCell>
                                    <TableCell className="py-2 text-xs text-right">
                                        {item.price.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </TableCell>
                                    <TableCell className="py-2 text-xs text-right">
                                        <span
                                            className={cn(
                                                "flex items-center justify-end gap-1 font-medium",
                                                item.change > 0
                                                    ? "text-green-500"
                                                    : item.change < 0
                                                        ? "text-red-500"
                                                        : "text-yellow-500"
                                            )}
                                        >
                                            {item.change > 0 ? "+" : ""}
                                            {item.change.toFixed(2)}%
                                        </span>
                                    </TableCell>
                                    {filter === "foreign" && (
                                        <TableCell className="py-2 text-xs text-right">
                                            {item.volume}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
