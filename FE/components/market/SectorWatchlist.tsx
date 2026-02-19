"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const sectors = [
    { id: "bank", name: "Ngân hàng", count: 27 },
    { id: "real_estate", name: "Bất động sản", count: 85 },
    { id: "securities", name: "Chứng khoán", count: 34 },
    { id: "oil", name: "Dầu khí", count: 12 },
    { id: "tech", name: "Công nghệ", count: 8 },
    { id: "retail", name: "Bán lẻ", count: 15 },
    { id: "steel", name: "Thép", count: 9 },
];

const stocks = {
    "bank": [
        { symbol: "VCB", price: 92.5, change: 1.2 },
        { symbol: "BID", price: 45.2, change: 0.8 },
        { symbol: "CTG", price: 32.1, change: -0.5 },
        { symbol: "TCB", price: 38.6, change: 2.1 },
        { symbol: "MBB", price: 22.4, change: -1.1 },
    ],
    "real_estate": [
        { symbol: "VHM", price: 42.5, change: -1.5 },
        { symbol: "VIC", price: 45.0, change: -0.8 },
        { symbol: "NVL", price: 16.2, change: 3.2 },
        { symbol: "DXG", price: 18.4, change: 4.1 },
    ],
    "securities": [
        { symbol: "SSI", price: 34.2, change: 1.5 },
        { symbol: "VND", price: 22.1, change: 0.9 },
        { symbol: "VCI", price: 48.5, change: 2.2 },
    ],
    "tech": [
        { symbol: "FPT", price: 102.5, change: 2.5 },
        { symbol: "CMG", price: 45.2, change: 1.8 },
        { symbol: "ELC", price: 22.1, change: 0.5 },
    ]
};

export function SectorWatchlist() {
    const [selectedSectors, setSelectedSectors] = useState<string[]>(["bank", "real_estate", "securities", "tech"]);

    const toggleSector = (id: string) => {
        setSelectedSectors(prev =>
            prev.includes(id)
                ? prev.filter(s => s !== id)
                : [...prev, id]
        );
    };

    return (
        <Card className="shadow-sm border-none bg-transparent shadow-none">
            <CardHeader className="pb-4 px-0">
                <div className="flex flex-col gap-4">
                    <CardTitle className="text-lg font-bold text-slate-800">Bảng giá chi tiết theo Ngành</CardTitle>

                    {/* Filter Controls */}
                    <div className="flex flex-wrap gap-2">
                        {sectors.map((sector) => {
                            const isSelected = selectedSectors.includes(sector.id);
                            return (
                                <Badge
                                    key={sector.id}
                                    variant={isSelected ? "default" : "outline"}
                                    className={`cursor-pointer transition-all hover:opacity-80 px-3 py-1 ${isSelected
                                            ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600"
                                        }`}
                                    onClick={() => toggleSector(sector.id)}
                                >
                                    {sector.name}
                                    <span className={`ml-2 text-[10px] ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                                        {sector.count}
                                    </span>
                                </Badge>
                            );
                        })}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sectors
                        .filter(sector => selectedSectors.includes(sector.id))
                        .map((sector) => {
                            const items = stocks[sector.id as keyof typeof stocks] || [];
                            if (items.length === 0) return null;

                            return (
                                <Card key={sector.id} className="h-full flex flex-col shadow-sm border-slate-200">
                                    <CardHeader className="py-3 px-4 bg-slate-50/50 border-b border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-sm font-bold text-slate-700">{sector.name}</CardTitle>
                                            <Badge variant="secondary" className="bg-white border-slate-200 text-slate-500 font-normal">
                                                {items.length} mã
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-1">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/30">
                                                        <th className="text-left font-medium py-2 px-4">Mã</th>
                                                        <th className="text-right font-medium py-2 px-4">Giá</th>
                                                        <th className="text-right font-medium py-2 px-4">Changes</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((stock, idx) => (
                                                        <tr
                                                            key={stock.symbol}
                                                            className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/10"
                                                                }`}
                                                        >
                                                            <td className="py-2.5 px-4 font-semibold text-slate-700">{stock.symbol}</td>
                                                            <td className="py-2.5 px-4 text-right text-slate-600">{stock.price.toFixed(2)}</td>
                                                            <td className="py-2.5 px-4 text-right">
                                                                <span className={`inline-flex items-center justify-end px-1.5 py-0.5 rounded text-[10px] font-medium min-w-[50px] ${stock.change > 0
                                                                    ? "text-green-700 bg-green-50"
                                                                    : stock.change < 0
                                                                        ? "text-red-700 bg-red-50"
                                                                        : "text-yellow-700 bg-yellow-50"
                                                                    }`}>
                                                                    {stock.change > 0 ? "+" : ""}{stock.change}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                </div>
            </CardContent>
        </Card>
    );
}
