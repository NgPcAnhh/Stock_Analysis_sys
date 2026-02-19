"use client";

import React from "react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CorporateNews = () => {
    const { corporateNews: CORPORATE_NEWS } = useStockDetail();
    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-gray-800">
                    Tin công ty
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* 3-column grid for news articles */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CORPORATE_NEWS.map((news) => (
                        <article
                            key={news.id}
                            className="group cursor-pointer"
                        >
                            <h3 className="text-sm font-semibold text-gray-800 line-clamp-3 group-hover:text-blue-600 transition-colors leading-relaxed">
                                {news.title}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1.5">
                                {news.time}
                            </p>
                        </article>
                    ))}
                </div>

                {/* View More Link */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                        Xem thêm &gt;
                    </button>
                </div>
            </CardContent>
        </Card>
    );
};

export default CorporateNews;
