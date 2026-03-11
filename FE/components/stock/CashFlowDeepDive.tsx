"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import {
  efficiencyMetrics,
  selfFundingData,
  earningsQuality,
  threeCashFlows,
  insightText,
  fcfDividendData,
  waterfallData,
  netCashChange,
} from "@/lib/cashFlowDeepDiveData";

const monoFont = "font-[var(--font-roboto-mono)]";
const fmt = (n: number) => n.toLocaleString("vi-VN");

// ==================== ROW 1: EFFICIENCY & SELF-FUNDING ====================
function EfficiencyAndSelfFunding() {
  const { cfo, capex, fcf, capexCoverage, dividendCoverage } = selfFundingData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Card 1: Hiệu Quả Tái Đầu Tư & Cổ Tức */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-5">
          <span>📊</span> Hiệu Quả Tái Đầu Tư &amp; Cổ Tức
        </h3>
        <div className="space-y-5">
          {efficiencyMetrics.map((item, idx) => {
            const pct = Math.min((item.numericValue / item.max) * 100, 100);
            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground font-medium">{item.title}</span>
                  <span className={`text-base font-extrabold ${monoFont}`} style={{ color: item.color }}>
                    {item.value}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full">
                  <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{item.subtitle}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 2: Khả năng Tự tài trợ & FCF */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-5">
          <span>💰</span> Khả năng Tự tài trợ &amp; FCF
        </h3>

        {/* Math Layout */}
        <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
          <div className="flex flex-col items-center bg-blue-50 rounded-xl px-5 py-3 border border-blue-100">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">CFO</span>
            <span className={`text-xl font-extrabold text-blue-700 ${monoFont}`}>{fmt(cfo)}</span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">−</span>
          <div className="flex flex-col items-center bg-red-50 rounded-xl px-5 py-3 border border-red-100">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">CAPEX</span>
            <span className={`text-xl font-extrabold text-red-600 ${monoFont}`}>{fmt(capex)}</span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">=</span>
          <div className="flex flex-col items-center bg-orange-50 rounded-xl px-6 py-3 border-2 border-orange-200">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">FCF</span>
            <span className={`text-3xl font-extrabold text-[#F97316] ${monoFont}`}>{fmt(fcf)}</span>
            <span className="text-xs text-orange-500 font-semibold">Tỷ VND</span>
          </div>
        </div>

        {/* Coverage Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground font-medium">CAPEX Coverage</span>
              <span className={`text-sm font-extrabold text-[#00C076] ${monoFont}`}>{capexCoverage}x</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full">
              <div className="h-1.5 rounded-full bg-[#00C076]" style={{ width: `${Math.min((capexCoverage / 5) * 100, 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground font-medium">Dividend Coverage</span>
              <span className={`text-sm font-extrabold text-[#3B82F6] ${monoFont}`}>{dividendCoverage}x</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full">
              <div className="h-1.5 rounded-full bg-[#3B82F6]" style={{ width: `${Math.min((dividendCoverage / 3) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ROW 2: EARNINGS QUALITY ====================
function EarningsQualityChart() {
  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        textStyle: { fontSize: 12 },
      },
      legend: {
        top: 4,
        textStyle: { fontSize: 11 },
        data: ["Lợi Nhuận Ròng (Net Income)", "Dòng Tiền HĐKD (OCF)"],
      },
      grid: { top: 40, left: 60, right: 20, bottom: 28 },
      xAxis: {
        type: "category" as const,
        data: earningsQuality.map((d) => d.year),
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 11 },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "#6b7280", fontSize: 11, formatter: "{value}" },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      },
      series: [
        {
          name: "Lợi Nhuận Ròng (Net Income)",
          type: "line",
          data: earningsQuality.map((d) => d.netIncome),
          lineStyle: { color: "#9CA3AF", width: 2, type: "dashed" as const },
          itemStyle: { color: "#9CA3AF" },
          symbol: "circle",
          symbolSize: 7,
        },
        {
          name: "Dòng Tiền HĐKD (OCF)",
          type: "line",
          data: earningsQuality.map((d) => d.ocf),
          lineStyle: { color: "#F97316", width: 3 },
          itemStyle: { color: "#F97316" },
          symbol: "circle",
          symbolSize: 8,
          areaStyle: {
            color: {
              type: "linear" as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(249,115,22,0.18)" },
                { offset: 1, color: "rgba(249,115,22,0.02)" },
              ],
            },
          },
        },
      ],
    }),
    []
  );

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
        <span className="w-1 h-4 bg-[#F97316] rounded-full" />
        Tương quan Lợi nhuận ròng vs Dòng tiền KD (Earnings Quality)
      </h3>
      <ReactECharts option={option} style={{ height: 280 }} />
    </div>
  );
}

// ==================== ROW 3: CASH FLOW BREAKDOWN ====================
function CashFlowBreakdown() {
  const threeFlowOption = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        textStyle: { fontSize: 12 },
      },
      legend: {
        top: 4,
        textStyle: { fontSize: 11 },
        data: ["HĐ Kinh Doanh", "HĐ Đầu Tư", "HĐ Tài Chính"],
      },
      grid: { top: 40, left: 60, right: 20, bottom: 28 },
      xAxis: {
        type: "category" as const,
        data: threeCashFlows.map((d) => d.year),
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 11 },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "#6b7280", fontSize: 11 },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      },
      series: [
        {
          name: "HĐ Kinh Doanh",
          type: "bar",
          data: threeCashFlows.map((d) => d.cfo),
          itemStyle: { color: "#F97316", borderRadius: [4, 4, 0, 0] },
          barWidth: "22%",
        },
        {
          name: "HĐ Đầu Tư",
          type: "bar",
          data: threeCashFlows.map((d) => d.cfi),
          itemStyle: { color: "#4B5563", borderRadius: [0, 0, 4, 4] },
          barWidth: "22%",
        },
        {
          name: "HĐ Tài Chính",
          type: "bar",
          data: threeCashFlows.map((d) => d.cff),
          itemStyle: { color: "#9CA3AF", borderRadius: [0, 0, 4, 4] },
          barWidth: "22%",
        },
      ],
    }),
    []
  );

  const fcfDividendOption = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        textStyle: { fontSize: 12 },
      },
      legend: {
        top: 4,
        textStyle: { fontSize: 11 },
        data: ["Dòng tiền tự do (FCF)", "Cổ tức chi trả"],
      },
      grid: { top: 40, left: 60, right: 20, bottom: 28 },
      xAxis: {
        type: "category" as const,
        data: fcfDividendData.map((d) => d.year),
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 11 },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "#6b7280", fontSize: 11 },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      },
      series: [
        {
          name: "Dòng tiền tự do (FCF)",
          type: "bar",
          data: fcfDividendData.map((d) => d.fcf),
          itemStyle: { color: "rgba(249,115,22,0.35)", borderRadius: [4, 4, 0, 0] },
          barWidth: "40%",
        },
        {
          name: "Cổ tức chi trả",
          type: "line",
          data: fcfDividendData.map((d) => d.dividend),
          lineStyle: { color: "#F97316", width: 3 },
          itemStyle: { color: "#F97316" },
          symbol: "circle",
          symbolSize: 8,
        },
      ],
    }),
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Three Cash Flows */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
          <span className="w-1 h-4 bg-[#F97316] rounded-full" />
          Diễn biến 3 Dòng tiền chính
        </h3>
        <ReactECharts option={threeFlowOption} style={{ height: 240 }} />
        {/* Insights Block */}
        <div className="mt-4 border-l-4 border-[#F97316] bg-orange-50 rounded-r-lg px-4 py-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{insightText}</p>
        </div>
      </div>

      {/* Right: FCF & Dividend */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
          <span className="w-1 h-4 bg-[#3B82F6] rounded-full" />
          Phân bổ Dòng tiền: Đầu tư &amp; Cổ tức
        </h3>
        <ReactECharts option={fcfDividendOption} style={{ height: 280 }} />
      </div>
    </div>
  );
}

// ==================== ROW 4: WATERFALL CHART ====================
function WaterfallChart() {
  const option = useMemo(() => {
    const categories = waterfallData.map((d) => d.name);
    // Transparent base series (lifts the visible bars)
    const baseData = waterfallData.map((d) => ({
      value: d.isTotal ? 0 : (d.value < 0 ? d.base + d.value : d.base),
      itemStyle: { color: "transparent" },
    }));
    // Visible bar values
    const visibleData = waterfallData.map((d) => ({
      value: d.isTotal ? d.value : Math.abs(d.value),
      itemStyle: { color: d.color, borderRadius: [4, 4, 4, 4] },
    }));

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        textStyle: { fontSize: 12 },
        formatter: (params: Array<{ name: string; seriesIndex: number; value: number }>) => {
          const item = waterfallData.find((d) => d.name === params[0]?.name);
          if (!item) return "";
          const sign = item.value >= 0 ? "+" : "";
          return `<b>${item.name}</b><br/>Giá trị: ${sign}${fmt(item.value)} Tỷ`;
        },
      },
      grid: { top: 20, left: 70, right: 30, bottom: 40 },
      xAxis: {
        type: "category" as const,
        data: categories,
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 11, interval: 0 },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "#6b7280", fontSize: 11 },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
      },
      series: [
        {
          name: "Base",
          type: "bar",
          stack: "waterfall",
          data: baseData,
          barWidth: "45%",
          emphasis: { disabled: true },
        },
        {
          name: "Value",
          type: "bar",
          stack: "waterfall",
          data: visibleData,
          barWidth: "45%",
          label: {
            show: true,
            position: "top",
            color: "#374151",
            fontSize: 11,
            fontWeight: "bold",
            fontFamily: "Roboto Mono, monospace",
            formatter: (p: { dataIndex: number }) => {
              const item = waterfallData[p.dataIndex];
              if (!item) return "";
              const sign = !item.isTotal && item.value >= 0 ? "+" : "";
              return `${sign}${fmt(item.value)}`;
            },
          },
        },
      ],
    };
  }, []);

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <span className="w-1 h-4 bg-[#3B82F6] rounded-full" />
          Tổng Quan Dòng Chảy Tiền Tệ
        </h3>
        <span className={`text-sm font-bold text-[#00C076] ${monoFont}`}>
          Thay đổi tiền ròng: +{fmt(netCashChange)} Tỷ
        </span>
      </div>
      <ReactECharts option={option} style={{ height: 320 }} />
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function CashFlowDeepDive() {
  return (
    <div className="space-y-5">
      {/* ROW 1 */}
      <EfficiencyAndSelfFunding />
      {/* ROW 2 */}
      <EarningsQualityChart />
      {/* ROW 3 */}
      <CashFlowBreakdown />
      {/* ROW 4 */}
      <WaterfallChart />
    </div>
  );
}
