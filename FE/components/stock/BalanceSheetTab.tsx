"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import IncomeStatementTab from "@/components/stock/IncomeStatementTab";
import CashFlowTab from "@/components/stock/CashFlowTab";
import {
  overviewStats,
  altmanZScore,
  healthIndicators,
  assetStructure,
  capitalStructure,
  trendData,
  trendInsights,
  inventoryItems,
  inventoryStats,
  leverageItems,
  cccData,
  liquidityData,
  balanceSheetTableData,
  tableYears,
  tableCompareLabel,
} from "@/lib/balanceSheetMockData";
import { useStockDetail } from "@/lib/StockDetailContext";

// ==================== HELPER FUNCTIONS ====================
const formatNumber = (n: number) =>
  n.toLocaleString("vi-VN");

const YoYBadge = ({ value, direction }: { value: number; direction?: "up" | "down" }) => {
  const isUp = direction === "up" || value > 0;
  const color = isUp ? "text-[#00C076]" : "text-[#EF4444]";
  const arrow = isUp ? "↗" : "↘";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {arrow} +{value}% YoY
    </span>
  );
};

// ==================== ROW 0: PAGE HEADER (SHARED) ====================
type SubTab = "balance" | "income" | "cashflow";

function PageHeader({
  ticker,
  activeSubTab,
  onSubTabChange,
}: {
  ticker: string;
  activeSubTab: SubTab;
  onSubTabChange: (tab: SubTab) => void;
}) {
  const [period, setPeriod] = useState("Năm 2024 (Kiểm toán)");

  const subTabs: { id: SubTab; icon: string; label: string }[] = [
    { id: "balance", icon: "📊", label: "Bảng Cân Đối Kế Toán" },
    { id: "income", icon: "📈", label: "Kết Quả Kinh Doanh" },
    { id: "cashflow", icon: "💰", label: "Lưu Chuyển Tiền Tệ" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 3v18M3 9h18" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold">
              Financial Analysis{" "}
              <span className="text-[#F97316]">DeepDive</span>
            </h1>
            <p className="text-xs text-gray-500">Báo cáo chuyên sâu một kỳ</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 mt-3 md:mt-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Doanh nghiệp</span>
            <span className="text-sm font-semibold text-gray-800">{ticker}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Kỳ báo cáo</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm font-semibold text-[#F97316] bg-transparent border-none cursor-pointer focus:outline-none"
            >
              <option>Năm 2024 (Kiểm toán)</option>
              <option>Năm 2023 (Kiểm toán)</option>
              <option>Q4 2024</option>
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Đơn vị</span>
            <span className="text-sm font-semibold text-gray-800">Tỷ VND</span>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex items-center gap-0 px-6">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSubTabChange(tab.id)}
            className={`px-5 py-3 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap ${
              activeSubTab === tab.id
                ? "text-[#F97316] border-[#F97316]"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== ROW 1: KEY METRIC CARDS ====================
function KeyMetricCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {overviewStats.map((stat, idx) => (
        <div
          key={idx}
          className={`bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 ${stat.borderColor} p-5`}
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {stat.label}
          </p>
          <p className="text-3xl font-extrabold text-gray-900 font-[var(--font-roboto-mono)]">
            {formatNumber(stat.value)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {stat.yoyPercent !== undefined && stat.yoyDirection && (
              <YoYBadge value={stat.yoyPercent} direction={stat.yoyDirection} />
            )}
            <span
              className={`text-xs ${
                stat.subLabelColor === "green"
                  ? "text-[#00C076]"
                  : stat.subLabelColor === "red"
                  ? "text-[#EF4444]"
                  : stat.subLabelColor === "purple"
                  ? "text-purple-500"
                  : "text-gray-500"
              }`}
            >
              {stat.subLabel}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== ROW 2: FINANCIAL HEALTH ====================
function FinancialHealthSection() {
  const gaugeOption = useMemo(
    () => ({
      series: [
        {
          type: "gauge",
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 5,
          splitNumber: 5,
          itemStyle: { color: "#00C076" },
          progress: {
            show: true,
            roundCap: true,
            width: 14,
          },
          pointer: { show: false },
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: 14,
              color: [
                [0.33, "#EF4444"],
                [0.6, "#FBBF24"],
                [1, "#00C076"],
              ],
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: { show: false },
          detail: {
            fontSize: 36,
            fontWeight: 800,
            fontFamily: "var(--font-roboto-mono), monospace",
            offsetCenter: [0, "10%"],
            formatter: "{value}",
            color: "#1F2937",
          },
          data: [{ value: altmanZScore.value }],
        },
      ],
    }),
    []
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-5">
        <span className="text-lg">🛡️</span>
        Sức Khỏe Tài Chính & Rủi Ro (Financial Health)
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Gauge */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center">
          <p className="text-sm font-semibold text-gray-600 mb-1">Altman Z-Score (Nguy cơ phá sản)</p>
          <ReactECharts option={gaugeOption} style={{ height: 220, width: "100%" }} />
          <p className="text-sm font-semibold text-[#00C076] -mt-2">
            {altmanZScore.value} — {altmanZScore.label}
          </p>
        </div>
        {/* Right: 2x2 grid */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {healthIndicators.map((item, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">{item.title}</p>
              <p className="text-2xl font-extrabold text-gray-900 font-[var(--font-roboto-mono)]">
                {item.value}
                <span className="text-base font-semibold text-gray-500">{item.suffix}</span>
              </p>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2 mb-1">
                <div
                  className={`h-2 rounded-full ${item.barColor}`}
                  style={{ width: `${Math.min(item.barPercent, 100)}%` }}
                />
              </div>
              <p className={`text-[11px] ${item.statusColor}`}>{item.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== ROW 3: ASSET & CAPITAL STRUCTURE ====================
function AssetCapitalStructure() {
  const assetDonutOption = useMemo(
    () => ({
      tooltip: { trigger: "item" },
      legend: { show: false },
      series: [
        {
          type: "pie",
          radius: ["50%", "75%"],
          avoidLabelOverlap: false,
          label: { show: false },
          data: [
            { value: assetStructure.shortTerm, name: "Tài sản Ngắn hạn", itemStyle: { color: "#F97316" } },
            { value: assetStructure.longTerm, name: "Tài sản Dài hạn", itemStyle: { color: "#8B5CF6" } },
          ],
        },
      ],
    }),
    []
  );

  const capitalDonutOption = useMemo(
    () => ({
      tooltip: { trigger: "item" },
      legend: { show: false },
      series: [
        {
          type: "pie",
          radius: ["50%", "75%"],
          avoidLabelOverlap: false,
          label: { show: false },
          data: [
            { value: capitalStructure.equity, name: "Vốn chủ sở hữu", itemStyle: { color: "#00C076" } },
            { value: capitalStructure.liabilities, name: "Nợ phải trả", itemStyle: { color: "#F97316" } },
          ],
        },
      ],
    }),
    []
  );

  const stackedBarAssetOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11 },
        data: ["Vốn Chủ Sở Hữu", "Nợ Phải Trả"],
      },
      grid: { top: 10, left: 40, right: 20, bottom: 40 },
      xAxis: { type: "category" as const, data: trendData.map((d) => d.year) },
      yAxis: { type: "value" as const, max: 100, axisLabel: { formatter: "{value}%" } },
      series: [
        {
          name: "Vốn Chủ Sở Hữu",
          type: "bar",
          stack: "total",
          data: trendData.map((d) => d.equity),
          itemStyle: { color: "#F97316" },
          barWidth: "40%",
        },
        {
          name: "Nợ Phải Trả",
          type: "bar",
          stack: "total",
          data: trendData.map((d) => d.liabilities),
          itemStyle: { color: "#9CA3AF" },
          barWidth: "40%",
        },
      ],
    }),
    []
  );

  const debtBarOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11 },
        data: ["Nợ Vay Ngắn Hạn", "Nợ Vay Dài Hạn"],
      },
      grid: { top: 10, left: 40, right: 20, bottom: 40 },
      xAxis: { type: "category" as const, data: trendData.map((d) => d.year) },
      yAxis: { type: "value" as const },
      series: [
        {
          name: "Nợ Vay Ngắn Hạn",
          type: "bar",
          stack: "debt",
          data: trendData.map((d) => d.shortTermDebt),
          itemStyle: { color: "#F97316" },
          barWidth: "40%",
        },
        {
          name: "Nợ Vay Dài Hạn",
          type: "bar",
          stack: "debt",
          data: trendData.map((d) => d.longTermDebt),
          itemStyle: { color: "#9CA3AF" },
          barWidth: "40%",
        },
      ],
    }),
    []
  );

  return (
    <div className="space-y-4">
      {/* Donut row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Asset Structure */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <span>🍩</span> Cơ Cấu Tài Sản
            </h3>
            <span className="text-xs text-gray-400 italic">{assetStructure.label}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40 flex-shrink-0">
              <ReactECharts option={assetDonutOption} style={{ height: 160, width: 160 }} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm text-gray-600">Tài sản Ngắn hạn ({assetStructure.shortTerm}%)</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full">
                <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${assetStructure.shortTerm}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-sm text-gray-600">Tài sản Dài hạn ({assetStructure.longTerm}%)</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full">
                <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${assetStructure.longTerm}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Capital Structure */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <span>🍩</span> Cấu Trúc Nguồn Vốn
            </h3>
            <span className="text-xs text-gray-400 italic">Đòn bẩy?</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40 flex-shrink-0">
              <ReactECharts option={capitalDonutOption} style={{ height: 160, width: 160 }} />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Debt / Equity</span>
                <span className="text-sm font-bold text-orange-600 font-[var(--font-roboto-mono)]">
                  {capitalStructure.debtToEquity}x
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full">
                <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${capitalStructure.debtToEquity * 50}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">Nợ vay ngân hàng (Chịu lãi)</span>
                <span className="text-sm font-bold text-purple-600 font-[var(--font-roboto-mono)]">
                  {capitalStructure.bankLoanPercent}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full">
                <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${capitalStructure.bankLoanPercent}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 italic">{capitalStructure.bankLoanLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Year Trend row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stacked Bar - Asset & Capital */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
            <span className="w-1 h-4 bg-orange-500 rounded-full" />
            Cấu trúc Tài sản & Nguồn vốn (5 năm)
          </h3>
          <ReactECharts option={stackedBarAssetOption} style={{ height: 240 }} />
          <div className="mt-3 border-l-4 border-orange-400 pl-3 bg-orange-50/50 rounded-r-lg py-2">
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-orange-600">Nhận định:</span> {trendInsights.assetCapital}
            </p>
          </div>
        </div>

        {/* Stacked Bar - Debt */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3">
            <span className="w-1 h-4 bg-blue-500 rounded-full" />
            Phân tích Nợ & Khả năng Thanh toán
          </h3>
          <ReactECharts option={debtBarOption} style={{ height: 240 }} />
          <div className="mt-3 border-l-4 border-orange-400 pl-3 bg-orange-50/50 rounded-r-lg py-2">
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-orange-600">Nhận định:</span> {trendInsights.debtPayment}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ROW 4: INVENTORY & LEVERAGE ====================
function InventoryAndLeverage() {
  const maxInventory = Math.max(...inventoryItems.map((i) => i.percent));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Inventory */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-4">
          <span>📦</span> Cấu Trúc Hàng Tồn Kho (Chi Tiết)
        </h3>
        <div className="space-y-3 mb-4">
          {inventoryItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-36 flex-shrink-0 truncate">{item.label}</span>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-5 rounded-full ${item.color}`}
                  style={{ width: `${(item.percent / maxInventory) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
          <div className="text-center">
            <p className="text-xs text-gray-400">Nguyên liệu</p>
            <p className="text-sm font-bold text-blue-600 font-[var(--font-roboto-mono)]">
              {inventoryStats.rawMaterial}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Thành phẩm</p>
            <p className="text-sm font-bold text-orange-600 font-[var(--font-roboto-mono)]">
              {inventoryStats.finishedGoods}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Vòng quay</p>
            <p className="text-sm font-bold text-gray-800 font-[var(--font-roboto-mono)]">
              {inventoryStats.turnover}x
            </p>
          </div>
        </div>
      </div>

      {/* Leverage */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-4">
          <span>⚖️</span> Các Chỉ Số Đòn Bẩy Tài Chính
        </h3>
        <div className="space-y-4">
          {leverageItems.map((item, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-0.5">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{item.title}</span>
                  <span className="text-[10px] text-gray-400 ml-2">{item.subtitle}</span>
                </div>
                <span className="text-lg font-extrabold font-[var(--font-roboto-mono)] text-gray-900">
                  {item.value}
                  <span className="text-xs font-semibold text-gray-500">{item.suffix}</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full">
                <div
                  className={`h-1.5 rounded-full ${item.barColor}`}
                  style={{ width: `${Math.min(item.barPercent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== ROW 5: CCC & LIQUIDITY ====================
function CCCAndLiquidity() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* CCC */}
      <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-5">
          <span>🔄</span> Chu Kỳ Tiền Mặt (CCC)
        </h3>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Inventory Days */}
          <div className="flex flex-col items-center bg-blue-50 rounded-xl px-5 py-3 border border-blue-100">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center mb-1">
              <span className="text-xs font-bold">📦</span>
            </div>
            <span className="text-[10px] text-gray-500">Tồn kho</span>
            <span className="text-xl font-extrabold text-blue-700 font-[var(--font-roboto-mono)]">
              {cccData.inventoryDays}d
            </span>
          </div>
          <span className="text-2xl font-bold text-gray-400">+</span>
          {/* Receivable Days */}
          <div className="flex flex-col items-center bg-orange-50 rounded-xl px-5 py-3 border border-orange-100">
            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center mb-1">
              <span className="text-xs font-bold">📄</span>
            </div>
            <span className="text-[10px] text-gray-500">Phải thu</span>
            <span className="text-xl font-extrabold text-orange-700 font-[var(--font-roboto-mono)]">
              {cccData.receivableDays}d
            </span>
          </div>
          <span className="text-2xl font-bold text-gray-400">−</span>
          {/* Payable Days */}
          <div className="flex flex-col items-center bg-green-50 rounded-xl px-5 py-3 border border-green-100">
            <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center mb-1">
              <span className="text-xs font-bold">📋</span>
            </div>
            <span className="text-[10px] text-gray-500">Phải trả</span>
            <span className="text-xl font-extrabold text-green-700 font-[var(--font-roboto-mono)]">
              {cccData.payableDays}d
            </span>
          </div>
          <span className="text-2xl font-bold text-gray-400">=</span>
          {/* Total CCC */}
          <div className="flex flex-col items-center bg-purple-50 rounded-xl px-6 py-3 border-2 border-purple-200">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Chu kỳ</span>
            <span className="text-3xl font-extrabold text-purple-700 font-[var(--font-roboto-mono)]">
              {cccData.cycleDays}
            </span>
            <span className="text-xs text-purple-500 font-semibold">Ngày</span>
          </div>
        </div>
      </div>

      {/* Liquidity */}
      <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Thanh khoản</h3>
        <div className="space-y-4">
          {liquidityData.map((item, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 font-medium">{item.title}</span>
                <span className="text-base font-extrabold font-[var(--font-roboto-mono)] text-gray-900">
                  {item.value}
                  <span className="text-xs text-gray-500">{item.suffix}</span>
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full">
                <div
                  className={`h-2.5 rounded-full ${item.barColor}`}
                  style={{ width: `${Math.min(item.barPercent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== ROW 6: DETAILED TABLE ====================
function DetailedBalanceSheetTable() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-orange-500 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-800">
          Chi tiết Bảng Cân Đối Kế Toán & So Sánh
        </h3>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
          {tableCompareLabel}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-6 py-3 font-semibold min-w-[200px]">Chỉ tiêu</th>
              {tableYears.map((y) => (
                <th key={y} className="text-right px-4 py-3 font-semibold">{y}</th>
              ))}
              <th className="text-right px-4 py-3 font-semibold">Thay đổi</th>
              <th className="text-right px-4 py-3 font-semibold">% YoY</th>
              <th className="text-right px-4 py-3 font-semibold">% Total &apos;24</th>
            </tr>
          </thead>
          <tbody>
            {balanceSheetTableData.map((row, idx) => {
              const isMain = row.level === "main";
              const isSub = row.level === "sub";
              const rowClass = isMain
                ? "font-bold text-orange-700 bg-orange-50"
                : isSub
                ? "font-semibold text-gray-800 bg-gray-50/50"
                : "text-gray-600";

              return (
                <tr
                  key={idx}
                  className={`${rowClass} border-b border-gray-100 hover:bg-gray-50/60 transition-colors`}
                >
                  <td className={`px-6 py-2.5 ${row.level === "detail" ? "pl-10" : ""}`}>
                    {row.label}
                  </td>
                  {row.values.map((val, vi) => (
                    <td key={vi} className="text-right px-4 py-2.5 font-[var(--font-roboto-mono)]">
                      {val !== null ? formatNumber(val) : "—"}
                    </td>
                  ))}
                  <td className="text-right px-4 py-2.5 font-[var(--font-roboto-mono)]">
                    {row.change !== null && row.change !== undefined ? (
                      <span className={row.change >= 0 ? "text-[#00C076]" : "text-[#EF4444]"}>
                        {row.change >= 0 ? "+" : ""}
                        {formatNumber(row.change)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-right px-4 py-2.5 font-[var(--font-roboto-mono)]">
                    {row.yoyPercent !== null && row.yoyPercent !== undefined ? (
                      <span className={row.yoyPercent >= 0 ? "text-[#00C076]" : "text-[#EF4444]"}>
                        {row.yoyPercent >= 0 ? "↑" : "↓"} {Math.abs(row.yoyPercent).toFixed(1)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-right px-4 py-2.5 font-[var(--font-roboto-mono)]">
                    {row.totalPercent !== null && row.totalPercent !== undefined
                      ? `${row.totalPercent.toFixed(1)}%`
                      : "—"}
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

// ==================== BALANCE SHEET CONTENT (no header) ====================
function BalanceSheetContent() {
  return (
    <>
      <KeyMetricCards />
      <FinancialHealthSection />
      <AssetCapitalStructure />
      <InventoryAndLeverage />
      <CCCAndLiquidity />
      <DetailedBalanceSheetTable />
    </>
  );
}

// ==================== MAIN COMPONENT (manages sub-tabs) ====================
export default function BalanceSheetTab() {
  const { stockInfo } = useStockDetail();
  const [subTab, setSubTab] = useState<SubTab>("balance");

  return (
    <div className="space-y-5">
      {/* Shared Header */}
      <PageHeader ticker={stockInfo.ticker} activeSubTab={subTab} onSubTabChange={setSubTab} />

      {/* Sub-tab content */}
      {subTab === "balance" && <BalanceSheetContent />}
      {subTab === "income" && <IncomeStatementTab />}
      {subTab === "cashflow" && <CashFlowTab />}
    </div>
  );
}
