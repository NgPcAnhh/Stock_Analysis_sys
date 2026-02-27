"use client";

import React, { useCallback, useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SectorItem {
    name: string;
    value: number;
}

export const SectorPerformance = () => {
    const [data, setData] = useState<SectorItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch(
                `${API_BASE}/api/v1/tong-quan/sector-performance`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: SectorItem[] = await res.json();
            setData(json);
        } catch (err: unknown) {
            console.error("Failed to fetch sector performance:", err);
            setError("Không thể tải dữ liệu ngành");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 120_000); // auto-refresh 2 phút
        return () => clearInterval(interval);
    }, [fetchData]);

    // ── Chart option ──
    const option = React.useMemo(() => {
        if (data.length === 0) return {};
        return {
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                formatter: (params: { name: string; value: number }[]) => {
                    const p = params[0];
                    const color = p.value >= 0 ? "#22c55e" : "#ef4444";
                    return `<b>${p.name}</b><br/>
                        <span style="color:${color}; font-weight:600">
                            ${p.value >= 0 ? "+" : ""}${p.value}%
                        </span>`;
                },
            },
            grid: { left: "3%", right: "6%", bottom: "3%", top: "4%", containLabel: true },
            xAxis: {
                type: "category",
                data: data.map((s) => s.name),
                axisLabel: {
                    rotate: data.length > 6 ? 30 : 0,
                    fontSize: 11,
                    interval: 0,
                },
            },
            yAxis: {
                type: "value",
                axisLabel: { formatter: "{value}%" },
            },
            series: [
                {
                    data: data.map((s) => ({
                        value: s.value,
                        itemStyle: {
                            color: s.value >= 0 ? "#22c55e" : "#ef4444",
                            borderRadius: s.value >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
                        },
                    })),
                    type: "bar",
                    barMaxWidth: 36,
                    label: {
                        show: true,
                        position: "top",
                        formatter: (p: { value: number }) =>
                            `${p.value >= 0 ? "+" : ""}${p.value}%`,
                        fontSize: 10,
                        color: "#6b7280",
                    },
                },
            ],
        };
    }, [data]);

    return (
        <Card className="shadow-sm border-gray-200 h-full flex flex-col">
            <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-gray-800">
                        Biến động ngành
                    </CardTitle>
                    {!loading && (
                        <button
                            onClick={fetchData}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Làm mới"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 relative">
                {loading && data.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <p className="text-sm text-red-500">{error}</p>
                        <button
                            onClick={fetchData}
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
                    <ReactECharts
                        option={option}
                        style={{ height: "100%", width: "100%" }}
                        notMerge
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default SectorPerformance;
