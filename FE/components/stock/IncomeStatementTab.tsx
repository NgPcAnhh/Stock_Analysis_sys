"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import {
  incomeOverviewStats,
  duPont5Factors,
  duPontResult,
  duPontTree,
  rosBreakdown,
  revenueTrendYears,
  revenueTrendData,
  costStructure,
  costInsight,
  growthData,
  sgaEfficiency,
  revenueBySegment,
  costBreakdownPie,
  profitFunnel,
  incomeTableYears,
  incomeStatementTable,
} from "@/lib/incomeStatementMockData";

// ==================== HELPERS ====================
const fmt = (n: number) => n.toLocaleString("vi-VN");
const monoFont = "font-[var(--font-roboto-mono)]";

// ==================== ROW 1: KEY METRIC CARDS ====================
function IncomeKeyCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {incomeOverviewStats.map((s, i) => (
        <div
          key={i}
          className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${s.borderColor} p-5`}
        >
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            {s.label}
          </p>
          {s.value !== undefined && (
            <p className={`text-3xl font-extrabold text-gray-900 ${monoFont}`}>{fmt(s.value)}</p>
          )}
          {s.yoyPercent !== undefined && (
            <span
              className={`text-xs font-medium ${
                s.yoyDirection === "up" ? "text-[#00C076]" : "text-[#EF4444]"
              }`}
            >
              {s.yoyDirection === "up" ? "↗" : "↘"} +{s.yoyPercent}% YoY
            </span>
          )}
          {s.subLines.length > 0 && (
            <div className="mt-2 space-y-1">
              {s.subLines.map((l, li) => (
                <div key={li} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{l.label}</span>
                  <span className={`text-sm font-bold ${monoFont} ${l.color ?? "text-gray-800"}`}>
                    {l.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== ROW 2: DUPONT ANALYSIS ====================
function DuPontSection() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-6">
        <span className="text-lg">🔬</span>
        Phân Tích DuPont 5 Yếu Tố (Mở Rộng - Bóc Tách ROS)
      </h2>

      {/* Section A: 5-Factor Formula */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
        {duPont5Factors.map((f, i) => (
          <React.Fragment key={i}>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center min-w-[110px] shadow-sm">
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {f.topLabel}
              </p>
              <p className={`text-xl font-extrabold text-gray-900 ${monoFont}`}>{f.value}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{f.bottomLabel}</p>
            </div>
            {i < duPont5Factors.length - 1 && (
              <span className="text-xl font-bold text-gray-300">×</span>
            )}
          </React.Fragment>
        ))}
        <span className="text-xl font-bold text-gray-400">=</span>
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl px-6 py-3 text-center min-w-[120px] shadow-sm">
          <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {duPontResult.label}
          </p>
          <p className={`text-2xl font-extrabold text-[#F97316] ${monoFont}`}>
            {duPontResult.value}
          </p>
        </div>
      </div>

      {/* Section B: Tree + ROS Breakdown */}
      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-5">
          <span>🌳</span> Phân Tích Cây DuPont 3 Yếu Tố (Góc Rẽ ROE)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Tree */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Level 1: ROE */}
            <TreeNode
              label={duPontTree.roe.label}
              value={duPontTree.roe.value}
              sub={duPontTree.roe.sub}
              color="bg-green-50 border-green-300 text-green-700"
            />
            <div className="w-px h-6 bg-gray-300" />
            {/* Level 2: ROA & Leverage */}
            <div className="flex items-start gap-8 relative">
              {/* Horizontal connector */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-px bg-gray-300" />
              <div className="flex flex-col items-center">
                <div className="w-px h-4 bg-gray-300" />
                <TreeNode
                  label={duPontTree.roa.label}
                  value={duPontTree.roa.value}
                  sub={duPontTree.roa.sub}
                  color="bg-orange-50 border-orange-300 text-orange-700"
                />
                <div className="w-px h-6 bg-gray-300" />
                {/* Level 3: ROS & Turnover */}
                <div className="flex items-start gap-6 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[160px] h-px bg-gray-300" />
                  <div className="flex flex-col items-center">
                    <div className="w-px h-4 bg-gray-300" />
                    <TreeNode
                      label={duPontTree.ros.label}
                      value={duPontTree.ros.value}
                      sub={duPontTree.ros.sub}
                      color="bg-blue-50 border-blue-300 text-blue-700"
                      small
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-px h-4 bg-gray-300" />
                    <TreeNode
                      label={duPontTree.assetTurnover.label}
                      value={duPontTree.assetTurnover.value}
                      sub={duPontTree.assetTurnover.sub}
                      color="bg-gray-50 border-gray-300 text-gray-700"
                      small
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-px h-4 bg-gray-300" />
                <TreeNode
                  label={duPontTree.leverage.label}
                  value={duPontTree.leverage.value}
                  sub={duPontTree.leverage.sub}
                  color="bg-purple-50 border-purple-300 text-purple-700"
                />
              </div>
            </div>
          </div>

          {/* Right: ROS Breakdown */}
          <div className="lg:col-span-5">
            <h4 className="text-sm font-bold text-gray-700 mb-4">
              Chi tiết Tỷ suất (ROS Breakdown)
            </h4>
            <div className="space-y-4">
              {rosBreakdown.map((r, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{r.label}</span>
                    <span className={`text-sm font-bold ${monoFont} text-gray-900`}>
                      {r.value}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full">
                    <div
                      className={`h-3 rounded-full ${r.color}`}
                      style={{ width: `${(r.value / 50) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TreeNode({
  label,
  value,
  sub,
  color,
  small,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div
      className={`border rounded-xl px-4 py-2 text-center shadow-sm ${color} ${
        small ? "min-w-[120px]" : "min-w-[140px]"
      }`}
    >
      <p className={`${small ? "text-[9px]" : "text-[10px]"} font-semibold uppercase tracking-wider opacity-80`}>
        {label}
      </p>
      <p className={`${small ? "text-base" : "text-xl"} font-extrabold ${monoFont}`}>{value}</p>
      <p className="text-[9px] opacity-60">{sub}</p>
    </div>
  );
}

// ==================== ROW 3: REVENUE & PROFIT TRENDS ====================
function RevenueProfitTrends() {
  const comboOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      legend: { bottom: 0, textStyle: { fontSize: 11 }, data: ["LN Gộp", "Doanh Thu", "Giá Vốn"] },
      grid: { top: 20, left: 50, right: 20, bottom: 45 },
      xAxis: { type: "category" as const, data: revenueTrendYears },
      yAxis: { type: "value" as const },
      series: [
        {
          name: "Doanh Thu",
          type: "bar",
          data: revenueTrendData.revenue,
          itemStyle: { color: "#F97316" },
          barWidth: "30%",
        },
        {
          name: "Giá Vốn",
          type: "bar",
          data: revenueTrendData.cogs,
          itemStyle: { color: "#D1D5DB" },
          barWidth: "30%",
        },
        {
          name: "LN Gộp",
          type: "line",
          data: revenueTrendData.grossProfit,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { color: "#EF4444", width: 2 },
          itemStyle: { color: "#EF4444" },
        },
      ],
    }),
    []
  );

  const donutOption = useMemo(
    () => ({
      tooltip: { trigger: "item" as const },
      legend: { show: false },
      graphic: [
        {
          type: "text",
          left: "center",
          top: "38%",
          style: { text: "Total:", fill: "#9CA3AF", fontSize: 11, fontWeight: 600 },
        },
        {
          type: "text",
          left: "center",
          top: "47%",
          style: { text: "100%", fill: "#1F2937", fontSize: 18, fontWeight: 800 },
        },
      ],
      series: [
        {
          type: "pie",
          radius: ["45%", "72%"],
          avoidLabelOverlap: false,
          label: { show: false },
          data: costStructure.map((c) => ({
            value: c.value,
            name: c.name,
            itemStyle: { color: c.color },
          })),
        },
      ],
    }),
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Combo */}
      <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
          <span>📊</span> Diễn biến Doanh thu & Chi phí
        </h3>
        <ReactECharts option={comboOption} style={{ height: 280 }} />
      </div>

      {/* Right: Donut */}
      <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
          <span>🍩</span> Cơ cấu Chi phí (Common Size)
        </h3>
        <ReactECharts option={donutOption} style={{ height: 200 }} />
        {/* Legend */}
        <div className="space-y-1.5 mt-2 mb-3">
          {costStructure.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.color }} />
              <span className="text-xs text-gray-600">{c.name}</span>
            </div>
          ))}
        </div>
        {/* Insight */}
        <div className="border-l-4 border-orange-400 pl-3 bg-orange-50/50 rounded-r-lg py-2">
          <p className="text-[11px] text-gray-600">
            <span className="font-semibold text-orange-600">Nhận định:</span> {costInsight}
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== ROW 4: GROWTH & EFFICIENCY ====================
function GrowthAndEfficiency() {
  const growthLineOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11 },
        data: ["Tăng trưởng Doanh thu (%)", "Tăng trưởng LN Ròng (%)"],
      },
      grid: { top: 20, left: 50, right: 20, bottom: 45 },
      xAxis: { type: "category" as const, data: growthData.years },
      yAxis: { type: "value" as const, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          name: "Tăng trưởng Doanh thu (%)",
          type: "line",
          data: growthData.revenueGrowth,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { color: "#F97316", width: 2 },
          itemStyle: { color: "#F97316" },
        },
        {
          name: "Tăng trưởng LN Ròng (%)",
          type: "line",
          data: growthData.netProfitGrowth,
          symbol: "diamond",
          symbolSize: 8,
          lineStyle: { color: "#00C076", width: 2, type: "dashed" as const },
          itemStyle: { color: "#00C076" },
        },
      ],
    }),
    []
  );

  const sgaBarOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      grid: { top: 20, left: 50, right: 20, bottom: 30 },
      xAxis: { type: "category" as const, data: sgaEfficiency.years },
      yAxis: { type: "value" as const, min: 10, max: 15, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          type: "bar",
          data: sgaEfficiency.sgaPercent,
          itemStyle: { color: "#F97316", borderRadius: [4, 4, 0, 0] },
          barWidth: "45%",
        },
      ],
    }),
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Growth Line */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
          <span className="w-1 h-4 bg-orange-500 rounded-full" />
          Tốc độ Tăng trưởng (YoY Growth %)
        </h3>
        <ReactECharts option={growthLineOption} style={{ height: 260 }} />
      </div>

      {/* SGA Bar */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <span className="w-1 h-4 bg-blue-500 rounded-full" />
            Hiệu quả Quản lý Chi phí (SG&A / Revenue)
          </h3>
          <span className="text-[10px] bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full border border-green-200">
            Thấp hơn là Tốt hơn
          </span>
        </div>
        <ReactECharts option={sgaBarOption} style={{ height: 260 }} />
      </div>
    </div>
  );
}

// ==================== ROW 5: SEGMENT CHARTS ====================
function SegmentCharts() {
  const segmentPieOption = useMemo(
    () => ({
      tooltip: { trigger: "item" as const },
      legend: { bottom: 0, textStyle: { fontSize: 10 } },
      series: [
        {
          type: "pie",
          radius: ["30%", "65%"],
          label: { show: false },
          data: revenueBySegment.map((s) => ({
            value: s.value,
            name: s.name,
            itemStyle: { color: s.color },
          })),
        },
      ],
    }),
    []
  );

  const costPieOption = useMemo(
    () => ({
      tooltip: { trigger: "item" as const },
      legend: { bottom: 0, textStyle: { fontSize: 10 } },
      series: [
        {
          type: "pie",
          radius: ["30%", "65%"],
          label: { show: false },
          data: costBreakdownPie.map((c) => ({
            value: c.value,
            name: c.name,
            itemStyle: { color: c.color },
          })),
        },
      ],
    }),
    []
  );

  const funnelOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      grid: { top: 10, left: 130, right: 40, bottom: 10 },
      xAxis: { type: "value" as const },
      yAxis: {
        type: "category" as const,
        data: [...profitFunnel].reverse().map((p) => p.name),
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          type: "bar",
          data: [...profitFunnel].reverse().map((p) => ({
            value: p.value,
            itemStyle: { color: p.color, borderRadius: [0, 4, 4, 0] },
          })),
          barWidth: "55%",
          label: {
            show: true,
            position: "right" as const,
            fontSize: 10,
            formatter: (p: { value: number }) => fmt(p.value),
          },
        },
      ],
    }),
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-2">
          <span>🍩</span> Cơ cấu doanh thu theo phân khúc
        </h3>
        <ReactECharts option={segmentPieOption} style={{ height: 240 }} />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-xs font-bold text-gray-800 text-center mb-2">
          Cấu trúc Chi Phí (% Doanh thu)
        </h3>
        <ReactECharts option={costPieOption} style={{ height: 240 }} />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-2">
          <span>🔻</span> Phễu Hiệu Quả (Profit Funnel)
        </h3>
        <ReactECharts option={funnelOption} style={{ height: 240 }} />
      </div>
    </div>
  );
}

// ==================== ROW 6: INCOME STATEMENT TABLE ====================
function IncomeStatementTable() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-orange-500 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-800">
          Chi tiết Báo Cáo & Tăng Trưởng YoY
        </h3>
        <span className="text-xs text-gray-400">Đơn vị: Tỷ VND</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-6 py-3 font-semibold min-w-[220px]">Chỉ tiêu</th>
              {incomeTableYears.map((y) => (
                <th key={y} className="text-right px-4 py-3 font-semibold">
                  {y}
                </th>
              ))}
              <th className="text-right px-4 py-3 font-semibold">GROWTH &apos;24</th>
            </tr>
          </thead>
          <tbody>
            {incomeStatementTable.map((row, idx) => {
              const isHighlight = row.isHighlight;
              const rowBg = isHighlight
                ? "bg-orange-50"
                : row.isBold
                ? "bg-gray-50/50"
                : "";
              const fontWeight = row.isBold ? "font-bold text-gray-900" : "text-gray-600";
              const pl = row.indent === 1 ? "pl-10" : row.indent === 2 ? "pl-14" : "px-6";

              return (
                <tr
                  key={idx}
                  className={`${rowBg} ${fontWeight} border-b border-gray-100 hover:bg-gray-50/60 transition-colors`}
                >
                  <td className={`py-2.5 ${pl}`}>{row.label}</td>
                  {row.values.map((v, vi) => (
                    <td
                      key={vi}
                      className={`text-right px-4 py-2.5 ${monoFont} ${
                        row.isBold ? "font-bold" : ""
                      }`}
                    >
                      {v !== null ? fmt(v) : "—"}
                    </td>
                  ))}
                  <td className={`text-right px-4 py-2.5 ${monoFont}`}>
                    {row.growthPercent !== null && row.growthPercent !== undefined ? (
                      <span
                        className={`font-semibold ${
                          row.growthPercent >= 0 ? "text-[#00C076]" : "text-[#EF4444]"
                        }`}
                      >
                        {row.growthPercent >= 0 ? "↑" : "↓"}{" "}
                        {Math.abs(row.growthPercent).toFixed(1)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== MAIN EXPORT ====================
export default function IncomeStatementTab() {
  return (
    <div className="space-y-5">
      {/* ROW 1 */}
      <IncomeKeyCards />
      {/* ROW 2 */}
      <DuPontSection />
      {/* ROW 3 */}
      <RevenueProfitTrends />
      {/* ROW 4 */}
      <GrowthAndEfficiency />
      {/* ROW 5 */}
      <SegmentCharts />
      {/* ROW 6 */}
      <IncomeStatementTable />
    </div>
  );
}
