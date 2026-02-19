"use client";

import React from "react";
import { NAVIGATION_TABS } from "@/lib/stockDetailMockData";

const NavigationTabs = ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (id: string) => void }) => {
    return (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 -mx-4 px-4 py-2">
            <nav className="flex items-center gap-1 overflow-x-auto">
                {NAVIGATION_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
              px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors
              ${activeTab === tab.id
                                ? "bg-[#2563EB] text-white shadow-sm"
                                : "text-gray-600 hover:text-[#2563EB] hover:bg-blue-50"
                            }
            `}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default NavigationTabs;
