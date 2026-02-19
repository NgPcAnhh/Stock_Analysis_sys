"use client";

import React, { useState, useMemo, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import type { StockAnalysisData } from "@/lib/technicalAnalysisData";

interface TechnicalChartProps {
  data: StockAnalysisData;
  overlays: string[];
  subIndicator: string;
}

const TechnicalChart: React.FC<TechnicalChartProps> = ({ data, overlays, subIndicator }) => {
  const [timeframe, setTimeframe] = useState("1Y");
  const [chartType, setChartType] = useState<"candle" | "line">("candle");

  const timeframes = ["1M", "3M", "6M", "1Y", "Tất cả"];

  // Filter data by timeframe
  const filteredData = useMemo(() => {
    const now = new Date(data.ohlcv[data.ohlcv.length - 1].date);
    let startDate = new Date(now);

    switch (timeframe) {
      case "1M": startDate.setMonth(startDate.getMonth() - 1); break;
      case "3M": startDate.setMonth(startDate.getMonth() - 3); break;
      case "6M": startDate.setMonth(startDate.getMonth() - 6); break;
      case "1Y": startDate.setFullYear(startDate.getFullYear() - 1); break;
      case "Tất cả": startDate = new Date("2000-01-01"); break;
    }

    const startIdx = data.ohlcv.findIndex(
      (d) => new Date(d.date) >= startDate
    );
    return startIdx >= 0 ? startIdx : 0;
  }, [data.ohlcv, timeframe]);

  const slicedOHLCV = useMemo(() => data.ohlcv.slice(filteredData), [data.ohlcv, filteredData]);

  const dates = slicedOHLCV.map((d) => d.date);
  const candlestickData = slicedOHLCV.map((d) => [d.open, d.close, d.low, d.high]);
  const closePrices = slicedOHLCV.map((d) => d.close);
  const volumeData = slicedOHLCV.map((d) => d.volume);
  const volumeColors = slicedOHLCV.map((d) =>
    d.close >= d.open ? "rgba(0, 192, 118, 0.6)" : "rgba(239, 68, 68, 0.6)"
  );

  // Build overlay series
  const overlaySeries = useMemo(() => {
    const series: any[] = [];
    const sliceIndicator = (arr: (number | null)[]) => arr.slice(filteredData);

    if (overlays.includes("sma20")) {
      series.push({
        name: "SMA 20",
        type: "line",
        data: sliceIndicator(data.indicators.sma20),
        smooth: false,
        symbol: "none",
        lineStyle: { color: "#F59E0B", width: 1.5 },
        z: 5,
      });
    }
    if (overlays.includes("sma50")) {
      series.push({
        name: "SMA 50",
        type: "line",
        data: sliceIndicator(data.indicators.sma50),
        smooth: false,
        symbol: "none",
        lineStyle: { color: "#8B5CF6", width: 1.5 },
        z: 5,
      });
    }
    if (overlays.includes("ema12")) {
      series.push({
        name: "EMA 12",
        type: "line",
        data: sliceIndicator(data.indicators.ema12),
        smooth: false,
        symbol: "none",
        lineStyle: { color: "#06B6D4", width: 1.5 },
        z: 5,
      });
    }
    if (overlays.includes("ema26")) {
      series.push({
        name: "EMA 26",
        type: "line",
        data: sliceIndicator(data.indicators.ema26),
        smooth: false,
        symbol: "none",
        lineStyle: { color: "#EC4899", width: 1.5 },
        z: 5,
      });
    }
    if (overlays.includes("bollinger")) {
      series.push(
        {
          name: "BB Upper",
          type: "line",
          data: sliceIndicator(data.indicators.bollingerUpper),
          smooth: false,
          symbol: "none",
          lineStyle: { color: "#94A3B8", width: 1, type: "dashed" },
          z: 4,
        },
        {
          name: "BB Middle",
          type: "line",
          data: sliceIndicator(data.indicators.bollingerMiddle),
          smooth: false,
          symbol: "none",
          lineStyle: { color: "#94A3B8", width: 1 },
          z: 4,
        },
        {
          name: "BB Lower",
          type: "line",
          data: sliceIndicator(data.indicators.bollingerLower),
          smooth: false,
          symbol: "none",
          lineStyle: { color: "#94A3B8", width: 1, type: "dashed" },
          areaStyle: { color: "rgba(148, 163, 184, 0.06)" },
          z: 4,
        }
      );
    }
    if (overlays.includes("ichimoku")) {
      series.push(
        {
          name: "Tenkan-sen",
          type: "line",
          data: sliceIndicator(data.indicators.ichimokuTenkan),
          smooth: false,
          symbol: "none",
          lineStyle: { color: "#2563EB", width: 1 },
          z: 4,
        },
        {
          name: "Kijun-sen",
          type: "line",
          data: sliceIndicator(data.indicators.ichimokuKijun),
          smooth: false,
          symbol: "none",
          lineStyle: { color: "#DC2626", width: 1 },
          z: 4,
        },
        {
          name: "Senkou A",
          type: "line",
          data: sliceIndicator(data.indicators.ichimokuSenkouA),
          smooth: false,
          symbol: "none",
          lineStyle: { color: "#16A34A", width: 1, type: "dashed" },
          z: 3,
        },
        {
          name: "Senkou B",
          type: "line",
          data: sliceIndicator(data.indicators.ichimokuSenkouB),
          smooth: false,
          symbol: "none",
          lineStyle: { color: "#DC2626", width: 1, type: "dashed" },
          areaStyle: { color: "rgba(220, 38, 38, 0.04)" },
          z: 3,
        }
      );
    }
    return series;
  }, [overlays, data.indicators, filteredData]);

  // Sub indicator data
  const getSubIndicatorConfig = useCallback(() => {
    const slice = (arr: (number | null)[]) => arr.slice(filteredData);

    switch (subIndicator) {
      case "rsi":
        return {
          title: "RSI (14)",
          height: "18%",
          series: [
            {
              name: "RSI",
              type: "line",
              data: slice(data.indicators.rsi),
              smooth: false,
              symbol: "none",
              lineStyle: { color: "#8B5CF6", width: 1.5 },
            },
          ],
          yAxisConfig: { min: 0, max: 100 },
          markLines: [
            { yAxis: 70, lineStyle: { color: "#EF4444", type: "dashed", width: 1 } },
            { yAxis: 30, lineStyle: { color: "#22C55E", type: "dashed", width: 1 } },
          ],
        };
      case "macd":
        return {
          title: "MACD (12,26,9)",
          height: "18%",
          series: [
            {
              name: "MACD",
              type: "line",
              data: slice(data.indicators.macdLine),
              smooth: false,
              symbol: "none",
              lineStyle: { color: "#2563EB", width: 1.5 },
            },
            {
              name: "Signal",
              type: "line",
              data: slice(data.indicators.macdSignal),
              smooth: false,
              symbol: "none",
              lineStyle: { color: "#F59E0B", width: 1.5 },
            },
            {
              name: "Histogram",
              type: "bar",
              data: slice(data.indicators.macdHistogram).map((v) => ({
                value: v,
                itemStyle: { color: v !== null && v >= 0 ? "rgba(0,192,118,0.7)" : "rgba(239,68,68,0.7)" },
              })),
            },
          ],
          yAxisConfig: {},
          markLines: [{ yAxis: 0, lineStyle: { color: "#94A3B8", width: 1 } }],
        };
      case "stochastic":
        return {
          title: "Stochastic (14,3)",
          height: "18%",
          series: [
            {
              name: "%K",
              type: "line",
              data: slice(data.indicators.stochK),
              smooth: false,
              symbol: "none",
              lineStyle: { color: "#2563EB", width: 1.5 },
            },
            {
              name: "%D",
              type: "line",
              data: slice(data.indicators.stochD),
              smooth: false,
              symbol: "none",
              lineStyle: { color: "#F59E0B", width: 1.5 },
            },
          ],
          yAxisConfig: { min: 0, max: 100 },
          markLines: [
            { yAxis: 80, lineStyle: { color: "#EF4444", type: "dashed", width: 1 } },
            { yAxis: 20, lineStyle: { color: "#22C55E", type: "dashed", width: 1 } },
          ],
        };
      case "williams":
        return {
          title: "Williams %R (14)",
          height: "18%",
          series: [
            {
              name: "Williams %R",
              type: "line",
              data: slice(data.indicators.williamsR),
              smooth: false,
              symbol: "none",
              lineStyle: { color: "#EC4899", width: 1.5 },
            },
          ],
          yAxisConfig: { min: -100, max: 0 },
          markLines: [
            { yAxis: -20, lineStyle: { color: "#EF4444", type: "dashed", width: 1 } },
            { yAxis: -80, lineStyle: { color: "#22C55E", type: "dashed", width: 1 } },
          ],
        };
      case "cci":
        return {
          title: "CCI (20)",
          height: "18%",
          series: [
            {
              name: "CCI",
              type: "line",
              data: slice(data.indicators.cci),
              smooth: false,
              symbol: "none",
              lineStyle: { color: "#06B6D4", width: 1.5 },
            },
          ],
          yAxisConfig: {},
          markLines: [
            { yAxis: 100, lineStyle: { color: "#EF4444", type: "dashed", width: 1 } },
            { yAxis: -100, lineStyle: { color: "#22C55E", type: "dashed", width: 1 } },
            { yAxis: 0, lineStyle: { color: "#94A3B8", width: 1 } },
          ],
        };
      case "adx":
        return {
          title: "ADX (14)",
          height: "18%",
          series: [
            {
              name: "ADX",
              type: "line",
              data: slice(data.indicators.adx),
              smooth: false,
              symbol: "none",
              lineStyle: { color: "#F59E0B", width: 1.5 },
            },
          ],
          yAxisConfig: { min: 0 },
          markLines: [
            { yAxis: 25, lineStyle: { color: "#94A3B8", type: "dashed", width: 1 } },
          ],
        };
      default:
        return null;
    }
  }, [subIndicator, data.indicators, filteredData]);

  const subConfig = getSubIndicatorConfig();
  const hasSubIndicator = subConfig !== null;

  // Chart heights
  const mainHeight = hasSubIndicator ? "48%" : "62%";
  const volumeHeight = hasSubIndicator ? "12%" : "18%";
  const volumeTop = hasSubIndicator ? "54%" : "68%";
  const subTop = "72%";

  // Build ECharts option
  const getOption = useCallback(() => {
    const grids: any[] = [
      { left: "58", right: "58", top: "8%", height: mainHeight, id: "main" },
      { left: "58", right: "58", top: volumeTop, height: volumeHeight, id: "volume" },
    ];
    const xAxes: any[] = [
      {
        type: "category",
        data: dates,
        boundaryGap: true,
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#9ca3af", fontSize: 11, interval: Math.floor(dates.length / 8) },
        splitLine: { show: false },
        gridIndex: 0,
      },
      {
        type: "category",
        data: dates,
        gridIndex: 1,
        boundaryGap: true,
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { show: !hasSubIndicator, color: "#9ca3af", fontSize: 11, interval: Math.floor(dates.length / 8) },
        splitLine: { show: false },
      },
    ];
    const yAxes: any[] = [
      {
        type: "value",
        position: "right",
        scale: true,
        gridIndex: 0,
        axisLine: { show: false },
        axisLabel: { color: "#9ca3af", fontSize: 11, formatter: (v: number) => (v / 1000).toFixed(1) + "k" },
        splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
      },
      {
        type: "value",
        position: "right",
        gridIndex: 1,
        scale: true,
        axisLine: { show: false },
        axisLabel: { color: "#9ca3af", fontSize: 10, formatter: (v: number) => (v / 1000000).toFixed(0) + "M" },
        splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
      },
    ];

    // Main series
    const series: any[] = [];

    if (chartType === "candle") {
      series.push({
        name: "Candlestick",
        type: "candlestick",
        data: candlestickData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: "#00C076",
          color0: "#EF4444",
          borderColor: "#00C076",
          borderColor0: "#EF4444",
        },
      });
    } else {
      series.push({
        name: "Giá",
        type: "line",
        data: closePrices,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#00C076", width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(0, 192, 118, 0.25)" },
              { offset: 1, color: "rgba(0, 192, 118, 0.02)" },
            ],
          },
        },
      });
    }

    // Overlays
    overlaySeries.forEach((s) => {
      series.push({ ...s, xAxisIndex: 0, yAxisIndex: 0 });
    });

    // Volume
    series.push({
      name: "Volume",
      type: "bar",
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: volumeData.map((v, i) => ({
        value: v,
        itemStyle: { color: volumeColors[i] },
      })),
      barWidth: "60%",
    });

    // Sub indicator
    if (hasSubIndicator && subConfig) {
      grids.push({
        left: "58",
        right: "58",
        top: subTop,
        height: subConfig.height,
        id: "sub",
      });

      xAxes.push({
        type: "category",
        data: dates,
        gridIndex: 2,
        boundaryGap: true,
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#9ca3af", fontSize: 11, interval: Math.floor(dates.length / 8) },
        splitLine: { show: false },
      });

      yAxes.push({
        type: "value",
        position: "right",
        gridIndex: 2,
        scale: true,
        ...subConfig.yAxisConfig,
        axisLine: { show: false },
        axisLabel: { color: "#9ca3af", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
      });

      subConfig.series.forEach((s: any, idx: number) => {
        const seriesItem: any = {
          ...s,
          xAxisIndex: 2,
          yAxisIndex: 2,
        };
        // Add mark lines to first series
        if (idx === 0 && subConfig.markLines.length > 0) {
          seriesItem.markLine = {
            silent: true,
            symbol: "none",
            label: { show: true, position: "end", fontSize: 10, color: "#9ca3af" },
            data: subConfig.markLines,
          };
        }
        series.push(seriesItem);
      });
    }

    const dataZoomAxes = hasSubIndicator ? [0, 1, 2] : [0, 1];

    return {
      animation: false,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", crossStyle: { color: "#999" } },
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: { color: "#374151", fontSize: 12 },
        formatter: function (params: any) {
          if (!params || params.length === 0) return "";
          const idx = params[0].dataIndex;
          const d = slicedOHLCV[idx];
          if (!d) return "";
          const color = d.close >= d.open ? "#00C076" : "#EF4444";
          let html = `<div style="font-size:12px;line-height:1.6">
            <div style="font-weight:600;margin-bottom:2px">${d.date}</div>
            <div>Mở: <b>${d.open.toLocaleString()}</b></div>
            <div>Cao: <b style="color:#00C076">${d.high.toLocaleString()}</b></div>
            <div>Thấp: <b style="color:#EF4444">${d.low.toLocaleString()}</b></div>
            <div>Đóng: <b style="color:${color}">${d.close.toLocaleString()}</b></div>
            <div>KL: <b>${d.volume.toLocaleString()}</b></div>`;

          params.forEach((p: any) => {
            if (
              p.seriesName !== "Candlestick" &&
              p.seriesName !== "Giá" &&
              p.seriesName !== "Volume" &&
              p.seriesName !== "Histogram" &&
              p.value !== null &&
              p.value !== undefined
            ) {
              const val = typeof p.value === "object" ? p.value.value : p.value;
              if (val !== null && val !== undefined) {
                html += `<div>${p.marker} ${p.seriesName}: <b>${typeof val === 'number' ? val.toLocaleString() : val}</b></div>`;
              }
            }
          });
          html += "</div>";
          return html;
        },
      },
      legend: {
        show: true,
        top: 0,
        left: "center",
        textStyle: { fontSize: 11, color: "#6b7280" },
        itemWidth: 14,
        itemHeight: 8,
        itemGap: 12,
      },
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: dataZoomAxes,
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      series,
    };
  }, [chartType, dates, candlestickData, closePrices, volumeData, volumeColors, overlaySeries, slicedOHLCV, hasSubIndicator, subConfig, mainHeight, volumeHeight, volumeTop]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Chart type toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setChartType("candle")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartType === "candle" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🕯️ Nến
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartType === "line" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              📈 Đường
            </button>
          </div>
        </div>

        {/* Timeframe */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeframe === tf ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ReactECharts
          option={getOption()}
          style={{ height: "100%", width: "100%" }}
          notMerge={true}
          opts={{ renderer: "canvas" }}
        />
      </div>
    </div>
  );
};

export default TechnicalChart;
