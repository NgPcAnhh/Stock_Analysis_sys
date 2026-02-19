"use client";

import { useRef } from "react";
import MarketIndicesTable from "@/components/indices/MarketIndicesTable";
import MacroIndicatorsTable from "@/components/indices/MacroIndicatorsTable";
import {
    VIETNAM_MARKET_INDICES,
    GLOBAL_MARKET_INDICES,
    MACRO_INDICATORS,
} from "@/lib/indicesData";
import { TrendingUp, Globe, Landmark } from "lucide-react";

export default function IndicesPage() {
    const marketRef = useRef<HTMLElement>(null);
    const globalRef = useRef<HTMLElement>(null);
    const macroRef = useRef<HTMLElement>(null);

    const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
        ref.current?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Chỉ số &amp; Vĩ mô <span className="text-orange-500">vnstock</span>
                    </h1>
                    <div className="text-sm text-gray-500">Cập nhật: Vừa xong</div>
                </div>

                {/* Quick nav cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => scrollTo(marketRef)}
                        className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-orange-300 hover:shadow-md transition-all text-left group"
                    >
                        <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                            <TrendingUp className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 text-sm">Chỉ số Việt Nam</div>
                            <div className="text-xs text-gray-500">{VIETNAM_MARKET_INDICES.length} chỉ số</div>
                        </div>
                    </button>
                    <button
                        onClick={() => scrollTo(globalRef)}
                        className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left group"
                    >
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <Globe className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 text-sm">Chỉ số Quốc tế</div>
                            <div className="text-xs text-gray-500">{GLOBAL_MARKET_INDICES.length} chỉ số</div>
                        </div>
                    </button>
                    <button
                        onClick={() => scrollTo(macroRef)}
                        className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all text-left group"
                    >
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                            <Landmark className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 text-sm">Chỉ số Vĩ mô</div>
                            <div className="text-xs text-gray-500">{MACRO_INDICATORS.length} chỉ số</div>
                        </div>
                    </button>
                </div>

                {/* Vietnam Market Indices */}
                <section ref={marketRef}>
                    <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-orange-500 rounded-full" />
                        Chỉ số Việt Nam
                    </h2>
                    <MarketIndicesTable
                        title="Chỉ số Việt Nam"
                        data={VIETNAM_MARKET_INDICES}
                        description="Các chỉ số chính trên sàn HOSE, HNX và UPCOM"
                    />
                </section>

                {/* Global Market Indices */}
                <section ref={globalRef}>
                    <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-blue-500 rounded-full" />
                        Chỉ số Quốc tế
                    </h2>
                    <MarketIndicesTable
                        title="Chỉ số Quốc tế"
                        data={GLOBAL_MARKET_INDICES}
                        description="Các chỉ số chứng khoán quốc tế chính"
                    />
                </section>

                {/* Macro Indicators */}
                <section ref={macroRef}>
                    <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-emerald-500 rounded-full" />
                        Chỉ số Vĩ mô
                    </h2>
                    <MacroIndicatorsTable data={MACRO_INDICATORS} />
                </section>
            </div>
        </div>
    );
}
