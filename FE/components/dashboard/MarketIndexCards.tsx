"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface IndexData {
    id: string;
    name: string;
    value: number;
    change: number;
    percent: number;
    status: "up" | "down" | "unchanged";
}

const INDICES: IndexData[] = [
    { id: "VNINDEX", name: "VN-INDEX", value: 1258.56, change: 12.34, percent: 0.98, status: "up" },
    { id: "VN30", name: "VN30", value: 1290.12, change: 8.45, percent: 0.65, status: "up" },
    { id: "HNX", name: "HNX-INDEX", value: 236.12, change: -1.23, percent: -0.52, status: "down" },
    { id: "UPCOM", name: "UPCOM", value: 90.45, change: 0.00, percent: 0.00, status: "unchanged" },
];

interface MarketIndexCardsProps {
    onIndexSelect?: (indexId: string) => void;
    activeIndex?: string;
}

export function MarketIndexCards({ onIndexSelect, activeIndex }: MarketIndexCardsProps) {
    const [selectedIndex, setSelectedIndex] = useState(activeIndex || "VNINDEX");

    // Sync with parent if activeIndex changes
    React.useEffect(() => {
        if (activeIndex && activeIndex !== selectedIndex) {
            setSelectedIndex(activeIndex);
        }
    }, [activeIndex]);

    const handleSelect = (id: string) => {
        setSelectedIndex(id);
        if (onIndexSelect) {
            onIndexSelect(id);
        }
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {INDICES.map((item) => (
                <div
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                        "relative p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md",
                        selectedIndex === item.id
                            ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                            : "bg-card border-border hover:border-sidebar-border"
                    )}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={cn(
                            "font-bold text-sm",
                            selectedIndex === item.id ? "text-primary" : "text-muted-foreground"
                        )}>
                            {item.name}
                        </span>
                        {item.status === "up" ? (
                            <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                <ArrowUp className="h-3.5 w-3.5" />
                            </div>
                        ) : item.status === "down" ? (
                            <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                <ArrowDown className="h-3.5 w-3.5" />
                            </div>
                        ) : (
                            <div className="h-6 w-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                <Minus className="h-3.5 w-3.5" />
                            </div>
                        )}
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold tracking-tight">
                            {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div
                        className={cn(
                            "text-xs font-medium flex items-center mt-1",
                            item.status === "up" ? "text-green-500" : item.status === "down" ? "text-red-500" : "text-yellow-500"
                        )}
                    >
                        <span>{item.change > 0 ? "+" : ""}{item.change.toFixed(2)}</span>
                        <span className="mx-1">•</span>
                        <span>{item.change > 0 ? "+" : ""}{item.percent.toFixed(2)}%</span>
                    </div>

                    {/* Active Indicator Line */}
                    {selectedIndex === item.id && (
                        <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-t-full" />
                    )}
                </div>
            ))}
        </div>
    );
}
