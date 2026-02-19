"use client";

import React from "react";
import { NEWS_FEED_DATA, NEWS_TAGS, MOST_READ_NEWS } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CATEGORY_COLORS: Record<string, string> = {
    "Doanh nghiệp": "bg-emerald-600",
    "Quốc tế": "bg-purple-600",
    "Phân tích": "bg-amber-600",
    "Vĩ mô": "bg-teal-600",
    "Thị trường": "bg-blue-600",
};

const NewsFeed = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Left Column: Main Feed */}
            <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold text-gray-900 border-l-4 border-orange-500 pl-3">
                    Dòng sự kiện
                </h2>
                <div className="space-y-4">
                    {NEWS_FEED_DATA.map((news) => (
                        <Card key={news.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex gap-4">
                                {/* Category Badge Thumbnail */}
                                <div
                                    className={`${CATEGORY_COLORS[news.category] || "bg-slate-600"} w-20 h-20 shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-xs text-center p-2`}
                                >
                                    {news.category}
                                </div>
                                {/* Content */}
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 hover:text-orange-600 cursor-pointer">
                                        {news.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                        <span className="font-medium text-gray-500">
                                            {news.source}
                                        </span>
                                        <span>•</span>
                                        <span>{news.time}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Right Column: Sidebar */}
            <div className="space-y-8">
                {/* Hot Keywords */}
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-md font-bold text-gray-800">
                            Hot Keywords
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {NEWS_TAGS.map((tag) => (
                                <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-orange-100 hover:text-orange-700 transition-colors"
                                >
                                    {tag.label}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Most Read */}
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-md font-bold text-gray-800">
                            Đọc nhiều nhất
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100">
                            {MOST_READ_NEWS.map((item, index) => (
                                <div key={item.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 cursor-pointer transition-colors">
                                    <span className="text-2xl font-bold text-gray-300 -mt-1">{index + 1}</span>
                                    <h4 className="text-sm font-medium text-gray-700 hover:text-orange-600 leading-snug">
                                        {item.title}
                                    </h4>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default NewsFeed;
