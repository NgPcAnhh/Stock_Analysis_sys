"use client";

import React from "react";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Info, ChevronRight } from "lucide-react";

const FinancialMatrix = () => {
    const { stockInfo } = useStockDetail();
    const { metrics, evaluation } = stockInfo;

    return (
        <div className="flex flex-col gap-3">
            {/* 4-Column Metrics Grid */}
            <div className="grid grid-cols-4 gap-4">
                {/* Column 1: Market Cap */}
                <div className="space-y-3">
                    <MetricItem
                        label="Vốn hóa"
                        value={metrics.marketCap}
                        subtext={`Xếp hạng vốn hóa: ${metrics.marketCapRank}`}
                        hasInfo
                    />
                </div>

                {/* Column 2: KLGD, P/E */}
                <div className="space-y-3">
                    <MetricItem
                        label="Khối lượng giao dịch"
                        value={metrics.volume}
                        hasInfo
                    />
                    <MetricItem
                        label="P/E"
                        value={metrics.pe}
                        hasInfo
                    />
                </div>

                {/* Column 3: P/B, EV/EBITDA */}
                <div className="space-y-3">
                    <MetricItem
                        label="P/B"
                        value={metrics.pb}
                        hasInfo
                    />
                    <MetricItem
                        label="EV/EBITDA"
                        value={metrics.evEbitda}
                        hasInfo
                    />
                </div>

                {/* Column 4: EPS, Shares */}
                <div className="space-y-3">
                    <MetricItem
                        label="EPS"
                        value={metrics.eps}
                        hasInfo
                    />
                    <MetricItem
                        label="Giá trị sổ sách"
                        value={metrics.roe}
                        hasInfo
                    />
                </div>
            </div>

            {/* Evaluation Section */}
            <div className="border-t border-gray-100 pt-3 mt-1">
                <div className="grid grid-cols-2 gap-4">
                    {/* Fundamental Analysis */}
                    <div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                            Phân tích cơ bản
                            <Info className="w-3 h-3 text-gray-400" />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-1">
                            <EvaluationBadge
                                label={`Rủi ro`}
                                value={evaluation.risk}
                                variant={evaluation.risk === 'Cao' ? 'danger' : 'success'}
                            />
                        </div>
                        <span className="text-xs text-gray-500">{evaluation.fundamentalAnalysis}</span>
                    </div>

                    {/* Valuation */}
                    <div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                            Định giá
                            <Info className="w-3 h-3 text-gray-400" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <EvaluationBadge
                                label=""
                                value={evaluation.valuation}
                                variant={evaluation.valuation === 'Hấp dẫn' ? 'success' : 'danger'}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Link */}
            <button className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline self-start">
                Chi tiết
                <ChevronRight className="w-3 h-3" />
            </button>
        </div>
    );
};

const MetricItem = ({
    label,
    value,
    subtext,
    hasInfo
}: {
    label: string;
    value: string;
    subtext?: string;
    hasInfo?: boolean;
}) => (
    <div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase">
            {label}
            {hasInfo && <Info className="w-3 h-3 text-gray-400" />}
        </div>
        <div className="text-sm font-bold text-gray-900 font-[var(--font-roboto-mono)]">
            {value}
        </div>
        {subtext && (
            <div className="text-[10px] text-gray-400">{subtext}</div>
        )}
    </div>
);

const EvaluationBadge = ({
    label,
    value,
    variant
}: {
    label: string;
    value: string;
    variant: 'success' | 'danger' | 'warning'
}) => {
    const variantStyles = {
        success: 'bg-green-50 text-green-700 border-green-200',
        danger: 'bg-red-50 text-red-700 border-red-200',
        warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    };

    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${variantStyles[variant]}`}>
            {label && `${label}: `}{value}
        </span>
    );
};

export default FinancialMatrix;
