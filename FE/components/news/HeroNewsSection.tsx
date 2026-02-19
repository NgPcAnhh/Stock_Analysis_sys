"use client";

import React from "react";
import { NEWS_HERO_DATA } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";

const CATEGORY_COLORS: Record<string, string> = {
    "Thị trường": "bg-blue-700",
    "Doanh nghiệp": "bg-emerald-700",
    "Quốc tế": "bg-purple-700",
    "Phân tích": "bg-amber-700",
    "Vĩ mô": "bg-teal-700",
};

const HeroNewsSection = () => {
    const mainNews = NEWS_HERO_DATA.main;
    const sideNews = NEWS_HERO_DATA.secondary;

    const getColor = (category: string) =>
        CATEGORY_COLORS[category] || "bg-slate-700";

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[400px]">
            {/* Large Left Card */}
            <div className="md:col-span-2 relative group overflow-hidden rounded-xl cursor-pointer">
                <div className={`absolute inset-0 ${getColor(mainNews.category)} opacity-90`}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6">
                    <Badge className="bg-orange-500 hover:bg-orange-600 mb-2">
                        {mainNews.category}
                    </Badge>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                        {mainNews.title}
                    </h2>
                    <p className="text-sm text-gray-300 mt-2">{mainNews.time}</p>
                </div>
            </div>

            {/* Right Column Stack */}
            <div className="md:col-span-2 grid grid-rows-2 gap-4">
                {sideNews.slice(0, 2).map((item) => (
                    <div
                        key={item.id}
                        className="relative group overflow-hidden rounded-xl cursor-pointer"
                    >
                        <div className={`absolute inset-0 ${getColor(item.category)} opacity-90`}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-4">
                            <Badge className="bg-white text-gray-900 hover:bg-gray-100 mb-2">
                                {item.category}
                            </Badge>
                            <h3 className="text-lg font-bold text-white">
                                {item.title}
                            </h3>
                            <p className="text-xs text-gray-300 mt-1">{item.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HeroNewsSection;
