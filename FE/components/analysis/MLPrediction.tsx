"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { OHLCVItem } from "@/lib/technicalAnalysisData";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart3,
  Zap,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MLPredictionProps {
  ohlcv: OHLCVItem[];
  ticker: string;
  currentPrice: number;
}

/* ═══════════════════════════════════════════════
   1. Linear Regression Forecast (OLS)
   ═══════════════════════════════════════════════ */

interface RegressionResult {
  predictedPrices: { day: number; price: number; lower: number; upper: number }[];
  slope: number;
  r2: number;
  trend: "up" | "down" | "neutral";
  confidence: number;
}

function linearRegressionForecast(
  ohlcv: OHLCVItem[],
  lookback = 30,
  forecastDays = 5
): RegressionResult {
  const prices = ohlcv.slice(-lookback).map((d) => d.close);
  const n = prices.length;

  // X = [0, 1, 2, ..., n-1]
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += prices[i];
    sumXY += i * prices[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const meanY = sumY / n;
  let ssTot = 0,
    ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yHat = slope * i + intercept;
    ssTot += (prices[i] - meanY) ** 2;
    ssRes += (prices[i] - yHat) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Standard error for prediction interval
  const se = Math.sqrt(ssRes / Math.max(n - 2, 1));

  // Forecast next days
  const predictedPrices = [];
  for (let d = 1; d <= forecastDays; d++) {
    const x = n - 1 + d;
    const pred = slope * x + intercept;
    // ~95% CI: ±1.96 * se * sqrt(1 + 1/n + (x - meanX)² / Σ(xi - meanX)²)
    const meanX = sumX / n;
    let ssX = 0;
    for (let i = 0; i < n; i++) ssX += (i - meanX) ** 2;
    const margin = 1.96 * se * Math.sqrt(1 + 1 / n + (x - meanX) ** 2 / (ssX || 1));
    predictedPrices.push({
      day: d,
      price: Math.round(pred),
      lower: Math.round(pred - margin),
      upper: Math.round(pred + margin),
    });
  }

  const lastPred = predictedPrices[predictedPrices.length - 1].price;
  const currentLast = prices[prices.length - 1];
  const changePct = ((lastPred - currentLast) / currentLast) * 100;

  return {
    predictedPrices,
    slope,
    r2: Math.max(0, r2),
    trend: changePct > 0.5 ? "up" : changePct < -0.5 ? "down" : "neutral",
    confidence: Math.min(99, Math.max(30, Math.round(r2 * 100))),
  };
}

/* ═══════════════════════════════════════════════
   2. Pattern Matching (KNN-Based Direction Prediction)
   ═══════════════════════════════════════════════ */

interface PatternResult {
  direction: "up" | "down" | "neutral";
  probability: number;
  avgReturn: number;
  matchCount: number;
  historicalWinRate: number;
}

function knnPatternPrediction(
  ohlcv: OHLCVItem[],
  patternLength = 10,
  k = 5
): PatternResult {
  const prices = ohlcv.map((d) => d.close);
  const n = prices.length;

  if (n < patternLength + 10) {
    return {
      direction: "neutral",
      probability: 50,
      avgReturn: 0,
      matchCount: 0,
      historicalWinRate: 50,
    };
  }

  // Normalize current pattern: relative returns
  const currentPattern: number[] = [];
  for (let i = n - patternLength; i < n; i++) {
    currentPattern.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  // Find similar historical patterns
  interface Match {
    distance: number;
    futureReturn: number;
  }

  const matches: Match[] = [];

  for (let start = patternLength; start < n - patternLength - 1; start++) {
    const pattern: number[] = [];
    for (let i = start; i < start + patternLength; i++) {
      pattern.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    // Euclidean distance
    let dist = 0;
    for (let j = 0; j < patternLength; j++) {
      dist += (pattern[j] - currentPattern[j]) ** 2;
    }
    dist = Math.sqrt(dist);

    // Next-day return after this historical pattern
    const nextIdx = start + patternLength;
    if (nextIdx < n) {
      const futureReturn = (prices[nextIdx] - prices[nextIdx - 1]) / prices[nextIdx - 1];
      matches.push({ distance: dist, futureReturn });
    }
  }

  // Sort by distance, pick K nearest
  matches.sort((a, b) => a.distance - b.distance);
  const kNearest = matches.slice(0, Math.min(k, matches.length));

  if (kNearest.length === 0) {
    return {
      direction: "neutral",
      probability: 50,
      avgReturn: 0,
      matchCount: 0,
      historicalWinRate: 50,
    };
  }

  // Weight by inverse distance
  let totalWeight = 0;
  let weightedReturn = 0;
  let upCount = 0;

  for (const m of kNearest) {
    const w = 1 / (m.distance + 1e-8);
    totalWeight += w;
    weightedReturn += w * m.futureReturn;
    if (m.futureReturn > 0) upCount++;
  }

  const avgReturn = (weightedReturn / totalWeight) * 100;
  const winRate = (upCount / kNearest.length) * 100;

  // Overall historical win rate (for context)
  const allUp = matches.filter((m) => m.futureReturn > 0).length;
  const historicalWinRate =
    matches.length > 0 ? (allUp / matches.length) * 100 : 50;

  const direction =
    avgReturn > 0.1 ? "up" : avgReturn < -0.1 ? "down" : "neutral";
  const probability = Math.min(
    95,
    Math.max(30, Math.round(Math.abs(avgReturn) * 50 + winRate * 0.5))
  );

  return {
    direction,
    probability,
    avgReturn: Math.round(avgReturn * 100) / 100,
    matchCount: kNearest.length,
    historicalWinRate: Math.round(historicalWinRate),
  };
}

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */

const MLPrediction: React.FC<MLPredictionProps> = ({
  ohlcv,
  ticker,
  currentPrice,
}) => {
  const [expandRegression, setExpandRegression] = useState(true);
  const [expandKNN, setExpandKNN] = useState(true);

  const regression = useMemo(
    () => linearRegressionForecast(ohlcv),
    [ohlcv]
  );

  const knn = useMemo(() => knnPatternPrediction(ohlcv), [ohlcv]);

  // Trend icon & color
  const trendConfig = (dir: "up" | "down" | "neutral") => {
    if (dir === "up")
      return {
        icon: <TrendingUp size={14} />,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        label: "TĂNG",
      };
    if (dir === "down")
      return {
        icon: <TrendingDown size={14} />,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        label: "GIẢM",
      };
    return {
      icon: <Minus size={14} />,
      color: "text-gray-600",
      bg: "bg-gray-50",
      border: "border-gray-200",
      label: "TRUNG LẬP",
    };
  };

  const regTrend = trendConfig(regression.trend);
  const knnTrend = trendConfig(knn.direction);

  return (
    <div className="space-y-1">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Brain size={14} className="text-violet-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Dự báo ML
        </span>
      </div>

      {/* 1. Linear Regression */}
      <div>
        <button
          onClick={() => setExpandRegression(!expandRegression)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Target size={13} className="text-blue-500" />
            Dự báo giá (Hồi quy)
          </span>
          {expandRegression ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>

        {expandRegression && (
          <div className="px-2 pb-2 space-y-2">
            {/* Trend badge */}
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg border",
                regTrend.bg,
                regTrend.border
              )}
            >
              <div className="flex items-center gap-1.5">
                {regTrend.icon}
                <span className={cn("text-xs font-bold", regTrend.color)}>
                  {regTrend.label}
                </span>
              </div>
              <span className="text-[10px] text-gray-500">
                R² = {(regression.r2 * 100).toFixed(0)}%
              </span>
            </div>

            {/* Predicted prices table */}
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500">
                    <th className="text-left px-2 py-1.5 font-medium">Ngày</th>
                    <th className="text-right px-2 py-1.5 font-medium">Dự báo</th>
                    <th className="text-right px-2 py-1.5 font-medium">Khoảng</th>
                  </tr>
                </thead>
                <tbody>
                  {regression.predictedPrices.map((p) => {
                    const change = ((p.price - currentPrice) / currentPrice) * 100;
                    const isUp = change > 0;
                    return (
                      <tr
                        key={p.day}
                        className="border-t border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="px-2 py-1.5 text-gray-600">
                          +{p.day}D
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium">
                          <span
                            className={
                              isUp ? "text-emerald-600" : "text-red-600"
                            }
                          >
                            {p.price.toLocaleString()}
                          </span>
                          <span className="text-gray-400 ml-1">
                            ({isUp ? "+" : ""}
                            {change.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-400">
                          {p.lower.toLocaleString()}-{p.upper.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-gray-400 px-1 leading-relaxed">
              OLS Linear Regression trên 30 phiên gần nhất. Khoảng tin cậy 95%.
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-gray-100" />

      {/* 2. KNN Pattern Matching */}
      <div>
        <button
          onClick={() => setExpandKNN(!expandKNN)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Zap size={13} className="text-amber-500" />
            Nhận diện mẫu hình (KNN)
          </span>
          {expandKNN ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expandKNN && (
          <div className="px-2 pb-2 space-y-2">
            {/* Direction badge */}
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg border",
                knnTrend.bg,
                knnTrend.border
              )}
            >
              <div className="flex items-center gap-1.5">
                {knnTrend.icon}
                <span className={cn("text-xs font-bold", knnTrend.color)}>
                  {knnTrend.label}
                </span>
              </div>
              <span className="text-[10px] text-gray-500">
                Xác suất: {knn.probability}%
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white rounded-lg border border-gray-100 px-2.5 py-2 text-center">
                <div className="text-[10px] text-gray-400 mb-0.5">
                  Lợi nhuận TB
                </div>
                <div
                  className={cn(
                    "text-sm font-bold",
                    knn.avgReturn > 0
                      ? "text-emerald-600"
                      : knn.avgReturn < 0
                      ? "text-red-600"
                      : "text-gray-600"
                  )}
                >
                  {knn.avgReturn > 0 ? "+" : ""}
                  {knn.avgReturn}%
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-100 px-2.5 py-2 text-center">
                <div className="text-[10px] text-gray-400 mb-0.5">
                  Win Rate tổng
                </div>
                <div className="text-sm font-bold text-gray-700">
                  {knn.historicalWinRate}%
                </div>
              </div>
            </div>

            {/* Probability bar */}
            <div className="px-1">
              <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                <span>Giảm</span>
                <span>Trung lập</span>
                <span>Tăng</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className={cn(
                    "absolute top-0 h-full rounded-full transition-all",
                    knn.direction === "up"
                      ? "bg-emerald-500 left-1/2"
                      : knn.direction === "down"
                      ? "bg-red-500 right-1/2"
                      : "bg-gray-400 left-[40%]"
                  )}
                  style={{
                    width: `${Math.min(50, knn.probability / 2)}%`,
                  }}
                />
                <div className="absolute left-1/2 top-0 w-px h-full bg-gray-300" />
              </div>
            </div>

            <p className="text-[10px] text-gray-400 px-1 leading-relaxed">
              K-Nearest Neighbors: so khớp 10 phiên gần nhất với lịch sử, chọn 5 mẫu tương đồng nhất.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MLPrediction;
