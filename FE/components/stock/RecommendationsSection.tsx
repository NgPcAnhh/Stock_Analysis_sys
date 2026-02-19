"use client";

import React from "react";
import { useStockDetail } from "@/lib/StockDetailContext";
import StockRecommendationCard from "./StockRecommendationCard";

const RecommendationsSection = () => {
    const { recommendations: RECOMMENDATIONS } = useStockDetail();
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RECOMMENDATIONS.map((stock) => (
                <StockRecommendationCard key={stock.ticker} stock={stock} />
            ))}
        </div>
    );
};

export default RecommendationsSection;
