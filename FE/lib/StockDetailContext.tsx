"use client";

import React, { createContext, useContext } from "react";
import type { StockInfo, PriceHistoryItem, OrderBookItem, HistoricalDataItem, Shareholder, PeerStock, NewsArticle, RecommendedStock } from "@/lib/stockDetailMockData";

export interface StockDetailData {
    stockInfo: StockInfo;
    priceHistory: PriceHistoryItem[];
    orderBook: OrderBookItem[];
    historicalData: HistoricalDataItem[];
    shareholders: Shareholder[];
    shareholderStructure: { domestic: number; foreign: number; strategic: number; individual: number };
    peerStocks: PeerStock[];
    corporateNews: NewsArticle[];
    recommendations: RecommendedStock[];
}

const StockDetailContext = createContext<StockDetailData | null>(null);

export function StockDetailProvider({ data, children }: { data: StockDetailData; children: React.ReactNode }) {
    return (
        <StockDetailContext.Provider value={data}>
            {children}
        </StockDetailContext.Provider>
    );
}

export function useStockDetail(): StockDetailData {
    const ctx = useContext(StockDetailContext);
    if (!ctx) throw new Error("useStockDetail must be used within StockDetailProvider");
    return ctx;
}
