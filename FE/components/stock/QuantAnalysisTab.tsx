"use client";

import React, { useMemo, useState, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import {
  quantKPI,
  wealthIndex,
  monthlyReturns,
  drawdownData,
  rollingVol,
  histogram,
  scatterData,
  rollingSharpe,
  yearlyReturns,
  varData,
  radarMetrics,
  rollingReturnPeriods,
  monteCarlo,
  generateMonteCarlo,
  generateValuation,
} from "@/lib/mockQuantData";
import type { MonteCarloResult, ValuationResult } from "@/lib/mockQuantData";
import { useStockDetail } from "@/lib/StockDetailContext";

/* ================================================================= */
/*  Phân tích Định lượng – Quantitative Analysis (Dashboard Sub-Tab)  */
/* ================================================================= */

/* ── Shared helpers ─────────────────────────────────────────── */
const fmtPct = (v: number, sign = true) =>
  `${sign && v > 0 ? "+" : ""}${v.toFixed(1)}%`;

const CardWrapper = ({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
    {title && (
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
    )}
    <div className="px-5 pb-5">{children}</div>
  </div>
);

/* ── Section Heading ─────────────────────────────────────────── */
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

/* ── Dynamic Insight Block ───────────────────────────────────── */
type InsightLevel = "positive" | "warning" | "negative" | "neutral";

const InsightBlock = ({
  level,
  children,
}: {
  level: InsightLevel;
  children: React.ReactNode;
}) => {
  const styles: Record<InsightLevel, { border: string; bg: string; icon: string }> = {
    positive: { border: "border-[#00C076]", bg: "bg-green-50", icon: "✅" },
    warning: { border: "border-[#F97316]", bg: "bg-orange-50", icon: "⚠️" },
    negative: { border: "border-[#EF4444]", bg: "bg-red-50", icon: "🔴" },
    neutral: { border: "border-[#3B82F6]", bg: "bg-blue-50", icon: "ℹ️" },
  };
  const s = styles[level];

  return (
    <div className={`mt-3 border-l-4 ${s.border} ${s.bg} rounded-r-lg px-4 py-3`}>
      <p className="text-xs text-gray-600 leading-relaxed">
        <span className="mr-1">{s.icon}</span>
        {children}
      </p>
    </div>
  );
};

/* ================================================================= */
/*  SECTION 1 – HIỆU SUẤT ĐẦU TƯ                                    */
/* ================================================================= */

/* ── KPI Cards ─────────────────────────────────────────── */
const KPICards = () => {
  const kpis = [
    {
      label: "CAGR (Tăng trưởng kép)",
      value: fmtPct(quantKPI.cagr),
      color: "text-[#00C076]",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      label: "Sharpe Ratio",
      value: quantKPI.sharpeRatio.toFixed(2),
      color: "text-[#F97316]",
      bg: "bg-orange-50",
      border: "border-orange-200",
      subtitle: `Risk-free = ${quantKPI.riskFreeRate}%`,
    },
    {
      label: "Max Drawdown",
      value: fmtPct(quantKPI.maxDrawdown, false),
      color: "text-[#EF4444]",
      bg: "bg-red-50",
      border: "border-red-200",
      subtitle: "Sụt giảm lớn nhất",
    },
    {
      label: "Biến động (Ann. Vol)",
      value: fmtPct(quantKPI.annualizedVol, false),
      color: "text-[#3B82F6]",
      bg: "bg-blue-50",
      border: "border-blue-200",
      subtitle: "Biến động giá",
    },
    {
      label: "Beta (vs VN-INDEX)",
      value: quantKPI.beta.toFixed(2),
      color: "text-[#64748B]",
      bg: "bg-slate-50",
      border: "border-slate-200",
      subtitle: "Độ nhạy thị trường",
    },
  ];

  /* ── Dynamic KPI insight ── */
  const insightLevel: InsightLevel =
    quantKPI.sharpeRatio >= 1
      ? "positive"
      : quantKPI.sharpeRatio >= 0.5
        ? "neutral"
        : "negative";

  const insightText =
    quantKPI.sharpeRatio >= 1
      ? `Sharpe Ratio ${quantKPI.sharpeRatio.toFixed(2)} > 1 — lợi nhuận điều chỉnh rủi ro xuất sắc. CAGR ${fmtPct(quantKPI.cagr)} vượt trội so với lãi suất phi rủi ro ${quantKPI.riskFreeRate}%.`
      : quantKPI.sharpeRatio >= 0.5
        ? `Sharpe Ratio ${quantKPI.sharpeRatio.toFixed(2)} ở mức trung bình. Nhà đầu tư nên cân nhắc tương quan rủi ro–lợi nhuận.`
        : `Sharpe Ratio ${quantKPI.sharpeRatio.toFixed(2)} < 0.5 — lợi nhuận chưa đủ bù đắp rủi ro. Cần xem xét lại chiến lược.`;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-xl border ${k.border} ${k.bg} p-4 flex flex-col gap-1`}
          >
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              {k.label}
            </span>
            <span className={`text-2xl font-extrabold font-mono ${k.color}`}>
              {k.value}
            </span>
            {k.subtitle && (
              <span className="text-[11px] text-gray-400">{k.subtitle}</span>
            )}
          </div>
        ))}
      </div>
      <InsightBlock level={insightLevel}>
        <strong>Tổng quan:</strong> {insightText}
      </InsightBlock>
    </>
  );
};

/* ── Cumulative Return vs Benchmark ─────────────────────── */
const CumulativeReturnChart = () => {
  const option = useMemo(() => {
    const dates = wealthIndex.map((d) => d.date);
    const stockVals = wealthIndex.map((d) => d.stock);
    const benchVals = wealthIndex.map((d) => d.benchmark);

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 12, fontFamily: "Roboto Mono" },
        formatter: (params: any) => {
          const date = params[0]?.axisValue;
          let html = `<div style="font-weight:600;margin-bottom:4px">${date}</div>`;
          params.forEach((p: any) => {
            html += `<div style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
              ${p.seriesName}: <b>${Number(p.value).toLocaleString("vi-VN")} đ</b>
            </div>`;
          });
          return html;
        },
      },
      legend: { top: 0, right: 0, textStyle: { fontSize: 11, color: "#64748b" } },
      grid: { top: 40, bottom: 30, left: 60, right: 20 },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { fontSize: 10, color: "#94a3b8", interval: Math.floor(dates.length / 6) },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          fontSize: 10, color: "#94a3b8", fontFamily: "Roboto Mono",
          formatter: (v: number) => (v / 1000).toFixed(0) + "K",
        },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [
        {
          name: "Cổ phiếu", type: "line", data: stockVals, smooth: true, symbol: "none",
          lineStyle: { width: 2.5, color: "#F97316" },
          areaStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(249,115,22,0.15)" },
                { offset: 1, color: "rgba(249,115,22,0)" },
              ],
            },
          },
        },
        {
          name: "VN-INDEX", type: "line", data: benchVals, smooth: true, symbol: "none",
          lineStyle: { width: 1.5, color: "#64748B", type: "dashed" },
        },
      ],
    };
  }, []);

  /* Dynamic insight */
  const lastStock = wealthIndex[wealthIndex.length - 1]?.stock ?? 0;
  const lastBench = wealthIndex[wealthIndex.length - 1]?.benchmark ?? 0;
  const outperform = lastStock > lastBench;

  return (
    <CardWrapper title="Hiệu quả Đầu tư Tích lũy (Cumulative Return) vs VN-INDEX">
      <ReactECharts option={option} style={{ height: 340 }} />
      <InsightBlock level={outperform ? "positive" : "warning"}>
        <strong>Nhận định:</strong>{" "}
        {outperform
          ? `Cổ phiếu tạo ra Alpha dương (+${quantKPI.alpha}%) so với VN-INDEX trong chu kỳ 3 năm. Hiệu quả tích lũy vượt benchmark ${((lastStock / lastBench - 1) * 100).toFixed(1)}%.`
          : `Cổ phiếu kém hơn VN-INDEX trong giai đoạn này. Cần đánh giá lại yếu tố cơ bản và momentum.`}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ── NEW: Yearly Returns Comparison Bar ───────────────────── */
const YearlyReturnsBar = () => {
  const option = useMemo(() => ({
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1e293b",
      borderColor: "#334155",
      textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
      formatter: (params: any) => {
        let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValue}</div>`;
        params.forEach((p: any) => {
          const v = p.value;
          html += `<div style="display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
            ${p.seriesName}: <b style="color:${v >= 0 ? "#00C076" : "#EF4444"}">${v > 0 ? "+" : ""}${v}%</b>
          </div>`;
        });
        return html;
      },
    },
    legend: { top: 0, right: 0, textStyle: { fontSize: 11, color: "#64748b" } },
    grid: { top: 35, bottom: 25, left: 50, right: 15 },
    xAxis: {
      type: "category",
      data: yearlyReturns.map((y) => y.year),
      axisLabel: { fontSize: 11, color: "#64748b", fontWeight: 600, fontFamily: "Roboto Mono" },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono", formatter: (v: number) => v + "%" },
      splitLine: { lineStyle: { color: "#f1f5f9" } },
    },
    series: [
      {
        name: "Cổ phiếu", type: "bar", barWidth: "30%", barGap: "20%",
        data: yearlyReturns.map((y) => ({
          value: y.stock,
          itemStyle: { color: y.stock >= 0 ? "#00C076" : "#EF4444", borderRadius: [4, 4, 0, 0] },
        })),
      },
      {
        name: "VN-INDEX", type: "bar", barWidth: "30%",
        data: yearlyReturns.map((y) => ({
          value: y.benchmark,
          itemStyle: { color: y.benchmark >= 0 ? "#93c5fd" : "#fca5a5", borderRadius: [4, 4, 0, 0] },
        })),
      },
    ],
  }), []);

  /* Dynamic insight */
  const winsCount = yearlyReturns.filter((y) => y.stock > y.benchmark).length;
  const totalYears = yearlyReturns.length;
  const winRate = ((winsCount / totalYears) * 100).toFixed(0);
  const level: InsightLevel = winsCount >= totalYears * 0.6 ? "positive" : winsCount >= totalYears * 0.4 ? "neutral" : "negative";

  return (
    <CardWrapper title="Tỷ suất sinh lời theo Năm (Annual Returns)">
      <ReactECharts option={option} style={{ height: 280 }} />
      <InsightBlock level={level}>
        <strong>So sánh hàng năm:</strong> Cổ phiếu vượt VN-INDEX trong{" "}
        <span className="font-mono font-semibold">{winsCount}/{totalYears}</span> năm (tỷ lệ {winRate}%).
        {winsCount >= totalYears * 0.6
          ? " Khả năng tạo alpha ổn định qua nhiều chu kỳ."
          : winsCount >= totalYears * 0.4
            ? " Hiệu suất phụ thuộc vào giai đoạn thị trường."
            : " Cổ phiếu thường xuyên thua benchmark — cần đánh giá lại."}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ================================================================= */
/*  SECTION 2 – PHÂN TÍCH RỦI RO                                     */
/* ================================================================= */

/* ── Drawdown Chart ─────────────────────────────────────────── */
const DrawdownChart = () => {
  const option = useMemo(() => {
    const dates = drawdownData.map((d) => d.date);
    const vals = drawdownData.map((d) => d.value);

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
        formatter: (params: any) => {
          const p = params[0];
          return `${p.axisValue}<br/>Drawdown: <b style="color:#EF4444">${p.value.toFixed(1)}%</b>`;
        },
      },
      grid: { top: 15, bottom: 30, left: 50, right: 15 },
      xAxis: {
        type: "category", data: dates,
        axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(dates.length / 5) },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value", max: 0,
        axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono", formatter: (v: number) => v.toFixed(0) + "%" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [{
        type: "line", data: vals, symbol: "none",
        lineStyle: { width: 1, color: "#EF4444" },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(239,68,68,0.35)" },
              { offset: 1, color: "rgba(239,68,68,0.05)" },
            ],
          },
        },
      }],
    };
  }, []);

  /* Dynamic insight */
  const mdd = quantKPI.maxDrawdown;
  const ddLevel: InsightLevel = mdd > -15 ? "positive" : mdd > -30 ? "warning" : "negative";

  return (
    <CardWrapper title="Sụt giảm Tối đa (Underwater Chart)">
      <ReactECharts option={option} style={{ height: 260 }} />
      <InsightBlock level={ddLevel}>
        <strong>Drawdown:</strong>{" "}
        {mdd > -15
          ? `Max Drawdown ${fmtPct(mdd, false)} — mức sụt giảm nhỏ, phù hợp nhà đầu tư ưa thích ổn định.`
          : mdd > -30
            ? `Max Drawdown ${fmtPct(mdd, false)} — mức sụt giảm trung bình. Cần quản lý kích thước vị thế.`
            : `Max Drawdown ${fmtPct(mdd, false)} — rủi ro cao, biến động mạnh. Không phù hợp nhà đầu tư bảo thủ.`}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ── Rolling Volatility Chart ─────────────────────────────── */
const RollingVolatilityChart = () => {
  const { data, average } = rollingVol;

  const option = useMemo(() => {
    const dates = data.map((d) => d.date);
    const vals = data.map((d) => d.value);

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
        formatter: (params: any) => {
          const p = params[0];
          return `${p.axisValue}<br/>Volatility: <b style="color:#3B82F6">${p.value}%</b>`;
        },
      },
      grid: { top: 15, bottom: 30, left: 50, right: 15 },
      xAxis: {
        type: "category", data: dates,
        axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(dates.length / 5) },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono", formatter: (v: number) => v.toFixed(0) + "%" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [
        {
          type: "line", data: vals, symbol: "none", smooth: true,
          lineStyle: { width: 1.5, color: "#3B82F6" },
          areaStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(59,130,246,0.12)" },
                { offset: 1, color: "rgba(59,130,246,0)" },
              ],
            },
          },
        },
        {
          type: "line", data: vals.map(() => average), symbol: "none",
          lineStyle: { width: 1, color: "#94a3b8", type: "dashed" },
          tooltip: { show: false }, silent: true,
        },
      ],
    };
  }, [data, average]);

  /* Dynamic insight */
  const recentVol = data.slice(-30).reduce((s, d) => s + d.value, 0) / 30;
  const volLevel: InsightLevel = recentVol <= average ? "positive" : recentVol <= average * 1.3 ? "neutral" : "negative";

  return (
    <CardWrapper title="Độ biến động trượt 30 ngày (Rolling Volatility)">
      <ReactECharts option={option} style={{ height: 260 }} />
      <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400 font-mono">
        <span>Trung bình: {average}%</span>
        <span>Hiện tại: {recentVol.toFixed(1)}%</span>
      </div>
      <InsightBlock level={volLevel}>
        <strong>Volatility:</strong>{" "}
        {recentVol <= average
          ? `Biến động gần đây (${recentVol.toFixed(1)}%) thấp hơn trung bình (${average}%) — thị trường ổn định.`
          : recentVol <= average * 1.3
            ? `Biến động gần đây (${recentVol.toFixed(1)}%) nhỉnh hơn trung bình — theo dõi sát.`
            : `Biến động đang tăng cao (${recentVol.toFixed(1)}% vs TB ${average}%) — cẩn trọng giao dịch.`}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ── NEW: Rolling Sharpe Ratio ────────────────────────────── */
const RollingSharpeChart = () => {
  const { data, average } = rollingSharpe;

  const option = useMemo(() => {
    const dates = data.map((d) => d.date);
    const vals = data.map((d) => d.value);

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
        formatter: (params: any) => {
          const p = params[0];
          const v = Number(p.value);
          return `${p.axisValue}<br/>Rolling Sharpe: <b style="color:${v >= 1 ? "#00C076" : v >= 0 ? "#F97316" : "#EF4444"}">${v.toFixed(2)}</b>`;
        },
      },
      grid: { top: 20, bottom: 30, left: 50, right: 15 },
      xAxis: {
        type: "category", data: dates,
        axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(dates.length / 5) },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      visualMap: {
        show: false,
        pieces: [
          { lt: 0, color: "#EF4444" },
          { gte: 0, lt: 1, color: "#F97316" },
          { gte: 1, color: "#00C076" },
        ],
        seriesIndex: 0,
      },
      series: [
        {
          type: "line", data: vals, symbol: "none", smooth: true,
          lineStyle: { width: 1.5 },
          areaStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(59,130,246,0.08)" },
                { offset: 1, color: "rgba(59,130,246,0)" },
              ],
            },
          },
        },
        {
          type: "line", data: vals.map(() => 1), symbol: "none",
          lineStyle: { width: 1, color: "#00C076", type: "dashed" },
          tooltip: { show: false }, silent: true,
        },
        {
          type: "line", data: vals.map(() => 0), symbol: "none",
          lineStyle: { width: 1, color: "#EF4444", type: "dotted" },
          tooltip: { show: false }, silent: true,
        },
      ],
    };
  }, [data]);

  const recentSharpe = data.slice(-90).reduce((s, d) => s + d.value, 0) / 90;
  const sharpeLevel: InsightLevel = recentSharpe >= 1 ? "positive" : recentSharpe >= 0 ? "neutral" : "negative";

  return (
    <CardWrapper title="Rolling Sharpe Ratio (90 ngày)">
      <ReactECharts option={option} style={{ height: 260 }} />
      <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400 font-mono">
        <span>TB dài hạn: {average}</span>
        <span>Gần đây: {recentSharpe.toFixed(2)}</span>
      </div>
      <InsightBlock level={sharpeLevel}>
        <strong>Rolling Sharpe:</strong>{" "}
        {recentSharpe >= 1
          ? `Sharpe 90 ngày gần nhất (${recentSharpe.toFixed(2)}) > 1 — giai đoạn lợi nhuận/rủi ro rất tốt.`
          : recentSharpe >= 0
            ? `Sharpe 90 ngày (${recentSharpe.toFixed(2)}) dương nhưng dưới 1 — hiệu quả ở mức bình thường.`
            : `Sharpe 90 ngày (${recentSharpe.toFixed(2)}) âm — cổ phiếu đang thua lỗ trong ngắn hạn.`}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ── NEW: VaR Summary Cards ──────────────────────────────── */
const VaRSummary = () => {
  const items = [
    { label: "VaR 95%", value: `${varData.var95}%`, color: "text-[#F97316]", desc: "Thua lỗ tối đa 1 ngày (95%)" },
    { label: "VaR 99%", value: `${varData.var99}%`, color: "text-[#EF4444]", desc: "Thua lỗ tối đa 1 ngày (99%)" },
    { label: "CVaR 95%", value: `${varData.cvar95}%`, color: "text-[#EF4444]", desc: "Kỳ vọng thua lỗ khi vượt VaR" },
    { label: "Vol ngày", value: `${varData.dailyVol}%`, color: "text-[#3B82F6]", desc: "Biến động trung bình 1 ngày" },
    { label: "Ngày tệ nhất", value: `${varData.worstDay}%`, color: "text-[#EF4444]", desc: "Mất mát lớn nhất 1 phiên" },
    { label: "Ngày tốt nhất", value: `+${varData.bestDay}%`, color: "text-[#00C076]", desc: "Lợi nhuận lớn nhất 1 phiên" },
  ];

  const level: InsightLevel = varData.var95 > -3 ? "neutral" : varData.var95 > -5 ? "warning" : "negative";

  return (
    <CardWrapper title="Giá trị Rủi ro (Value at Risk)">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{it.label}</span>
            <div className={`text-xl font-extrabold font-mono ${it.color} mt-1`}>{it.value}</div>
            <span className="text-[10px] text-gray-400">{it.desc}</span>
          </div>
        ))}
      </div>
      <InsightBlock level={level}>
        <strong>Value at Risk:</strong>{" "}
        {varData.var95 > -3
          ? `VaR 95% = ${varData.var95}% — rủi ro hàng ngày ở mức thấp. Phù hợp danh mục ổn định.`
          : varData.var95 > -5
            ? `VaR 95% = ${varData.var95}% — rủi ro trung bình. Với 100 triệu đ, có thể mất tối đa ${Math.abs(varData.var95)} triệu trong 1 phiên.`
            : `VaR 95% = ${varData.var95}% — rủi ro cao. Cần kết hợp stop-loss và phân bổ tài sản hợp lý.`}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ================================================================= */
/*  SECTION 3 – PHÂN TÍCH THỐNG KÊ                                   */
/* ================================================================= */

/* ── Monthly Heatmap ────────────────────────────────────── */
const MonthlyHeatmap = () => {
  const { data, years, ytd } = monthlyReturns;
  const months = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12","YTD"];

  const option = useMemo(() => {
    const heatData: [number, number, number][] = data.map((d) => [
      d.month, years.indexOf(d.year), d.value,
    ]);
    ytd.forEach((v, yi) => heatData.push([12, yi, v]));

    const allVals = heatData.map((d) => d[2]);
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);

    return {
      tooltip: {
        position: "top",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
        formatter: (p: any) => {
          const mi = p.data[0]; const yi = p.data[1]; const v = p.data[2];
          return `<b>${years[yi]}</b> – ${months[mi]}<br/>Tỷ suất: <b style="color:${v >= 0 ? "#00C076" : "#EF4444"}">${v > 0 ? "+" : ""}${v}%</b>`;
        },
      },
      grid: { top: 10, bottom: 40, left: 60, right: 20 },
      xAxis: {
        type: "category", data: months, splitArea: { show: true },
        axisLabel: { fontSize: 11, color: "#64748b", fontWeight: 600 },
        axisLine: { show: false }, axisTick: { show: false },
      },
      yAxis: {
        type: "category", data: years.map(String), splitArea: { show: true },
        axisLabel: { fontSize: 11, color: "#64748b", fontWeight: 600, fontFamily: "Roboto Mono" },
        axisLine: { show: false }, axisTick: { show: false },
      },
      visualMap: {
        min: minVal, max: maxVal, calculable: false, orient: "horizontal",
        left: "center", bottom: 0, itemWidth: 12, itemHeight: 120,
        textStyle: { fontSize: 10, color: "#94a3b8" },
        inRange: { color: ["#fca5a5","#fecaca","#fef2f2","#f0fdf4","#bbf7d0","#4ade80"] },
      },
      series: [{
        type: "heatmap", data: heatData,
        label: {
          show: true, fontSize: 10, fontFamily: "Roboto Mono", fontWeight: 600,
          formatter: (p: any) => { const v = p.data[2]; return `${v > 0 ? "+" : ""}${v}%`; },
          color: "#1e293b",
        },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.2)" } },
        itemStyle: { borderWidth: 2, borderColor: "#fff", borderRadius: 4 },
      }],
    };
  }, [data, years, ytd]);

  /* Dynamic insight: find best/worst months */
  const monthlyAvg = Array.from({ length: 12 }, (_, m) => {
    const vals = data.filter((d) => d.month === m).map((d) => d.value);
    return { month: months[m], avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
  });
  const best = monthlyAvg.reduce((a, b) => (b.avg > a.avg ? b : a));
  const worst = monthlyAvg.reduce((a, b) => (b.avg < a.avg ? b : a));

  return (
    <CardWrapper title="Biểu đồ Nhiệt Tỷ suất sinh lời Hàng tháng (Monthly Returns)">
      <ReactECharts option={option} style={{ height: 280 }} />
      <InsightBlock level="neutral">
        <strong>Tính mùa vụ:</strong> Tháng có hiệu suất trung bình tốt nhất:{" "}
        <span className="font-mono font-semibold text-[#00C076]">{best.month} ({fmtPct(best.avg)})</span>,
        tệ nhất: <span className="font-mono font-semibold text-[#EF4444]">{worst.month} ({fmtPct(worst.avg)})</span>.
        {Math.abs(best.avg - worst.avg) > 5
          ? " Biên độ mùa vụ rộng — có thể khai thác chiến lược timing."
          : " Hiệu ứng mùa vụ không rõ rệt."}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ── Return Histogram ────────────────────────────────────── */
const ReturnHistogram = () => {
  const { bins, normalCurve } = histogram;

  const option = useMemo(() => {
    const categories = bins.map((b) => b.range);
    const counts = bins.map((b) => b.count);
    const curveOnBins = bins.map((b) => {
      const closest = normalCurve.reduce((prev, curr) =>
        Math.abs(curr.x - b.rangeCenter) < Math.abs(prev.x - b.rangeCenter) ? curr : prev,
      );
      return closest.y;
    });

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11 },
      },
      grid: { top: 25, bottom: 35, left: 45, right: 15 },
      xAxis: {
        type: "category", data: categories,
        axisLabel: { fontSize: 8, color: "#94a3b8", rotate: 30 },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [
        {
          name: "Tần suất", type: "bar", data: counts, barWidth: "60%",
          itemStyle: { color: "#94a3b8", borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Phân phối chuẩn", type: "line", data: curveOnBins, smooth: true, symbol: "none",
          lineStyle: { width: 2.5, color: "#F97316" },
        },
      ],
    };
  }, [bins, normalCurve]);

  /* Dynamic insight: skewness approximation */
  const meanIdx = bins.reduce((acc, b, i) => acc + b.count * i, 0) / bins.reduce((acc, b) => acc + b.count, 0);
  const medianIdx = bins.length / 2;
  const skewed = meanIdx < medianIdx - 0.5 ? "left" : meanIdx > medianIdx + 0.5 ? "right" : "symmetric";

  return (
    <CardWrapper title="Phân phối Tỷ suất sinh lời Ngày (Distribution)">
      <ReactECharts option={option} style={{ height: 280 }} />
      <InsightBlock level={skewed === "left" ? "warning" : skewed === "right" ? "positive" : "neutral"}>
        <strong>Phân phối:</strong>{" "}
        {skewed === "left"
          ? "Phân phối lệch trái (negative skew) — các phiên giảm mạnh xuất hiện nhiều hơn kỳ vọng. Rủi ro đuôi trái cao."
          : skewed === "right"
            ? "Phân phối lệch phải (positive skew) — xác suất phiên tăng mạnh vượt kỳ vọng."
            : "Phân phối gần đối xứng — hành vi giá tương đối cân bằng."}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ── Scatter Correlation (β & α) ─────────────────────────── */
const ScatterCorrelation = () => {
  const { points, regressionLine } = scatterData;

  const option = useMemo(() => {
    const scatterPoints = points.map((p) => [p.benchmarkReturn, p.stockReturn]);

    return {
      tooltip: {
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
        formatter: (p: any) => {
          if (p.componentType === "series" && p.seriesIndex === 0) {
            return `VN-INDEX: ${p.data[0]}%<br/>Cổ phiếu: ${p.data[1]}%`;
          }
          return "";
        },
      },
      grid: { top: 25, bottom: 35, left: 50, right: 15 },
      xAxis: {
        type: "value", name: "VN-INDEX (%)", nameLocation: "center", nameGap: 25,
        nameTextStyle: { fontSize: 10, color: "#64748b" },
        axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      yAxis: {
        type: "value", name: "Cổ phiếu (%)", nameLocation: "center", nameGap: 35,
        nameTextStyle: { fontSize: 10, color: "#64748b" },
        axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [
        {
          type: "scatter", data: scatterPoints, symbolSize: 5,
          itemStyle: { color: "#475569", opacity: 0.4 },
        },
        {
          type: "line",
          data: [[regressionLine.x1, regressionLine.y1], [regressionLine.x2, regressionLine.y2]],
          symbol: "none", lineStyle: { width: 2.5, color: "#F97316" },
          tooltip: { show: false }, silent: true,
        },
      ],
    };
  }, [points, regressionLine]);

  const betaLevel: InsightLevel =
    quantKPI.beta <= 1.2 && quantKPI.beta >= 0.8 ? "neutral"
      : quantKPI.beta > 1.2 ? "warning" : "positive";

  return (
    <CardWrapper title="Tương quan vs VN-INDEX (Beta & Alpha)">
      <ReactECharts option={option} style={{ height: 280 }} />
      <div className="flex items-center gap-4 mt-1 text-[10px] text-gray-400 font-mono">
        <span>&beta; = {quantKPI.beta}</span>
        <span>&alpha; = +{quantKPI.alpha}%</span>
      </div>
      <InsightBlock level={betaLevel}>
        <strong>Beta:</strong>{" "}
        {quantKPI.beta > 1.2
          ? `β = ${quantKPI.beta} > 1.2 — cổ phiếu biến động mạnh hơn thị trường. Phù hợp chiến lược tích cực.`
          : quantKPI.beta < 0.8
            ? `β = ${quantKPI.beta} < 0.8 — cổ phiếu phòng thủ, ít nhạy cảm với thị trường.`
            : `β = ${quantKPI.beta} ≈ 1 — cổ phiếu đi theo thị trường. Alpha +${quantKPI.alpha}% cho thấy hiệu quả chọn lọc.`}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ================================================================= */
/*  SECTION 4 – SO SÁNH & ĐÁNH GIÁ TỔNG HỢP                         */
/* ================================================================= */

/* ── NEW: Risk-Reward Radar ─────────────────────────────── */
const RiskRewardRadar = () => {
  const option = useMemo(() => ({
    tooltip: {
      backgroundColor: "#1e293b",
      borderColor: "#334155",
      textStyle: { color: "#f1f5f9", fontSize: 11 },
    },
    legend: {
      top: 0, right: 0,
      textStyle: { fontSize: 11, color: "#64748b" },
    },
    radar: {
      indicator: radarMetrics.map((m) => ({ name: m.name, max: 100 })),
      radius: "65%",
      axisName: { color: "#64748b", fontSize: 10 },
      splitLine: { lineStyle: { color: "#f1f5f9" } },
      splitArea: { areaStyle: { color: ["#fff", "#fafafa", "#f8fafc", "#f1f5f9"] } },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
    },
    series: [{
      type: "radar",
      data: [
        {
          name: "Cổ phiếu",
          value: radarMetrics.map((m) => m.stock),
          lineStyle: { color: "#F97316", width: 2 },
          areaStyle: { color: "rgba(249,115,22,0.15)" },
          itemStyle: { color: "#F97316" },
        },
        {
          name: "VN-INDEX",
          value: radarMetrics.map((m) => m.benchmark),
          lineStyle: { color: "#64748B", width: 1.5, type: "dashed" },
          areaStyle: { color: "rgba(100,116,139,0.08)" },
          itemStyle: { color: "#64748B" },
        },
      ],
    }],
  }), []);

  const stockTotal = radarMetrics.reduce((s, m) => s + m.stock, 0);
  const benchTotal = radarMetrics.reduce((s, m) => s + m.benchmark, 0);
  const overallLevel: InsightLevel = stockTotal > benchTotal * 1.1 ? "positive" : stockTotal > benchTotal * 0.9 ? "neutral" : "negative";

  return (
    <CardWrapper title="Đánh giá Rủi ro – Lợi nhuận (Risk-Reward Radar)">
      <ReactECharts option={option} style={{ height: 320 }} />
      <InsightBlock level={overallLevel}>
        <strong>Tổng hợp:</strong>{" "}
        {stockTotal > benchTotal * 1.1
          ? `Cổ phiếu vượt trội ở đa số tiêu chí (${((stockTotal / benchTotal - 1) * 100).toFixed(0)}% tốt hơn VN-INDEX). Phù hợp cho chiến lược tích lũy dài hạn.`
          : stockTotal > benchTotal * 0.9
            ? "Cổ phiếu ngang bằng VN-INDEX về tổng thể. Cần xem xét từng tiêu chí cụ thể."
            : "Cổ phiếu yếu hơn VN-INDEX trên nhiều tiêu chí. Cân nhắc giảm tỷ trọng trong danh mục."}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ── NEW: Rolling Return Periods Table ─────────────────── */
const RollingReturnTable = () => {
  const bestPeriod = rollingReturnPeriods.reduce((a, b) => (b.pctPositive > a.pctPositive ? b : a));

  return (
    <CardWrapper title="Phân tích Lợi nhuận theo Chu kỳ (Rolling Returns)">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 text-gray-500 font-semibold">Chu kỳ</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">Min</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">Trung bình</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">Max</th>
              <th className="text-right py-2 px-3 text-gray-500 font-semibold">% Dương</th>
            </tr>
          </thead>
          <tbody>
            {rollingReturnPeriods.map((rp) => (
              <tr key={rp.period} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2.5 px-3 font-medium text-gray-700">{rp.period}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#EF4444]">{fmtPct(rp.min)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-gray-700 font-semibold">{fmtPct(rp.avg)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#00C076]">{fmtPct(rp.max)}</td>
                <td className="py-2.5 px-3 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    rp.pctPositive >= 70
                      ? "bg-green-100 text-[#00C076]"
                      : rp.pctPositive >= 50
                        ? "bg-orange-100 text-[#F97316]"
                        : "bg-red-100 text-[#EF4444]"
                  }`}>
                    {rp.pctPositive}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InsightBlock level={bestPeriod.pctPositive >= 80 ? "positive" : "neutral"}>
        <strong>Khuyến nghị:</strong>{" "}
        {bestPeriod.pctPositive >= 80
          ? `Nắm giữ ${bestPeriod.period} có xác suất lãi ${bestPeriod.pctPositive}% — phù hợp chiến lược hold trung/dài hạn.`
          : `Xác suất lãi cao nhất ở chu kỳ ${bestPeriod.period} (${bestPeriod.pctPositive}%). Nên kết hợp nhiều khung thời gian.`}
        {" "}Trung bình lợi nhuận chu kỳ dài nhất đạt{" "}
        <span className="font-mono font-semibold text-[#00C076]">
          {fmtPct(rollingReturnPeriods[rollingReturnPeriods.length - 1].avg)}
        </span>.
      </InsightBlock>
    </CardWrapper>
  );
};

/* ================================================================= */
/*  SECTION 5 – MÔ PHỎNG MONTE CARLO                                 */
/* ================================================================= */

/* ── Shared input row ──────────────────────────────────────────────── */
const ParamInput = ({
  label,
  value,
  onChange,
  unit = "",
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
      {label}
    </span>
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-mono text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
      />
      {unit && <span className="text-[11px] text-gray-400 whitespace-nowrap">{unit}</span>}
    </div>
  </div>
);

const MonteCarloSimulation = () => {
  /* ── State for simulation parameters ──────────────────────────── */
  const [numSims, setNumSims] = useState(1000);
  const [annualReturn, setAnnualReturn] = useState(10);     // %
  const [annualVol, setAnnualVol] = useState(28.5);          // %
  const [timeDays, setTimeDays] = useState(253);             // trading days

  /* ── Risk scenario presets ──────────────────────────────────────── */
  const riskPresets = useMemo(
    () => [
      { name: "Cơ bản", icon: "📊", ret: 10, vol: 28.5, desc: "Dựa trên thông số lịch sử" },
      { name: "Bi quan", icon: "🐻", ret: -5, vol: 40, desc: "Suy thoái / Black Swan" },
      { name: "Lạc quan", icon: "🐂", ret: 25, vol: 20, desc: "Thị trường tăng mạnh" },
      { name: "Sideway", icon: "↔️", ret: 2, vol: 18, desc: "Biến động thấp, không xu hướng" },
    ],
    []
  );

  const [activePreset, setActivePreset] = useState<string>("Cơ bản");

  const applyPreset = useCallback(
    (preset: (typeof riskPresets)[0]) => {
      setActivePreset(preset.name);
      setAnnualReturn(preset.ret);
      setAnnualVol(preset.vol);
    },
    []
  );

  /* ── Run simulation ──────────────────────────────────────────────── */
  const mcResult: MonteCarloResult = useMemo(
    () =>
      generateMonteCarlo({
        numSims: Math.max(100, Math.min(numSims, 10000)),
        days: Math.max(20, Math.min(timeDays, 504)),
        annualReturn,
        annualVol,
      }),
    [numSims, annualReturn, annualVol, timeDays]
  );

  const { paths, percentile95, percentile50, percentile5, stats } = mcResult;
  const days = useMemo(
    () => Array.from({ length: timeDays }, (_, i) => `Day ${i}`),
    [timeDays]
  );

  /* ── Chart option ────────────────────────────────────────────────── */
  const option = useMemo(() => {
    const bgSeries = paths.map((path, idx) => ({
      type: "line" as const,
      data: path,
      symbol: "none",
      lineStyle: { width: 1, color: "#9CA3AF", opacity: 0.15 },
      silent: true,
      tooltip: { show: false },
      name: idx === 0 ? "Kịch bản mẫu" : undefined,
      showSymbol: false,
      z: 1,
    }));

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
        formatter: (params: any) => {
          const day = params[0]?.axisValue;
          let html = `<div style="font-weight:600;margin-bottom:4px">${day}</div>`;
          const named = params.filter((p: any) => p.seriesName && !p.seriesName.startsWith("series"));
          const pLines = named.filter((p: any) =>
            ["Trung vị (50%)", "Tích cực (95%)", "Tiêu cực (5%)"].includes(p.seriesName)
          );
          pLines.forEach((p: any) => {
            html += `<div style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
              ${p.seriesName}: <b>${Number(p.value).toLocaleString("vi-VN")} đ</b>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        top: 0, right: 0,
        data: ["Trung vị (50%)", "Tích cực (95%)", "Tiêu cực (5%)"],
        textStyle: { fontSize: 11, color: "#64748b" },
      },
      grid: { top: 40, bottom: 30, left: 65, right: 15 },
      xAxis: {
        type: "category",
        data: days,
        axisLabel: {
          fontSize: 9, color: "#94a3b8",
          interval: Math.max(Math.floor(timeDays / 6), 1),
          formatter: (v: string) => v.replace("Day ", "D"),
        },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono",
          formatter: (v: number) => (v / 1000).toFixed(0) + "K",
        },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [
        ...bgSeries,
        {
          name: "Trung vị (50%)",
          type: "line", data: percentile50, symbol: "none", z: 10,
          lineStyle: { width: 3, color: "#F97316" },
        },
        {
          name: "Tích cực (95%)",
          type: "line", data: percentile95, symbol: "none", z: 10,
          lineStyle: { width: 2, color: "#00C076", type: "dashed" },
        },
        {
          name: "Tiêu cực (5%)",
          type: "line", data: percentile5, symbol: "none", z: 10,
          lineStyle: { width: 2, color: "#EF4444", type: "dashed" },
        },
      ],
    };
  }, [paths, percentile50, percentile95, percentile5, days, timeDays]);

  const fmtVND = (v: number) => v.toLocaleString("vi-VN") + " đ";

  const level: InsightLevel =
    stats.winRate >= 65 ? "positive" : stats.winRate >= 50 ? "neutral" : "negative";

  const statItems = [
    { label: "Giá hiện tại", value: fmtVND(stats.currentPrice), color: "text-gray-800" },
    { label: "Kỳ vọng Trung vị (50%)", value: fmtVND(stats.median), color: "text-[#F97316]" },
    { label: "Kịch bản Tích cực (Top 5%)", value: fmtVND(stats.top5), color: "text-[#00C076]" },
    { label: "Kịch bản Tiêu cực (Bottom 5%)", value: fmtVND(stats.bottom5), color: "text-[#EF4444]" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Control Panel ──────────────────────────────────────────── */}
      <CardWrapper>
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full" />
            Tham số Mô phỏng
          </h4>

          {/* Risk Scenario Presets */}
          <div>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              Kịch bản Rủi ro
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1.5">
              {riskPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-all ${
                    activePreset === preset.name
                      ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{preset.icon}</span>
                    <span className="text-xs font-semibold text-gray-800">{preset.name}</span>
                  </div>
                  <span className="text-[9px] text-gray-400 leading-tight">{preset.desc}</span>
                  <div className="text-[9px] font-mono text-gray-500 mt-0.5">
                    μ={preset.ret}% · σ={preset.vol}%
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Numeric Inputs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ParamInput
              label="Số lượng kịch bản"
              value={numSims}
              onChange={(v) => { setNumSims(v); setActivePreset(""); }}
              min={100}
              max={10000}
              step={100}
            />
            <ParamInput
              label="Lợi nhuận kỳ vọng (năm)"
              value={annualReturn}
              onChange={(v) => { setAnnualReturn(v); setActivePreset(""); }}
              unit="%"
              min={-50}
              max={100}
              step={0.5}
            />
            <ParamInput
              label="Biến động kỳ vọng (năm)"
              value={annualVol}
              onChange={(v) => { setAnnualVol(v); setActivePreset(""); }}
              unit="%"
              min={5}
              max={100}
              step={0.5}
            />
            <ParamInput
              label="Số ngày dự phóng"
              value={timeDays}
              onChange={(v) => { setTimeDays(v); setActivePreset(""); }}
              unit="ngày"
              min={20}
              max={504}
              step={1}
            />
          </div>
        </div>
      </CardWrapper>

      {/* ── Main Chart + Stats ─────────────────────────────────────── */}
      <CardWrapper title={`Mô phỏng Monte Carlo (${numSims.toLocaleString()} kịch bản · ${timeDays - 1} ngày)`}>
        <p className="text-[11px] text-gray-400 -mt-2 mb-3">
          μ = {annualReturn}%/năm · σ = {annualVol}%/năm · Hiển thị {Math.min(50, numSims)} đường mẫu
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Spaghetti Chart */}
          <div className="lg:col-span-9">
            <ReactECharts option={option} style={{ height: 400 }} />
          </div>

          {/* Right: Stats Panel */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {statItems.map((it) => (
              <div key={it.label} className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  {it.label}
                </span>
                <div className={`text-lg font-extrabold font-mono ${it.color} mt-0.5`}>
                  {it.value}
                </div>
              </div>
            ))}

            {/* Win Rate */}
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Xác suất có lãi (Win Rate)
              </span>
              <div className="text-lg font-extrabold font-mono text-gray-800 mt-0.5">
                {stats.winRate}%
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${stats.winRate}%`,
                    background: `linear-gradient(90deg, #00C076 0%, #00C076 ${stats.winRate}%, #EF4444 ${stats.winRate}%, #EF4444 100%)`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[9px] text-gray-400 font-mono">
                <span>Lỗ {(100 - stats.winRate).toFixed(1)}%</span>
                <span>Lãi {stats.winRate}%</span>
              </div>
            </div>
          </div>
        </div>

        <InsightBlock level={level}>
          <strong>Nhận định:</strong> Dựa trên mô phỏng {numSims.toLocaleString()} kịch bản
          (μ={annualReturn}%, σ={annualVol}%), cổ phiếu có{" "}
          <span className="font-mono font-semibold">{stats.winRate}%</span> xác suất đóng cửa
          cao hơn giá hiện tại sau {timeDays - 1} ngày giao dịch, với mức kỳ vọng trung bình tăng{" "}
          <span className="font-mono font-semibold text-[#F97316]">
            {stats.expectedReturn > 0 ? "+" : ""}{stats.expectedReturn}%
          </span>.
          {stats.winRate >= 65
            ? " Phân bổ rủi ro nghiêng về phía tích cực — momentum hỗ trợ chiến lược mua & nắm giữ."
            : stats.winRate >= 50
              ? " Phân bổ cân bằng — cần kết hợp stop-loss để quản lý rủi ro."
              : " Xác suất thua lỗ cao — không nên mở vị thế mới nếu chưa có tín hiệu đảo chiều."}
          {annualVol >= 35 &&
            " ⚠️ Biến động rất cao — mô hình nhạy cảm với sigma, kết quả cần diễn giải thận trọng."}
        </InsightBlock>
      </CardWrapper>
    </div>
  );
};

/* ================================================================= */
/*  SECTION 6 – ĐỊNH GIÁ CỔ PHIẾU (MONTE CARLO DCF)                 */
/* ================================================================= */

const StockValuationMC = () => {
  /* ── Valuation parameters ─────────────────────────────────────── */
  const [currentEPS, setCurrentEPS] = useState(5200);          // VND
  const [growthRate, setGrowthRate] = useState(15);             // %
  const [growthVol, setGrowthVol] = useState(8);                // %
  const [discountRate, setDiscountRate] = useState(12);         // %
  const [terminalGrowth, setTerminalGrowth] = useState(3);      // %
  const [projYears, setProjYears] = useState(5);
  const [valSims, setValSims] = useState(5000);

  const currentPrice = 85000; // VND from mock

  /* ── Run valuation simulation ────────────────────────────────── */
  const valResult: ValuationResult = useMemo(
    () =>
      generateValuation(
        { currentEPS, growthRate, growthVol, discountRate, terminalGrowth, years: projYears, numSims: Math.max(500, Math.min(valSims, 20000)) },
        currentPrice
      ),
    [currentEPS, growthRate, growthVol, discountRate, terminalGrowth, projYears, valSims]
  );

  /* ── Histogram of fair values ───────────────────────────────────── */
  const histOption = useMemo(() => {
    // Bucket fair values into bins
    const values = valResult.fairValues;
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const BINS = 30;
    const binWidth = (maxV - minV) / BINS || 1;
    const buckets: { range: string; center: number; count: number }[] = [];

    for (let i = 0; i < BINS; i++) {
      const lo = minV + i * binWidth;
      const hi = lo + binWidth;
      const count = values.filter((v) => v >= lo && (i === BINS - 1 ? v <= hi : v < hi)).length;
      buckets.push({
        range: `${(lo / 1000).toFixed(0)}K–${(hi / 1000).toFixed(0)}K`,
        center: Math.round((lo + hi) / 2),
        count,
      });
    }

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
      },
      grid: { top: 40, bottom: 45, left: 50, right: 20 },
      xAxis: {
        type: "category",
        data: buckets.map((b) => b.range),
        axisLabel: { fontSize: 8, color: "#94a3b8", rotate: 45, interval: 2 },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value",
        name: "Số kịch bản",
        nameTextStyle: { fontSize: 10, color: "#94a3b8" },
        axisLabel: { fontSize: 9, color: "#94a3b8" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [
        {
          type: "bar",
          data: buckets.map((b) => ({
            value: b.count,
            itemStyle: {
              color: b.center < currentPrice ? "#EF4444" : "#00C076",
              opacity: 0.75,
            },
          })),
          barMaxWidth: 20,
        },
      ],
      // Mark lines for current price & median
      ...(valResult.median > 0
        ? {}
        : {}),
    };
  }, [valResult, currentPrice]);

  /* ── Valuation verdict ──────────────────────────────────────────── */
  const verdictLevel: InsightLevel =
    valResult.upside >= 20
      ? "positive"
      : valResult.upside >= 0
        ? "neutral"
        : valResult.upside >= -15
          ? "warning"
          : "negative";

  const verdictText =
    valResult.upside >= 20
      ? "Cổ phiếu đang được định giá thấp đáng kể so với giá trị nội tại ước tính — có tiềm năng tăng giá tốt."
      : valResult.upside >= 0
        ? "Giá hiện tại gần mức hợp lý theo mô hình DCF Monte Carlo — upside hạn chế."
        : valResult.upside >= -15
          ? "Cổ phiếu đang bị định giá cao nhẹ — cân nhắc chờ điều chỉnh trước khi mua."
          : "Giá hiện tại cao hơn nhiều so với giá trị nội tại — rủi ro downside lớn.";

  const fmtK = (v: number) => (v / 1000).toFixed(1) + "K đ";
  const fmtVND = (v: number) => v.toLocaleString("vi-VN") + " đ";

  return (
    <div className="space-y-4">
      {/* ── Valuation Inputs ──────────────────────────────────────── */}
      <CardWrapper>
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500 rounded-full" />
            Tham số Định giá DCF
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ParamInput
              label="EPS hiện tại"
              value={currentEPS}
              onChange={setCurrentEPS}
              unit="VND"
              min={100}
              max={100000}
              step={100}
            />
            <ParamInput
              label="Tăng trưởng EPS"
              value={growthRate}
              onChange={setGrowthRate}
              unit="%/năm"
              min={-20}
              max={50}
              step={0.5}
            />
            <ParamInput
              label="Biến động tăng trưởng"
              value={growthVol}
              onChange={setGrowthVol}
              unit="%"
              min={1}
              max={30}
              step={0.5}
            />
            <ParamInput
              label="Tỷ lệ chiết khấu"
              value={discountRate}
              onChange={setDiscountRate}
              unit="%/năm"
              min={5}
              max={25}
              step={0.5}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ParamInput
              label="Tăng trưởng vĩnh viễn"
              value={terminalGrowth}
              onChange={setTerminalGrowth}
              unit="%"
              min={0}
              max={8}
              step={0.5}
            />
            <ParamInput
              label="Số năm dự phóng"
              value={projYears}
              onChange={setProjYears}
              min={3}
              max={10}
              step={1}
            />
            <ParamInput
              label="Số kịch bản"
              value={valSims}
              onChange={setValSims}
              min={500}
              max={20000}
              step={500}
            />
          </div>
        </div>
      </CardWrapper>

      {/* ── Results ───────────────────────────────────────────────── */}
      <CardWrapper title="Phân phối Giá trị Nội tại (Fair Value)">
        <p className="text-[11px] text-gray-400 -mt-2 mb-3">
          Mô phỏng {valSims.toLocaleString()} kịch bản DCF với biến động tăng trưởng ngẫu nhiên
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Histogram */}
          <div className="lg:col-span-8">
            <ReactECharts option={histOption} style={{ height: 350 }} />
            <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-[#EF4444] opacity-75" />
                Dưới giá hiện tại
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-[#00C076] opacity-75" />
                Trên giá hiện tại
              </span>
            </div>
          </div>

          {/* Right: Summary Cards */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Giá hiện tại
              </span>
              <div className="text-lg font-extrabold font-mono text-gray-800 mt-0.5">
                {fmtVND(currentPrice)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Giá trị Nội tại (Trung vị)
              </span>
              <div className="text-lg font-extrabold font-mono text-[#F97316] mt-0.5">
                {fmtVND(valResult.median)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Khoảng tin cậy 80%
              </span>
              <div className="text-sm font-bold font-mono text-gray-700 mt-0.5">
                {fmtK(valResult.percentile10)} – {fmtK(valResult.percentile90)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Upside / Downside
              </span>
              <div
                className={`text-lg font-extrabold font-mono mt-0.5 ${
                  valResult.upside >= 0 ? "text-[#00C076]" : "text-[#EF4444]"
                }`}
              >
                {valResult.upside > 0 ? "+" : ""}
                {valResult.upside}%
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Xác suất Undervalued
              </span>
              <div className="text-lg font-extrabold font-mono text-gray-800 mt-0.5">
                {valResult.pctUndervalued}%
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#00C076] transition-all"
                  style={{ width: `${valResult.pctUndervalued}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[9px] text-gray-400 font-mono">
                <span>Đắt {(100 - valResult.pctUndervalued).toFixed(1)}%</span>
                <span>Rẻ {valResult.pctUndervalued}%</span>
              </div>
            </div>
          </div>
        </div>

        <InsightBlock level={verdictLevel}>
          <strong>Nhận định Định giá:</strong> Với EPS hiện tại {currentEPS.toLocaleString()} đ,
          tăng trưởng kỳ vọng {growthRate}%/năm ± {growthVol}%, chiết khấu {discountRate}%:{" "}
          giá trị nội tại trung vị ước tính{" "}
          <span className="font-mono font-semibold text-[#F97316]">{fmtVND(valResult.median)}</span>,
          tương đương upside{" "}
          <span className={`font-mono font-semibold ${valResult.upside >= 0 ? "text-[#00C076]" : "text-[#EF4444]"}`}>
            {valResult.upside > 0 ? "+" : ""}{valResult.upside}%
          </span>{" "}
          so với giá thị trường. {verdictText}{" "}
          Có <span className="font-mono font-semibold">{valResult.pctUndervalued}%</span> kịch bản
          cho thấy cổ phiếu đang bị định giá thấp.
        </InsightBlock>
      </CardWrapper>
    </div>
  );
};

/* ================================================================= */
/*  MAIN EXPORT                                                       */
/* ================================================================= */

export default function QuantAnalysisTab() {
  const { stockInfo } = useStockDetail();

  return (
    <div className="space-y-6">
      {/* ──────── Title ──────── */}
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-6 bg-gradient-to-b from-[#F97316] to-[#F59E0B] rounded-full" />
        <h2 className="text-base font-bold text-gray-800">
          Phân tích Định lượng – {stockInfo?.ticker ?? ""}
        </h2>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SECTION 1: HIỆU SUẤT ĐẦU TƯ                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon="📊"
          title="Hiệu suất Đầu tư"
          subtitle="Đánh giá khả năng sinh lời theo thời gian so với benchmark VN-INDEX"
        />
        <div className="space-y-4">
          <KPICards />
          <CumulativeReturnChart />
          <YearlyReturnsBar />
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SECTION 2: PHÂN TÍCH RỦI RO                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon="⚠️"
          title="Phân tích Rủi ro"
          subtitle="Đo lường mức độ biến động, sụt giảm và rủi ro đuôi (tail risk)"
        />
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <DrawdownChart />
            </div>
            <div className="lg:col-span-5">
              <VaRSummary />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RollingVolatilityChart />
            <RollingSharpeChart />
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SECTION 3: PHÂN TÍCH THỐNG KÊ                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon="📈"
          title="Phân tích Thống kê"
          subtitle="Phân phối lợi nhuận, tương quan thị trường và hiệu ứng mùa vụ"
        />
        <div className="space-y-4">
          <MonthlyHeatmap />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReturnHistogram />
            <ScatterCorrelation />
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SECTION 4: SO SÁNH & ĐÁNH GIÁ TỔNG HỢP                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon="🎯"
          title="So sánh & Đánh giá Tổng hợp"
          subtitle="Radar đa chiều và phân tích rolling return theo chu kỳ đầu tư"
        />
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RiskRewardRadar />
            <RollingReturnTable />
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SECTION 5: MÔ PHỎNG MONTE CARLO                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon="🎲"
          title="Mô phỏng Monte Carlo"
          subtitle="Chạy N kịch bản ngẫu nhiên với giả định rủi ro tùy chỉnh — dự phóng giá cổ phiếu trong tương lai"
        />
        <MonteCarloSimulation />
      </section>

      <hr className="border-gray-100" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SECTION 6: ĐỊNH GIÁ CỔ PHIẾU                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeading
          icon="💰"
          title="Định giá Cổ phiếu (Monte Carlo DCF)"
          subtitle="Ước tính giá trị nội tại qua mô phỏng dòng tiền chiết khấu với biến động ngẫu nhiên"
        />
        <StockValuationMC />
      </section>
    </div>
  );
}
