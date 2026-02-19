"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisSummaryData } from "@/lib/technicalAnalysisData";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpCircle,
  ArrowDownCircle,
  Circle,
} from "lucide-react";

interface AnalysisSummaryProps {
  summary: AnalysisSummaryData;
  currentPrice: number;
}

const signalColors: Record<string, { bg: string; text: string; border: string }> = {
  "Mua mạnh": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Mua": { bg: "bg-emerald-50/50", text: "text-emerald-600", border: "border-emerald-100" },
  "Trung lập": { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
  "Bán": { bg: "bg-red-50/50", text: "text-red-600", border: "border-red-100" },
  "Bán mạnh": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const SignalIcon: React.FC<{ signal: string; size?: number }> = ({ signal, size = 16 }) => {
  if (signal === "Mua" || signal === "Mua mạnh")
    return <TrendingUp size={size} className="text-emerald-500" />;
  if (signal === "Bán" || signal === "Bán mạnh")
    return <TrendingDown size={size} className="text-red-500" />;
  return <Minus size={size} className="text-gray-400" />;
};

const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ summary, currentPrice }) => {
  const overall = signalColors[summary.overallSignal] || signalColors["Trung lập"];
  const totalSignals = summary.buyCount + summary.sellCount + summary.neutralCount;

  return (
    <div className="space-y-4">
      {/* Overall Signal */}
      <Card className={`shadow-sm ${overall.border} border`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Tín hiệu tổng hợp</span>
            <SignalIcon signal={summary.overallSignal} size={20} />
          </div>
          <div className={`text-2xl font-bold ${overall.text} mb-3`}>
            {summary.overallSignal}
          </div>

          {/* Signal gauge */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 rounded-l-full transition-all"
                style={{ width: `${(summary.buyCount / totalSignals) * 100}%` }}
              />
              <div
                className="bg-gray-300 transition-all"
                style={{ width: `${(summary.neutralCount / totalSignals) * 100}%` }}
              />
              <div
                className="bg-red-500 rounded-r-full transition-all"
                style={{ width: `${(summary.sellCount / totalSignals) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <ArrowUpCircle size={14} className="text-emerald-500" />
              <span className="text-emerald-600 font-medium">Mua: {summary.buyCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Circle size={14} className="text-gray-400" />
              <span className="text-gray-500 font-medium">Trung lập: {summary.neutralCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowDownCircle size={14} className="text-red-500" />
              <span className="text-red-600 font-medium">Bán: {summary.sellCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moving Averages */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Đường trung bình
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-1.5">
            {summary.movingAverages.map((ma) => (
              <div
                key={ma.indicator}
                className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
              >
                <span className="text-xs text-gray-600">{ma.indicator}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">{ma.value}</span>
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      ma.signal === "Mua"
                        ? "bg-emerald-50 text-emerald-600"
                        : ma.signal === "Bán"
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {ma.signal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Oscillators */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Chỉ báo dao động
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-1.5">
            {summary.oscillators.map((osc) => (
              <div
                key={osc.indicator}
                className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
              >
                <span className="text-xs text-gray-600">{osc.indicator}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">{osc.value}</span>
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      osc.signal === "Mua"
                        ? "bg-emerald-50 text-emerald-600"
                        : osc.signal === "Bán"
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {osc.signal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pivot Points */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-semibold text-gray-700">Điểm Pivot</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 text-gray-500 font-medium">Loại</th>
                  <th className="text-right py-1.5 text-red-400 font-medium">S3</th>
                  <th className="text-right py-1.5 text-red-400 font-medium">S2</th>
                  <th className="text-right py-1.5 text-red-400 font-medium">S1</th>
                  <th className="text-right py-1.5 text-gray-500 font-medium">Pivot</th>
                  <th className="text-right py-1.5 text-emerald-400 font-medium">R1</th>
                  <th className="text-right py-1.5 text-emerald-400 font-medium">R2</th>
                  <th className="text-right py-1.5 text-emerald-400 font-medium">R3</th>
                </tr>
              </thead>
              <tbody>
                {summary.pivotPoints.map((pp) => (
                  <tr key={pp.type} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 text-gray-600 font-medium">{pp.type}</td>
                    <td className="py-1.5 text-right font-mono text-red-500">{pp.s3.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-mono text-red-500">{pp.s2.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-mono text-red-400">{pp.s1.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-mono text-gray-600 font-bold">{pp.pivot.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-mono text-emerald-400">{pp.r1.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-mono text-emerald-500">{pp.r2.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-mono text-emerald-500">{pp.r3.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Current price indicator */}
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Giá hiện tại</span>
            <span className="text-sm font-bold text-gray-800">{currentPrice.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisSummary;
