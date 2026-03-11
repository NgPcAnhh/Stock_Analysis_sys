"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import {
  incomeMetricCards,
  dupontFactors,
  dupontResult,
  dupontTree,
  rosBreakdown,
  revenueTrend,
  costStructure,
  growthData,
  efficiencyData,
  revenueBySegment,
  costByCategory,
  profitFunnel,
  incomeTableHeaders,
  incomeTableData,
  type DuPontTreeNode,
} from "@/lib/incomeStatementDeepDiveData";

// ── Design tokens ──
const mono = "font-[var(--font-roboto-mono)]";
const GREEN = "#00C076";
const RED = "#EF4444";
const ORANGE = "#F97316";
const BLUE = "#3B82F6";
const PURPLE = "#8B5CF6";

const fmtN = (n: number | null) => {
  if (n == null) return "—";
  return n.toLocaleString("vi-VN");
};

// ══════════════════════════════════════════════════════════════
//  ROW 1 – Key Metric Highlight Cards
// ══════════════════════════════════════════════════════════════
function KeyMetricCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {incomeMetricCards.map((c, i) => (
        <div
          key={i}
          className={`bg-card rounded-lg shadow-sm border border-border/50 border-l-4 ${c.borderColor} p-5`}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {c.label}
          </p>

          {c.value && (
            <p className={`text-3xl font-extrabold text-foreground ${mono}`}>{c.value}</p>
          )}

          {c.listItems ? (
            <div className="space-y-1.5 mt-2">
              {c.listItems.map((li) => (
                <div key={li.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{li.label}</span>
                  <span className={`text-sm font-bold ${mono} text-foreground`}>{li.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {c.badges.map((b, j) => (
                <span key={j} className={`text-sm font-semibold ${mono}`} style={{ color: b.color }}>
                  {b.text}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 2 – DuPont Analysis Engine (Pure Tailwind)
// ══════════════════════════════════════════════════════════════

/* Section A: 5-Factor Formula */
function DuPontFormula() {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {dupontFactors.map((f, i) => (
        <React.Fragment key={i}>
          <div className="bg-card border border-border rounded-xl px-4 py-3 text-center min-w-[120px] shadow-sm">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {f.label}
            </p>
            <p className={`text-xl font-extrabold text-foreground ${mono}`}>{f.value.toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{f.sub}</p>
          </div>
          {i < dupontFactors.length - 1 && (
            <span className="text-lg font-bold text-muted-foreground/60">×</span>
          )}
        </React.Fragment>
      ))}
      <span className="text-lg font-bold text-muted-foreground">=</span>
      <div className="bg-orange-50 border-2 border-orange-300 rounded-xl px-6 py-3 text-center min-w-[120px] shadow-sm">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          {dupontResult.label}
        </p>
        <p className={`text-2xl font-extrabold text-[#F97316] ${mono}`}>
          {dupontResult.value}%
        </p>
      </div>
    </div>
  );
}

/* DuPont Tree Node */
function TreeNode({ node, isRoot = false }: { node: DuPontTreeNode; isRoot?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`rounded-xl px-4 py-2.5 text-center shadow-sm border-2 min-w-[110px] ${
          isRoot ? "bg-orange-50 border-orange-300" : "bg-card border-border"
        }`}
      >
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
          {node.label}
        </p>
        <p className={`text-lg font-extrabold ${mono}`} style={{ color: node.color }}>
          {node.value}
        </p>
      </div>

      {node.children && node.children.length > 0 && (
        <>
          {/* Vertical connector */}
          <div className="w-px h-4 bg-border" />
          {/* Horizontal bar */}
          <div className="relative flex items-start">
            <div
              className="absolute top-0 bg-border"
              style={{
                height: "1px",
                left: "25%",
                right: "25%",
              }}
            />
            <div className="flex gap-6">
              {node.children.map((child, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-px h-4 bg-border" />
                  <TreeNode node={child} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* Section B: Tree + ROS Breakdown */
function DuPontTreeAndROS() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
      {/* Left: DuPont Tree */}
      <div className="lg:col-span-7 flex items-center justify-center py-4">
        <TreeNode node={dupontTree} isRoot />
      </div>

      {/* Right: ROS Breakdown */}
      <div className="lg:col-span-5">
        <h4 className="text-sm font-bold text-foreground mb-4">
          Chi tiết Tỷ suất
        </h4>
        <div className="space-y-4">
          {rosBreakdown.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-bold ${mono}`} style={{ color: item.color }}>
                  {item.value}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${(item.value / 50) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DuPontSection() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-6">
        <span className="text-lg">🔬</span> Phân Tích DuPont 5 Yếu Tố
        <span className="text-xs text-muted-foreground font-normal">
          (Mở Rộng - Bóc Tách ROS)
        </span>
      </h2>
      <DuPontFormula />
      <DuPontTreeAndROS />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 3 – Revenue & Profit Trends
// ══════════════════════════════════════════════════════════════
function RevenueProfitTrends() {
  const years = revenueTrend.map((d) => String(d.year));

  const comboChart = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      legend: {
        top: 4,
        textStyle: { fontSize: 11 },
        data: ["Doanh Thu", "Giá Vốn", "LN Gộp"],
      },
      grid: { top: 42, left: 55, right: 20, bottom: 28 },
      xAxis: { type: "category" as const, data: years },
      yAxis: { type: "value" as const },
      series: [
        {
          name: "Doanh Thu",
          type: "bar",
          data: revenueTrend.map((d) => d.revenue),
          itemStyle: { color: ORANGE },
          barWidth: "28%",
        },
        {
          name: "Giá Vốn",
          type: "bar",
          data: revenueTrend.map((d) => d.cogs),
          itemStyle: { color: "#D1D5DB" },
          barWidth: "28%",
        },
        {
          name: "LN Gộp",
          type: "line",
          data: revenueTrend.map((d) => d.grossProfit),
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { color: RED, width: 2.5 },
          itemStyle: { color: RED },
        },
      ],
    }),
    [years]
  );

  const donutChart = useMemo(
    () => ({
      tooltip: { trigger: "item" as const, formatter: "{b}: {d}%" },
      graphic: {
        type: "text" as const,
        left: "center",
        top: "center",
        style: {
          text: "Total\n100%",
          textAlign: "center" as const,
          fill: "#6b7280",
          fontSize: 13,
          fontWeight: "bold" as const,
        },
      },
      series: [
        {
          type: "pie",
          radius: ["48%", "75%"],
          label: { show: false },
          data: costStructure.map((d) => ({
            value: d.value,
            name: d.name,
            itemStyle: { color: d.color },
          })),
        },
      ],
    }),
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
      {/* Left: Combo Chart 70% */}
      <div className="lg:col-span-7 bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span>📊</span> Diễn biến Doanh thu & Chi phí
        </h3>
        <ReactECharts option={comboChart} style={{ height: 300 }} />
      </div>

      {/* Right: Donut 30% */}
      <div className="lg:col-span-3 bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span>🍩</span> Cơ cấu Chi phí (Common Size)
        </h3>
        <ReactECharts option={donutChart} style={{ height: 200 }} />
        {/* Legend */}
        <div className="space-y-1.5 mt-2">
          {costStructure.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
              </div>
              <span className={`text-xs font-bold ${mono}`}>{d.value}%</span>
            </div>
          ))}
        </div>
        {/* Insights */}
        <div className="mt-3 border-l-4 border-[#F97316] pl-3 bg-orange-50 rounded-r-lg py-2 px-2">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Nhận định:</span> Giá vốn chiếm 57.5%
            doanh thu, giảm nhẹ so với năm trước. Biên lợi nhuận ròng cải thiện nhờ kiểm soát chi
            phí tốt hơn.
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 4 – Growth & Efficiency
// ══════════════════════════════════════════════════════════════
function GrowthAndEfficiency() {
  const years = growthData.map((d) => String(d.year));

  const growthChart = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      legend: {
        top: 4,
        textStyle: { fontSize: 11 },
        data: ["Tăng trưởng Doanh thu", "Tăng trưởng LN Ròng"],
      },
      grid: { top: 42, left: 50, right: 20, bottom: 28 },
      xAxis: { type: "category" as const, data: years },
      yAxis: { type: "value" as const, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          name: "Tăng trưởng Doanh thu",
          type: "line",
          data: growthData.map((d) => d.revenueGrowth),
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { color: ORANGE, width: 2.5 },
          itemStyle: { color: ORANGE },
        },
        {
          name: "Tăng trưởng LN Ròng",
          type: "line",
          data: growthData.map((d) => d.netProfitGrowth),
          symbol: "diamond",
          symbolSize: 8,
          lineStyle: { color: GREEN, width: 2.5, type: "dashed" as const },
          itemStyle: { color: GREEN },
        },
      ],
    }),
    [years]
  );

  const efficiencyChart = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const, formatter: "{b}: {c}%" },
      grid: { top: 24, left: 50, right: 20, bottom: 28 },
      xAxis: { type: "category" as const, data: efficiencyData.map((d) => String(d.year)) },
      yAxis: { type: "value" as const, min: 75, max: 85, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          type: "bar",
          data: efficiencyData.map((d) => d.costToRevenue),
          itemStyle: { color: ORANGE, borderRadius: [4, 4, 0, 0] },
          barWidth: "45%",
        },
      ],
    }),
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Growth */}
      <div className="bg-card rounded-xl shadow-sm border-2 border-blue-200 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span className="w-1 h-4 bg-[#F97316] rounded-full" />
          Tốc độ Tăng trưởng (YoY Growth %)
        </h3>
        <ReactECharts option={growthChart} style={{ height: 260 }} />
      </div>

      {/* Efficiency */}
      <div className="bg-card rounded-xl shadow-sm border-2 border-blue-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span className="w-1 h-4 bg-[#3B82F6] rounded-full" />
            Hiệu quả Quản lý Chi phí
          </h3>
          <span className="text-[10px] font-semibold text-[#00C076] bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
            Thấp hơn là Tốt hơn
          </span>
        </div>
        <ReactECharts option={efficiencyChart} style={{ height: 260 }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 5 – Segment Charts (3 columns)
// ══════════════════════════════════════════════════════════════
function SegmentCharts() {
  const revPie = useMemo(
    () => ({
      tooltip: { trigger: "item" as const, formatter: "{b}: {d}%" },
      series: [
        {
          type: "pie",
          radius: ["40%", "72%"],
          label: { show: false },
          data: revenueBySegment.map((d) => ({
            value: d.value,
            name: d.name,
            itemStyle: { color: d.color },
          })),
        },
      ],
    }),
    []
  );

  const costPie = useMemo(
    () => ({
      tooltip: { trigger: "item" as const, formatter: "{b}: {d}%" },
      series: [
        {
          type: "pie",
          radius: ["40%", "72%"],
          label: { show: false },
          data: costByCategory.map((d) => ({
            value: d.value,
            name: d.name,
            itemStyle: { color: d.color },
          })),
        },
      ],
    }),
    []
  );

  const funnelChart = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      grid: { top: 12, left: 120, right: 40, bottom: 12 },
      xAxis: { type: "value" as const, show: false },
      yAxis: {
        type: "category" as const,
        data: profitFunnel.map((d) => d.name).reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 11, color: "#6b7280" },
      },
      series: [
        {
          type: "bar",
          data: profitFunnel
            .map((d) => ({
              value: d.value,
              itemStyle: { color: d.color, borderRadius: [0, 4, 4, 0] },
            }))
            .reverse(),
          barWidth: "55%",
          label: {
            show: true,
            position: "right" as const,
            formatter: (p: { value: number }) => fmtN(p.value),
            fontSize: 11,
            fontFamily: "Roboto Mono, monospace",
            color: "#374151",
          },
        },
      ],
    }),
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Revenue by Segment */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span>📊</span> Cơ cấu DT theo phân khúc
        </h3>
        <ReactECharts option={revPie} style={{ height: 180 }} />
        <div className="space-y-1.5 mt-2">
          {revenueBySegment.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
              </div>
              <span className={`text-xs font-bold ${mono}`}>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Structure */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span>🏗️</span> Cấu trúc Chi Phí
        </h3>
        <ReactECharts option={costPie} style={{ height: 180 }} />
        <div className="space-y-1.5 mt-2">
          {costByCategory.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
              </div>
              <span className={`text-xs font-bold ${mono}`}>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Profit Funnel */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
          <span>📉</span> Phễu Hiệu Quả (Profit Funnel)
        </h3>
        <ReactECharts option={funnelChart} style={{ height: 220 }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROW 6 – Detailed Income Statement Table
// ══════════════════════════════════════════════════════════════
function DetailedTable() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 border-t-4 border-t-[#F97316] overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <span>📋</span> Chi tiết Báo Cáo & Tăng Trưởng YoY
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-muted/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {incomeTableHeaders.map((h) => (
                <th
                  key={h}
                  className={`py-3 px-3 ${h === "Chỉ tiêu" ? "text-left" : "text-right"} whitespace-nowrap`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {incomeTableData.map((row, idx) => {
              const padClass =
                row.indent === 2 ? "pl-8" : row.indent === 1 ? "pl-4" : "";
              const fontClass = row.isBold
                ? "font-bold text-gray-900"
                : "text-gray-600";
              const bgClass = row.isBold ? "bg-orange-50/50" : "";

              return (
                <tr
                  key={idx}
                  className={`${bgClass} border-b border-border/30 hover:bg-muted/30 transition-colors`}
                >
                  <td
                    className={`py-2 px-3 text-left text-sm whitespace-nowrap ${padClass} ${fontClass}`}
                  >
                    {row.label}
                  </td>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={`py-2 px-3 text-right text-sm ${mono} whitespace-nowrap ${fontClass}`}
                    >
                      {v != null ? fmtN(v) : "—"}
                    </td>
                  ))}
                  <td className={`py-2 px-3 text-right text-sm ${mono} whitespace-nowrap`}>
                    {row.growth24 != null ? (
                      <span
                        className={
                          row.growth24 >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"
                        }
                      >
                        {row.growth24 >= 0 ? "↑" : "↓"}{" "}
                        {row.growth24 >= 0 ? "+" : ""}
                        {row.growth24.toFixed(1)}%
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

// ══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export default function IncomeStatementDeepDive() {
  return (
    <div className="space-y-5">
      {/* ROW 1 */}
      <KeyMetricCards />
      {/* ROW 2 */}
      <DuPontSection />
      {/* ROW 3 */}
      <RevenueProfitTrends />
      {/* ROW 4 */}
      <GrowthAndEfficiency />
      {/* ROW 5 */}
      <SegmentCharts />
      {/* ROW 6 */}
      <DetailedTable />
    </div>
  );
}
