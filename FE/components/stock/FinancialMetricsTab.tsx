"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinancialReportData } from "@/lib/financialReportData";
import { useStockDetail } from "@/lib/StockDetailContext";

const formatBillion = (val: number) => {
    if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return `${val}`;
};

function SectionHeading({ icon, color, title }: { icon: string; color: string; title: string }) {
    return (
        <h3 className="text-base font-semibold text-gray-700 flex items-center gap-2">
            <span className={`w-1 h-5 ${color} rounded-full`} />
            <span>{icon}</span>
            {title}
        </h3>
    );
}

export default function FinancialMetricsTab() {
    const { stockInfo } = useStockDetail();
    const data = getFinancialReportData(stockInfo.ticker);

    const statements = data.incomeStatements;
    const balanceSheets = data.balanceSheets;
    const cashFlows = data.cashFlows;

    const sorted = [...statements].reverse();
    const sortedBS = [...balanceSheets].reverse();
    const sortedCF = [...cashFlows].reverse();
    const periods = sorted.map((s) => s.period.period);

    // Derived metrics
    const grossMargins = sorted.map((s) =>
        parseFloat(((s.grossProfit / s.revenue) * 100).toFixed(1))
    );
    const netMargins = sorted.map((s) =>
        parseFloat(((s.netProfit / s.revenue) * 100).toFixed(1))
    );
    const operatingMargins = sorted.map((s) =>
        parseFloat(((s.operatingProfit / s.revenue) * 100).toFixed(1))
    );
    const debtToEquity = sortedBS.map((b) =>
        parseFloat((b.totalLiabilities / b.totalEquity).toFixed(2))
    );
    const currentRatio = sortedBS.map((b) =>
        parseFloat((b.currentAssets / b.currentLiabilities).toFixed(2))
    );
    const roe = sorted.map((s, i) =>
        parseFloat(((s.netProfit / sortedBS[i].totalEquity) * 100).toFixed(1))
    );
    const roa = sorted.map((s, i) =>
        parseFloat(((s.netProfit / sortedBS[i].totalAssets) * 100).toFixed(1))
    );
    const revenueGrowth = sorted.map((s, i) =>
        i === 0 ? 0 : parseFloat((((s.revenue - sorted[i - 1].revenue) / sorted[i - 1].revenue) * 100).toFixed(1))
    );
    const netProfitGrowth = sorted.map((s, i) =>
        i === 0 ? 0 : parseFloat((((s.netProfit - sorted[i - 1].netProfit) / Math.abs(sorted[i - 1].netProfit)) * 100).toFixed(1))
    );

    // ============ CHART OPTIONS ============

    const revenueNetProfitOption = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "cross" },
            formatter: (params: any) => {
                let result = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => {
                    result += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")} tỷ</b><br/>`;
                });
                return result;
            },
        },
        legend: { data: ["Doanh thu", "Lợi nhuận gộp", "LNST"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "14%", top: "10%", containLabel: true },
        xAxis: { type: "category", data: periods },
        yAxis: { type: "value", axisLabel: { formatter: (v: number) => formatBillion(v) + " tỷ" } },
        series: [
            { name: "Doanh thu", type: "bar", data: sorted.map((s) => s.revenue), itemStyle: { color: "#3b82f6", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 32 },
            { name: "Lợi nhuận gộp", type: "bar", data: sorted.map((s) => s.grossProfit), itemStyle: { color: "#22c55e", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 32 },
            { name: "LNST", type: "bar", data: sorted.map((s) => s.netProfit), itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 32 },
        ],
    };

    const marginOption = {
        tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
                let result = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => { result += `${p.marker} ${p.seriesName}: <b>${p.value}%</b><br/>`; });
                return result;
            },
        },
        legend: { data: ["Biên LN gộp", "Biên LNST", "Biên HĐKD"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "14%", top: "10%", containLabel: true },
        xAxis: { type: "category", data: periods },
        yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
        series: [
            { name: "Biên LN gộp", type: "line", data: grossMargins, smooth: true, lineStyle: { width: 3, color: "#3b82f6" }, itemStyle: { color: "#3b82f6" }, symbol: "circle", symbolSize: 8 },
            { name: "Biên LNST", type: "line", data: netMargins, smooth: true, lineStyle: { width: 3, color: "#ef4444" }, itemStyle: { color: "#ef4444" }, symbol: "circle", symbolSize: 8 },
            { name: "Biên HĐKD", type: "line", data: operatingMargins, smooth: true, lineStyle: { width: 3, color: "#8b5cf6" }, itemStyle: { color: "#8b5cf6" }, symbol: "circle", symbolSize: 8 },
        ],
    };

    const assetsLiabOption = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: (params: any) => {
                let result = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => { result += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")} tỷ</b><br/>`; });
                return result;
            },
        },
        legend: { data: ["VCSH", "Tổng nợ", "Vốn chủ sở hữu"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "14%", top: "10%", containLabel: true },
        xAxis: { type: "category", data: periods },
        yAxis: { type: "value", axisLabel: { formatter: (v: number) => formatBillion(v) + " tỷ" } },
        series: [
            { name: "VCSH", type: "bar", stack: "total", data: sortedBS.map((b) => b.totalEquity), itemStyle: { color: "#22c55e" }, barMaxWidth: 40 },
            { name: "Tổng nợ", type: "bar", stack: "total", data: sortedBS.map((b) => b.totalLiabilities), itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 40 },
            { name: "Vốn chủ sở hữu", type: "line", data: sortedBS.map((b) => b.totalEquity), smooth: true, lineStyle: { width: 2, color: "#3b82f6", type: "dashed" as const }, itemStyle: { color: "#3b82f6" }, symbol: "circle", symbolSize: 6 },
        ],
    };

    const roeRoaOption = {
        tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
                let result = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => { result += `${p.marker} ${p.seriesName}: <b>${p.value}%</b><br/>`; });
                return result;
            },
        },
        legend: { data: ["ROE", "ROA"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "14%", top: "10%", containLabel: true },
        xAxis: { type: "category", data: periods },
        yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
        series: [
            { name: "ROE", type: "bar", data: roe, itemStyle: { color: "#3b82f6", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 },
            { name: "ROA", type: "bar", data: roa, itemStyle: { color: "#f97316", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 },
        ],
    };

    const debtRatioOption = {
        tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
                let result = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => { result += `${p.marker} ${p.seriesName}: <b>${p.value}</b><br/>`; });
                return result;
            },
        },
        legend: { data: ["Nợ/VCSH (D/E)", "Hệ số TT ngắn hạn"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "14%", top: "10%", containLabel: true },
        xAxis: { type: "category", data: periods },
        yAxis: [
            { type: "value", name: "D/E", position: "left" },
            { type: "value", name: "Hệ số TT", position: "right" },
        ],
        series: [
            {
                name: "Nợ/VCSH (D/E)", type: "line", data: debtToEquity, smooth: true,
                lineStyle: { width: 3, color: "#ef4444" }, itemStyle: { color: "#ef4444" },
                symbol: "diamond", symbolSize: 10,
                areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(239,68,68,0.2)" }, { offset: 1, color: "rgba(239,68,68,0.01)" }] } },
            },
            {
                name: "Hệ số TT ngắn hạn", type: "line", yAxisIndex: 1, data: currentRatio, smooth: true,
                lineStyle: { width: 3, color: "#22c55e" }, itemStyle: { color: "#22c55e" }, symbol: "circle", symbolSize: 8,
            },
        ],
    };

    const expenseBreakdownOption = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: (params: any) => {
                let result = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => { result += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")} tỷ</b><br/>`; });
                return result;
            },
        },
        legend: { data: ["Giá vốn", "CP bán hàng", "CP quản lý", "CP tài chính"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "14%", top: "10%", containLabel: true },
        xAxis: { type: "category", data: periods },
        yAxis: { type: "value", axisLabel: { formatter: (v: number) => formatBillion(v) + " tỷ" } },
        series: [
            { name: "Giá vốn", type: "bar", stack: "expenses", data: sorted.map((s) => s.costOfGoodsSold), itemStyle: { color: "#ef4444" }, barMaxWidth: 40 },
            { name: "CP bán hàng", type: "bar", stack: "expenses", data: sorted.map((s) => s.sellingExpenses), itemStyle: { color: "#f97316" }, barMaxWidth: 40 },
            { name: "CP quản lý", type: "bar", stack: "expenses", data: sorted.map((s) => s.adminExpenses), itemStyle: { color: "#eab308" }, barMaxWidth: 40 },
            { name: "CP tài chính", type: "bar", stack: "expenses", data: sorted.map((s) => s.financialExpenses), itemStyle: { color: "#8b5cf6", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 40 },
        ],
    };

    // ============ NEW CHARTS ============

    const growthOption = {
        tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
                let result = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => { result += `${p.marker} ${p.seriesName}: <b>${p.value}%</b><br/>`; });
                return result;
            },
        },
        legend: { data: ["Tăng trưởng DT", "Tăng trưởng LNST"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "14%", top: "10%", containLabel: true },
        xAxis: { type: "category", data: periods },
        yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
        series: [
            {
                name: "Tăng trưởng DT", type: "bar", data: revenueGrowth, barMaxWidth: 28,
                itemStyle: { color: (params: any) => params.value >= 0 ? "#22c55e" : "#ef4444", borderRadius: [4, 4, 0, 0] },
            },
            {
                name: "Tăng trưởng LNST", type: "bar", data: netProfitGrowth, barMaxWidth: 28,
                itemStyle: { color: (params: any) => params.value >= 0 ? "#3b82f6" : "#f97316", borderRadius: [4, 4, 0, 0] },
            },
        ],
    };

    const cashFlowOption = {
        tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
                let result = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => { result += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")} tỷ</b><br/>`; });
                return result;
            },
        },
        legend: { data: ["HĐKD", "HĐĐT", "HĐTC", "Tiền thuần"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "14%", top: "10%", containLabel: true },
        xAxis: { type: "category", data: periods },
        yAxis: { type: "value", axisLabel: { formatter: (v: number) => formatBillion(v) + " tỷ" } },
        series: [
            { name: "HĐKD", type: "bar", data: sortedCF.map((c) => c.operatingCashFlow), itemStyle: { color: "#22c55e", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 24 },
            { name: "HĐĐT", type: "bar", data: sortedCF.map((c) => c.investingCashFlow), itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 24 },
            { name: "HĐTC", type: "bar", data: sortedCF.map((c) => c.financingCashFlow), itemStyle: { color: "#8b5cf6", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 24 },
            { name: "Tiền thuần", type: "line", data: sortedCF.map((c) => c.netCashChange), smooth: true, lineStyle: { width: 3, color: "#f59e0b" }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 8 },
        ],
    };

    const epsOption = {
        tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
                let result = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => {
                    const unit = p.seriesName === "EPS" ? " VND" : " tỷ";
                    result += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")}${unit}</b><br/>`;
                });
                return result;
            },
        },
        legend: { data: ["EPS", "LNST CĐ mẹ"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "14%", top: "10%", containLabel: true },
        xAxis: { type: "category", data: periods },
        yAxis: [
            { type: "value", name: "EPS (VND)", position: "left" },
            { type: "value", name: "LNST CĐ mẹ (tỷ)", position: "right", axisLabel: { formatter: (v: number) => formatBillion(v) } },
        ],
        series: [
            {
                name: "EPS", type: "bar", data: sorted.map((s) => s.eps), barMaxWidth: 36,
                itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#6366f1" }, { offset: 1, color: "#818cf8" }] }, borderRadius: [4, 4, 0, 0] },
            },
            {
                name: "LNST CĐ mẹ", type: "line", yAxisIndex: 1, data: sorted.map((s) => s.netProfitParent),
                smooth: true, lineStyle: { width: 3, color: "#f59e0b" }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 8,
            },
        ],
    };

    const assetBreakdownOption = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: (params: any) => {
                let result = `<b>${params[0].axisValue}</b><br/>`;
                params.forEach((p: any) => { result += `${p.marker} ${p.seriesName}: <b>${p.value.toLocaleString("vi-VN")} tỷ</b><br/>`; });
                return result;
            },
        },
        legend: { data: ["Tiền mặt", "ĐT ngắn hạn", "Phải thu", "Tồn kho", "TS dài hạn"], bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "16%", top: "10%", containLabel: true },
        xAxis: { type: "category", data: periods },
        yAxis: { type: "value", axisLabel: { formatter: (v: number) => formatBillion(v) + " tỷ" } },
        series: [
            { name: "Tiền mặt", type: "bar", stack: "assets", data: sortedBS.map((b) => b.cash), itemStyle: { color: "#22c55e" }, barMaxWidth: 40 },
            { name: "ĐT ngắn hạn", type: "bar", stack: "assets", data: sortedBS.map((b) => b.shortTermInvestments), itemStyle: { color: "#10b981" }, barMaxWidth: 40 },
            { name: "Phải thu", type: "bar", stack: "assets", data: sortedBS.map((b) => b.shortTermReceivables), itemStyle: { color: "#3b82f6" }, barMaxWidth: 40 },
            { name: "Tồn kho", type: "bar", stack: "assets", data: sortedBS.map((b) => b.inventory), itemStyle: { color: "#f59e0b" }, barMaxWidth: 40 },
            { name: "TS dài hạn", type: "bar", stack: "assets", data: sortedBS.map((b) => b.nonCurrentAssets), itemStyle: { color: "#8b5cf6", borderRadius: [4, 4, 0, 0] }, barMaxWidth: 40 },
        ],
    };

    return (
        <div className="space-y-6">
            {/* Title */}
            <h2 className="text-lg font-bold text-gray-800">
                Số liệu tài chính - {stockInfo.ticker}
            </h2>

            {/* ══════ KPI CARDS ══════ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <KpiCard label="Doanh thu" value={`${statements[0].revenue.toLocaleString("vi-VN")}`} unit="tỷ"
                    trend={statements[0].revenue > statements[1].revenue ? "up" : "down"}
                    change={((statements[0].revenue - statements[1].revenue) / statements[1].revenue * 100).toFixed(1)} />
                <KpiCard label="LNST" value={`${statements[0].netProfit.toLocaleString("vi-VN")}`} unit="tỷ"
                    trend={statements[0].netProfit > statements[1].netProfit ? "up" : "down"}
                    change={((statements[0].netProfit - statements[1].netProfit) / statements[1].netProfit * 100).toFixed(1)} />
                <KpiCard label="Biên LN gộp" value={`${grossMargins[grossMargins.length - 1]}`} unit="%"
                    trend={grossMargins[grossMargins.length - 1] > grossMargins[grossMargins.length - 2] ? "up" : "down"}
                    change={(grossMargins[grossMargins.length - 1] - grossMargins[grossMargins.length - 2]).toFixed(1)} isPercent />
                <KpiCard label="Biên LNST" value={`${netMargins[netMargins.length - 1]}`} unit="%"
                    trend={netMargins[netMargins.length - 1] > netMargins[netMargins.length - 2] ? "up" : "down"}
                    change={(netMargins[netMargins.length - 1] - netMargins[netMargins.length - 2]).toFixed(1)} isPercent />
                <KpiCard label="ROE" value={`${roe[roe.length - 1]}`} unit="%"
                    trend={roe[roe.length - 1] > roe[roe.length - 2] ? "up" : "down"}
                    change={(roe[roe.length - 1] - roe[roe.length - 2]).toFixed(1)} isPercent />
                <KpiCard label="ROA" value={`${roa[roa.length - 1]}`} unit="%"
                    trend={roa[roa.length - 1] > roa[roa.length - 2] ? "up" : "down"}
                    change={(roa[roa.length - 1] - roa[roa.length - 2]).toFixed(1)} isPercent />
                <KpiCard label="D/E" value={`${debtToEquity[debtToEquity.length - 1]}`} unit="x"
                    trend={debtToEquity[debtToEquity.length - 1] < debtToEquity[debtToEquity.length - 2] ? "up" : "down"}
                    change={(debtToEquity[debtToEquity.length - 1] - debtToEquity[debtToEquity.length - 2]).toFixed(2)} isPercent />
                <KpiCard label="EPS" value={`${statements[0].eps.toLocaleString("vi-VN")}`} unit="VND"
                    trend={statements[0].eps > statements[1].eps ? "up" : "down"}
                    change={((statements[0].eps - statements[1].eps) / statements[1].eps * 100).toFixed(1)} />
            </div>

            {/* ══════ SECTION 1: KẾT QUẢ KINH DOANH ══════ */}
            <section className="space-y-4">
                <SectionHeading icon="📊" color="bg-blue-500" title="Kết quả kinh doanh" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title="Doanh thu & Lợi nhuận" option={revenueNetProfitOption} />
                    <ChartCard title="Tăng trưởng Doanh thu & LNST (QoQ)" option={growthOption} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title="Biên lợi nhuận" option={marginOption} />
                    <ChartCard title="EPS & LNST cổ đông công ty mẹ" option={epsOption} />
                </div>
            </section>

            {/* ══════ SECTION 2: CÂN ĐỐI KẾ TOÁN ══════ */}
            <section className="space-y-4">
                <SectionHeading icon="🏦" color="bg-green-500" title="Cân đối kế toán" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title="Cơ cấu tài sản & Nguồn vốn" option={assetsLiabOption} />
                    <ChartCard title="Chi tiết cơ cấu tài sản" option={assetBreakdownOption} />
                </div>
            </section>

            {/* ══════ SECTION 3: HIỆU SUẤT & AN TOÀN TÀI CHÍNH ══════ */}
            <section className="space-y-4">
                <SectionHeading icon="💰" color="bg-amber-500" title="Hiệu suất & An toàn tài chính" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title="Hiệu suất sinh lời (ROE & ROA)" option={roeRoaOption} />
                    <ChartCard title="Hệ số nợ & Thanh khoản" option={debtRatioOption} />
                </div>
            </section>

            {/* ══════ SECTION 4: CHI PHÍ & DÒNG TIỀN ══════ */}
            <section className="space-y-4">
                <SectionHeading icon="📋" color="bg-purple-500" title="Chi phí & Dòng tiền" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title="Cơ cấu chi phí" option={expenseBreakdownOption} />
                    <ChartCard title="Dòng tiền (HĐKD / HĐĐT / HĐTC)" option={cashFlowOption} />
                </div>
            </section>
        </div>
    );
}

// ============ REUSABLE CHART CARD ============
function ChartCard({ title, option }: { title: string; option: any }) {
    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
                <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
            </CardContent>
        </Card>
    );
}

// ============ KPI CARD ============
function KpiCard({
    label, value, unit, trend, change, isPercent,
}: {
    label: string; value: string; unit: string; trend: "up" | "down"; change: string; isPercent?: boolean;
}) {
    const isUp = trend === "up";
    return (
        <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-3">
                <p className="text-[10px] text-gray-500 font-medium truncate uppercase tracking-wide">{label}</p>
                <p className="text-sm font-bold text-gray-800 mt-1">
                    {value}<span className="text-[10px] font-normal text-gray-400 ml-0.5">{unit}</span>
                </p>
                <div className="flex items-center gap-1 mt-1">
                    <span className={`text-[10px] font-semibold ${isUp ? "text-green-600" : "text-red-500"}`}>
                        {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{change}{isPercent ? "" : "%"}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
