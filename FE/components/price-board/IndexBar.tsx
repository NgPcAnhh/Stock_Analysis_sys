"use client";

import React, { useEffect, useRef, useState, memo } from "react";
import { marketEvents } from "@/lib/socketEvents";
import type { IndexDisplayData } from "@/lib/priceBoardTypes";
import { INDEX_CODES, CHART_INDEX_IDS } from "@/lib/priceBoardData";
import { fmtIndexValue, fmtIndexChange, safeFloat } from "@/lib/priceBoardUtils";

/* ================================================================= */
/*  IndexBar – top row showing market indices with live updates       */
/* ================================================================= */

/** A single mini index card */
const IndexCard = memo(function IndexCard({ symbol }: { symbol: string }) {
  const stateRef = useRef<{
    value: number;
    change: number;
    changePercent: number;
    totalVolume: number;
    totalValue: number;
    advances: number;
    declines: number;
    noChange: number;
  }>({
    value: 0,
    change: 0,
    changePercent: 0,
    totalVolume: 0,
    totalValue: 0,
    advances: 0,
    declines: 0,
    noChange: 0,
  });

  const [, tick] = useState(0);
  const rafId = useRef(0);

  useEffect(() => {
    const unsub = marketEvents.on(symbol, (delta: Record<string, unknown>) => {
      const s = stateRef.current;
      if (delta.p != null) s.value = safeFloat(delta.p);
      if (delta.cv != null) s.change = safeFloat(delta.cv);
      if (delta.cp != null) s.changePercent = safeFloat(delta.cp);
      if (delta.tv != null) s.totalVolume = safeFloat(delta.tv);
      if (delta.tva != null) s.totalValue = safeFloat(delta.tva);

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          rafId.current = 0;
          tick((n) => n + 1);
        });
      }
    });
    return () => {
      unsub();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [symbol]);

  const { value, change, changePercent, totalVolume, totalValue } = stateRef.current;
  const isUp = change > 0;
  const isDown = change < 0;
  const mainColor = isUp ? "text-[#00c076]" : isDown ? "text-[#ff3333]" : "text-[#ffd700]";
  const bgColor = isUp
    ? "border-[#00c076]/30 bg-[#00c076]/5"
    : isDown
      ? "border-[#ff3333]/30 bg-[#ff3333]/5"
      : "border-[#ffd700]/30 bg-[#ffd700]/5";

  const fmtVol = (n: number) => {
    if (!n) return "-";
    if (n >= 1e9) return (n / 1e9).toFixed(1) + " tỷ CP";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + " tr CP";
    return n.toLocaleString("en-US");
  };

  const fmtVal = (n: number) => {
    if (!n) return "-";
    if (n >= 1e12) return (n / 1e12).toFixed(1) + " nghìn tỷ";
    if (n >= 1e9) return (n / 1e9).toFixed(1) + " tỷ";
    return n.toLocaleString("en-US");
  };

  return (
    <div className={`rounded-lg border px-3 py-2 min-w-[180px] ${bgColor}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-bold text-white">{symbol}</span>
        <span className={`text-[11px] ${mainColor}`}>
          {isUp ? "▲" : isDown ? "▼" : "—"}
        </span>
      </div>
      <div className={`text-[18px] font-bold ${mainColor}`}>
        {value > 0 ? fmtIndexValue(value) : "—"}
      </div>
      <div className={`text-[12px] ${mainColor} mt-0.5`}>
        {fmtIndexChange(change)} ({changePercent > 0 ? "+" : ""}{changePercent.toFixed(2)}%)
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
        <span>KL: {fmtVol(totalVolume)}</span>
        <span>GT: {fmtVal(totalValue)}</span>
      </div>
    </div>
  );
});

/* ================================================================= */
/*  Summary table for all tracked indices                             */
/* ================================================================= */

interface IndexSummaryData {
  value: number;
  change: number;
  changePercent: number;
  totalVolume: number;
  totalValue: number;
  advances: number;
  declines: number;
  noChange: number;
}

const IndexSummaryTable = memo(function IndexSummaryTable() {
  const storeRef = useRef<Record<string, IndexSummaryData>>({});
  const [, tick] = useState(0);

  useEffect(() => {
    const unsubs = INDEX_CODES.map((code) =>
      marketEvents.on(code, (delta: Record<string, unknown>) => {
        const prev = storeRef.current[code] ?? {
          value: 0,
          change: 0,
          changePercent: 0,
          totalVolume: 0,
          totalValue: 0,
          advances: 0,
          declines: 0,
          noChange: 0,
        };
        if (delta.p != null) prev.value = safeFloat(delta.p);
        if (delta.cv != null) prev.change = safeFloat(delta.cv);
        if (delta.cp != null) prev.changePercent = safeFloat(delta.cp);
        if (delta.tv != null) prev.totalVolume = safeFloat(delta.tv);
        if (delta.tva != null) prev.totalValue = safeFloat(delta.tva);
        storeRef.current[code] = prev;
      }),
    );

    const interval = setInterval(() => tick((n) => n + 1), 1000);

    return () => {
      unsubs.forEach((u) => u());
      clearInterval(interval);
    };
  }, []);

  return (
    <table className="w-full border-collapse text-[11px]">
      <thead className="bg-[#1a1e29] text-[#7d90a8]">
        <tr>
          <th className="p-1 text-left border border-[#2a2e39]">Chỉ số</th>
          <th className="p-1 text-right border border-[#2a2e39]">Điểm</th>
          <th className="p-1 text-right border border-[#2a2e39]">+/-</th>
          <th className="p-1 text-right border border-[#2a2e39]">%</th>
          <th className="p-1 text-right border border-[#2a2e39]">KLGD</th>
          <th className="p-1 text-right border border-[#2a2e39]">GTGD</th>
        </tr>
      </thead>
      <tbody>
        {INDEX_CODES.map((code) => {
          const s = storeRef.current[code];
          if (!s) {
            return (
              <tr key={code} className="bg-[#131722]">
                <td className="px-1.5 py-1 border border-[#2a2e39] font-bold text-white">{code}</td>
                <td className="px-1.5 py-1 border border-[#2a2e39] text-right text-gray-400">—</td>
                <td className="px-1.5 py-1 border border-[#2a2e39] text-right text-gray-400">—</td>
                <td className="px-1.5 py-1 border border-[#2a2e39] text-right text-gray-400">—</td>
                <td className="px-1.5 py-1 border border-[#2a2e39] text-right text-gray-400">—</td>
                <td className="px-1.5 py-1 border border-[#2a2e39] text-right text-gray-400">—</td>
              </tr>
            );
          }
          const color = s.change > 0 ? "text-[#00c076]" : s.change < 0 ? "text-[#ff3333]" : "text-[#ffd700]";
          const fmtVol = (n: number) => {
            if (!n) return "—";
            if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
            if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
            return n.toLocaleString();
          };
          const fmtVal = (n: number) => {
            if (!n) return "—";
            if (n >= 1e9) return (n / 1e9).toFixed(0) + " Tỷ";
            if (n >= 1e6) return (n / 1e6).toFixed(0) + " Tr";
            return n.toLocaleString();
          };
          return (
            <tr key={code} className="bg-[#131722] hover:bg-[#1e2329]">
              <td className="px-1.5 py-1 border border-[#2a2e39] font-bold text-white">{code}</td>
              <td className={`px-1.5 py-1 border border-[#2a2e39] text-right ${color}`}>
                {s.value > 0 ? fmtIndexValue(s.value) : "—"}
              </td>
              <td className={`px-1.5 py-1 border border-[#2a2e39] text-right ${color}`}>
                {fmtIndexChange(s.change)}
              </td>
              <td className={`px-1.5 py-1 border border-[#2a2e39] text-right ${color}`}>
                {s.changePercent > 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
              </td>
              <td className="px-1.5 py-1 border border-[#2a2e39] text-right text-gray-300">
                {fmtVol(s.totalVolume)}
              </td>
              <td className="px-1.5 py-1 border border-[#2a2e39] text-right text-gray-300">
                {fmtVal(s.totalValue)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});

/* ================================================================= */
/*  Export composite component                                        */
/* ================================================================= */

export default function IndexBar() {
  return (
    <div className="flex flex-col xl:flex-row gap-3 mb-2">
      {/* Mini cards for key indices */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0">
        {CHART_INDEX_IDS.map((id) => (
          <IndexCard key={id} symbol={id} />
        ))}
      </div>
      {/* Compact summary table for all indices */}
      <div className="xl:w-[520px] flex-shrink-0 overflow-auto">
        <IndexSummaryTable />
      </div>
    </div>
  );
}
