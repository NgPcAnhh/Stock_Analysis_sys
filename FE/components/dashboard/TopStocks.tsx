"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
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

// Mock data
const dataMap = {
    gainers: [
        { symbol: "VGI", price: 35.6, change: 6.9, volume: "2.5M" },
        { symbol: "FPT", price: 112.4, change: 4.2, volume: "1.8M" },
        { symbol: "CTR", price: 98.2, change: 3.5, volume: "800K" },
        { symbol: "GMD", price: 78.5, change: 2.8, volume: "1.2M" },
        { symbol: "DGC", price: 105.3, change: 2.1, volume: "1.5M" },
    ],
    losers: [
        { symbol: "NVL", price: 16.2, change: -4.5, volume: "5.6M" },
        { symbol: "PDR", price: 28.4, change: -3.2, volume: "3.2M" },
        { symbol: "DIG", price: 32.1, change: -2.8, volume: "4.1M" },
        { symbol: "DXG", price: 18.5, change: -2.1, volume: "2.8M" },
        { symbol: "CEO", price: 22.3, change: -1.9, volume: "1.5M" },
    ],
    foreign: [
        { symbol: "HPG", price: 30.2, change: 0.5, volume: "125B" },
        { symbol: "SSI", price: 36.5, change: 1.2, volume: "85B" },
        { symbol: "VNM", price: 68.2, change: -0.2, volume: "62B" },
        { symbol: "MWG", price: 48.5, change: 1.5, volume: "58B" },
        { symbol: "STB", price: 31.4, change: 0.8, volume: "45B" },
    ]
};

export function TopStocks() {
    const [filter, setFilter] = useState<"gainers" | "losers" | "foreign">("gainers");
    const data = dataMap[filter];

    return (
        <Card className="h-full shadow-sm">
            <CardHeader className="pb-2 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">Top Cổ Phiếu</CardTitle>
                <Tabs defaultValue="gainers" onValueChange={(v) => setFilter(v as any)} className="w-auto">
                    <TabsList className="h-8">
                        <TabsTrigger value="gainers" className="text-xs px-2 h-6">Tăng giá</TabsTrigger>
                        <TabsTrigger value="losers" className="text-xs px-2 h-6">Giảm giá</TabsTrigger>
                        <TabsTrigger value="foreign" className="text-xs px-2 h-6">Nước ngoài</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="h-9 text-xs">Mã</TableHead>
                            <TableHead className="h-9 text-xs text-right">Giá</TableHead>
                            <TableHead className="h-9 text-xs text-right">+/-</TableHead>
                            <TableHead className="h-9 text-xs text-right">KL/GT</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.symbol} className="hover:bg-muted/50 border-b border-border/50">
                                <TableCell className="py-2 text-xs font-semibold">{item.symbol}</TableCell>
                                <TableCell className="py-2 text-xs text-right">{item.price.toLocaleString()}</TableCell>
                                <TableCell className="py-2 text-xs text-right">
                                    <span className={cn(
                                        "flex items-center justify-end gap-1 font-medium",
                                        item.change > 0 ? "text-green-500" : item.change < 0 ? "text-red-500" : "text-yellow-500"
                                    )}>
                                        {item.change > 0 ? "+" : ""}{item.change}%
                                    </span>
                                </TableCell>
                                <TableCell className="py-2 text-xs text-right">{item.volume}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
