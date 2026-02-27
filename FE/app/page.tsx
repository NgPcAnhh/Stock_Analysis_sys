"use client";

import { useState } from "react";
import { MarketIndexCards } from "@/components/dashboard/MarketIndexCards";
import { MainMarketChart } from "@/components/dashboard/MainMarketChart";
import { SectorPerformance } from "@/components/dashboard/SectorPerformance";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { MarketComparisonTable } from "@/components/dashboard/MarketComparisonTable";
import { MarketHeatmap } from "@/components/dashboard/MarketHeatmap";
import { ValuationChart } from "@/components/charts/ValuationChart";
import { LiquidityChart } from "@/components/charts/LiquidityChart";
import { TopStocks } from "@/components/dashboard/TopStocks";
import { MacroData } from "@/components/dashboard/MacroData";
import { NewsSection } from "@/components/dashboard/NewsSection";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
    const [activeTicker, setActiveTicker] = useState("VNINDEX");

    return (
        <>
            <div className="p-6 mx-auto max-w-7xl space-y-10 pb-10 pt-4">
                {/* Row 1: Main Market Chart (Full Width) */}
                <section>
                    <MarketIndexCards
                        activeIndex={activeTicker}
                        onIndexSelect={(id) => setActiveTicker(id)}
                    />
                    <div className="mt-10">
                        <MainMarketChart ticker={activeTicker} />
                    </div>
                </section>

                {/* Row 2: Sector Performance & International Markets */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="h-[400px]">
                        <SectorPerformance />
                    </div>
                    <div className="h-[400px]">
                        <MarketComparisonTable />
                    </div>
                </section>

                {/* Row 3: Market Breadth & Top Stocks */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-5 h-[400px]">
                        <MarketBreadth />
                    </div>
                    <div className="lg:col-span-7 h-[400px]">
                        <TopStocks />
                    </div>
                </section>

                {/* Row 4: Market Heatmap (Full Width) */}
                <section className="h-[550px]">
                    <MarketHeatmap />
                </section>

                {/* Row 5: PE Valuation & Liquidity */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="h-[400px]">
                        <ValuationChart />
                    </div>
                    <div className="h-[400px]">
                        <LiquidityChart />
                    </div>
                </section>

                {/* Section C: Macro & News */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-3">
                        <MacroData />
                    </div>
                </section>

                <section>
                    <NewsSection />
                </section>
            </div>

            <Footer />
        </>
    );
}
