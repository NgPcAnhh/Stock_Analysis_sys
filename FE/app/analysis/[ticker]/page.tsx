"use client";

import React, { useState, use, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ChartWithDrawing from "@/components/analysis/ChartWithDrawing";
import AnalysisSummary from "@/components/analysis/AnalysisSummary";
import SignalTable from "@/components/analysis/SignalTable";
import IndicatorSelector from "@/components/analysis/IndicatorSelector";
import AnalysisHeader from "@/components/analysis/AnalysisHeader";
import StockSearchBar from "@/components/analysis/StockSearchBar";
import { getAnalysisData } from "@/lib/technicalAnalysisData";
import { Footer } from "@/components/layout/Footer";
import {
  ChartCandlestick,
  ListChecks,
  BarChart3,
  Settings2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

interface AnalysisPageProps {
  params: Promise<{ ticker: string }>;
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { ticker } = use(params);
  const data = useMemo(() => getAnalysisData(ticker), [ticker]);

  const [selectedOverlays, setSelectedOverlays] = useState<string[]>(["sma20"]);
  const [selectedSubIndicator, setSelectedSubIndicator] = useState("rsi");
  const [activeTab, setActiveTab] = useState("chart");
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(true);

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <div className="max-w-[1600px] mx-auto px-3 py-3 space-y-3">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <StockSearchBar currentTicker={data.ticker} className="flex-1 max-w-md" />
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400">
            <span>Phân tích kỹ thuật</span>
            <span>/</span>
            <span className="font-semibold text-gray-700">{data.ticker}</span>
          </div>
        </div>

        {/* Header */}
        <AnalysisHeader data={data} />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-gray-200 shadow-sm p-1 h-auto">
            <TabsTrigger
              value="chart"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <ChartCandlestick size={14} />
              Biểu đồ
            </TabsTrigger>
            <TabsTrigger
              value="signals"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <ListChecks size={14} />
              Tín hiệu
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <BarChart3 size={14} />
              Tổng hợp
            </TabsTrigger>
          </TabsList>

          {/* Chart Tab */}
          <TabsContent value="chart" className="mt-3">
            <div className="flex gap-3">
              {/* Chart Area */}
              <div className="flex-1 min-w-0">
                <Card className="shadow-sm border-gray-200 overflow-hidden">
                  <CardContent className="p-0" style={{ height: "650px" }}>
                    <ChartWithDrawing
                      data={data}
                      overlays={selectedOverlays}
                      subIndicator={selectedSubIndicator === "none" ? "" : selectedSubIndicator}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Indicator Panel */}
              <div className="relative">
                <button
                  onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
                  className="absolute -left-3 top-3 z-10 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                  title={showIndicatorPanel ? "Ẩn bảng chỉ báo" : "Hiện bảng chỉ báo"}
                >
                  {showIndicatorPanel ? <PanelLeftClose size={12} /> : <PanelLeft size={12} />}
                </button>

                {showIndicatorPanel && (
                  <Card className="shadow-sm border-gray-200 w-[260px] flex-shrink-0 overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
                      <Settings2 size={14} className="text-gray-400" />
                      <span className="text-xs font-semibold text-gray-700">Chỉ báo kỹ thuật</span>
                    </div>
                    <CardContent className="p-2 max-h-[570px] overflow-y-auto">
                      <IndicatorSelector
                        selectedOverlays={selectedOverlays}
                        onOverlaysChange={setSelectedOverlays}
                        selectedSubIndicator={selectedSubIndicator}
                        onSubIndicatorChange={setSelectedSubIndicator}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Summary below chart */}
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-1">
                <AnalysisSummary summary={data.summary} currentPrice={data.currentPrice} />
              </div>
              <div className="lg:col-span-2">
                <SignalTable signals={data.signals} />
              </div>
            </div>
          </TabsContent>

          {/* Signals Tab */}
          <TabsContent value="signals" className="mt-3">
            <SignalTable signals={data.signals} />
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AnalysisSummary summary={data.summary} currentPrice={data.currentPrice} />
              <div>
                <SignalTable signals={data.signals} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
