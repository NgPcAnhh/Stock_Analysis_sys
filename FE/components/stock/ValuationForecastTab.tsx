"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import {
  valuationSummary,
  revenueProjections,
  epsProjections,
  footballFieldData,
  footballFieldCurrentPrice,
  dcfAssumptions,
  dcfProjection,
  dcfSensitivity,
  ddmModel,
  relativeValuation,
  sectorAverage,
  impliedFromPeers,
  profitabilityTrends,
  marginTrends,
  peBandsData,
  pbBandsData,
  consensusCategories,
  formatVND,
} from "@/lib/mockValuationData";

/* ================================================================= */
/*  Định giá & Dự phóng – Valuation & Forecasting (Dashboard Sub-Tab) */
/* ================================================================= */

/* ── Shared helpers ─────────────────────────────────────────── */
const CardWrapper = ({
  title,
  icon,
  children,
  className = "",
  accent,
}: {
  title?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${accent ? `border-t-4 ${accent}` : ""} ${className}`}>
    {title && (
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
    )}
    <div className="px-5 pb-5">{children}</div>
  </div>
);

const SectionHeading = ({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) => (
  <div className="flex items-start gap-3 mb-4 mt-2">
    <span className="text-xl leading-none mt-0.5">{icon}</span>
    <div>
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

type InsightLevel = "positive" | "warning" | "negative" | "neutral";
const InsightBlock = ({ level, children }: { level: InsightLevel; children: React.ReactNode }) => {
  const styles: Record<InsightLevel, { border: string; bg: string; icon: string }> = {
    positive: { border: "border-[#00C076]", bg: "bg-green-50", icon: "✅" },
    warning:  { border: "border-[#FBBF24]", bg: "bg-yellow-50", icon: "⚠️" },
    negative: { border: "border-[#EF4444]", bg: "bg-red-50", icon: "🚨" },
    neutral:  { border: "border-gray-300", bg: "bg-gray-50", icon: "💡" },
  };
  const s = styles[level];
  return (
    <div className={`border-l-4 ${s.border} ${s.bg} rounded-r-lg py-2 px-3 mt-3`}>
      <p className="text-xs text-gray-600"><span className="mr-1">{s.icon}</span>{children}</p>
    </div>
  );
};

/* ================================================================= */
/*  SECTION 1 – VALUATION SUMMARY                                    */
/* ================================================================= */
function ValuationSummaryRow() {
  const s = valuationSummary;
  const verdictColor = s.verdict === "Undervalued" ? "#00C076" : s.verdict === "Overvalued" ? "#EF4444" : "#FBBF24";
  const verdictLabel = s.verdict === "Undervalued" ? "Định giá thấp" : s.verdict === "Overvalued" ? "Định giá cao" : "Hợp lý";

  const gaugeOption = useMemo(
    () => ({
      series: [{
        type: "gauge",
        startAngle: 200, endAngle: -20, min: 0, max: 50, splitNumber: 5,
        progress: { show: true, roundCap: true, width: 14 },
        pointer: { show: false },
        axisLine: { roundCap: true, lineStyle: { width: 14, color: [[0.2, "#EF4444"], [0.4, "#FBBF24"], [1, "#00C076"]] } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        title: { show: true, offsetCenter: [0, "75%"], fontSize: 11, color: "#9CA3AF", text: "Biên an toàn" },
        detail: { fontSize: 32, fontWeight: 800, fontFamily: "var(--font-roboto-mono), monospace", offsetCenter: [0, "20%"], formatter: `{value}%`, color: verdictColor },
        data: [{ value: s.marginOfSafety }],
      }],
    }),
    [s.marginOfSafety, verdictColor]
  );

  const consensus = s.analystConsensus;
  const total = consensus.strongBuy + consensus.buy + consensus.hold + consensus.sell + consensus.strongSell;

  return (
    <>
      <SectionHeading icon="🎯" title="Tổng quan Định giá" subtitle="Weighted blended fair value – 5 phương pháp" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Price vs Intrinsic */}
        <div className="lg:col-span-3">
          <CardWrapper className="h-full">
            <div className="flex flex-col items-center justify-center h-full pt-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Giá hiện tại</p>
              <p className="text-3xl font-extrabold text-gray-800 font-[var(--font-roboto-mono)]">{formatVND(s.currentPrice)}</p>
              <div className="my-3 w-12 border-t-2 border-dashed border-gray-300" />
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Giá trị nội tại</p>
              <p className="text-3xl font-extrabold font-[var(--font-roboto-mono)]" style={{ color: verdictColor }}>{formatVND(s.intrinsicValue)}</p>
              <div className="mt-3 px-4 py-1.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: verdictColor }}>
                {verdictLabel} · Upside +{s.upside}%
              </div>
            </div>
          </CardWrapper>
        </div>
        {/* CENTER: Gauge */}
        <div className="lg:col-span-4">
          <CardWrapper className="h-full">
            <ReactECharts option={gaugeOption} style={{ height: 220 }} />
          </CardWrapper>
        </div>
        {/* RIGHT: Analyst consensus */}
        <div className="lg:col-span-5">
          <CardWrapper title="Đồng thuận Analyst" icon="👥" className="h-full">
            <div className="flex h-7 rounded-full overflow-hidden mt-2 mb-3">
              {consensusCategories.map((cat) => {
                const count = consensus[cat.key as keyof typeof consensus] as number;
                const pct = (count / total) * 100;
                return pct > 0 ? (
                  <div key={cat.key} className="flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${pct}%`, backgroundColor: cat.color }} title={`${cat.label}: ${count}`}>{count}</div>
                ) : null;
              })}
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              {consensusCategories.map((cat) => (
                <div key={cat.key} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-[11px] text-gray-500">{cat.label}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
              {[
                { label: "Thấp nhất", value: consensus.lowTarget, color: "#EF4444" },
                { label: "Trung bình", value: consensus.avgTarget, color: "#F97316" },
                { label: "Cao nhất", value: consensus.highTarget, color: "#00C076" },
              ].map((t) => (
                <div key={t.label} className="text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t.label}</p>
                  <p className="text-base font-bold font-[var(--font-roboto-mono)]" style={{ color: t.color }}>{formatVND(t.value)}</p>
                </div>
              ))}
            </div>
          </CardWrapper>
        </div>
      </div>
      {/* Method breakdown */}
      <div className="mt-4">
        <CardWrapper>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Phương pháp tính giá trị nội tại (trọng số)</p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {s.methodBreakdown.map((m) => (
              <div key={m.method} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 text-center">
                <p className="text-[11px] text-gray-500 mb-1">{m.method}</p>
                <p className="text-lg font-extrabold text-gray-800 font-[var(--font-roboto-mono)]">{formatVND(m.value)}</p>
                <p className="text-[10px] text-gray-400">Trọng số: {(m.weight * 100).toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </CardWrapper>
      </div>
    </>
  );
}

/* ================================================================= */
/*  SECTION 2 – REVENUE & EPS PROJECTIONS                            */
/* ================================================================= */
function ProjectionsRow() {
  const rev = revenueProjections;
  const eps = epsProjections;

  const makeComboOption = (
    years: string[],
    actual: (number | null)[],
    estimate: (number | null)[],
    yoy: (number | null)[],
    barColor: string,
    labelActual: string,
    labelEst: string,
    yAxisName: string,
    yAxisFmt: (v: number) => string,
  ) => ({
    tooltip: { trigger: "axis" as const, axisPointer: { type: "shadow" as const } },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 30, left: 50, right: 30, bottom: 45 },
    xAxis: { type: "category" as const, data: years },
    yAxis: [
      { type: "value" as const, name: yAxisName, nameTextStyle: { fontSize: 10, color: "#9CA3AF" }, axisLabel: { formatter: yAxisFmt } },
      { type: "value" as const, name: "% YoY", nameTextStyle: { fontSize: 10, color: "#9CA3AF" }, axisLabel: { formatter: "{value}%" }, splitLine: { show: false } },
    ],
    series: [
      { name: labelActual, type: "bar", data: actual, itemStyle: { color: barColor, borderRadius: [4, 4, 0, 0] }, barWidth: "30%" },
      { name: labelEst, type: "bar", data: estimate, itemStyle: { color: barColor.replace(")", ",0.35)").replace("rgb", "rgba"), borderColor: barColor, borderWidth: 1, borderType: "dashed" as const, borderRadius: [4, 4, 0, 0] }, barWidth: "30%" },
      { name: "Tăng trưởng YoY", type: "line", yAxisIndex: 1, data: yoy, symbol: "circle", symbolSize: 6, lineStyle: { color: "#F97316", width: 2 }, itemStyle: { color: "#F97316" }, connectNulls: false },
    ],
  });

  const revenueOption = useMemo(
    () => makeComboOption(rev.years, rev.actual, rev.estimate, rev.yoyGrowth, "#3B82F6", "Doanh thu thực", "Doanh thu dự phóng", "Tỷ VND", (v: number) => `${(v / 1000).toFixed(0)}K`),
    [rev]
  );
  const epsOption = useMemo(
    () => makeComboOption(eps.years, eps.actual, eps.estimate, eps.yoyGrowth, "#00C076", "EPS thực", "EPS dự phóng", "VND", (v: number) => v.toLocaleString("vi-VN")),
    [eps]
  );

  return (
    <>
      <SectionHeading icon="📈" title="Dự phóng Doanh thu & EPS" subtitle="Dữ liệu thực tế & ước tính consensus" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardWrapper title="Doanh thu (Revenue)" icon="💰"><ReactECharts option={revenueOption} style={{ height: 300 }} /></CardWrapper>
        <CardWrapper title="Lợi nhuận trên cổ phiếu (EPS)" icon="📊"><ReactECharts option={epsOption} style={{ height: 300 }} /></CardWrapper>
      </div>
    </>
  );
}

/* ================================================================= */
/*  SECTION 3 – PROFITABILITY & MARGIN TRENDS                        */
/* ================================================================= */
function ProfitabilitySection() {
  const prof = profitabilityTrends;
  const marg = marginTrends;

  const profOption = useMemo(() => ({
    tooltip: { trigger: "axis" as const },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 20, left: 45, right: 20, bottom: 45 },
    xAxis: { type: "category" as const, data: prof.years },
    yAxis: { type: "value" as const, axisLabel: { formatter: "{value}%" } },
    series: [
      { name: "ROE", type: "line", data: prof.roe, symbol: "circle", symbolSize: 6, lineStyle: { width: 2.5, color: "#F97316" }, itemStyle: { color: "#F97316" } },
      { name: "ROA", type: "line", data: prof.roa, symbol: "circle", symbolSize: 6, lineStyle: { width: 2.5, color: "#3B82F6" }, itemStyle: { color: "#3B82F6" } },
      { name: "ROIC", type: "line", data: prof.roic, symbol: "circle", symbolSize: 6, lineStyle: { width: 2.5, color: "#00C076" }, itemStyle: { color: "#00C076" } },
    ],
  }), [prof]);

  const margOption = useMemo(() => ({
    tooltip: { trigger: "axis" as const },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 20, left: 45, right: 20, bottom: 45 },
    xAxis: { type: "category" as const, data: marg.years },
    yAxis: { type: "value" as const, axisLabel: { formatter: "{value}%" } },
    series: [
      { name: "Biên Gộp", type: "line", data: marg.grossMargin, lineStyle: { width: 2, color: "#00C076" }, itemStyle: { color: "#00C076" }, areaStyle: { color: "rgba(0,192,118,0.08)" } },
      { name: "Biên EBITDA", type: "line", data: marg.ebitdaMargin, lineStyle: { width: 2, color: "#8B5CF6" }, itemStyle: { color: "#8B5CF6" } },
      { name: "Biên HĐKD", type: "line", data: marg.operatingMargin, lineStyle: { width: 2, color: "#3B82F6" }, itemStyle: { color: "#3B82F6" } },
      { name: "Biên Ròng", type: "line", data: marg.netMargin, lineStyle: { width: 2, color: "#F97316" }, itemStyle: { color: "#F97316" } },
    ],
  }), [marg]);

  return (
    <>
      <SectionHeading icon="📊" title="Hiệu suất sinh lời & Biên lợi nhuận" subtitle="Xu hướng ROE, ROA, ROIC & Margin qua các năm" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardWrapper title="Hiệu suất sinh lời (ROE / ROA / ROIC)" icon="🎯">
          <ReactECharts option={profOption} style={{ height: 280 }} />
          <InsightBlock level="positive">
            ROE duy trì trên 25% liên tục 5 năm, cho thấy năng lực sinh lời vốn chủ rất tốt. ROIC &gt; WACC ({dcfAssumptions.wacc}%) xác nhận doanh nghiệp tạo giá trị.
          </InsightBlock>
        </CardWrapper>
        <CardWrapper title="Biên lợi nhuận (Margin Analysis)" icon="📈">
          <ReactECharts option={margOption} style={{ height: 280 }} />
          <InsightBlock level="positive">
            Biên gộp cải thiện từ 33.5% → 36.7%, biên ròng tăng đều qua các năm. Xu hướng mở rộng margin cho thấy hiệu quả vận hành cải thiện.
          </InsightBlock>
        </CardWrapper>
      </div>
    </>
  );
}

/* ================================================================= */
/*  SECTION 4 – FOOTBALL FIELD                                       */
/* ================================================================= */
function FootballFieldSection() {
  const data = footballFieldData;
  const currentPrice = footballFieldCurrentPrice;

  const option = useMemo(() => {
    const methods = data.map((d) => d.method);
    const allValues = data.flatMap((d) => [d.low, d.high]);
    const minVal = Math.min(...allValues, currentPrice) * 0.85;
    const maxVal = Math.max(...allValues, currentPrice) * 1.1;

    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        formatter: (params: Array<{ name: string }>) => {
          const idx = methods.indexOf(params[0]?.name ?? "");
          if (idx < 0) return "";
          const row = data[idx];
          return `<b>${row.method}</b><br/>Thấp: <b>${formatVND(row.low)}</b><br/>Trung bình: <b>${formatVND(row.mid)}</b><br/>Cao: <b>${formatVND(row.high)}</b>`;
        },
      },
      grid: { top: 20, left: 120, right: 40, bottom: 30 },
      xAxis: { type: "value" as const, min: minVal, max: maxVal, axisLabel: { formatter: (v: number) => formatVND(v) } },
      yAxis: { type: "category" as const, data: methods, inverse: true, axisLabel: { fontSize: 11, fontWeight: 600, color: "#374151" } },
      series: [
        { name: "_placeholder", type: "bar", stack: "range", data: data.map((d) => d.low - minVal), itemStyle: { color: "transparent" }, barWidth: 22, silent: true },
        { name: "Range", type: "bar", stack: "range", data: data.map((d) => d.high - d.low), itemStyle: { color: (p: { dataIndex: number }) => data[p.dataIndex].color, borderRadius: [4, 4, 4, 4], opacity: 0.7 }, barWidth: 22 },
        { name: "Giá trị trung bình", type: "scatter", data: data.map((d, i) => [d.mid, i]), symbol: "diamond", symbolSize: 14, itemStyle: { color: "#1F2937", borderColor: "#fff", borderWidth: 2 }, z: 10 },
        { name: "Giá hiện tại", type: "line", data: [], markLine: { silent: true, symbol: "none", lineStyle: { color: "#F97316", width: 2, type: "dashed" as const }, data: [{ xAxis: currentPrice }], label: { formatter: `Giá hiện tại: ${formatVND(currentPrice)}`, fontSize: 11, fontWeight: 600, color: "#F97316" } }, lineStyle: { width: 0 }, symbol: "none", silent: true },
      ],
    };
  }, [data, currentPrice]);

  return (
    <>
      <SectionHeading icon="🏈" title="Football Field – So sánh vùng định giá" subtitle="Phạm vi định giá theo từng phương pháp | Đường cam = giá hiện tại" />
      <CardWrapper>
        <ReactECharts option={option} style={{ height: 300 }} />
        <div className="flex flex-wrap items-center gap-4 mt-3 border-t border-gray-100 pt-3">
          {data.map((d) => (
            <div key={d.method} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: d.color, opacity: 0.7 }} />
              <span className="text-[11px] text-gray-500">{d.method}: {formatVND(d.low)} – {formatVND(d.high)}</span>
            </div>
          ))}
        </div>
        <InsightBlock level="positive">
          Giá hiện tại ({formatVND(currentPrice)}) nằm dưới vùng low của hầu hết phương pháp. Tất cả 5 mô hình đều cho fair value cao hơn giá thị trường, xác nhận tiềm năng upside đáng kể.
        </InsightBlock>
      </CardWrapper>
    </>
  );
}

/* ================================================================= */
/*  SECTION 5 – DCF DEEP DIVE (ENHANCED)                             */
/* ================================================================= */
function DCFDeepDive() {
  const a = dcfAssumptions;
  const p = dcfProjection;
  const sens = dcfSensitivity;

  /* WACC build-up visual */
  const waccItems = [
    { label: "Lãi suất phi rủi ro (Rf)", value: `${a.riskFreeRate}%`, color: "#3B82F6" },
    { label: "Beta × ERP", value: `${a.beta} × ${a.equityRiskPremium}% = ${(a.beta * a.equityRiskPremium).toFixed(1)}%`, color: "#8B5CF6" },
    { label: "Chi phí vốn CSH (Ke)", value: `${a.costOfEquity}%`, color: "#F97316" },
    { label: "Chi phí nợ sau thuế (Kd)", value: `${a.costOfDebtAfterTax}%`, color: "#00C076" },
    { label: "→ WACC", value: `${a.wacc}%`, color: "#EF4444" },
  ];

  const waterfallOption = useMemo(() => {
    const items = [
      { name: "PV of\nFCFF", value: p.enterpriseValue - p.discountedTerminal },
      { name: "PV\nTerminal", value: p.discountedTerminal },
      { name: "EV", value: p.enterpriseValue },
      { name: "– Nợ ròng", value: -p.netDebt },
      { name: "– LPTSS", value: -(p.minorityInterest ?? 0) },
      { name: "Equity\nValue", value: p.equityValue },
    ];

    return {
      tooltip: { trigger: "axis" as const, formatter: (params: Array<{ name: string; value: number; marker: string }>) => { const p0 = params[0]; return `<b>${p0.name}</b><br/>${p0.marker} ${Math.abs(p0.value).toLocaleString("vi-VN")} tỷ VND`; } },
      grid: { top: 20, left: 50, right: 20, bottom: 50 },
      xAxis: { type: "category" as const, data: items.map((i) => i.name), axisLabel: { fontSize: 10, interval: 0 } },
      yAxis: { type: "value" as const, axisLabel: { formatter: (v: number) => `${(v / 1000).toFixed(0)}K` } },
      series: [{
        type: "bar",
        data: items.map((item, idx) => {
          if (idx === 2) return { value: item.value, itemStyle: { color: "#3B82F6", borderRadius: [4, 4, 0, 0] } };
          if (idx === 5) return { value: item.value, itemStyle: { color: "#00C076", borderRadius: [4, 4, 0, 0] } };
          return { value: item.value, itemStyle: { color: item.value >= 0 ? "#3B82F6" : "#EF4444", borderRadius: [4, 4, 0, 0] } };
        }),
        barWidth: "45%",
      }],
    };
  }, [p]);

  /* FCFF stacked area chart */
  const fcffChartOption = useMemo(() => ({
    tooltip: { trigger: "axis" as const },
    legend: { bottom: 0, textStyle: { fontSize: 10 } },
    grid: { top: 20, left: 50, right: 20, bottom: 45 },
    xAxis: { type: "category" as const, data: p.years },
    yAxis: { type: "value" as const, name: "Tỷ VND", nameTextStyle: { fontSize: 10, color: "#9CA3AF" } },
    series: [
      { name: "NOPAT", type: "bar", data: p.nopat, itemStyle: { color: "#3B82F6", borderRadius: [4, 4, 0, 0] }, barWidth: "22%" },
      { name: "D&A cộng lại", type: "bar", stack: "add", data: p.da, itemStyle: { color: "#00C076" }, barWidth: "22%" },
      { name: "CAPEX", type: "bar", stack: "sub", data: p.capex.map((v) => -v), itemStyle: { color: "#EF4444" }, barWidth: "22%" },
      { name: "∆NWC", type: "bar", stack: "sub", data: p.nwcChange.map((v) => -v), itemStyle: { color: "#FBBF24" }, barWidth: "22%" },
      { name: "FCFF", type: "line", data: p.fcff, symbol: "circle", symbolSize: 8, lineStyle: { width: 3, color: "#F97316" }, itemStyle: { color: "#F97316" }, z: 10 },
    ],
  }), [p]);

  return (
    <CardWrapper title="Mô hình DCF – Chiết khấu dòng tiền tự do (FCFF)" icon="🔬" accent="border-t-blue-500">
      {/* WACC Build-up */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-600 mb-2">Xây dựng WACC (Weighted Average Cost of Capital)</p>
        <div className="flex flex-wrap gap-2">
          {waccItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-gray-500">{item.label}:</span>
              <span className="text-xs font-bold text-gray-800 font-[var(--font-roboto-mono)]">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-4">
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <span className="text-[10px] text-gray-400">Equity Weight:</span>
            <span className="ml-1 text-xs font-bold">{a.equityWeight}%</span>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <span className="text-[10px] text-gray-400">Debt Weight:</span>
            <span className="ml-1 text-xs font-bold">{a.debtWeight}%</span>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <span className="text-[10px] text-gray-400">Terminal Growth:</span>
            <span className="ml-1 text-xs font-bold">{a.terminalGrowth}%</span>
          </div>
        </div>
      </div>

      {/* Detailed Projection Table */}
      <p className="text-xs font-semibold text-gray-600 mb-2">Bảng dự phóng chi tiết (Income → FCFF)</p>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider">
              <th className="text-left px-3 py-2 font-semibold min-w-[140px]">Chỉ tiêu</th>
              {p.years.map((y) => (
                <th key={y} className="text-right px-2 py-2 font-semibold">{y}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {([
              { label: "Revenue (tỷ)", data: p.revenue, cls: "font-semibold text-gray-800 bg-gray-50/50" },
              { label: "  Tăng trưởng (%)", data: p.revenueGrowth, cls: "text-gray-500 italic", pct: true },
              { label: "COGS (tỷ)", data: p.cogs, cls: "" },
              { label: "Gross Profit (tỷ)", data: p.grossProfit, cls: "font-medium text-green-700" },
              { label: "  Gross Margin (%)", data: p.grossMargin, cls: "text-gray-500 italic", pct: true },
              { label: "SG&A (tỷ)", data: p.sga, cls: "" },
              { label: "EBITDA (tỷ)", data: p.ebitda, cls: "font-semibold text-blue-700" },
              { label: "  EBITDA Margin (%)", data: p.ebitdaMargin, cls: "text-gray-500 italic", pct: true },
              { label: "D&A (tỷ)", data: p.da, cls: "" },
              { label: "EBIT (tỷ)", data: p.ebit, cls: "font-medium" },
              { label: "  EBIT Margin (%)", data: p.ebitMargin, cls: "text-gray-500 italic", pct: true },
              { label: "Tax (tỷ)", data: p.tax, cls: "text-red-600" },
              { label: "NOPAT (tỷ)", data: p.nopat, cls: "font-semibold text-blue-700" },
              { label: "– CAPEX (tỷ)", data: p.capex, cls: "text-red-600" },
              { label: "– ∆NWC (tỷ)", data: p.nwcChange, cls: "text-red-600" },
              { label: "+ D&A (tỷ)", data: p.da, cls: "text-green-600" },
              { label: "FCFF (tỷ)", data: p.fcff, cls: "font-bold text-orange-700 bg-orange-50" },
              { label: "Discount Factor", data: p.discountFactor, cls: "text-gray-500 italic" },
              { label: "PV FCFF (tỷ)", data: p.discountedFcff, cls: "font-bold text-gray-800" },
            ] as Array<{ label: string; data: number[]; cls: string; pct?: boolean }>).map((row, ri) => (
              <tr key={ri} className={`border-b border-gray-100 ${row.cls}`}>
                <td className="px-3 py-1.5">{row.label}</td>
                {row.data.map((v, i) => (
                  <td key={i} className="text-right px-2 py-1.5 font-[var(--font-roboto-mono)]">
                    {row.pct ? `${v}%` : typeof v === "number" && v < 1 ? v.toFixed(4) : v.toLocaleString("vi-VN")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FCFF bridge chart */}
      <p className="text-xs font-semibold text-gray-600 mb-2">FCFF Bridge (NOPAT → FCFF)</p>
      <ReactECharts option={fcffChartOption} style={{ height: 220 }} />

      {/* Waterfall */}
      <p className="text-xs font-semibold text-gray-600 mb-2 mt-4">Waterfall: Enterprise Value → Equity Value</p>
      <ReactECharts option={waterfallOption} style={{ height: 200 }} />

      {/* Results */}
      <div className="grid grid-cols-6 gap-2 mt-3 border-t border-gray-100 pt-3">
        {[
          { label: "Terminal Value", value: `${(p.terminalValue / 1000).toFixed(0)}K tỷ`, color: "text-gray-800" },
          { label: "PV Terminal", value: `${(p.discountedTerminal / 1000).toFixed(0)}K tỷ`, color: "text-blue-600" },
          { label: "EV", value: `${(p.enterpriseValue / 1000).toFixed(0)}K tỷ`, color: "text-gray-800" },
          { label: "Nợ ròng", value: `-${(p.netDebt / 1000).toFixed(1)}K tỷ`, color: "text-[#EF4444]" },
          { label: "Equity Value", value: `${(p.equityValue / 1000).toFixed(0)}K tỷ`, color: "text-[#00C076]" },
          { label: "Fair Value / CP", value: formatVND(p.fairValuePerShare), color: "text-[#F97316]" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-[10px] text-gray-400">{item.label}</p>
            <p className={`text-sm font-bold font-[var(--font-roboto-mono)] ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Sensitivity analysis */}
      <div className="mt-5">
        <p className="text-xs font-semibold text-gray-600 mb-2">Bảng nhạy cảm (Sensitivity – WACC vs Terminal Growth)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-1.5 text-left text-gray-400 font-semibold">WACC \ g</th>
                {sens.growthValues.map((g) => (
                  <th key={g} className="px-2 py-1.5 text-right text-gray-500 font-semibold">{g}%</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sens.waccValues.map((w, wi) => (
                <tr key={w} className={`border-b border-gray-100 ${w === a.wacc ? "bg-orange-50 font-bold" : ""}`}>
                  <td className="px-2 py-1.5 font-semibold text-gray-600">{w}%</td>
                  {sens.matrix[wi].map((val, gi) => {
                    const isBase = w === a.wacc && sens.growthValues[gi] === a.terminalGrowth;
                    return (
                      <td key={gi} className={`text-right px-2 py-1.5 font-[var(--font-roboto-mono)] ${isBase ? "text-[#F97316] font-extrabold underline" : val >= valuationSummary.currentPrice ? "text-[#00C076]" : "text-[#EF4444]"}`}>
                        {formatVND(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-gray-400 mt-1 italic">
            * Xanh = trên giá hiện tại ({formatVND(valuationSummary.currentPrice)}), Đỏ = dưới. Cam đậm = giả định cơ sở.
          </p>
        </div>
      </div>
    </CardWrapper>
  );
}

/* ================================================================= */
/*  SECTION 6 – DDM (DIVIDEND DISCOUNT MODEL)                        */
/* ================================================================= */
function DDMSection() {
  const d = ddmModel;
  const a = d.assumptions;
  const hist = d.dividendHistory;

  const histOption = useMemo(() => ({
    tooltip: { trigger: "axis" as const },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 20, left: 50, right: 40, bottom: 45 },
    xAxis: { type: "category" as const, data: hist.years },
    yAxis: [
      { type: "value" as const, name: "VND", nameTextStyle: { fontSize: 10, color: "#9CA3AF" } },
      { type: "value" as const, name: "%", nameTextStyle: { fontSize: 10, color: "#9CA3AF" }, axisLabel: { formatter: "{value}%" }, splitLine: { show: false } },
    ],
    series: [
      { name: "DPS (VND)", type: "bar", data: hist.dps, itemStyle: { color: "#3B82F6", borderRadius: [4, 4, 0, 0] }, barWidth: "35%" },
      { name: "Payout Ratio (%)", type: "line", yAxisIndex: 1, data: hist.payout, lineStyle: { width: 2, color: "#F97316" }, itemStyle: { color: "#F97316" }, symbol: "circle", symbolSize: 6 },
      { name: "Dividend Yield (%)", type: "line", yAxisIndex: 1, data: hist.yield, lineStyle: { width: 2, color: "#00C076", type: "dashed" as const }, itemStyle: { color: "#00C076" }, symbol: "diamond", symbolSize: 6 },
    ],
  }), [hist]);

  return (
    <CardWrapper title="Mô hình DDM – Chiết khấu cổ tức (Gordon Growth)" icon="💎" accent="border-t-green-500">
      {/* Assumptions */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { label: "DPS hiện tại", value: `${a.currentDPS.toLocaleString()} VND` },
          { label: "Tăng trưởng (Y1-3)", value: `${a.dividendGrowthShort}%` },
          { label: "Tăng trưởng (Y4+)", value: `${a.dividendGrowthLong}%` },
          { label: "Ke (Required Return)", value: `${a.requiredReturn}%` },
          { label: "Terminal Growth", value: `${a.terminalGrowth}%` },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase">{item.label}</p>
            <p className="text-sm font-bold text-gray-800 font-[var(--font-roboto-mono)]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Projection table */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Dự phóng cổ tức & PV</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase">
                  <th className="text-left px-2 py-1.5 font-semibold">Năm</th>
                  <th className="text-right px-2 py-1.5 font-semibold">DPS (VND)</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Growth</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Discount</th>
                  <th className="text-right px-2 py-1.5 font-semibold">PV</th>
                </tr>
              </thead>
              <tbody>
                {d.projections.years.map((y, i) => (
                  <tr key={y} className={`border-b border-gray-100 ${y === "Terminal" ? "font-bold bg-green-50" : ""}`}>
                    <td className="px-2 py-1.5 font-medium">{y}</td>
                    <td className="text-right px-2 py-1.5 font-[var(--font-roboto-mono)]">{d.projections.dps[i].toLocaleString()}</td>
                    <td className="text-right px-2 py-1.5 font-[var(--font-roboto-mono)]">{d.projections.growthRate[i]}%</td>
                    <td className="text-right px-2 py-1.5 font-[var(--font-roboto-mono)]">{d.projections.discountFactor[i]?.toFixed(3) ?? "—"}</td>
                    <td className="text-right px-2 py-1.5 font-[var(--font-roboto-mono)]">{d.projections.pvDividend[i]?.toLocaleString() ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Results */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { label: "PV Explicit", value: d.pvExplicit.toLocaleString(), color: "text-blue-600" },
              { label: "TV / Share", value: formatVND(d.terminalValuePerShare), color: "text-gray-700" },
              { label: "PV Terminal", value: d.pvTerminal.toLocaleString(), color: "text-purple-600" },
              { label: "Fair Value (DDM)", value: formatVND(d.fairValue), color: "text-[#00C076]" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 text-center">
                <p className="text-[10px] text-gray-400">{item.label}</p>
                <p className={`text-sm font-bold font-[var(--font-roboto-mono)] ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Dividend history chart */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Lịch sử cổ tức (6 năm)</p>
          <ReactECharts option={histOption} style={{ height: 260 }} />
        </div>
      </div>
      <InsightBlock level="positive">
        Cổ tức tăng trưởng đều đặn ~15%/năm trong 5 năm gần nhất. Payout ratio duy trì ổn định 35-43%, cho thấy công ty vừa giữ lại lợi nhuận tái đầu tư vừa chia sẻ lợi nhuận hợp lý. DDM fair value = {formatVND(d.fairValue)}.
      </InsightBlock>
    </CardWrapper>
  );
}

/* ================================================================= */
/*  SECTION 7 – RELATIVE VALUATION (PEER COMPARISON)                 */
/* ================================================================= */
function RelativeValuationSection() {
  const peers = relativeValuation;
  const avg = sectorAverage;
  const implied = impliedFromPeers;

  return (
    <CardWrapper title="Định giá tương đối – So sánh Peer Group" icon="⚖️" accent="border-t-purple-500">
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider">
              <th className="text-left px-3 py-2 font-semibold">Ticker</th>
              <th className="text-left px-2 py-2 font-semibold">Tên</th>
              <th className="text-right px-2 py-2 font-semibold">Giá (VND)</th>
              <th className="text-right px-2 py-2 font-semibold">P/E</th>
              <th className="text-right px-2 py-2 font-semibold">P/B</th>
              <th className="text-right px-2 py-2 font-semibold">EV/EBITDA</th>
              <th className="text-right px-2 py-2 font-semibold">ROE (%)</th>
              <th className="text-right px-2 py-2 font-semibold">D/E</th>
              <th className="text-right px-2 py-2 font-semibold">MCap (tỷ)</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p) => (
              <tr key={p.ticker} className={`border-b border-gray-100 hover:bg-gray-50/60 transition-colors ${p.highlight ? "bg-orange-50 font-semibold" : ""}`}>
                <td className="px-3 py-2">
                  <span className={`font-bold ${p.highlight ? "text-[#F97316]" : "text-gray-800"}`}>{p.ticker}</span>
                </td>
                <td className="px-2 py-2 text-gray-600">{p.name}</td>
                <td className="text-right px-2 py-2 font-[var(--font-roboto-mono)]">{p.price.toLocaleString()}</td>
                <td className={`text-right px-2 py-2 font-[var(--font-roboto-mono)] ${p.pe < avg.pe ? "text-[#00C076]" : "text-[#EF4444]"}`}>{p.pe.toFixed(1)}</td>
                <td className={`text-right px-2 py-2 font-[var(--font-roboto-mono)] ${p.pb < avg.pb ? "text-[#00C076]" : "text-[#EF4444]"}`}>{p.pb.toFixed(1)}</td>
                <td className={`text-right px-2 py-2 font-[var(--font-roboto-mono)] ${p.evEbitda < avg.evEbitda ? "text-[#00C076]" : "text-[#EF4444]"}`}>{p.evEbitda.toFixed(1)}</td>
                <td className={`text-right px-2 py-2 font-[var(--font-roboto-mono)] ${p.roe > avg.roe ? "text-[#00C076]" : "text-gray-600"}`}>{p.roe.toFixed(1)}</td>
                <td className="text-right px-2 py-2 font-[var(--font-roboto-mono)]">{p.debtEquity.toFixed(2)}</td>
                <td className="text-right px-2 py-2 font-[var(--font-roboto-mono)]">{(p.marketCap / 1000).toFixed(0)}K</td>
              </tr>
            ))}
            {/* Sector average row */}
            <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
              <td className="px-3 py-2 text-blue-700" colSpan={3}>Trung bình ngành</td>
              <td className="text-right px-2 py-2 font-[var(--font-roboto-mono)] text-blue-700">{avg.pe.toFixed(1)}</td>
              <td className="text-right px-2 py-2 font-[var(--font-roboto-mono)] text-blue-700">{avg.pb.toFixed(1)}</td>
              <td className="text-right px-2 py-2 font-[var(--font-roboto-mono)] text-blue-700">{avg.evEbitda.toFixed(1)}</td>
              <td className="text-right px-2 py-2 font-[var(--font-roboto-mono)] text-blue-700">{avg.roe.toFixed(1)}</td>
              <td className="text-right px-2 py-2 font-[var(--font-roboto-mono)] text-blue-700">{avg.debtEquity.toFixed(2)}</td>
              <td className="text-right px-2 py-2">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Implied from peers */}
      <p className="text-xs font-semibold text-gray-600 mb-2">Implied Fair Value từ định giá tương đối</p>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Từ P/E ngành", value: implied.fromPE, color: "#3B82F6" },
          { label: "Từ P/B ngành", value: implied.fromPB, color: "#8B5CF6" },
          { label: "Từ EV/EBITDA", value: implied.fromEVEBITDA, color: "#F97316" },
          { label: "Blended Average", value: implied.blended, color: "#00C076" },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 text-center">
            <p className="text-[10px] text-gray-500 mb-1">{item.label}</p>
            <p className="text-lg font-extrabold font-[var(--font-roboto-mono)]" style={{ color: item.color }}>{formatVND(item.value)}</p>
            <p className={`text-[10px] ${item.value > valuationSummary.currentPrice ? "text-[#00C076]" : "text-[#EF4444]"}`}>
              {item.value > valuationSummary.currentPrice ? "↑" : "↓"} {((item.value / valuationSummary.currentPrice - 1) * 100).toFixed(1)}% vs giá
            </p>
          </div>
        ))}
      </div>
      <InsightBlock level={implied.blended > valuationSummary.currentPrice ? "positive" : "warning"}>
        P/E hiện tại (15.2x) thấp hơn trung bình ngành ({avg.pe}x), trong khi ROE cao hơn ({relativeValuation[0].roe}% vs {avg.roe}%). Doanh nghiệp đang bị chiết khấu so với peer, implied blended = {formatVND(implied.blended)}.
      </InsightBlock>
    </CardWrapper>
  );
}

/* ================================================================= */
/*  SECTION 8 – P/E BANDS + P/B BANDS                                */
/* ================================================================= */
function MultipleBandsSection() {
  const pe = peBandsData;
  const pb = pbBandsData;

  const makeBandOption = (
    years: string[],
    priceHistory: (number | null)[],
    bands: Array<{ label: string; values: number[]; color: string }>,
  ) => ({
    tooltip: { trigger: "axis" as const },
    legend: { bottom: 0, textStyle: { fontSize: 10 }, data: ["Giá thực tế", ...bands.map((b) => b.label)] },
    grid: { top: 20, left: 50, right: 20, bottom: 50 },
    xAxis: { type: "category" as const, data: years },
    yAxis: { type: "value" as const, axisLabel: { formatter: (v: number) => formatVND(v) } },
    series: [
      ...bands.map((band) => ({
        name: band.label,
        type: "line" as const,
        data: band.values,
        lineStyle: { width: 1, type: "dashed" as const, color: band.color },
        itemStyle: { color: band.color },
        symbol: "none",
      })),
      {
        name: "Giá thực tế",
        type: "line" as const,
        data: priceHistory,
        lineStyle: { width: 3, color: "#F97316" },
        itemStyle: { color: "#F97316" },
        symbol: "circle",
        symbolSize: 8,
        connectNulls: false,
        z: 10,
      },
    ],
  });

  const peOption = useMemo(() => makeBandOption(pe.years, pe.priceHistory, pe.bands), [pe]);
  const pbOption = useMemo(() => makeBandOption(pb.years, pb.priceHistory, pb.bands), [pb]);

  return (
    <>
      <SectionHeading icon="📉" title="Vùng định giá lịch sử – P/E & P/B Bands" subtitle="Xác định vùng giá hợp lý dựa trên lịch sử valuation multiple" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardWrapper title="P/E Bands" icon="📊">
          <ReactECharts option={peOption} style={{ height: 320 }} />
          <InsightBlock level="neutral">
            Giá hiện tại ({formatVND(valuationSummary.currentPrice)}) giao dịch ở vùng P/E 14x trung bình lịch sử. Với EPS dự phóng 2025E tăng 14.3%, cổ phiếu có khả năng re-rating lên P/E 17x.
          </InsightBlock>
        </CardWrapper>
        <CardWrapper title="P/B Bands" icon="📈">
          <ReactECharts option={pbOption} style={{ height: 320 }} />
          <InsightBlock level="neutral">
            Với BVPS dự kiến đạt ~{pb.bvps[pb.bvps.length - 1]?.toLocaleString()} VND (2025E), P/B hiện tại ~{(valuationSummary.currentPrice / (pb.bvps[5] ?? 1)).toFixed(1)}x – thấp hơn trung bình lịch sử 3.5x, cho thấy dư địa tăng giá.
          </InsightBlock>
        </CardWrapper>
      </div>
    </>
  );
}

/* ================================================================= */
/*  MAIN EXPORT                                                       */
/* ================================================================= */
export default function ValuationForecastTab() {
  return (
    <div className="space-y-6">
      {/* SECTION 1 – Summary */}
      <ValuationSummaryRow />

      {/* SECTION 2 – Revenue & EPS */}
      <ProjectionsRow />

      {/* SECTION 3 – Profitability & Margins */}
      <ProfitabilitySection />

      {/* SECTION 4 – Football Field */}
      <FootballFieldSection />

      {/* SECTION 5+6 – DCF + DDM side by side */}
      <SectionHeading icon="🔍" title="Mô hình chi tiết – Absolute Valuation" subtitle="DCF (FCFF) & DDM (Gordon Growth) – phân tích chuyên sâu" />
      <div className="space-y-4">
        <DCFDeepDive />
        <DDMSection />
      </div>

      {/* SECTION 7 – Relative Valuation */}
      <SectionHeading icon="⚖️" title="Định giá tương đối – Relative Valuation" subtitle="So sánh bội số với peers cùng ngành" />
      <RelativeValuationSection />

      {/* SECTION 8 – P/E & P/B Bands */}
      <MultipleBandsSection />
    </div>
  );
}
