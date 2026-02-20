"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import {
  efficiencyMetrics,
  selfFundingData,
  earningsQualityYears,
  earningsQualityData,
  threeCashFlows,
  cashFlowInsight,
  investmentAllocation,
  waterfallData,
  waterfallNetChange,
} from "@/lib/cashFlowMockData";

// ==================== HELPERS ====================
const fmt = (n: number) => n.toLocaleString("vi-VN");
const monoFont = "font-[var(--font-roboto-mono)]";

// ==================== ROW 1: EFFICIENCY & SELF-FUNDING ====================
function EfficiencyAndFunding() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Efficiency Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-5">
          <span>📊</span> Hiệu Quả Tái Đầu Tư & Cổ Tức
        </h3>
        <div className="space-y-5">
          {efficiencyMetrics.map((m, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{m.title}</span>
                <span className={`text-lg font-extrabold ${monoFont} text-gray-900`}>
                  {m.value}
                  <span className="text-xs font-semibold text-gray-500">{m.suffix}</span>
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full mb-1">
                <div
                  className={`h-2 rounded-full ${m.barColor}`}
                  style={{ width: `${Math.min(m.barPercent, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400">{m.subtitle}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Self-Funding & FCF */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-5">
          <span>💰</span> Khả năng Tự tài trợ & FCF
        </h3>

        {/* Math Layout */}
        <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
          <div className="flex flex-col items-center bg-green-50 rounded-xl px-5 py-3 border border-green-100 min-w-[100px]">
            <span className="text-[10px] text-gray-500 font-semibold uppercase">CFO</span>
            <span className={`text-xl font-extrabold text-green-700 ${monoFont}`}>
              {fmt(selfFundingData.cfo)}
            </span>
          </div>
          <span className="text-2xl font-bold text-gray-400">−</span>
          <div className="flex flex-col items-center bg-orange-50 rounded-xl px-5 py-3 border border-orange-100 min-w-[100px]">
            <span className="text-[10px] text-gray-500 font-semibold uppercase">CAPEX</span>
            <span className={`text-xl font-extrabold text-orange-700 ${monoFont}`}>
              {fmt(selfFundingData.capex)}
            </span>
          </div>
          <span className="text-2xl font-bold text-gray-400">=</span>
          <div className="flex flex-col items-center bg-orange-50 rounded-xl px-6 py-3 border-2 border-orange-300 min-w-[110px]">
            <span className="text-[10px] text-gray-500 font-semibold uppercase">FCF</span>
            <span className={`text-2xl font-extrabold text-[#F97316] ${monoFont}`}>
              {fmt(selfFundingData.fcf)}
            </span>
          </div>
        </div>

        {/* Coverage Bars */}
        <div className="space-y-4">
          {/* CAPEX Coverage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">CAPEX Coverage</span>
              <span className={`text-sm font-bold ${monoFont} text-[#00C076]`}>
                {selfFundingData.capexCoverage}x
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full">
              <div
                className="h-1.5 rounded-full bg-green-500"
                style={{ width: `${Math.min((selfFundingData.capexCoverage / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
          {/* Dividend Coverage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Dividend Coverage</span>
              <span className={`text-sm font-bold ${monoFont} text-blue-600`}>
                {selfFundingData.dividendCoverage}x
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full">
              <div
                className="h-1.5 rounded-full bg-blue-500"
                style={{ width: `${Math.min((selfFundingData.dividendCoverage / 3) * 100, 100)}%` }}
              />
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
      tooltip: { trigger: "axis" as const },
      legend: {
        top: 0,
        textStyle: { fontSize: 11 },
        data: ["Lợi Nhuận Ròng (Net Income)", "Dòng Tiền HĐKD (OCF)"],
      },
      grid: { top: 40, left: 50, right: 30, bottom: 30 },
      xAxis: { type: "category" as const, data: earningsQualityYears, boundaryGap: false },
      yAxis: { type: "value" as const },
      series: [
        {
          name: "Lợi Nhuận Ròng (Net Income)",
          type: "line",
          data: earningsQualityData.netIncome,
          symbol: "diamond",
          symbolSize: 8,
          lineStyle: { color: "#9CA3AF", width: 2, type: "dashed" as const },
          itemStyle: { color: "#9CA3AF" },
        },
        {
          name: "Dòng Tiền HĐKD (OCF)",
          type: "line",
          data: earningsQualityData.ocf,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { color: "#F97316", width: 3 },
          itemStyle: { color: "#F97316" },
          areaStyle: {
            color: {
              type: "linear" as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-base font-bold text-gray-800 flex items-center gap-1.5 mb-2">
        <span className="w-1 h-5 bg-orange-500 rounded-full" />
        Tương quan Lợi nhuận ròng vs Dòng tiền KD (Earnings Quality)
      </h3>
      <ReactECharts option={option} style={{ height: 300 }} />
    </div>
  );
}

// ==================== ROW 3: CASH FLOW BREAKDOWN ====================
function CashFlowBreakdown() {
  const threeFlowsOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11 },
        data: ["HĐ Kinh Doanh", "HĐ Đầu Tư", "HĐ Tài Chính"],
      },
      grid: { top: 15, left: 50, right: 20, bottom: 45 },
      xAxis: { type: "category" as const, data: threeCashFlows.years },
      yAxis: { type: "value" as const },
      series: [
        {
          name: "HĐ Kinh Doanh",
          type: "bar",
          data: threeCashFlows.cfo,
          itemStyle: { color: "#F97316", borderRadius: [4, 4, 0, 0] },
          barWidth: "22%",
        },
        {
          name: "HĐ Đầu Tư",
          type: "bar",
          data: threeCashFlows.cfi,
          itemStyle: { color: "#4B5563", borderRadius: [0, 0, 4, 4] },
          barWidth: "22%",
        },
        {
          name: "HĐ Tài Chính",
          type: "bar",
          data: threeCashFlows.cff,
          itemStyle: { color: "#D1D5DB", borderRadius: [0, 0, 4, 4] },
          barWidth: "22%",
        },
      ],
    }),
    []
  );

  const allocationOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11 },
        data: ["Dòng tiền Tự do (FCF)", "Cổ tức chi trả"],
      },
      grid: { top: 15, left: 50, right: 20, bottom: 45 },
      xAxis: { type: "category" as const, data: investmentAllocation.years },
      yAxis: { type: "value" as const },
      series: [
        {
          name: "Dòng tiền Tự do (FCF)",
          type: "bar",
          data: investmentAllocation.fcf,
          itemStyle: { color: "#F97316", borderRadius: [4, 4, 0, 0] },
          barWidth: "40%",
        },
        {
          name: "Cổ tức chi trả",
          type: "line",
          data: investmentAllocation.dividends,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { color: "#EF4444", width: 2 },
          itemStyle: { color: "#EF4444" },
        },
      ],
    }),
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: 3 Cash Flows */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          Diễn biến 3 Dòng tiền chính
        </h3>
        <ReactECharts option={threeFlowsOption} style={{ height: 250 }} />
        {/* Insight */}
        <div className="mt-3 border-l-4 border-orange-400 pl-3 bg-orange-50/50 rounded-r-lg py-2">
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-orange-600">Nhận định:</span> {cashFlowInsight}
          </p>
        </div>
      </div>

      {/* Right: Investment & Dividends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          Phân bổ Dòng tiền: Đầu tư & Cổ tức
        </h3>
        <ReactECharts option={allocationOption} style={{ height: 250 }} />
        <p className="text-[11px] text-gray-400 mt-2 text-center italic">
          Dòng tiền tự do (FCF) so với Cổ tức chi trả
        </p>
      </div>
    </div>
  );
}

// ==================== ROW 4: WATERFALL CHART ====================
function WaterfallChart() {
  const option = useMemo(() => {
    const categories = waterfallData.map((d) => d.name);
    // Transparent base series (lifts bars for waterfall effect)
    const baseValues = waterfallData.map((d) => {
      if (d.isTotal) return 0;
      // For negative values, the visible bar goes downward from base
      return d.value < 0 ? d.base + d.value : d.base;
    });
    // Visible values
    const visibleValues = waterfallData.map((d) => {
      if (d.isTotal) return d.value;
      return Math.abs(d.value);
    });

    return {
      tooltip: {
        trigger: "axis" as const,
        formatter: (params: { name: string; seriesIndex: number; value: number }[]) => {
          const item = params.find((p) => p.seriesIndex === 1);
          if (!item) return "";
          const orig = waterfallData.find((d) => d.name === item.name);
          const val = orig?.isTotal ? orig.value : orig?.value ?? 0;
          return `${item.name}: <b>${fmt(val)}</b> Tỷ`;
        },
      },
      grid: { top: 20, left: 80, right: 40, bottom: 40 },
      xAxis: {
        type: "category" as const,
        data: categories,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { formatter: (v: number) => fmt(v) },
      },
      series: [
        {
          // Invisible base
          name: "base",
          type: "bar",
          stack: "waterfall",
          data: baseValues,
          itemStyle: { color: "transparent" },
          emphasis: { itemStyle: { color: "transparent" } },
          barWidth: "45%",
        },
        {
          // Visible bar
          name: "value",
          type: "bar",
          stack: "waterfall",
          data: visibleValues.map((v, i) => ({
            value: v,
            itemStyle: {
              color: waterfallData[i].color,
              borderRadius: waterfallData[i].value >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
            },
          })),
          barWidth: "45%",
          label: {
            show: true,
            position: "top" as const,
            fontSize: 11,
            fontWeight: 600,
            formatter: (p: { dataIndex: number }) => {
              const d = waterfallData[p.dataIndex];
              const val = d.isTotal ? d.value : d.value;
              return fmt(val);
            },
          },
        },
      ],
    };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-800 flex items-center gap-1.5">
          <span>✅</span> Tổng Quan Dòng Chảy Tiền Tệ
        </h3>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-gray-500">Thay đổi tiền ròng:</span>
          <span className={`font-bold ${monoFont} text-[#00C076]`}>
            +{fmt(waterfallNetChange)} Tỷ
          </span>
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}

// ==================== MAIN EXPORT ====================
export default function CashFlowTab() {
  return (
    <div className="space-y-5">
      {/* ROW 1 */}
      <EfficiencyAndFunding />
      {/* ROW 2 */}
      <EarningsQualityChart />
      {/* ROW 3 */}
      <CashFlowBreakdown />
      {/* ROW 4 */}
      <WaterfallChart />
    </div>
  );
}
