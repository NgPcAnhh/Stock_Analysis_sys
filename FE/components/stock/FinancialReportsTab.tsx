"use client";

import React, { useState, useCallback, Component, type ReactNode, type ErrorInfo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinancialReports, useFinancialRatios, type IncomeStatementItem, type BalanceSheetItem, type CashFlowItem } from "@/hooks/useStockData";
import { useStockDetail } from "@/lib/StockDetailContext";
import { Download, FileSpreadsheet, BarChart3, Building2 } from "lucide-react";
import FinancialOverviewCharts from "@/components/stock/FinancialOverviewCharts";

// Temporary error boundary to capture runtime errors
class FinancialErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(err: Error) { return { error: err }; }
    componentDidCatch(err: Error, info: ErrorInfo) {
        console.error("[FinancialErrorBoundary]", err.message, err.stack, info.componentStack);
    }
    render() {
        if (this.state.error) {
            return (
                <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-sm font-sans">
                    <p className="font-bold text-red-700">Runtime Error:</p>
                    <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">{this.state.error.message}{"\n"}{this.state.error.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

type ReportType = "overview" | "income" | "balance" | "cashflow";

const formatNumber = (val: number): string => {
    if (val === 0) return "0";
    const negative = val < 0;
    const abs = Math.abs(val);
    const formatted = abs.toLocaleString("vi-VN");
    return negative ? `(${formatted})` : formatted;
};

// Convert raw VND to tỷ VND for display
const toTyVND = (val: number): number => +(val / 1_000_000_000).toFixed(2);
const fmtTy = (val: number): string => formatNumber(toTyVND(val));

const getChangePercent = (current: number, previous: number): number | null => {
    if (previous === 0) return null;
    return parseFloat((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
};

function ChangeCell({ current, previous }: { current: number; previous: number }) {
    const pct = getChangePercent(current, previous);
    if (pct === null) return <span className="text-gray-400">-</span>;
    const isPositive = pct > 0;
    const isNegative = pct < 0;
    return (
        <span
            className={`text-xs font-medium ${
                isPositive ? "text-green-600" : isNegative ? "text-red-500" : "text-gray-500"
            }`}
        >
            {isPositive ? "+" : ""}
            {pct}%
        </span>
    );
}

// ==================== INCOME STATEMENT TABLE ====================
function IncomeStatementTable({ data }: { data: IncomeStatementItem[] }) {
    const periods = data.map((d) => d.period.period);

    const rows: { label: string; key: keyof IncomeStatementItem; bold?: boolean; indent?: boolean }[] = [
        { label: "Doanh thu thuần", key: "revenue", bold: true },
        { label: "Giá vốn hàng bán", key: "costOfGoodsSold", indent: true },
        { label: "Lợi nhuận gộp", key: "grossProfit", bold: true },
        { label: "Chi phí bán hàng", key: "sellingExpenses", indent: true },
        { label: "Chi phí quản lý DN", key: "adminExpenses", indent: true },
        { label: "Lợi nhuận từ HĐKD", key: "operatingProfit", bold: true },
        { label: "Doanh thu tài chính", key: "financialIncome", indent: true },
        { label: "Chi phí tài chính", key: "financialExpenses", indent: true },
        { label: "Trong đó: Chi phí lãi vay", key: "interestExpenses", indent: true },
        { label: "Lợi nhuận trước thuế", key: "profitBeforeTax", bold: true },
        { label: "Thuế TNDN", key: "incomeTax", indent: true },
        { label: "Lợi nhuận sau thuế", key: "netProfit", bold: true },
        { label: "LNST của CĐ công ty mẹ", key: "netProfitParent", bold: true },
        { label: "EPS (VND)", key: "eps" },
    ];

    return (
        <ReportTable
            title="📋 Kết quả kinh doanh"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows}
            data={data}
        />
    );
}

// ==================== BALANCE SHEET TABLE ====================
function BalanceSheetTable({ data }: { data: BalanceSheetItem[] }) {
    const periods = data.map((d) => d.period.period);

    const rows: { label: string; key: keyof BalanceSheetItem; bold?: boolean; indent?: boolean; section?: string }[] = [
        { label: "TÀI SẢN", key: "totalAssets", bold: true, section: "header" },
        { label: "Tổng tài sản", key: "totalAssets", bold: true },
        { label: "Tài sản ngắn hạn", key: "currentAssets", bold: true },
        { label: "Tiền & tương đương tiền", key: "cash", indent: true },
        { label: "Đầu tư TC ngắn hạn", key: "shortTermInvestments", indent: true },
        { label: "Phải thu ngắn hạn", key: "shortTermReceivables", indent: true },
        { label: "Hàng tồn kho", key: "inventory", indent: true },
        { label: "Tài sản dài hạn", key: "nonCurrentAssets", bold: true },
        { label: "Tài sản cố định", key: "fixedAssets", indent: true },
        { label: "Đầu tư TC dài hạn", key: "longTermInvestments", indent: true },
        { label: "NGUỒN VỐN", key: "totalLiabilitiesAndEquity", bold: true, section: "header" },
        { label: "Tổng nợ phải trả", key: "totalLiabilities", bold: true },
        { label: "Nợ ngắn hạn", key: "currentLiabilities", indent: true },
        { label: "Nợ dài hạn", key: "longTermLiabilities", indent: true },
        { label: "Vốn chủ sở hữu", key: "totalEquity", bold: true },
        { label: "Vốn điều lệ", key: "charterCapital", indent: true },
        { label: "LN chưa phân phối", key: "retainedEarnings", indent: true },
        { label: "Tổng nguồn vốn", key: "totalLiabilitiesAndEquity", bold: true },
    ];

    return (
        <ReportTable
            title="🏛️ Cân đối kế toán"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows}
            data={data}
        />
    );
}

// ==================== CASH FLOW TABLE ====================
function CashFlowTable({ data }: { data: CashFlowItem[] }) {
    const periods = data.map((d) => d.period.period);

    const rows: { label: string; key: keyof CashFlowItem; bold?: boolean; indent?: boolean; section?: string }[] = [
        { label: "I. LƯU CHUYỂN TIỀN TỪ HĐKD", key: "operatingCashFlow", bold: true, section: "header" },
        { label: "Lưu chuyển tiền thuần từ HĐKD", key: "operatingCashFlow", bold: true },
        { label: "Lợi nhuận trước thuế", key: "profitBeforeTax", indent: true },
        { label: "Khấu hao TSCĐ", key: "depreciationAmortization", indent: true },
        { label: "Dự phòng", key: "provisionsAndReserves", indent: true },
        { label: "Thay đổi vốn lưu động", key: "workingCapitalChanges", indent: true },
        { label: "Tiền lãi đã trả", key: "interestPaid", indent: true },
        { label: "Thuế TNDN đã nộp", key: "incomeTaxPaid", indent: true },
        { label: "II. LƯU CHUYỂN TIỀN TỪ HĐĐT", key: "investingCashFlow", bold: true, section: "header" },
        { label: "Lưu chuyển tiền thuần từ HĐĐT", key: "investingCashFlow", bold: true },
        { label: "Mua sắm TSCĐ", key: "purchaseOfFixedAssets", indent: true },
        { label: "Thu thanh lý tài sản", key: "proceedsFromDisposal", indent: true },
        { label: "Đầu tư vào công ty con", key: "investmentInSubsidiaries", indent: true },
        { label: "III. LƯU CHUYỂN TIỀN TỪ HĐTC", key: "financingCashFlow", bold: true, section: "header" },
        { label: "Lưu chuyển tiền thuần từ HĐTC", key: "financingCashFlow", bold: true },
        { label: "Tiền thu từ đi vay", key: "proceedsFromBorrowing", indent: true },
        { label: "Tiền trả nợ vay", key: "repaymentOfBorrowing", indent: true },
        { label: "Cổ tức đã trả", key: "dividendsPaid", indent: true },
        { label: "Thu phát hành cổ phiếu", key: "proceedsFromEquity", indent: true },
        { label: "Tăng/giảm tiền thuần", key: "netCashChange", bold: true },
        { label: "Tiền đầu kỳ", key: "beginningCash", indent: true },
        { label: "Tiền cuối kỳ", key: "endingCash", bold: true },
    ];

    return (
        <ReportTable
            title="💵 Lưu chuyển tiền tệ"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows}
            data={data}
        />
    );
}

// ==================== GENERIC TABLE COMPONENT ====================
function ReportTable<T extends Record<string, any>>({
    title,
    subtitle,
    periods,
    rows,
    data,
}: {
    title: string;
    subtitle: string;
    periods: string[];
    rows: { label: string; key: keyof T; bold?: boolean; indent?: boolean; section?: string }[];
    data: T[];
}) {
    // Track which sections are visible (for headers that are repeated)
    const seenSectionHeaders = new Set<string>();

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-gray-800 font-sans">{title}</CardTitle>
                    <span className="text-xs text-gray-400 italic font-sans">{subtitle}</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs font-sans">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[220px] sticky left-0 bg-gray-50 z-10">
                                    Chỉ tiêu
                                </th>
                                {periods.map((p, i) => (
                                    <th
                                        key={p}
                                        className={`text-right px-3 py-3 font-semibold min-w-[110px] ${
                                            i === 0 ? "text-blue-600 bg-blue-50/50" : "text-gray-600"
                                        }`}
                                    >
                                        {p}
                                        {i === 0 && (
                                            <span className="block text-[10px] font-normal text-blue-400">
                                                Mới nhất
                                            </span>
                                        )}
                                    </th>
                                ))}
                                <th className="text-right px-3 py-3 font-semibold text-gray-500 min-w-[90px]">
                                    % thay đổi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                // Section headers
                                if (row.section === "header") {
                                    if (seenSectionHeaders.has(row.label)) return null;
                                    seenSectionHeaders.add(row.label);
                                    return (
                                        <tr key={`section-${idx}`} className="bg-blue-50/40 border-t border-blue-100">
                                            <td
                                                colSpan={periods.length + 2}
                                                className="px-4 py-2 text-xs font-bold text-blue-700 uppercase tracking-wide"
                                            >
                                                {row.label}
                                            </td>
                                        </tr>
                                    );
                                }

                                const values = data.map((d) => (d[row.key] as number) ?? 0);
                                const currentVal = values[0] ?? 0;
                                const prevVal = values[1] ?? 0;

                                return (
                                    <tr
                                        key={`row-${idx}`}
                                        className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                                            row.bold ? "bg-gray-50/30" : ""
                                        }`}
                                    >
                                        <td
                                            className={`px-4 py-2.5 sticky left-0 bg-white z-10 ${
                                                row.bold ? "font-semibold text-gray-800" : "font-normal text-gray-600"
                                            } ${row.indent ? "pl-8" : ""}`}
                                        >
                                            {row.label}
                                        </td>
                                        {values.map((val, i) => (
                                            <td
                                                key={i}
                                                className={`text-right px-3 py-2.5 tabular-nums ${
                                                    i === 0
                                                        ? "font-semibold text-blue-700 bg-blue-50/30"
                                                        : row.bold
                                                        ? "font-medium text-gray-800"
                                                        : "font-normal text-gray-600"
                                                } ${val < 0 ? "!text-red-500" : ""}`}
                                            >
                                                {fmtTy(val)}
                                            </td>
                                        ))}
                                        <td className="text-right px-3 py-2.5">
                                            <ChangeCell current={currentVal} previous={prevVal} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

// ==================== BANK INCOME STATEMENT TABLE ====================
function BankIncomeStatementTable({ data }: { data: IncomeStatementItem[] }) {
    const periods = data.map((d) => d.period.period);

    type BankISRow = {
        label: string;
        key: keyof IncomeStatementItem;
        bold?: boolean;
        indent?: boolean;
        section?: string;
    };

    const rows: BankISRow[] = [
        { label: "I. THU NHẬP LÃI THUẦN", key: "netInterestIncome", bold: true, section: "header" },
        { label: "Thu nhập lãi và các khoản tương đương", key: "interestIncome", indent: true },
        { label: "Chi phí lãi và các khoản tương đương", key: "interestExpenseBank", indent: true },
        { label: "Thu nhập lãi thuần (NII)", key: "netInterestIncome", bold: true },

        { label: "II. THU NHẬP NGOÀI LÃI", key: "totalOperatingIncome", bold: true, section: "header" },
        { label: "Lãi/lỗ thuần dịch vụ & phí", key: "netServiceFeeIncome", indent: true },
        { label: "Lãi/lỗ hoạt động kinh doanh ngoại tệ", key: "tradingFxIncome", indent: true },
        { label: "Lãi/lỗ mua bán chứng khoán kinh doanh", key: "tradingSecuritiesIncome", indent: true },
        { label: "Lãi/lỗ từ chứng khoán đầu tư", key: "investmentSecuritiesIncome", indent: true },
        { label: "Thu nhập từ hoạt động khác", key: "otherOperatingIncome", indent: true },
        { label: "Tổng thu nhập hoạt động (TOI)", key: "totalOperatingIncome", bold: true },

        { label: "III. CHI PHÍ HOẠT ĐỘNG (OPEX)", key: "operatingExpenses", bold: true, section: "header" },
        { label: "Chi phí hoạt động", key: "operatingExpenses", bold: true, indent: true },
        { label: "Lợi nhuận trước dự phòng (PPOP)", key: "prePpopProfit", bold: true },

        { label: "IV. DỰ PHÒNG RỦI RO TÍN DỤNG", key: "provisionExpenses", bold: true, section: "header" },
        { label: "Chi phí dự phòng rủi ro tín dụng", key: "provisionExpenses", bold: true, indent: true },

        { label: "V. LỢI NHUẬN", key: "profitBeforeTax", bold: true, section: "header" },
        { label: "Lợi nhuận trước thuế", key: "profitBeforeTax", bold: true },
        { label: "Thuế TNDN", key: "incomeTax", indent: true },
        { label: "Lợi nhuận sau thuế (LNST)", key: "netProfit", bold: true },
        { label: "LNST của CĐ công ty mẹ", key: "netProfitParent" },
        { label: "EPS (VND)", key: "eps" },
    ];

    return (
        <ReportTable
            title="🏦 KQKD Ngân hàng"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows}
            data={data}
        />
    );
}

// ==================== BANK BALANCE SHEET TABLE ====================
function BankBalanceSheetTable({ data }: { data: BalanceSheetItem[] }) {
    const periods = data.map((d) => d.period.period);

    type BankBSRow = {
        label: string;
        key: keyof BalanceSheetItem;
        bold?: boolean;
        indent?: boolean;
        section?: string;
    };

    const rows: BankBSRow[] = [
        { label: "TÀI SẢN", key: "totalAssets", bold: true, section: "header" },
        { label: "Tổng tài sản", key: "totalAssets", bold: true },
        { label: "Tiền và tương đương tiền", key: "cash", indent: true },
        { label: "Tiền gửi tại NHNN", key: "sbvDeposits", indent: true },
        { label: "Tiền gửi tại TCTD khác (tài sản)", key: "interBankDeposits", indent: true },
        { label: "Chứng khoán kinh doanh", key: "tradingSecurities", indent: true },
        { label: "Chứng khoán đầu tư", key: "investmentSecurities", indent: true },
        { label: "Cho vay khách hàng (gộp)", key: "loansToCustomersGross", indent: true },
        { label: "Dự phòng rủi ro cho vay", key: "loanLossReserves", indent: true },
        { label: "Cho vay khách hàng (thuần)", key: "loansToCustomers", bold: true, indent: true },
        { label: "Tài sản cố định", key: "fixedAssets", indent: true },
        { label: "Đầu tư TC dài hạn", key: "longTermInvestments", indent: true },

        { label: "NGUỒN VỐN", key: "totalLiabilitiesAndEquity", bold: true, section: "header" },
        { label: "Tổng nợ phải trả", key: "totalLiabilities", bold: true },
        { label: "Tiền gửi của NHNN và TCTD", key: "sbvDeposits", indent: true },
        { label: "Tiền gửi khách hàng", key: "customerDeposits", bold: true, indent: true },
        { label: "Phát hành giấy tờ có giá", key: "debtSecuritiesIssued", indent: true },
        { label: "Vốn chủ sở hữu", key: "totalEquity", bold: true },
        { label: "Vốn điều lệ", key: "charterCapital", indent: true },
        { label: "LN chưa phân phối", key: "retainedEarnings", indent: true },
        { label: "Tổng nguồn vốn", key: "totalLiabilitiesAndEquity", bold: true },
    ];

    return (
        <ReportTable
            title="🏦 Cân đối kế toán Ngân hàng"
            subtitle="Đơn vị: Tỷ VND"
            periods={periods}
            rows={rows}
            data={data}
        />
    );
}

// ==================== EXCEL EXPORT UTILITY ====================
function escapeCSV(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
}

function downloadCSV(filename: string, csvContent: string) {
    // BOM for UTF-8 so Excel reads Vietnamese correctly
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function buildIncomeCSV(data: IncomeStatementItem[]): string {
    const headers = ["Chỉ tiêu", ...data.map((d) => d.period.period)];
    const rows: { label: string; key: keyof IncomeStatementItem }[] = [
        { label: "Doanh thu thuần", key: "revenue" },
        { label: "Giá vốn hàng bán", key: "costOfGoodsSold" },
        { label: "Lợi nhuận gộp", key: "grossProfit" },
        { label: "Chi phí bán hàng", key: "sellingExpenses" },
        { label: "Chi phí quản lý DN", key: "adminExpenses" },
        { label: "Lợi nhuận từ HĐKD", key: "operatingProfit" },
        { label: "Doanh thu tài chính", key: "financialIncome" },
        { label: "Chi phí tài chính", key: "financialExpenses" },
        { label: "Chi phí lãi vay", key: "interestExpenses" },
        { label: "Lợi nhuận trước thuế", key: "profitBeforeTax" },
        { label: "Thuế TNDN", key: "incomeTax" },
        { label: "Lợi nhuận sau thuế", key: "netProfit" },
        { label: "LNST CĐ công ty mẹ", key: "netProfitParent" },
        { label: "EPS (VND)", key: "eps" },
    ];
    const lines = [headers.map(escapeCSV).join(",")];
    for (const row of rows) {
        const vals = data.map((d) => String(d[row.key]));
        lines.push([escapeCSV(row.label), ...vals].join(","));
    }
    return lines.join("\n");
}

function buildBalanceCSV(data: BalanceSheetItem[]): string {
    const headers = ["Chỉ tiêu", ...data.map((d) => d.period.period)];
    const rows: { label: string; key: keyof BalanceSheetItem }[] = [
        { label: "Tổng tài sản", key: "totalAssets" },
        { label: "Tài sản ngắn hạn", key: "currentAssets" },
        { label: "Tiền & tương đương tiền", key: "cash" },
        { label: "Đầu tư TC ngắn hạn", key: "shortTermInvestments" },
        { label: "Phải thu ngắn hạn", key: "shortTermReceivables" },
        { label: "Hàng tồn kho", key: "inventory" },
        { label: "Tài sản dài hạn", key: "nonCurrentAssets" },
        { label: "Tài sản cố định", key: "fixedAssets" },
        { label: "Đầu tư TC dài hạn", key: "longTermInvestments" },
        { label: "Tổng nợ phải trả", key: "totalLiabilities" },
        { label: "Nợ ngắn hạn", key: "currentLiabilities" },
        { label: "Nợ dài hạn", key: "longTermLiabilities" },
        { label: "Vốn chủ sở hữu", key: "totalEquity" },
        { label: "Vốn điều lệ", key: "charterCapital" },
        { label: "LN chưa phân phối", key: "retainedEarnings" },
        { label: "Tổng nguồn vốn", key: "totalLiabilitiesAndEquity" },
    ];
    const lines = [headers.map(escapeCSV).join(",")];
    for (const row of rows) {
        const vals = data.map((d) => String(d[row.key]));
        lines.push([escapeCSV(row.label), ...vals].join(","));
    }
    return lines.join("\n");
}

function buildCashFlowCSV(data: CashFlowItem[]): string {
    const headers = ["Chỉ tiêu", ...data.map((d) => d.period.period)];
    const rows: { label: string; key: keyof CashFlowItem }[] = [
        { label: "LC tiền thuần từ HĐKD", key: "operatingCashFlow" },
        { label: "Lợi nhuận trước thuế", key: "profitBeforeTax" },
        { label: "Khấu hao TSCĐ", key: "depreciationAmortization" },
        { label: "Dự phòng", key: "provisionsAndReserves" },
        { label: "Thay đổi vốn lưu động", key: "workingCapitalChanges" },
        { label: "Tiền lãi đã trả", key: "interestPaid" },
        { label: "Thuế TNDN đã nộp", key: "incomeTaxPaid" },
        { label: "LC tiền thuần từ HĐĐT", key: "investingCashFlow" },
        { label: "Mua sắm TSCĐ", key: "purchaseOfFixedAssets" },
        { label: "Thu thanh lý tài sản", key: "proceedsFromDisposal" },
        { label: "Đầu tư vào công ty con", key: "investmentInSubsidiaries" },
        { label: "LC tiền thuần từ HĐTC", key: "financingCashFlow" },
        { label: "Tiền thu từ đi vay", key: "proceedsFromBorrowing" },
        { label: "Tiền trả nợ vay", key: "repaymentOfBorrowing" },
        { label: "Cổ tức đã trả", key: "dividendsPaid" },
        { label: "Thu phát hành cổ phiếu", key: "proceedsFromEquity" },
        { label: "Tăng/giảm tiền thuần", key: "netCashChange" },
        { label: "Tiền đầu kỳ", key: "beginningCash" },
        { label: "Tiền cuối kỳ", key: "endingCash" },
    ];
    const lines = [headers.map(escapeCSV).join(",")];
    for (const row of rows) {
        const vals = data.map((d) => String(d[row.key]));
        lines.push([escapeCSV(row.label), ...vals].join(","));
    }
    return lines.join("\n");
}

// ==================== MAIN COMPONENT ====================
export default function FinancialReportsTab() {
    const { stockInfo, ticker } = useStockDetail();
    const { data: reportData, loading, error } = useFinancialReports(ticker, 20);
    const { data: ratiosData } = useFinancialRatios(ticker, 20);
    const [activeReport, setActiveReport] = useState<ReportType>("overview");

    const isBank = reportData?.isBank ?? false;

    const data = reportData
        ? {
              incomeStatements: reportData.incomeStatement,
              balanceSheets: reportData.balanceSheet,
              cashFlows: reportData.cashFlow,
          }
        : null;

    const reportTabs: { id: ReportType; label: string; icon: string }[] = [
        { id: "overview", label: "Tổng quan biểu đồ", icon: "📊" },
        { id: "income", label: isBank ? "KQKD Ngân hàng" : "Kết quả kinh doanh", icon: isBank ? "🏦" : "📋" },
        { id: "balance", label: isBank ? "CĐKT Ngân hàng" : "Cân đối kế toán", icon: isBank ? "🏦" : "🏛️" },
        { id: "cashflow", label: "Lưu chuyển tiền tệ", icon: "💵" },
    ];

    // All hooks MUST be called before any early return (React Rules of Hooks)
    const handleExportCurrent = useCallback(() => {
        if (!data) return;
        const t = stockInfo.ticker;
        if (activeReport === "income") {
            downloadCSV(`${t}_ket_qua_kinh_doanh.csv`, buildIncomeCSV(data.incomeStatements));
        } else if (activeReport === "balance") {
            downloadCSV(`${t}_can_doi_ke_toan.csv`, buildBalanceCSV(data.balanceSheets));
        } else {
            downloadCSV(`${t}_luu_chuyen_tien_te.csv`, buildCashFlowCSV(data.cashFlows));
        }
    }, [activeReport, data, stockInfo.ticker]);

    const handleExportAll = useCallback(() => {
        if (!data) return;
        const t = stockInfo.ticker;
        const income = buildIncomeCSV(data.incomeStatements);
        const balance = buildBalanceCSV(data.balanceSheets);
        const cashflow = buildCashFlowCSV(data.cashFlows);
        const combined = [
            "=== KẾT QUẢ KINH DOANH ===",
            income,
            "",
            "=== CÂN ĐỐI KẾ TOÁN ===",
            balance,
            "",
            "=== LƯU CHUYỂN TIỀN TỆ ===",
            cashflow,
        ].join("\n");
        downloadCSV(`${t}_bao_cao_tai_chinh.csv`, combined);
    }, [data, stockInfo.ticker]);

    if (loading && !reportData) return <div className="text-center py-12 text-gray-400 animate-pulse font-sans">Đang tải báo cáo tài chính…</div>;
    if (error && !reportData) return <div className="text-center py-12 text-red-500 font-sans">Lỗi: {error}</div>;
    if (!data) return null;

    return (
        <div className="space-y-4 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        {isBank && <Building2 className="w-5 h-5 text-blue-600" />}
                        Báo cáo tài chính
                        {isBank && <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Ngân hàng</span>}
                        {" — "}{stockInfo.ticker}
                    </h2>
                    <p className="text-xs text-gray-400 italic mt-0.5">
                        So sánh 6 quý gần nhất • Đơn vị: Tỷ VND
                        {isBank && " • Cấu trúc BCTC dành riêng cho ngành Ngân hàng"}
                    </p>
                </div>
                <button
                    onClick={handleExportAll}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Tải toàn bộ Excel
                </button>
            </div>

            {/* Sub-tabs + Export current */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-0">
                <div className="flex gap-1 flex-wrap">
                    {reportTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveReport(tab.id)}
                            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                                activeReport === tab.id
                                    ? "border-blue-500 text-blue-600 bg-blue-50/50"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <span className="mr-1.5">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
                {activeReport !== "overview" && (
                    <button
                        onClick={handleExportCurrent}
                        className="flex items-center gap-1.5 px-3 py-1.5 mb-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Tải báo cáo này
                    </button>
                )}
            </div>

            {/* Report content */}
            <FinancialErrorBoundary>
            {activeReport === "overview" && data && (
                <FinancialOverviewCharts
                    incomeStatement={data.incomeStatements}
                    balanceSheet={data.balanceSheets}
                    cashFlow={data.cashFlows}
                    financialRatios={ratiosData ?? undefined}
                    isBank={isBank}
                />
            )}
            {activeReport === "income" && data && (
                isBank
                    ? <BankIncomeStatementTable data={data.incomeStatements} />
                    : <IncomeStatementTable data={data.incomeStatements} />
            )}
            {activeReport === "balance" && data && (
                isBank
                    ? <BankBalanceSheetTable data={data.balanceSheets} />
                    : <BalanceSheetTable data={data.balanceSheets} />
            )}
            {activeReport === "cashflow" && data && (
                <CashFlowTable data={data.cashFlows} />
            )}
            </FinancialErrorBoundary>
        </div>
    );
}
