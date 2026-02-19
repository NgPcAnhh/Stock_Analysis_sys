"use client";

import React from "react";
import StockIdentityCard from "./StockIdentityCard";
import PriceBoard from "./PriceBoard";
import FinancialMatrix from "./FinancialMatrix";
import { Card } from "@/components/ui/card";

const StockDetailHeader = () => {
    return (
        <Card className="p-4 shadow-sm border-gray-200 bg-white">
            <div className="space-y-4">
                {/* Top Row: Stock Identity (with AI box inside) */}
                <StockIdentityCard />

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Bottom Row: Price Board + Financial Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Price Board - 5 cols */}
                    <div className="lg:col-span-5">
                        <PriceBoard />
                    </div>

                    {/* Divider */}
                    <div className="hidden lg:block lg:col-span-1 border-l border-gray-100" />

                    {/* Financial Matrix - 6 cols */}
                    <div className="lg:col-span-6">
                        <FinancialMatrix />
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default StockDetailHeader;
