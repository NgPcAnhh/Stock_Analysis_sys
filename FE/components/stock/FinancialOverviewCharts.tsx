"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
    IncomeStatementItem,
    BalanceSheetItem,
    CashFlowItem,
} from "@/hooks/useStockData";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Convert raw VND to tá»· VND */
const toTyVND = (v: number): number => +(v / 1_000_000_000).toFixed(2);

const fmtTy = (v: number): string => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toFixed(1);
};

const COLORS = {
    blue: "#3B82F6",
    green: "#10B981",
    red: "#EF4444",
    amber: "#F59E0B",
    purple: "#8B5CF6",
    pink: "#EC4899",
    cyan: "#06B6D4",
    indigo: "#6366F1",
    orange: "#F97316",
    teal: "#14B8A6",
    lime: "#84CC16",
    emerald: "#059669",
    sky: "#0EA5E9",
    slate: "#64748B",
};

// â”€â”€ 1. Revenue â€“ COGS â€“ Gross Profit (combo bar + line) â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RevenueOverviewChart({ data }: { data: IncomeStatementItem[] }) {
    const sorted = useMemo(() => [...data].reverse(), [data]);
    const periods = sorted.map((d) => d.period.period);
    const revenue = sorted.map((d) => toTyVND(d.revenue));
    const cogs = sorted.map((d) => toTyVND(Math.abs(d.costOfGoodsSold)));
    const grossProfit = sorted.map((d) => toTyVND(d.grossProfit));
    const grossMargin = sorted.map((d) =>
        d.revenue !== 0 ? +((d.grossProfit / d.revenue) * 100).toFixed(1) : 0
    );

    const option = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "cross" },
            formatter: (params: any[]) => {
                let html = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => {
                    const unit = p.seriesName.includes("BiÃªn") ? "%" : " tá»·";
                    html += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")}${unit}</b><br/>`;
                });
                return html;
            },
        },
        legend: { bottom: 0, textStyle: { fontSize: 11 } },
        grid: { top: 30, right: 50, bottom: 50, left: 60, containLabel: true },
        xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: 30 } },
        yAxis: [
            {
                type: "value",
                name: "Tá»· VND",
                nameTextStyle: { fontSize: 10 },
                axisLabel: { formatter: (v: number) => fmtTy(v) },
            },
            {
                type: "value",
                name: "BiÃªn LN gá»™p (%)",
                nameTextStyle: { fontSize: 10 },
                axisLabel: { formatter: "{value}%" },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: "Doanh thu thuáº§n",
                type: "bar",
                data: revenue,
                itemStyle: { color: COLORS.blue, borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 28,
            },
            {
                name: "GiÃ¡ vá»‘n hÃ ng bÃ¡n",
                type: "bar",
                data: cogs,
                itemStyle: { color: COLORS.red, borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 28,
            },
            {
                name: "Lá»£i nhuáº­n gá»™p",
                type: "bar",
                data: grossProfit,
                itemStyle: { color: COLORS.green, borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 28,
            },
            {
                name: "BiÃªn LN gá»™p",
                type: "line",
                yAxisIndex: 1,
                data: grossMargin,
                smooth: true,
                symbol: "circle",
                symbolSize: 6,
                lineStyle: { width: 2.5, color: COLORS.amber },
                itemStyle: { color: COLORS.amber },
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold text-gray-800">
                    ðŸ“Š Doanh thu & Lá»£i nhuáº­n gá»™p
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <ReactECharts option={option} style={{ height: 340 }} />
            </CardContent>
        </Card>
    );
}

// â”€â”€ 2. Net Profit After Tax + Net Margin (combo bar + line) â”€â”€â”€â”€â”€
function NetProfitChart({ data }: { data: IncomeStatementItem[] }) {
    const sorted = useMemo(() => [...data].reverse(), [data]);
    const periods = sorted.map((d) => d.period.period);
    const netProfit = sorted.map((d) => toTyVND(d.netProfit));
    const netProfitParent = sorted.map((d) => toTyVND(d.netProfitParent));
    const netMargin = sorted.map((d) =>
        d.revenue !== 0 ? +((d.netProfit / d.revenue) * 100).toFixed(1) : 0
    );

    // YoY growth
    const yoyGrowth = sorted.map((d, i) => {
        if (i < 4) return null;
        const prev = sorted[i - 4].netProfit;
        if (prev === 0) return null;
        return +(((d.netProfit - prev) / Math.abs(prev)) * 100).toFixed(1);
    });

    const option = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "cross" },
            formatter: (params: any[]) => {
                let html = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => {
                    if (p.value === null || p.value === undefined) return;
                    const unit = p.seriesName.includes("%") || p.seriesName.includes("BiÃªn") || p.seriesName.includes("tÄƒng trÆ°á»Ÿng") ? "%" : " tá»·";
                    html += `${p.marker} ${p.seriesName}: <b>${typeof p.value === "number" ? p.value.toLocaleString("vi-VN") : p.value}${unit}</b><br/>`;
                });
                return html;
            },
        },
        legend: { bottom: 0, textStyle: { fontSize: 11 } },
        grid: { top: 30, right: 55, bottom: 50, left: 60, containLabel: true },
        xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: 30 } },
        yAxis: [
            {
                type: "value",
                name: "Tá»· VND",
                nameTextStyle: { fontSize: 10 },
                axisLabel: { formatter: (v: number) => fmtTy(v) },
            },
            {
                type: "value",
                name: "%",
                nameTextStyle: { fontSize: 10 },
                axisLabel: { formatter: "{value}%" },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: "LNST",
                type: "bar",
                data: netProfit,
                itemStyle: {
                    color: (params: any) => (params.value >= 0 ? COLORS.green : COLORS.red),
                    borderRadius: [3, 3, 0, 0],
                },
                barMaxWidth: 30,
            },
            {
                name: "LNST CÄCTM",
                type: "bar",
                data: netProfitParent,
                itemStyle: { color: COLORS.teal, borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 30,
            },
            {
                name: "BiÃªn LN rÃ²ng",
                type: "line",
                yAxisIndex: 1,
                data: netMargin,
                smooth: true,
                symbol: "circle",
                symbolSize: 5,
                lineStyle: { width: 2, color: COLORS.purple },
                itemStyle: { color: COLORS.purple },
            },
            {
                name: "TÄƒng trÆ°á»Ÿng YoY",
                type: "line",
                yAxisIndex: 1,
                data: yoyGrowth,
                smooth: true,
                symbol: "diamond",
                symbolSize: 6,
                lineStyle: { width: 2, type: "dashed", color: COLORS.amber },
                itemStyle: { color: COLORS.amber },
                connectNulls: false,
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold text-gray-800">
                    ðŸ’° Lá»£i nhuáº­n sau thuáº¿ & TÄƒng trÆ°á»Ÿng
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <ReactECharts option={option} style={{ height: 340 }} />
            </CardContent>
        </Card>
    );
}

// â”€â”€ 3. Cost Structure (stacked bar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CostStructureChart({ data }: { data: IncomeStatementItem[] }) {
    const sorted = useMemo(() => [...data].reverse(), [data]);
    const periods = sorted.map((d) => d.period.period);
    const cogs = sorted.map((d) => toTyVND(Math.abs(d.costOfGoodsSold)));
    const selling = sorted.map((d) => toTyVND(Math.abs(d.sellingExpenses)));
    const admin = sorted.map((d) => toTyVND(Math.abs(d.adminExpenses)));
    const financial = sorted.map((d) => toTyVND(Math.abs(d.financialExpenses)));
    const tax = sorted.map((d) => toTyVND(Math.abs(d.incomeTax)));

    const option = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: (params: any[]) => {
                let html = `<b>${params[0].axisValue}</b><br/>`;
                let total = 0;
                params.forEach((p: any) => {
                    total += p.value;
                    html += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")} tá»·</b><br/>`;
                });
                html += `<b>Tá»•ng: ${total.toLocaleString("vi-VN")} tá»·</b>`;
                return html;
            },
        },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        grid: { top: 30, right: 20, bottom: 55, left: 60, containLabel: true },
        xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: 30 } },
        yAxis: {
            type: "value",
            name: "Tá»· VND",
            nameTextStyle: { fontSize: 10 },
            axisLabel: { formatter: (v: number) => fmtTy(v) },
        },
        series: [
            {
                name: "GiÃ¡ vá»‘n",
                type: "bar",
                stack: "cost",
                data: cogs,
                itemStyle: { color: COLORS.red },
                barMaxWidth: 35,
            },
            {
                name: "Chi phÃ­ bÃ¡n hÃ ng",
                type: "bar",
                stack: "cost",
                data: selling,
                itemStyle: { color: COLORS.orange },
                barMaxWidth: 35,
            },
            {
                name: "Chi phÃ­ QLDN",
                type: "bar",
                stack: "cost",
                data: admin,
                itemStyle: { color: COLORS.amber },
                barMaxWidth: 35,
            },
            {
                name: "Chi phÃ­ tÃ i chÃ­nh",
                type: "bar",
                stack: "cost",
                data: financial,
                itemStyle: { color: COLORS.purple },
                barMaxWidth: 35,
            },
            {
                name: "Thuáº¿ TNDN",
                type: "bar",
                stack: "cost",
                data: tax,
                itemStyle: { color: COLORS.slate },
                barMaxWidth: 35,
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold text-gray-800">
                    ðŸ—ï¸ CÆ¡ cáº¥u chi phÃ­
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <ReactECharts option={option} style={{ height: 340 }} />
            </CardContent>
        </Card>
    );
}

// â”€â”€ 4. Balance Sheet Structure (stacked area) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BalanceSheetOverviewChart({ data }: { data: BalanceSheetItem[] }) {
    const sorted = useMemo(() => [...data].reverse(), [data]);
    const periods = sorted.map((d) => d.period.period);

    const option = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "cross" },
            formatter: (params: any[]) => {
                let html = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => {
                    html += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")} tá»·</b><br/>`;
                });
                return html;
            },
        },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        grid: { top: 30, right: 20, bottom: 50, left: 60, containLabel: true },
        xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: 30 } },
        yAxis: {
            type: "value",
            name: "Tá»· VND",
            nameTextStyle: { fontSize: 10 },
            axisLabel: { formatter: (v: number) => fmtTy(v) },
        },
        series: [
            {
                name: "Tá»•ng tÃ i sáº£n",
                type: "line",
                data: sorted.map((d) => toTyVND(d.totalAssets)),
                smooth: true,
                lineStyle: { width: 3, color: COLORS.blue },
                itemStyle: { color: COLORS.blue },
                symbol: "circle",
                symbolSize: 6,
                areaStyle: { color: "rgba(59,130,246,0.08)" },
            },
            {
                name: "Vá»‘n chá»§ sá»Ÿ há»¯u",
                type: "bar",
                data: sorted.map((d) => toTyVND(d.totalEquity)),
                itemStyle: { color: COLORS.green, borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 22,
            },
            {
                name: "Tá»•ng ná»£ pháº£i tráº£",
                type: "bar",
                data: sorted.map((d) => toTyVND(d.totalLiabilities)),
                itemStyle: { color: COLORS.red, borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 22,
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold text-gray-800">
                    ðŸ›ï¸ Tá»•ng quan CÃ¢n Ä‘á»‘i káº¿ toÃ¡n
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <ReactECharts option={option} style={{ height: 340 }} />
            </CardContent>
        </Card>
    );
}

// â”€â”€ 5. Asset Composition (stacked bar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AssetCompositionChart({ data }: { data: BalanceSheetItem[] }) {
    const sorted = useMemo(() => [...data].reverse(), [data]);
    const periods = sorted.map((d) => d.period.period);

    const option = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: (params: any[]) => {
                let html = `<b>${params[0].axisValue}</b><br/>`;
                let total = 0;
                params.forEach((p: any) => {
                    total += p.value;
                    html += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")} tá»·</b><br/>`;
                });
                html += `<b>Tá»•ng TS: ${total.toLocaleString("vi-VN")} tá»·</b>`;
                return html;
            },
        },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        grid: { top: 30, right: 20, bottom: 60, left: 60, containLabel: true },
        xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: 30 } },
        yAxis: {
            type: "value",
            name: "Tá»· VND",
            nameTextStyle: { fontSize: 10 },
            axisLabel: { formatter: (v: number) => fmtTy(v) },
        },
        series: [
            {
                name: "Tiá»n & TÄ tiá»n",
                type: "bar",
                stack: "asset",
                data: sorted.map((d) => toTyVND(d.cash)),
                itemStyle: { color: COLORS.cyan },
                barMaxWidth: 35,
            },
            {
                name: "ÄTTC ngáº¯n háº¡n",
                type: "bar",
                stack: "asset",
                data: sorted.map((d) => toTyVND(d.shortTermInvestments)),
                itemStyle: { color: COLORS.sky },
                barMaxWidth: 35,
            },
            {
                name: "Pháº£i thu NH",
                type: "bar",
                stack: "asset",
                data: sorted.map((d) => toTyVND(d.shortTermReceivables)),
                itemStyle: { color: COLORS.blue },
                barMaxWidth: 35,
            },
            {
                name: "HÃ ng tá»“n kho",
                type: "bar",
                stack: "asset",
                data: sorted.map((d) => toTyVND(d.inventory)),
                itemStyle: { color: COLORS.amber },
                barMaxWidth: 35,
            },
            {
                name: "TSCÄ",
                type: "bar",
                stack: "asset",
                data: sorted.map((d) => toTyVND(d.fixedAssets)),
                itemStyle: { color: COLORS.indigo },
                barMaxWidth: 35,
            },
            {
                name: "ÄT dÃ i háº¡n",
                type: "bar",
                stack: "asset",
                data: sorted.map((d) => toTyVND(d.longTermInvestments)),
                itemStyle: { color: COLORS.purple },
                barMaxWidth: 35,
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold text-gray-800">
                    ðŸ“¦ CÆ¡ cáº¥u tÃ i sáº£n
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <ReactECharts option={option} style={{ height: 340 }} />
            </CardContent>
        </Card>
    );
}

// â”€â”€ 6. Cash Flow Overview (waterfall-style grouped bar) â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CashFlowOverviewChart({ data }: { data: CashFlowItem[] }) {
    const sorted = useMemo(() => [...data].reverse(), [data]);
    const periods = sorted.map((d) => d.period.period);
    const operating = sorted.map((d) => toTyVND(d.operatingCashFlow));
    const investing = sorted.map((d) => toTyVND(d.investingCashFlow));
    const financing = sorted.map((d) => toTyVND(d.financingCashFlow));
    const netChange = sorted.map((d) => toTyVND(d.netCashChange));

    const option = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: (params: any[]) => {
                let html = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => {
                    html += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")} tá»·</b><br/>`;
                });
                return html;
            },
        },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        grid: { top: 30, right: 20, bottom: 50, left: 60, containLabel: true },
        xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: 30 } },
        yAxis: {
            type: "value",
            name: "Tá»· VND",
            nameTextStyle: { fontSize: 10 },
            axisLabel: { formatter: (v: number) => fmtTy(v) },
        },
        series: [
            {
                name: "LCTT tá»« HÄKD",
                type: "bar",
                data: operating,
                itemStyle: { color: COLORS.green, borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 22,
            },
            {
                name: "LCTT tá»« HÄÄT",
                type: "bar",
                data: investing,
                itemStyle: { color: COLORS.orange, borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 22,
            },
            {
                name: "LCTT tá»« HÄTC",
                type: "bar",
                data: financing,
                itemStyle: { color: COLORS.purple, borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 22,
            },
            {
                name: "Thay Ä‘á»•i tiá»n rÃ²ng",
                type: "line",
                data: netChange,
                smooth: true,
                symbol: "circle",
                symbolSize: 7,
                lineStyle: { width: 2.5, color: COLORS.blue, type: "dashed" },
                itemStyle: { color: COLORS.blue },
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold text-gray-800">
                    ðŸ’µ Tá»•ng quan DÃ²ng tiá»n
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <ReactECharts option={option} style={{ height: 340 }} />
            </CardContent>
        </Card>
    );
}

// â”€â”€ 7. Debt vs Equity (stacked bar + D/E ratio line) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DebtEquityChart({ data }: { data: BalanceSheetItem[] }) {
    const sorted = useMemo(() => [...data].reverse(), [data]);
    const periods = sorted.map((d) => d.period.period);
    const shortDebt = sorted.map((d) => toTyVND(d.currentLiabilities));
    const longDebt = sorted.map((d) => toTyVND(d.longTermLiabilities));
    const equity = sorted.map((d) => toTyVND(d.totalEquity));
    const deRatio = sorted.map((d) =>
        d.totalEquity !== 0 ? +((d.totalLiabilities / d.totalEquity) * 100).toFixed(1) : 0
    );

    const option = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "cross" },
            formatter: (params: any[]) => {
                let html = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => {
                    const unit = p.seriesName.includes("D/E") ? "%" : " tá»·";
                    html += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")}${unit}</b><br/>`;
                });
                return html;
            },
        },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        grid: { top: 30, right: 55, bottom: 50, left: 60, containLabel: true },
        xAxis: { type: "category", data: periods, axisLabel: { fontSize: 10, rotate: 30 } },
        yAxis: [
            {
                type: "value",
                name: "Tá»· VND",
                nameTextStyle: { fontSize: 10 },
                axisLabel: { formatter: (v: number) => fmtTy(v) },
            },
            {
                type: "value",
                name: "D/E (%)",
                nameTextStyle: { fontSize: 10 },
                axisLabel: { formatter: "{value}%" },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: "Ná»£ ngáº¯n háº¡n",
                type: "bar",
                stack: "debt",
                data: shortDebt,
                itemStyle: { color: COLORS.red },
                barMaxWidth: 28,
            },
            {
                name: "Ná»£ dÃ i háº¡n",
                type: "bar",
                stack: "debt",
                data: longDebt,
                itemStyle: { color: COLORS.orange },
                barMaxWidth: 28,
            },
            {
                name: "VCSH",
                type: "bar",
                data: equity,
                itemStyle: { color: COLORS.green, borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 28,
            },
            {
                name: "D/E Ratio",
                type: "line",
                yAxisIndex: 1,
                data: deRatio,
                smooth: true,
                symbol: "circle",
                symbolSize: 6,
                lineStyle: { width: 2.5, color: COLORS.indigo },
                itemStyle: { color: COLORS.indigo },
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold text-gray-800">
                    âš–ï¸ Ná»£ & Vá»‘n chá»§ sá»Ÿ há»¯u
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <ReactECharts option={option} style={{ height: 340 }} />
            </CardContent>
        </Card>
    );
}

// â”€â”€ 8. Latest Period Pie: Revenue Breakdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LatestPeriodPieChart({ income, balance }: { income: IncomeStatementItem; balance: BalanceSheetItem }) {
    const pieProfitData = [
        { name: "GiÃ¡ vá»‘n", value: toTyVND(Math.abs(income.costOfGoodsSold)), itemStyle: { color: COLORS.red } },
        { name: "CP bÃ¡n hÃ ng", value: toTyVND(Math.abs(income.sellingExpenses)), itemStyle: { color: COLORS.orange } },
        { name: "CP quáº£n lÃ½", value: toTyVND(Math.abs(income.adminExpenses)), itemStyle: { color: COLORS.amber } },
        { name: "CP tÃ i chÃ­nh", value: toTyVND(Math.abs(income.financialExpenses)), itemStyle: { color: COLORS.purple } },
        { name: "Thuáº¿ TNDN", value: toTyVND(Math.abs(income.incomeTax)), itemStyle: { color: COLORS.slate } },
        { name: "LNST", value: toTyVND(Math.max(income.netProfit, 0)), itemStyle: { color: COLORS.green } },
    ].filter((d) => d.value > 0);

    const pieSourceData = [
        { name: "VCSH", value: toTyVND(balance.totalEquity), itemStyle: { color: COLORS.green } },
        { name: "Ná»£ ngáº¯n háº¡n", value: toTyVND(balance.currentLiabilities), itemStyle: { color: COLORS.red } },
        { name: "Ná»£ dÃ i háº¡n", value: toTyVND(balance.longTermLiabilities), itemStyle: { color: COLORS.orange } },
    ].filter((d) => d.value > 0);

    const option = {
        tooltip: {
            trigger: "item",
            formatter: (p: any) => `${p.marker} ${p.name}: <b>${p.value.toLocaleString("vi-VN")} tá»·</b> (${p.percent}%)`,
        },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        series: [
            {
                name: "PhÃ¢n bá»• doanh thu",
                type: "pie",
                radius: ["0%", "55%"],
                center: ["25%", "45%"],
                data: pieProfitData,
                label: { show: false },
                emphasis: { label: { show: true, fontSize: 11, fontWeight: "bold" } },
            },
            {
                name: "CÆ¡ cáº¥u nguá»“n vá»‘n",
                type: "pie",
                radius: ["30%", "55%"],
                center: ["72%", "45%"],
                data: pieSourceData,
                label: { show: false },
                emphasis: { label: { show: true, fontSize: 11, fontWeight: "bold" } },
                roseType: "radius",
            },
        ],
        graphic: [
            {
                type: "text",
                left: "14%",
                top: 5,
                style: { text: "PhÃ¢n bá»• doanh thu", fontSize: 12, fontWeight: "bold", fill: "#374151" },
            },
            {
                type: "text",
                left: "61%",
                top: 5,
                style: { text: "CÆ¡ cáº¥u nguá»“n vá»‘n", fontSize: 12, fontWeight: "bold", fill: "#374151" },
            },
        ],
    };

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-1">
                <CardTitle className="text-sm font-bold text-gray-800">
                    ðŸ© Ká»³ gáº§n nháº¥t: {income.period.period}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <ReactECharts option={option} style={{ height: 320 }} />
            </CardContent>
        </Card>
    );
}

// â”€â”€ 9. KPI Summary Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KPISummaryCards({
    income,
    balance,
    cashflow,
}: {
    income: IncomeStatementItem[];
    balance: BalanceSheetItem[];
    cashflow: CashFlowItem[];
}) {
    const latest = income[0];
    const prev = income.length > 1 ? income[1] : null;
    const latestBS = balance[0];
    const latestCF = cashflow[0];

    const revenueGrowth =
        prev && prev.revenue !== 0
            ? +(((latest.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100).toFixed(1)
            : null;
    const profitGrowth =
        prev && prev.netProfit !== 0
            ? +(((latest.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100).toFixed(1)
            : null;
    const grossMargin = latest.revenue !== 0 ? +((latest.grossProfit / latest.revenue) * 100).toFixed(1) : 0;
    const netMargin = latest.revenue !== 0 ? +((latest.netProfit / latest.revenue) * 100).toFixed(1) : 0;
    const deRatio = latestBS.totalEquity !== 0 ? +((latestBS.totalLiabilities / latestBS.totalEquity)).toFixed(2) : 0;

    const kpis = [
        {
            label: "Doanh thu",
            value: `${toTyVND(latest.revenue).toLocaleString("vi-VN")} tá»·`,
            change: revenueGrowth,
            color: "blue",
        },
        {
            label: "LNST",
            value: `${toTyVND(latest.netProfit).toLocaleString("vi-VN")} tá»·`,
            change: profitGrowth,
            color: "green",
        },
        {
            label: "BiÃªn LN gá»™p",
            value: `${grossMargin}%`,
            change: null,
            color: "amber",
        },
        {
            label: "BiÃªn LN rÃ²ng",
            value: `${netMargin}%`,
            change: null,
            color: "purple",
        },
        {
            label: "Tá»•ng tÃ i sáº£n",
            value: `${toTyVND(latestBS.totalAssets).toLocaleString("vi-VN")} tá»·`,
            change: null,
            color: "indigo",
        },
        {
            label: "D/E Ratio",
            value: `${deRatio}x`,
            change: null,
            color: "red",
        },
        {
            label: "VCSH",
            value: `${toTyVND(latestBS.totalEquity).toLocaleString("vi-VN")} tá»·`,
            change: null,
            color: "teal",
        },
        {
            label: "LCTT tá»« HÄKD",
            value: `${toTyVND(latestCF.operatingCashFlow).toLocaleString("vi-VN")} tá»·`,
            change: null,
            color: "cyan",
        },
    ];

    const colorMap: Record<string, string> = {
        blue: "bg-blue-50 border-blue-200 text-blue-700",
        green: "bg-green-50 border-green-200 text-green-700",
        amber: "bg-amber-50 border-amber-200 text-amber-700",
        purple: "bg-purple-50 border-purple-200 text-purple-700",
        indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
        red: "bg-red-50 border-red-200 text-red-700",
        teal: "bg-teal-50 border-teal-200 text-teal-700",
        cyan: "bg-cyan-50 border-cyan-200 text-cyan-700",
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {kpis.map((kpi) => (
                <div
                    key={kpi.label}
                    className={`rounded-lg border p-3 ${colorMap[kpi.color] || "bg-gray-50 border-gray-200 text-gray-700"}`}
                >
                    <div className="text-[10px] font-medium opacity-70 uppercase tracking-wide">
                        {kpi.label}
                    </div>
                    <div className="text-sm font-bold mt-1 leading-tight">{kpi.value}</div>
                    {kpi.change !== null && (
                        <div
                            className={`text-[10px] font-semibold mt-0.5 ${
                                kpi.change >= 0 ? "text-green-600" : "text-red-500"
                            }`}
                        >
                            {kpi.change >= 0 ? "â–²" : "â–¼"} {Math.abs(kpi.change)}% vs quÃ½ trÆ°á»›c
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN EXPORT â€” Financial Overview Charts
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
interface FinancialOverviewChartsProps {
    incomeStatement: IncomeStatementItem[];
    balanceSheet: BalanceSheetItem[];
    cashFlow: CashFlowItem[];
}

export default function FinancialOverviewCharts({
    incomeStatement,
    balanceSheet,
    cashFlow,
}: FinancialOverviewChartsProps) {
    if (!incomeStatement.length || !balanceSheet.length || !cashFlow.length) {
        return (
            <div className="text-center py-8 text-gray-400">
                KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»ƒ hiá»ƒn thá»‹ biá»ƒu Ä‘á»“
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* KPI Summary */}
            <KPISummaryCards
                income={incomeStatement}
                balance={balanceSheet}
                cashflow={cashFlow}
            />

            {/* Row 1: Revenue + Net Profit */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RevenueOverviewChart data={incomeStatement} />
                <NetProfitChart data={incomeStatement} />
            </div>

            {/* Row 2: Cost Structure + Pie Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CostStructureChart data={incomeStatement} />
                <LatestPeriodPieChart
                    income={incomeStatement[0]}
                    balance={balanceSheet[0]}
                />
            </div>

            {/* Row 3: Balance Sheet + Assets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BalanceSheetOverviewChart data={balanceSheet} />
                <AssetCompositionChart data={balanceSheet} />
            </div>

            {/* Row 4: Cash Flow + Debt/Equity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CashFlowOverviewChart data={cashFlow} />
                <DebtEquityChart data={balanceSheet} />
            </div>
        </div>
    );
}
