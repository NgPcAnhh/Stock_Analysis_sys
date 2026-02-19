"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

// Mock data for ticker
const TICKER_DATA = [
    { symbol: "VNINDEX", price: 1250.45, change: 5.2, percent: 0.42 },
    { symbol: "VN30", price: 1280.12, change: -2.3, percent: -0.18 },
    { symbol: "HNX", price: 235.67, change: 1.1, percent: 0.47 },
    { symbol: "UPCOM", price: 90.12, change: 0.0, percent: 0.00 },
    { symbol: "HPG", price: 28.5, change: 0.4, percent: 1.42 },
    { symbol: "SSI", price: 34.2, change: -0.1, percent: -0.29 },
    { symbol: "VIC", price: 45.1, change: 0.9, percent: 2.04 },
    { symbol: "VNM", price: 67.8, change: -0.5, percent: -0.73 },
    { symbol: "FPT", price: 112.4, change: 2.1, percent: 1.90 },
    { symbol: "MWG", price: 48.9, change: 1.2, percent: 2.51 },
    { symbol: "TCB", price: 38.6, change: -0.2, percent: -0.52 },
    { symbol: "ACB", price: 27.4, change: 0.1, percent: 0.37 },
];

export function StockTicker() {
    const [isPaused, setIsPaused] = useState(false);

    return (
        <div
            className="w-full bg-background border-b border-border overflow-hidden h-10 flex items-center relative z-20"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div
                className={`flex whitespace-nowrap animate-infinite-scroll ${isPaused ? 'paused' : ''}`}
                style={{
                    animation: "scroll 40s linear infinite",
                }}
            >
                {[...TICKER_DATA, ...TICKER_DATA, ...TICKER_DATA].map((item, index) => (
                    <div
                        key={`${item.symbol}-${index}`}
                        className="flex items-center space-x-2 px-6 border-r border-border/50 min-w-max"
                    >
                        <span className="font-bold text-sm text-foreground">{item.symbol}</span>
                        <span className={`text-sm font-medium ${item.percent > 0 ? "text-green-500" : item.percent < 0 ? "text-red-500" : "text-yellow-500"
                            }`}>
                            {item.price.toLocaleString()}
                        </span>
                        <span className={`flex items-center text-xs ${item.percent > 0 ? "text-green-500" : item.percent < 0 ? "text-red-500" : "text-yellow-500"
                            }`}>
                            {item.percent > 0 ? <ArrowUp size={12} className="mr-0.5" /> :
                                item.percent < 0 ? <ArrowDown size={12} className="mr-0.5" /> :
                                    <Minus size={12} className="mr-0.5" />}
                            {Math.abs(item.percent).toFixed(2)}%
                        </span>
                    </div>
                ))}
            </div>
            <style jsx global>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .paused {
          animation-play-state: paused !important;
        }
      `}</style>
        </div>
    );
}
