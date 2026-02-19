"use client";

import React from "react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";

const OrderBook = () => {
    const { orderBook: ORDER_BOOK } = useStockDetail();
    // Find max volume for bar chart scaling
    const maxVolume = Math.max(...ORDER_BOOK.map(o => o.volume));

    return (
        <Card className="shadow-sm border-gray-200 h-full flex flex-col">
            <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-800">
                        Chi tiết khớp lệnh
                    </CardTitle>
                    <button className="p-1 hover:bg-gray-100 rounded">
                        <Settings2 className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-1 px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-y border-gray-100">
                    <span>Thời gian</span>
                    <span className="text-right">Khối lượng</span>
                    <span className="text-right">Giá</span>
                    <span className="text-right">%</span>
                    <span className="text-center">M/B</span>
                </div>

                {/* Scrollable Body */}
                <ScrollArea className="h-[410px]">
                    <div className="divide-y divide-gray-50">
                        {ORDER_BOOK.map((order, index) => {
                            const isBuy = order.side === 'Mua';
                            const barWidth = maxVolume > 0 ? (order.volume / maxVolume) * 100 : 0;

                            return (
                                <div
                                    key={index}
                                    className="grid grid-cols-5 gap-1 px-3 py-2 text-sm hover:bg-gray-50 transition-colors relative"
                                >
                                    <span className="text-gray-600 font-[var(--font-roboto-mono)]">
                                        {order.time}
                                    </span>

                                    {/* Volume with background bar */}
                                    <div className="relative text-right">
                                        <div
                                            className={`absolute right-0 top-0 h-full ${isBuy ? 'bg-green-50' : 'bg-red-50'}`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                        <span className="relative z-10 font-semibold font-[var(--font-roboto-mono)] text-gray-900">
                                            {order.volume.toLocaleString()}
                                        </span>
                                    </div>

                                    <span
                                        className={`text-right font-semibold font-[var(--font-roboto-mono)] ${isBuy ? "text-[#00C076]" : "text-[#EF4444]"
                                            }`}
                                    >
                                        {order.price.toLocaleString()}
                                    </span>

                                    <span
                                        className={`text-right font-[var(--font-roboto-mono)] ${isBuy ? "text-[#00C076]" : "text-[#EF4444]"
                                            }`}
                                    >
                                        +{order.change.toFixed(2)}
                                    </span>

                                    <span className="text-center">
                                        <span
                                            className={`text-xs font-medium ${isBuy ? "text-[#00C076]" : "text-[#EF4444]"
                                                }`}
                                        >
                                            {order.side}
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default OrderBook;
