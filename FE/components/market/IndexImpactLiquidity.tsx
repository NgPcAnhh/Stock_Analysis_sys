"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import {
    INDEX_IMPACT_DATA,
    FOREIGN_FLOW_DATA,
} from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const IndexImpactLiquidity = () => {
    const impactOption = {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: { type: "category", data: INDEX_IMPACT_DATA.map((i) => i.ticker), axisLabel: { fontSize: 10 } },
        yAxis: { type: "value", axisLabel: { fontSize: 10 } },
        series: [
            {
                data: INDEX_IMPACT_DATA.map((item) => ({
                    value: item.impact,
                    itemStyle: { color: item.impact >= 0 ? "#22c55e" : "#ef4444" },
                })),
                type: "bar",
                barMaxWidth: 24,
            },
        ],
    };

    const foreignOption = {
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
        xAxis: {
            type: "category",
            data: FOREIGN_FLOW_DATA.map((i) => i.date),
            axisLabel: { fontSize: 10 },
        },
        yAxis: { type: "value", axisLabel: { fontSize: 10 } },
        series: [
            {
                data: FOREIGN_FLOW_DATA.map((item) => ({
                    value: item.netVal,
                    itemStyle: { color: item.netVal >= 0 ? "#22c55e" : "#ef4444" },
                })),
                type: "bar",
                barMaxWidth: 20,
            },
        ],
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-800">
                        Tác động tới Index
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ReactECharts option={impactOption} style={{ height: "220px" }} />
                </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-800">
                        Giao dịch Khối ngoại
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ReactECharts option={foreignOption} style={{ height: "220px" }} />
                </CardContent>
            </Card>
        </div>
    );
};

export default IndexImpactLiquidity;
