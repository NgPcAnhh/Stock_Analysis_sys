"use client";

import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const data = [
    { name: "VNINDEX", price: 1258.56, change: 0.98, status: "up" },
    { name: "Dow Jones", price: 39087.67, change: -0.45, status: "down" },
    { name: "Nasdaq", price: 16274.94, change: 1.23, status: "up" },
    { name: "S&P 500", price: 5137.08, change: 0.80, status: "up" },
    { name: "Nikkei 225", price: 40109.23, change: 1.90, status: "up" },
    { name: "Shanghai", price: 3027.02, change: 0.39, status: "up" },
    { name: "FTSE 100", price: 7682.50, change: -0.15, status: "down" },
    { name: "Hang Seng", price: 16589.44, change: 0.47, status: "up" },
];

export function MarketComparisonTable() {
    return (
        <Card className="shadow-sm h-full flex flex-col">
            <CardHeader className="pb-2 border-b border-border/50 shrink-0">
                <CardTitle className="text-base font-semibold">Thị trường quốc tế</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[120px]">Chỉ số</TableHead>
                            <TableHead className="text-right">Điểm</TableHead>
                            <TableHead className="text-right">% Thay đổi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.name} className="hover:bg-muted/50 border-b border-border/50">
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right font-medium">
                                    {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={cn(
                                        "flex items-center justify-end gap-1 font-semibold",
                                        item.status === "up" ? "text-green-500" : item.status === "down" ? "text-red-500" : "text-yellow-500"
                                    )}>
                                        {item.status === "up" ? <ArrowUp className="h-3 w-3" /> : item.status === "down" ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                        {Math.abs(item.change)}%
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
