"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { useQuantAnalysis, type QuantAnalysisData } from "@/hooks/useStockData";

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
  <div className={`bg-card rounded-xl shadow-sm border border-border/50 ${className}`}>
    {title && (
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

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
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="mr-1">{s.icon}</span>
        {children}
      </p>
    </div>
  );
};

/* ================================================================= */
/*  SECTION 1 – KPI CARDS                                             */
/* ================================================================= */
const KPICards = ({ kpis }: { kpis: QuantAnalysisData["kpis"] }) => {
  const colorMap: Record<string, { color: string; bg: string; border: string }> = {
    "Sharpe Ratio": { color: "text-[#F97316]", bg: "bg-orange-50", border: "border-orange-200" },
    "Sortino Ratio": { color: "text-[#10B981]", bg: "bg-emerald-50", border: "border-emerald-200" },
    "Max Drawdown": { color: "text-[#EF4444]", bg: "bg-red-50", border: "border-red-200" },
  };
  const defaults = [
    { color: "text-[#00C076]", bg: "bg-green-50", border: "border-green-200" },
    { color: "text-[#3B82F6]", bg: "bg-blue-50", border: "border-blue-200" },
    { color: "text-[#64748B]", bg: "bg-slate-50", border: "border-slate-200" },
    { color: "text-[#8B5CF6]", bg: "bg-violet-50", border: "border-violet-200" },
    { color: "text-[#F97316]", bg: "bg-orange-50", border: "border-orange-200" },
    { color: "text-[#EF4444]", bg: "bg-red-50", border: "border-red-200" },
  ];

  const sharpe = kpis.find((k) => k.label === "Sharpe Ratio");
  const insightLevel: InsightLevel = sharpe && sharpe.value >= 1 ? "positive" : sharpe && sharpe.value >= 0.5 ? "neutral" : "negative";

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, i) => {
          const style = colorMap[k.label] ?? defaults[i % defaults.length];
          return (
            <div key={k.label} className={`rounded-xl border ${style.border} ${style.bg} p-4 flex flex-col gap-1`}>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{k.label}</span>
              <span className={`text-2xl font-extrabold font-mono ${style.color}`}>
                {k.value}{k.suffix}
              </span>
            </div>
          );
        })}
      </div>
      {sharpe && (
        <InsightBlock level={insightLevel}>
          <strong>Tong quan:</strong>{" "}
          {sharpe.value >= 1
            ? `Sharpe Ratio ${sharpe.value} > 1 — loi nhuan dieu chinh rui ro xuat sac.`
            : sharpe.value >= 0.5
              ? `Sharpe Ratio ${sharpe.value} o muc trung binh. Can can nhac tuong quan rui ro-loi nhuan.`
              : `Sharpe Ratio ${sharpe.value} < 0.5 — loi nhuan chua du bu dap rui ro.`}
        </InsightBlock>
      )}
    </>
  );
};

/* ================================================================= */
/*  CUMULATIVE RETURN (Wealth Index)                                  */
/* ================================================================= */
const CumulativeReturnChart = ({ wealthIndex }: { wealthIndex: QuantAnalysisData["wealthIndex"] }) => {
  const option = useMemo(() => {
    if (wealthIndex.length < 2) return null;
    const dates = wealthIndex.map((d) => d.date);
    const vals = wealthIndex.map((d) => d.value);
    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "#1e293b", borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 12, fontFamily: "Roboto Mono" },
        formatter: (params: { axisValue: string; value: number }[]) =>
          `${params[0]?.axisValue}<br/>Wealth Index: <b>${Number(params[0]?.value).toFixed(4)}</b>`,
      },
      grid: { top: 20, bottom: 30, left: 55, right: 20 },
      xAxis: {
        type: "category" as const, data: dates,
        axisLabel: { fontSize: 10, color: "#94a3b8", interval: Math.floor(dates.length / 6) },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { fontSize: 10, color: "#94a3b8", fontFamily: "Roboto Mono" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [{
        type: "line", data: vals, smooth: true, symbol: "none",
        lineStyle: { width: 2.5, color: "#F97316" },
        areaStyle: {
          color: {
            type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "rgba(249,115,22,0.15)" }, { offset: 1, color: "rgba(249,115,22,0)" }],
          },
        },
      }],
    };
  }, [wealthIndex]);

  if (!option) return null;
  const lastVal = wealthIndex[wealthIndex.length - 1]?.value ?? 1;
  const totalReturn = ((lastVal - 1) * 100);

  return (
    <CardWrapper title="Hieu qua Dau tu Tich luy (Cumulative Wealth Index)">
      <ReactECharts option={option} style={{ height: 340 }} />
      <InsightBlock level={totalReturn > 0 ? "positive" : "negative"}>
        <strong>Nhan dinh:</strong> Tong loi nhuan tich luy: <span className="font-mono font-semibold">{fmtPct(totalReturn)}</span>.
        {totalReturn > 20 ? " Hieu suat vuot troi — chien luoc buy & hold mang lai ket qua tot." : totalReturn > 0 ? " Loi nhuan duong nhung can theo doi momentum." : " Co phieu dang trong xu huong giam — can than."}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ================================================================= */
/*  DRAWDOWN CHART                                                    */
/* ================================================================= */
const DrawdownChart = ({ drawdownData }: { drawdownData: QuantAnalysisData["drawdownData"] }) => {
  const option = useMemo(() => {
    if (drawdownData.length < 2) return null;
    const dates = drawdownData.map((d) => d.date);
    const vals = drawdownData.map((d) => d.value);
    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "#1e293b", borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
        formatter: (params: { axisValue: string; value: number }[]) =>
          `${params[0]?.axisValue}<br/>Drawdown: <b style="color:#EF4444">${Number(params[0]?.value).toFixed(1)}%</b>`,
      },
      grid: { top: 15, bottom: 30, left: 50, right: 15 },
      xAxis: {
        type: "category" as const, data: dates,
        axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(dates.length / 5) },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value" as const, max: 0,
        axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono", formatter: (v: number) => v.toFixed(0) + "%" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [{
        type: "line", data: vals, symbol: "none",
        lineStyle: { width: 1, color: "#EF4444" },
        areaStyle: {
          color: {
            type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "rgba(239,68,68,0.35)" }, { offset: 1, color: "rgba(239,68,68,0.05)" }],
          },
        },
      }],
    };
  }, [drawdownData]);

  if (!option) return null;
  const mdd = Math.min(...drawdownData.map((d) => d.value));
  const ddLevel: InsightLevel = mdd > -15 ? "positive" : mdd > -30 ? "warning" : "negative";

  return (
    <CardWrapper title="Sut giam Toi da (Underwater Chart)">
      <ReactECharts option={option} style={{ height: 260 }} />
      <InsightBlock level={ddLevel}>
        <strong>Drawdown:</strong>{" "}
        {mdd > -15
          ? `Max Drawdown ${fmtPct(mdd, false)} — muc sut giam nho, phu hop nha dau tu on dinh.`
          : mdd > -30
            ? `Max Drawdown ${fmtPct(mdd, false)} — muc sut giam trung binh. Can quan ly kich thuoc vi the.`
            : `Max Drawdown ${fmtPct(mdd, false)} — rui ro cao, bien dong manh.`}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ================================================================= */
/*  ROLLING VOLATILITY                                                */
/* ================================================================= */
const RollingVolatilityChart = ({ rollingVolatility }: { rollingVolatility: QuantAnalysisData["rollingVolatility"] }) => {
  const average = useMemo(() => {
    if (rollingVolatility.length === 0) return 0;
    return rollingVolatility.reduce((s, d) => s + d.value, 0) / rollingVolatility.length;
  }, [rollingVolatility]);

  const option = useMemo(() => {
    if (rollingVolatility.length < 2) return null;
    const dates = rollingVolatility.map((d) => d.date);
    const vals = rollingVolatility.map((d) => d.value);
    return {
      tooltip: {
        trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
      },
      grid: { top: 15, bottom: 30, left: 50, right: 15 },
      xAxis: {
        type: "category" as const, data: dates,
        axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(dates.length / 5) },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono", formatter: (v: number) => v.toFixed(0) + "%" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [
        {
          type: "line", data: vals, symbol: "none", smooth: true,
          lineStyle: { width: 1.5, color: "#3B82F6" },
          areaStyle: {
            color: {
              type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: "rgba(59,130,246,0.12)" }, { offset: 1, color: "rgba(59,130,246,0)" }],
            },
          },
        },
        {
          type: "line", data: vals.map(() => average), symbol: "none",
          lineStyle: { width: 1, color: "#94a3b8", type: "dashed" as const },
          tooltip: { show: false }, silent: true,
        },
      ],
    };
  }, [rollingVolatility, average]);

  if (!option) return null;
  const recentVol = rollingVolatility.slice(-30).reduce((s, d) => s + d.value, 0) / Math.max(rollingVolatility.slice(-30).length, 1);
  const volLevel: InsightLevel = recentVol <= average ? "positive" : recentVol <= average * 1.3 ? "neutral" : "negative";

  return (
    <CardWrapper title="Do bien dong truot (Rolling Volatility)">
      <ReactECharts option={option} style={{ height: 260 }} />
      <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-mono">
        <span>Trung binh: {average.toFixed(1)}%</span>
        <span>Hien tai: {recentVol.toFixed(1)}%</span>
      </div>
      <InsightBlock level={volLevel}>
        <strong>Volatility:</strong>{" "}
        {recentVol <= average
          ? `Bien dong gan day (${recentVol.toFixed(1)}%) thap hon trung binh (${average.toFixed(1)}%) — thi truong on dinh.`
          : `Bien dong dang tang (${recentVol.toFixed(1)}% vs TB ${average.toFixed(1)}%) — can trong.`}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ================================================================= */
/*  ROLLING SHARPE                                                    */
/* ================================================================= */
const RollingSharpeChart = ({ rollingSharpe }: { rollingSharpe: QuantAnalysisData["rollingSharpe"] }) => {
  const average = useMemo(() => {
    if (rollingSharpe.length === 0) return 0;
    return rollingSharpe.reduce((s, d) => s + d.value, 0) / rollingSharpe.length;
  }, [rollingSharpe]);

  const option = useMemo(() => {
    if (rollingSharpe.length < 2) return null;
    const dates = rollingSharpe.map((d) => d.date);
    const vals = rollingSharpe.map((d) => d.value);
    return {
      tooltip: {
        trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
      },
      grid: { top: 20, bottom: 30, left: 50, right: 15 },
      xAxis: {
        type: "category" as const, data: dates,
        axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.floor(dates.length / 5) },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value" as const,
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
              type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: "rgba(59,130,246,0.08)" }, { offset: 1, color: "rgba(59,130,246,0)" }],
            },
          },
        },
        {
          type: "line", data: vals.map(() => 1), symbol: "none",
          lineStyle: { width: 1, color: "#00C076", type: "dashed" as const },
          tooltip: { show: false }, silent: true,
        },
        {
          type: "line", data: vals.map(() => 0), symbol: "none",
          lineStyle: { width: 1, color: "#EF4444", type: "dotted" as const },
          tooltip: { show: false }, silent: true,
        },
      ],
    };
  }, [rollingSharpe]);

  if (!option) return null;
  const recent = rollingSharpe.slice(-30).reduce((s, d) => s + d.value, 0) / Math.max(rollingSharpe.slice(-30).length, 1);
  const level: InsightLevel = recent >= 1 ? "positive" : recent >= 0 ? "neutral" : "negative";

  return (
    <CardWrapper title="Rolling Sharpe Ratio">
      <ReactECharts option={option} style={{ height: 260 }} />
      <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground font-mono">
        <span>TB dai han: {average.toFixed(2)}</span>
        <span>Gan day: {recent.toFixed(2)}</span>
      </div>
      <InsightBlock level={level}>
        <strong>Rolling Sharpe:</strong>{" "}
        {recent >= 1
          ? `Sharpe gan nhat (${recent.toFixed(2)}) > 1 — giai doan loi nhuan/rui ro rat tot.`
          : recent >= 0
            ? `Sharpe (${recent.toFixed(2)}) duong nhung duoi 1 — hieu qua o muc binh thuong.`
            : `Sharpe (${recent.toFixed(2)}) am — co phieu dang thua lo trong ngan han.`}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ================================================================= */
/*  VAR SUMMARY                                                       */
/* ================================================================= */
const VaRSummary = ({ varData }: { varData: QuantAnalysisData["varData"] }) => {
  const items = [
    { label: "VaR 95%", value: `${varData.var95}%`, color: "text-[#F97316]", desc: "Thua lo toi da 1 ngay (95%)" },
    { label: "VaR 99%", value: `${varData.var99}%`, color: "text-[#EF4444]", desc: "Thua lo toi da 1 ngay (99%)" },
    { label: "CVaR 95%", value: `${varData.cvar95}%`, color: "text-[#EF4444]", desc: "Ky vong thua lo khi vuot VaR" },
  ];

  const level: InsightLevel = varData.var95 > -3 ? "neutral" : varData.var95 > -5 ? "warning" : "negative";

  return (
    <CardWrapper title="Gia tri Rui ro (Value at Risk)">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg bg-muted/50 border border-border/50 p-3">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{it.label}</span>
            <div className={`text-xl font-extrabold font-mono ${it.color} mt-1`}>{it.value}</div>
            <span className="text-[10px] text-muted-foreground">{it.desc}</span>
          </div>
        ))}
      </div>
      <InsightBlock level={level}>
        <strong>Value at Risk:</strong>{" "}
        {varData.var95 > -3
          ? `VaR 95% = ${varData.var95}% — rui ro hang ngay o muc thap.`
          : varData.var95 > -5
            ? `VaR 95% = ${varData.var95}% — rui ro trung binh.`
            : `VaR 95% = ${varData.var95}% — rui ro cao. Can ket hop stop-loss.`}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ================================================================= */
/*  MONTHLY HEATMAP                                                   */
/* ================================================================= */
const MonthlyHeatmap = ({ monthlyReturns }: { monthlyReturns: QuantAnalysisData["monthlyReturns"] }) => {
  const { years, grouped } = useMemo(() => {
    const yrs = [...new Set(monthlyReturns.map((m) => m.year))].sort();
    const grp = new Map<string, number>();
    monthlyReturns.forEach((m) => grp.set(`${m.year}-${m.month}`, m.return));
    return { years: yrs, grouped: grp };
  }, [monthlyReturns]);

  const months = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

  const option = useMemo(() => {
    if (years.length < 1) return null;
    const heatData: [number, number, number][] = [];
    years.forEach((yr, yi) => {
      for (let m = 1; m <= 12; m++) {
        const v = grouped.get(`${yr}-${m}`) ?? 0;
        heatData.push([m - 1, yi, v]);
      }
    });

    const allVals = heatData.map((d) => d[2]).filter((v) => v !== 0);
    const minVal = allVals.length ? Math.min(...allVals) : -10;
    const maxVal = allVals.length ? Math.max(...allVals) : 10;

    return {
      tooltip: {
        position: "top" as const, backgroundColor: "#1e293b", borderColor: "#334155",
        textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" },
        formatter: (p: { data: [number, number, number] }) => {
          const mi = p.data[0]; const yi = p.data[1]; const v = p.data[2];
          return `<b>${years[yi]}</b> – ${months[mi]}<br/>Ty suat: <b style="color:${v >= 0 ? "#00C076" : "#EF4444"}">${v > 0 ? "+" : ""}${v}%</b>`;
        },
      },
      grid: { top: 10, bottom: 40, left: 60, right: 20 },
      xAxis: {
        type: "category" as const, data: months, splitArea: { show: true },
        axisLabel: { fontSize: 11, color: "#64748b", fontWeight: 600 },
        axisLine: { show: false }, axisTick: { show: false },
      },
      yAxis: {
        type: "category" as const, data: years.map(String), splitArea: { show: true },
        axisLabel: { fontSize: 11, color: "#64748b", fontWeight: 600, fontFamily: "Roboto Mono" },
        axisLine: { show: false }, axisTick: { show: false },
      },
      visualMap: {
        min: minVal, max: maxVal, calculable: false, orient: "horizontal" as const,
        left: "center", bottom: 0, itemWidth: 12, itemHeight: 120,
        textStyle: { fontSize: 10, color: "#94a3b8" },
        inRange: { color: ["#fca5a5", "#fecaca", "#fef2f2", "#f0fdf4", "#bbf7d0", "#4ade80"] },
      },
      series: [{
        type: "heatmap", data: heatData,
        label: {
          show: true, fontSize: 10, fontFamily: "Roboto Mono", fontWeight: 600,
          formatter: (p: { data: [number, number, number] }) => { const v = p.data[2]; return v !== 0 ? `${v > 0 ? "+" : ""}${v}%` : ""; },
          color: "#1e293b",
        },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.2)" } },
        itemStyle: { borderWidth: 2, borderColor: "#fff", borderRadius: 4 },
      }],
    };
  }, [years, grouped, months]);

  if (!option) return null;
  return (
    <CardWrapper title="Bieu do Nhiet Ty suat sinh loi Hang thang">
      <ReactECharts option={option} style={{ height: Math.max(220, years.length * 45 + 80) }} />
    </CardWrapper>
  );
};

/* ================================================================= */
/*  HISTOGRAM                                                         */
/* ================================================================= */
const ReturnHistogram = ({ histogram }: { histogram: QuantAnalysisData["histogram"] }) => {
  const option = useMemo(() => {
    if (histogram.length < 2) return null;
    const categories = histogram.map((b) => `${b.bin}%`);
    const counts = histogram.map((b) => b.count);
    return {
      tooltip: { trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155", textStyle: { color: "#f1f5f9", fontSize: 11 } },
      grid: { top: 25, bottom: 35, left: 45, right: 15 },
      xAxis: {
        type: "category" as const, data: categories,
        axisLabel: { fontSize: 8, color: "#94a3b8", rotate: 30, interval: Math.max(0, Math.floor(categories.length / 15)) },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series: [{
        name: "Tan suat", type: "bar", data: counts.map((c, i) => ({
          value: c,
          itemStyle: { color: histogram[i].bin >= 0 ? "#00C076" : "#EF4444", borderRadius: [3, 3, 0, 0] },
        })),
        barWidth: "60%",
      }],
    };
  }, [histogram]);

  if (!option) return null;
  return (
    <CardWrapper title="Phan phoi Ty suat sinh loi Ngay">
      <ReactECharts option={option} style={{ height: 280 }} />
    </CardWrapper>
  );
};

/* ================================================================= */
/*  RADAR                                                             */
/* ================================================================= */
const RiskRewardRadar = ({ radarMetrics }: { radarMetrics: QuantAnalysisData["radarMetrics"] }) => {
  const option = useMemo(() => {
    if (radarMetrics.length < 3) return null;
    return {
      tooltip: { backgroundColor: "#1e293b", borderColor: "#334155", textStyle: { color: "#f1f5f9", fontSize: 11 } },
      radar: {
        indicator: radarMetrics.map((m) => ({ name: m.axis, max: 100 })),
        radius: "65%",
        axisName: { color: "#64748b", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
        splitArea: { areaStyle: { color: ["#fff", "#fafafa", "#f8fafc", "#f1f5f9"] } },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      series: [{
        type: "radar",
        data: [{
          name: "Co phieu",
          value: radarMetrics.map((m) => m.value),
          lineStyle: { color: "#F97316", width: 2 },
          areaStyle: { color: "rgba(249,115,22,0.15)" },
          itemStyle: { color: "#F97316" },
        }],
      }],
    };
  }, [radarMetrics]);

  if (!option) return null;
  const avgScore = radarMetrics.reduce((s, m) => s + m.value, 0) / radarMetrics.length;
  const level: InsightLevel = avgScore > 60 ? "positive" : avgScore > 40 ? "neutral" : "negative";

  return (
    <CardWrapper title="Danh gia Rui ro – Loi nhuan (Risk-Reward Radar)">
      <ReactECharts option={option} style={{ height: 320 }} />
      <InsightBlock level={level}>
        <strong>Tong hop:</strong> Diem trung binh: <span className="font-mono font-semibold">{avgScore.toFixed(1)}/100</span>.{" "}
        {avgScore > 60 ? "Co phieu co profile risk-reward tot." : avgScore > 40 ? "Muc trung binh — can xem xet tung tieu chi." : "Profile yeu — can than."}
      </InsightBlock>
    </CardWrapper>
  );
};

/* ================================================================= */
/*  MONTE CARLO (server-computed)                                     */
/* ================================================================= */
const MonteCarloDisplay = ({ monteCarlo }: { monteCarlo: QuantAnalysisData["monteCarlo"] }) => {
  const { percentiles, expectedPrice, p5, p95, probUp, simulations, days } = monteCarlo;

  const option = useMemo(() => {
    if (!percentiles || Object.keys(percentiles).length === 0) return null;
    const numPoints = percentiles.p50?.length ?? 0;
    if (numPoints < 2) return null;

    const xLabels = Array.from({ length: numPoints }, (_, i) => `D${Math.round((i / numPoints) * days)}`);

    const series: Record<string, unknown>[] = [];
    // Fan chart bands
    if (percentiles.p5 && percentiles.p95) {
      series.push({
        name: "P5-P95 Band", type: "line", data: percentiles.p95, symbol: "none",
        lineStyle: { width: 0 },
        areaStyle: { color: "rgba(249,115,22,0.08)" },
        stack: "band", z: 1,
      });
      series.push({
        name: "P5", type: "line", data: percentiles.p5, symbol: "none",
        lineStyle: { width: 1, color: "#EF4444", type: "dashed" },
        z: 5,
      });
    }
    if (percentiles.p25 && percentiles.p75) {
      series.push({
        name: "P25-P75", type: "line", data: percentiles.p75, symbol: "none",
        lineStyle: { width: 0 },
        areaStyle: { color: "rgba(249,115,22,0.12)" },
        z: 2,
      });
    }
    if (percentiles.p50) {
      series.push({
        name: "Trung vi (P50)", type: "line", data: percentiles.p50, symbol: "none",
        lineStyle: { width: 3, color: "#F97316" }, z: 10,
      });
    }
    if (percentiles.p95) {
      series.push({
        name: "Tich cuc (P95)", type: "line", data: percentiles.p95, symbol: "none",
        lineStyle: { width: 1.5, color: "#00C076", type: "dashed" }, z: 5,
      });
    }

    return {
      tooltip: { trigger: "axis" as const, backgroundColor: "#1e293b", borderColor: "#334155", textStyle: { color: "#f1f5f9", fontSize: 11, fontFamily: "Roboto Mono" } },
      legend: {
        top: 0, right: 0,
        data: ["Trung vi (P50)", "Tich cuc (P95)", "P5"],
        textStyle: { fontSize: 11, color: "#64748b" },
      },
      grid: { top: 40, bottom: 30, left: 65, right: 15 },
      xAxis: {
        type: "category" as const, data: xLabels,
        axisLabel: { fontSize: 9, color: "#94a3b8", interval: Math.max(Math.floor(numPoints / 6), 1) },
        axisLine: { lineStyle: { color: "#e2e8f0" } },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { fontSize: 9, color: "#94a3b8", fontFamily: "Roboto Mono", formatter: (v: number) => (v / 1000).toFixed(0) + "K" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      series,
    };
  }, [percentiles, days]);

  const fmtVND = (v: number) => v.toLocaleString("vi-VN") + " d";
  const level: InsightLevel = probUp >= 65 ? "positive" : probUp >= 50 ? "neutral" : "negative";

  const statItems = [
    { label: "Ky vong (TB)", value: fmtVND(expectedPrice), color: "text-[#F97316]" },
    { label: "Kich ban Tich cuc (P95)", value: fmtVND(p95), color: "text-[#00C076]" },
    { label: "Kich ban Tieu cuc (P5)", value: fmtVND(p5), color: "text-[#EF4444]" },
  ];

  return (
    <CardWrapper title={`Mo phong Monte Carlo (${simulations} kich ban · ${days} ngay)`}>
      {option ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-9">
              <ReactECharts option={option} style={{ height: 380 }} />
            </div>
            <div className="lg:col-span-3 flex flex-col gap-3">
              {statItems.map((it) => (
                <div key={it.label} className="bg-muted/50 rounded-lg border border-border/50 p-3">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{it.label}</span>
                  <div className={`text-lg font-extrabold font-mono ${it.color} mt-0.5`}>{it.value}</div>
                </div>
              ))}
              <div className="bg-muted/50 rounded-lg border border-border/50 p-3">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Xac suat co lai</span>
                <div className="text-lg font-extrabold font-mono text-foreground mt-0.5">{probUp}%</div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-[#00C076] transition-all" style={{ width: `${probUp}%` }} />
                </div>
              </div>
            </div>
          </div>
          <InsightBlock level={level}>
            <strong>Nhan dinh:</strong> Dua tren {simulations} kich ban, co phieu co{" "}
            <span className="font-mono font-semibold">{probUp}%</span> xac suat tang gia sau {days} ngay.
            {probUp >= 65 ? " Phan bo nghieng tich cuc." : probUp >= 50 ? " Phan bo can bang." : " Xac suat thua lo cao — can than."}
          </InsightBlock>
        </>
      ) : (
        <p className="text-muted-foreground text-center py-8">Khong du du lieu de mo phong</p>
      )}
    </CardWrapper>
  );
};

/* ================================================================= */
/*  MAIN EXPORT                                                       */
/* ================================================================= */
export default function QuantAnalysisTab() {
  const { ticker } = useStockDetail();
  const { data, loading, error } = useQuantAnalysis(ticker);

  if (loading && !data) return <div className="text-center py-12 text-muted-foreground animate-pulse">Dang tai phan tich dinh luong...</div>;
  if (error && !data) return <div className="text-center py-12 text-red-500">Loi: {error}</div>;
  if (!data) return <div className="text-center py-12 text-muted-foreground">Khong co du lieu</div>;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-6 bg-gradient-to-b from-[#F97316] to-[#F59E0B] rounded-full" />
        <h2 className="text-base font-bold text-foreground">Phan tich Dinh luong – {ticker}</h2>
      </div>

      {/* SECTION 1: HIEU SUAT DAU TU */}
      <section>
        <SectionHeading icon="📊" title="Hieu suat Dau tu" subtitle="Danh gia kha nang sinh loi theo thoi gian" />
        <div className="space-y-4">
          <KPICards kpis={data.kpis} />
          <CumulativeReturnChart wealthIndex={data.wealthIndex} />
        </div>
      </section>

      <hr className="border-border/50" />

      {/* SECTION 2: PHAN TICH RUI RO */}
      <section>
        <SectionHeading icon="⚠️" title="Phan tich Rui ro" subtitle="Do luong bien dong, sut giam va rui ro duoi (tail risk)" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7"><DrawdownChart drawdownData={data.drawdownData} /></div>
            <div className="lg:col-span-5"><VaRSummary varData={data.varData} /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RollingVolatilityChart rollingVolatility={data.rollingVolatility} />
            <RollingSharpeChart rollingSharpe={data.rollingSharpe} />
          </div>
        </div>
      </section>

      <hr className="border-border/50" />

      {/* SECTION 3: PHAN TICH THONG KE */}
      <section>
        <SectionHeading icon="📈" title="Phan tich Thong ke" subtitle="Phan phoi loi nhuan va hieu ung mua vu" />
        <div className="space-y-4">
          <MonthlyHeatmap monthlyReturns={data.monthlyReturns} />
          <ReturnHistogram histogram={data.histogram} />
        </div>
      </section>

      <hr className="border-border/50" />

      {/* SECTION 4: MO PHONG MONTE CARLO */}
      <section>
        <SectionHeading icon="🎲" title="Mo phong Monte Carlo" subtitle="Du phong gia co phieu tu kich ban ngau nhien" />
        <MonteCarloDisplay monteCarlo={data.monteCarlo} />
      </section>

      <hr className="border-border/50" />

      {/* SECTION 5: DANH GIA TONG HOP */}
      <section>
        <SectionHeading icon="🎯" title="Danh gia Tong hop" subtitle="Radar da chieu rui ro – loi nhuan" />
        <RiskRewardRadar radarMetrics={data.radarMetrics} />
      </section>
    </div>
  );
}
