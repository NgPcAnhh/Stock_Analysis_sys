"use client";

import React from "react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { ScrollArea } from "@/components/ui/scroll-area";

const ShareholderList = () => {
    const { shareholders: SHAREHOLDERS } = useStockDetail();
    return (
        <div className="bg-white rounded-lg overflow-hidden h-full border border-gray-200">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-1 px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 uppercase tracking-wide">
                <span className="col-span-4">Họ và tên</span>
                <span className="col-span-5">Chức vụ</span>
                <span className="col-span-3 text-right">Tỷ lệ (%)</span>
            </div>

            {/* Scrollable Body */}
            <ScrollArea className="h-[380px]">
                <div className="divide-y divide-gray-100">
                    {SHAREHOLDERS.map((holder, index) => (
                        <div
                            key={index}
                            className={`grid grid-cols-12 gap-1 px-4 py-3 text-sm hover:bg-blue-50/40 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                }`}
                        >
                            <span className="col-span-4 text-gray-800 font-medium truncate">
                                {holder.name}
                            </span>
                            <span className="col-span-5 text-gray-500 truncate">
                                {holder.role}
                            </span>
                            <span className="col-span-3 text-right text-gray-700 font-semibold font-[var(--font-roboto-mono)]">
                                {holder.percentage > 0 ? holder.shares : "0.0"}
                            </span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

export default ShareholderList;
