"use client";

import React, { useState, use } from "react";
import StockDetailHeader from "@/components/stock/StockDetailHeader";
import NavigationTabs from "@/components/stock/NavigationTabs";
import PriceHistoryChart from "@/components/stock/PriceHistoryChart";
import OrderBook from "@/components/stock/OrderBook";
import PeerComparison from "@/components/stock/PeerComparison";
import HistoricalDataTable from "@/components/stock/HistoricalDataTable";
import ShareholderList from "@/components/stock/ShareholderList";
import ShareholderDonutChart from "@/components/stock/ShareholderDonutChart";
import CorporateNews from "@/components/stock/CorporateNews";
import RecommendationsSection from "@/components/stock/RecommendationsSection";
import FinancialMetricsTab from "@/components/stock/FinancialMetricsTab";
import FinancialReportsTab from "@/components/stock/FinancialReportsTab";
import CompanyProfileTab from "@/components/stock/CompanyProfileTab";
import StockComparisonTab from "@/components/stock/StockComparisonTab";
import BalanceSheetTab from "@/components/stock/BalanceSheetTab";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import { getStockDetailData } from "@/lib/stockDetailMockData";
import { StockDetailProvider } from "@/lib/StockDetailContext";

interface StockDetailPageProps {
    params: Promise<{ ticker: string }>;
}

export default function StockDetailPage({ params }: StockDetailPageProps) {
    const { ticker } = use(params);
    const data = getStockDetailData(ticker.toUpperCase());
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <StockDetailProvider data={data}>
            <div className="min-h-screen bg-[#F3F4F6]">
                <div className="max-w-[1440px] mx-auto px-4 py-4 space-y-6">

                {/* Section 1: Header & Overview */}
                <StockDetailHeader />

                {/* Navigation Tabs */}
                <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />

                {activeTab === "overview" && (
                    <>
                        {/* ── Biểu đồ & Khớp lệnh ── */}
                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-gray-600 flex items-center gap-2">
                                <span className="w-1 h-5 bg-blue-500 rounded-full" />
                                Biểu đồ & Khớp lệnh
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                                <div className="lg:col-span-8">
                                    <PriceHistoryChart />
                                </div>
                                <div className="lg:col-span-4">
                                    <OrderBook />
                                </div>
                            </div>
                        </section>

                        {/* ── Dữ liệu giao dịch ── */}
                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-gray-600 flex items-center gap-2">
                                <span className="w-1 h-5 bg-green-500 rounded-full" />
                                Dữ liệu giao dịch & So sánh
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                                <div className="lg:col-span-8">
                                    <HistoricalDataTable />
                                </div>
                                <div className="lg:col-span-4">
                                    <PeerComparison />
                                </div>
                            </div>
                        </section>

                        {/* ── Cơ cấu cổ đông ── */}
                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-gray-600 flex items-center gap-2">
                                <span className="w-1 h-5 bg-amber-500 rounded-full" />
                                Cơ cấu cổ đông
                            </h2>
                            <Card className="shadow-sm border-gray-200">
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-center">
                                            <ShareholderDonutChart />
                                        </div>
                                        <div>
                                            <ShareholderList />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* ── Tin tức doanh nghiệp ── */}
                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-gray-600 flex items-center gap-2">
                                <span className="w-1 h-5 bg-purple-500 rounded-full" />
                                Tin tức doanh nghiệp
                            </h2>
                            <CorporateNews />
                        </section>

                        {/* ── Khuyến nghị ── */}
                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-gray-600 flex items-center gap-2">
                                <span className="w-1 h-5 bg-red-500 rounded-full" />
                                Có thể bạn sẽ quan tâm
                            </h2>
                            <RecommendationsSection />
                        </section>
                    </>
                )}

                {activeTab === "news" && (
                    <div className="py-4">
                        <CorporateNews />
                    </div>
                )}

                {activeTab === "financials" && (
                    <div className="py-4">
                        <FinancialMetricsTab />
                    </div>
                )}

                {activeTab === "reports" && (
                    <div className="py-4">
                        <FinancialReportsTab />
                    </div>
                )}

                {activeTab === "profile" && (
                    <div className="py-4">
                        <CompanyProfileTab />
                    </div>
                )}

                {activeTab === "compare" && (
                    <div className="py-4">
                        <StockComparisonTab />
                    </div>
                )}

                {activeTab === "analysis" && (
                    <div className="py-4">
                        <BalanceSheetTab />
                    </div>
                )}
            </div>

            {/* Spacing before footer */}
            <div className="h-12" />

            {/* Footer */}
            <Footer />
        </div>
        </StockDetailProvider>
    );
}
