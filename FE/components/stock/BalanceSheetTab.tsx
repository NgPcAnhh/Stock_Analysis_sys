"use client";

import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import IncomeStatementTab from "@/components/stock/IncomeStatementTab";
import CashFlowTab from "@/components/stock/CashFlowTab";
import QuantAnalysisTab from "@/components/stock/QuantAnalysisTab";
import ValuationForecastTab from "@/components/stock/ValuationForecastTab";
import { useStockDetail } from "@/lib/StockDetailContext";
import {
  useDeepAnalysis,
  useFinancialRatios,
  type DeepAnalysisData,
  type OverviewStat,
  type HealthIndicator,
  type TrendYear,
} from "@/hooks/useStockData";

// ==================== HELPER FUNCTIONS ====================
const formatNumber = (n: number) => n.toLocaleString("vi-VN");
const monoFont = "font-[var(--font-roboto-mono)]";

// ==================== ROW 0: PAGE HEADER (SHARED) ====================
type SubTab = "balance" | "income" | "cashflow" | "quant" | "valuation";

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
    { id: "quant", icon: "📐", label: "Phân tích 360" },
    { id: "valuation", icon: "💰", label: "Định giá & Dự phóng" },
  ];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18M3 9h18" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold">Financial Analysis <span className="text-[#F97316]">DeepDive</span></h1>
            <p className="text-xs text-gray-500">Báo cáo chuyên sâu</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 mt-3 md:mt-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Doanh nghiệp</span>
            <span className="text-sm font-semibold text-gray-800">{ticker}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Kỳ báo cáo</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="text-sm font-semibold text-[#F97316] bg-transparent border-none cursor-pointer focus:outline-none">
              <option>Năm 2024 (Kiểm toán)</option><option>Năm 2023 (Kiểm toán)</option><option>Q4 2024</option>
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Đơn vị</span>
            <span className="text-sm font-semibold text-gray-800">Tỷ VND</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-0 px-6 overflow-x-auto">
        {subTabs.map((tab) => (
          <button key={tab.id} onClick={() => onSubTabChange(tab.id)}
            className={`px-5 py-3 text-sm font-semibold border-b-[3px] transition-colors whitespace-nowrap ${
              activeSubTab === tab.id ? "text-[#F97316] border-[#F97316]" : "text-gray-500 border-transparent hover:text-gray-700"
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== ROW 1: KEY METRIC CARDS ====================
function KeyMetricCards({ stats }: { stats: OverviewStat[] }) {
  const borderColors = ["border-t-orange-500", "border-t-orange-400", "border-t-red-500", "border-t-blue-500"];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 ${borderColors[idx % borderColors.length]} p-5`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{stat.label}</p>
          <p className={`text-2xl font-extrabold text-gray-900 ${monoFont}`}>{stat.value}</p>
          {stat.subLabel && <p className="text-xs text-gray-400 mt-1">{stat.subLabel}</p>}
          {stat.trend && (
            <span className={`text-xs font-medium ${stat.trend === "up" ? "text-[#00C076]" : stat.trend === "down" ? "text-[#EF4444]" : "text-gray-500"}`}>
              {stat.trend === "up" ? "↗" : stat.trend === "down" ? "↘" : ""} {stat.trend}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== ROW 2: FINANCIAL HEALTH ====================
function FinancialHealthSection({ indicators }: { indicators: HealthIndicator[] }) {
  const statusColors: Record<string, string> = { good: "text-[#00C076]", warning: "text-[#F59E0B]", danger: "text-[#EF4444]" };
  const barColors: Record<string, string> = { good: "bg-green-500", warning: "bg-yellow-500", danger: "bg-red-500" };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-5">
        <span className="text-lg">🛡️</span> Sức Khỏe Tài Chính & Rủi Ro
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {indicators.map((item, idx) => {
          const barPct = item.value > 0 ? Math.min((item.value / 3) * 100, 100) : 0;
          return (
            <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">{item.name}</p>
              <p className={`text-2xl font-extrabold text-gray-900 ${monoFont}`}>{item.value.toFixed(2)}</p>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2 mb-1">
                <div className={`h-2 rounded-full ${barColors[item.status] ?? "bg-gray-400"}`} style={{ width: `${barPct}%` }} />
              </div>
              <p className={`text-[11px] ${statusColors[item.status] ?? "text-gray-500"}`}>{item.description}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Ngưỡng: {item.threshold}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== ROW 3: ASSET & CAPITAL STRUCTURE ====================
function AssetCapitalStructure({ trends }: { trends: TrendYear[] }) {
  const latest = trends.length > 0 ? trends[trends.length - 1] : null;
  const totalAssets = latest?.totalAssets ?? 0;
  const currentAssets = latest?.currentAssets ?? 0;
  const nonCurrentAssets = latest?.nonCurrentAssets ?? 0;
  const equity = latest?.equity ?? 0;
  const totalLiab = latest?.totalLiabilities ?? 0;
  const shortTermPct = totalAssets > 0 ? Math.round((currentAssets / totalAssets) * 100) : 0;
  const longTermPct = 100 - shortTermPct;
  const equityPct = (equity + totalLiab) > 0 ? Math.round((equity / (equity + totalLiab)) * 100) : 0;
  const liabPct = 100 - equityPct;

  const assetDonutOption = useMemo(() => ({
    tooltip: { trigger: "item" },
    series: [{ type: "pie", radius: ["50%", "75%"], label: { show: false },
      data: [
        { value: shortTermPct, name: "TS Ngắn hạn", itemStyle: { color: "#F97316" } },
        { value: longTermPct, name: "TS Dài hạn", itemStyle: { color: "#8B5CF6" } },
      ],
    }],
  }), [shortTermPct, longTermPct]);

  const capitalDonutOption = useMemo(() => ({
    tooltip: { trigger: "item" },
    series: [{ type: "pie", radius: ["50%", "75%"], label: { show: false },
      data: [
        { value: equityPct, name: "Vốn CSH", itemStyle: { color: "#00C076" } },
        { value: liabPct, name: "Nợ phải trả", itemStyle: { color: "#F97316" } },
      ],
    }],
  }), [equityPct, liabPct]);

  const trendOption = useMemo(() => {
    if (trends.length < 2) return null;
    return {
      tooltip: { trigger: "axis" },
      legend: { top: 4, textStyle: { fontSize: 11 }, data: ["Vốn CSH", "Nợ phải trả"] },
      grid: { top: 40, left: 50, right: 20, bottom: 24 },
      xAxis: { type: "category" as const, data: trends.map((t) => String(t.year)) },
      yAxis: { type: "value" as const },
      series: [
        { name: "Vốn CSH", type: "bar", stack: "total", data: trends.map((t) => ((t.equity ?? 0) / 1e9).toFixed(0)), itemStyle: { color: "#F97316" }, barWidth: "40%" },
        { name: "Nợ phải trả", type: "bar", stack: "total", data: trends.map((t) => ((t.totalLiabilities ?? 0) / 1e9).toFixed(0)), itemStyle: { color: "#9CA3AF" }, barWidth: "40%" },
      ],
    };
  }, [trends]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-4"><span>🍩</span> Cơ Cấu Tài Sản</h3>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40 flex-shrink-0"><ReactECharts option={assetDonutOption} style={{ height: 160, width: 160 }} /></div>
            <div className="space-y-3">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /><span className="text-sm text-gray-600">Ngắn hạn ({shortTermPct}%)</span></div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full"><div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${shortTermPct}%` }} /></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-sm text-gray-600">Dài hạn ({longTermPct}%)</span></div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full"><div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${longTermPct}%` }} /></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-4"><span>🍩</span> Cấu Trúc Nguồn Vốn</h3>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40 flex-shrink-0"><ReactECharts option={capitalDonutOption} style={{ height: 160, width: 160 }} /></div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Vốn CSH</span><span className={`text-sm font-bold text-green-600 ${monoFont}`}>{equityPct}%</span></div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full"><div className="h-1.5 rounded-full bg-green-500" style={{ width: `${equityPct}%` }} /></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Nợ phải trả</span><span className={`text-sm font-bold text-orange-600 ${monoFont}`}>{liabPct}%</span></div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full"><div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${liabPct}%` }} /></div>
            </div>
          </div>
        </div>
      </div>
      {trendOption && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-3"><span className="w-1 h-4 bg-orange-500 rounded-full" /> Cấu trúc Tài sản & Nguồn vốn (Xu hướng)</h3>
          <ReactECharts option={trendOption} style={{ height: 240 }} />
        </div>
      )}
    </div>
  );
}

// ==================== ROW 4: LEVERAGE ====================
function LeverageSection({ leverageData }: { leverageData: Record<string, unknown>[] }) {
  const chartOption = useMemo(() => {
    if (leverageData.length < 2) return null;
    return {
      tooltip: { trigger: "axis" },
      legend: { top: 4, data: ["D/E Ratio"] },
      grid: { top: 36, left: 50, right: 20, bottom: 24 },
      xAxis: { type: "category" as const, data: leverageData.map((d) => String(d.year)) },
      yAxis: { type: "value" as const },
      series: [
        { name: "D/E Ratio", type: "line", data: leverageData.map((d) => d.deRatio), symbol: "circle", symbolSize: 8, lineStyle: { color: "#F97316", width: 3 }, itemStyle: { color: "#F97316" },
          areaStyle: { color: { type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(249,115,22,0.15)" }, { offset: 1, color: "rgba(249,115,22,0.02)" }] } },
        },
      ],
    };
  }, [leverageData]);

  const latest = leverageData.length > 0 ? leverageData[leverageData.length - 1] : null;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-4"><span>⚖️</span> Đòn Bẩy Tài Chính (D/E)</h3>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-1">D/E hiện tại</p>
            <p className={`text-4xl font-extrabold text-gray-900 ${monoFont}`}>{latest ? `${Number(latest.deRatio).toFixed(2)}x` : "N/A"}</p>
            <p className={`text-xs mt-1 ${(Number(latest?.deRatio) ?? 0) <= 1 ? "text-[#00C076]" : "text-[#F59E0B]"}`}>
              {(Number(latest?.deRatio) ?? 0) <= 1 ? "An toàn" : "Cần theo dõi"}
            </p>
          </div>
        </div>
        <div className="lg:col-span-8">
          {chartOption ? <ReactECharts option={chartOption} style={{ height: 200 }} /> : <p className="text-gray-400 text-center py-8">Không đủ dữ liệu</p>}
        </div>
      </div>
    </div>
  );
}

// ==================== ROW 5: CCC & LIQUIDITY ====================
function CCCAndLiquidity({ liquidityData, ratios }: { liquidityData: Record<string, unknown>[]; ratios: { inventoryDays: number | null; receivableDays: number | null; payableDays: number | null; cashConversionCycle: number | null } | null }) {
  const ccc = ratios;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {ccc && (ccc.inventoryDays || ccc.receivableDays || ccc.payableDays) && (
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-5"><span>🔄</span> Chu Kỳ Tiền Mặt (CCC)</h3>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex flex-col items-center bg-blue-50 rounded-xl px-5 py-3 border border-blue-100">
              <span className="text-[10px] text-gray-500">Tồn kho</span>
              <span className={`text-xl font-extrabold text-blue-700 ${monoFont}`}>{ccc.inventoryDays?.toFixed(0) ?? "—"}d</span>
            </div>
            <span className="text-2xl font-bold text-gray-400">+</span>
            <div className="flex flex-col items-center bg-orange-50 rounded-xl px-5 py-3 border border-orange-100">
              <span className="text-[10px] text-gray-500">Phải thu</span>
              <span className={`text-xl font-extrabold text-orange-700 ${monoFont}`}>{ccc.receivableDays?.toFixed(0) ?? "—"}d</span>
            </div>
            <span className="text-2xl font-bold text-gray-400">−</span>
            <div className="flex flex-col items-center bg-green-50 rounded-xl px-5 py-3 border border-green-100">
              <span className="text-[10px] text-gray-500">Phải trả</span>
              <span className={`text-xl font-extrabold text-green-700 ${monoFont}`}>{ccc.payableDays?.toFixed(0) ?? "—"}d</span>
            </div>
            <span className="text-2xl font-bold text-gray-400">=</span>
            <div className="flex flex-col items-center bg-purple-50 rounded-xl px-6 py-3 border-2 border-purple-200">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Chu kỳ</span>
              <span className={`text-3xl font-extrabold text-purple-700 ${monoFont}`}>{ccc.cashConversionCycle?.toFixed(0) ?? "—"}</span>
              <span className="text-xs text-purple-500 font-semibold">Ngày</span>
            </div>
          </div>
        </div>
      )}
      <div className={`${ccc && (ccc.inventoryDays || ccc.receivableDays || ccc.payableDays) ? "lg:col-span-5" : "lg:col-span-12"} bg-white rounded-xl shadow-sm border border-gray-100 p-5`}>
        <h3 className="text-sm font-bold text-gray-800 mb-4">Thanh khoản</h3>
        {liquidityData.length > 0 ? (
          <div className="space-y-4">
            {(() => { const latest = liquidityData[0] as Record<string, number>; const items = [
              { title: "Hệ số thanh toán hiện hành", value: latest?.currentRatio, max: 3 },
              { title: "Hệ số thanh toán nhanh", value: latest?.quickRatio, max: 3 },
              { title: "Hệ số tiền mặt", value: latest?.cashRatio, max: 2 },
            ]; return items.map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 font-medium">{item.title}</span>
                  <span className={`text-base font-extrabold ${monoFont} text-gray-900`}>{item.value != null ? item.value.toFixed(2) : "N/A"}<span className="text-xs text-gray-500">x</span></span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full">
                  <div className={`h-2.5 rounded-full ${(item.value ?? 0) >= 1 ? "bg-green-500" : "bg-orange-500"}`} style={{ width: `${Math.min(((item.value ?? 0) / item.max) * 100, 100)}%` }} />
                </div>
              </div>
            )); })()}
          </div>
        ) : <p className="text-gray-400 text-center py-4">Không có dữ liệu</p>}
      </div>
    </div>
  );
}

// ==================== BALANCE SHEET CONTENT ====================
function BalanceSheetContent() {
  const { ticker } = useStockDetail();
  const { data, loading, error } = useDeepAnalysis(ticker);
  const { data: ratioData } = useFinancialRatios(ticker, 4);

  const bs = data?.balanceSheet;
  const latestRatio = ratioData && ratioData.length > 0 ? ratioData[0] : null;

  if (loading && !data) return <div className="text-center py-12 text-gray-400 animate-pulse">Đang tải phân tích...</div>;
  if (error && !data) return <div className="text-center py-12 text-red-500">Lỗi: {error}</div>;
  if (!bs) return <div className="text-center py-12 text-gray-400">Không có dữ liệu phân tích</div>;

  return (
    <>
      <KeyMetricCards stats={bs.overviewStats} />
      <FinancialHealthSection indicators={bs.healthIndicators} />
      <AssetCapitalStructure trends={bs.trends} />
      <LeverageSection leverageData={bs.leverageData} />
      <CCCAndLiquidity liquidityData={bs.liquidityData} ratios={latestRatio ? { inventoryDays: latestRatio.inventoryDays, receivableDays: latestRatio.receivableDays, payableDays: latestRatio.payableDays, cashConversionCycle: latestRatio.cashConversionCycle } : null} />
    </>
  );
}

// ==================== MAIN COMPONENT ====================
export default function BalanceSheetTab() {
  const { stockInfo } = useStockDetail();
  const [subTab, setSubTab] = useState<SubTab>("balance");
  return (
    <div className="space-y-5">
      <PageHeader ticker={stockInfo.ticker} activeSubTab={subTab} onSubTabChange={setSubTab} />
      {subTab === "balance" && <BalanceSheetContent />}
      {subTab === "income" && <IncomeStatementTab />}
      {subTab === "cashflow" && <CashFlowTab />}
      {subTab === "quant" && <QuantAnalysisTab />}
      {subTab === "valuation" && <ValuationForecastTab />}
    </div>
  );
}
