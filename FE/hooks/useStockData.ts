/**
 * useStockDetail — Hook fetching stock overview data from the API.
 *
 * Replaces the mock-data based `getStockDetailData` + `StockDetailProvider` pattern
 * with real API calls using the optimized fetch infrastructure.
 */
import { useOptimizedFetch } from "@/hooks/useOptimizedFetch";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Overview (mega endpoint) ──────────────────────────────────
export function useStockOverview(ticker: string) {
    return useOptimizedFetch<StockOverviewData>({
        url: `${API_BASE}/api/v1/stock/${ticker}/overview`,
        refreshInterval: 60_000,
    });
}

// ── Price History ─────────────────────────────────────────────
export type PriceHistoryPeriod = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "ALL";

export function usePriceHistory(ticker: string, period: PriceHistoryPeriod = "1Y") {
    return useOptimizedFetch<PriceHistoryItem[]>({
        url: `${API_BASE}/api/v1/stock/${ticker}/price-history?period=${period}`,
        refreshInterval: 120_000,
    });
}

// ── Financial Ratios ──────────────────────────────────────────
export function useFinancialRatios(ticker: string, periods = 20) {
    return useOptimizedFetch<FinancialRatioItem[]>({
        url: `${API_BASE}/api/v1/stock/${ticker}/financial-ratios?periods=${periods}`,
        refreshInterval: 300_000,
    });
}

// ── Financial Reports ─────────────────────────────────────────
// Normalise period: backend may return flat {period:"Q1/2025",year,quarter,...}
// or nested {period:{period:"Q1/2025",year,quarter},...}. We always normalise to
// the nested FinancialPeriod shape expected by our TypeScript interfaces.
function normalisePeriod(item: Record<string, unknown>): Record<string, unknown> {
    const p = item.period;
    if (typeof p === "string") {
        // flat → nested
        return {
            ...item,
            period: {
                period: p,
                year: Number(item.year) || 0,
                quarter: Number(item.quarter) || 0,
            },
        };
    }
    return item;
}

function transformFinancialReports(json: unknown): FinancialReportsData {
    const raw = json as Record<string, unknown>;
    const rawArr = raw as Record<string, unknown[]>;
    return {
        isBank: !!(raw.isBank),
        industry: String(raw.industry || ""),
        incomeStatement: (rawArr.incomeStatement || []).map((i) => normalisePeriod(i as Record<string, unknown>) as unknown as IncomeStatementItem),
        balanceSheet: (rawArr.balanceSheet || []).map((i) => normalisePeriod(i as Record<string, unknown>) as unknown as BalanceSheetItem),
        cashFlow: (rawArr.cashFlow || []).map((i) => normalisePeriod(i as Record<string, unknown>) as unknown as CashFlowItem),
    };
}

export function useFinancialReports(ticker: string, periods = 12) {
    return useOptimizedFetch<FinancialReportsData>({
        url: `${API_BASE}/api/v1/stock/${ticker}/financial-reports?periods=${periods}`,
        refreshInterval: 300_000,
        transform: transformFinancialReports,
    });
}

// ── Company Profile ───────────────────────────────────────────
export function useCompanyProfile(ticker: string) {
    return useOptimizedFetch<CompanyProfileData>({
        url: `${API_BASE}/api/v1/stock/${ticker}/profile`,
        refreshInterval: 600_000,
    });
}

// ── Stock Comparison ──────────────────────────────────────────
export function useStockComparison(ticker: string, peers = "") {
    const query = peers ? `?peers=${encodeURIComponent(peers)}` : "";
    return useOptimizedFetch<StockComparisonData>({
        url: `${API_BASE}/api/v1/stock/${ticker}/comparison${query}`,
        refreshInterval: 300_000,
    });
}

// ── Deep Analysis ─────────────────────────────────────────────
export function useDeepAnalysis(ticker: string) {
    return useOptimizedFetch<DeepAnalysisData>({
        url: `${API_BASE}/api/v1/stock/${ticker}/deep-analysis`,
        refreshInterval: 300_000,
    });
}

// ── Quant Analysis ────────────────────────────────────────────
export function useQuantAnalysis(ticker: string) {
    return useOptimizedFetch<QuantAnalysisData>({
        url: `${API_BASE}/api/v1/stock/${ticker}/quant-analysis`,
        refreshInterval: 600_000,
    });
}

// ── Valuation ─────────────────────────────────────────────────
export function useValuation(ticker: string) {
    return useOptimizedFetch<ValuationData>({
        url: `${API_BASE}/api/v1/stock/${ticker}/valuation`,
        refreshInterval: 600_000,
    });
}


// ══════════════════════════════════════════════════════════════
// Types — matching the backend Pydantic schemas
// ══════════════════════════════════════════════════════════════

export interface StockOverviewData {
    stockInfo: StockInfo;
    priceHistory: PriceHistoryItem[];
    orderBook: OrderBookItem[];
    historicalData: HistoricalDataItem[];
    shareholders: Shareholder[];
    shareholderStructure: { position: string; percent: number; members: { name: string; percent: number }[] }[];
    peerStocks: PeerStock[];
    corporateNews: NewsArticle[];
    recommendations: RecommendedStock[];
}

export interface StockInfo {
    ticker: string;
    exchange: string;
    companyName: string;
    companyNameFull: string;
    overview: string;
    logoUrl: string;
    tags: string[];
    sector?: string;
    website: string;
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    dayLow: number;
    dayHigh: number;
    referencePrice: number;
    ceilingPrice: number;
    floorPrice: number;
    metrics: {
        marketCap: string;
        marketCapRank: number;
        volume: string;
        pe: string;
        peRank: number;
        eps: string;
        pb: string;
        evEbitda: string;
        outstandingShares: string;
        roe: string;
        bvps: string;
    };
    evaluation: {
        risk: string;
        valuation: string;
        fundamentalAnalysis: string;
        technicalAnalysis: string;
    };
}

export interface PriceHistoryItem {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface OrderBookItem {
    time: string;
    volume: number;
    price: number;
    side: string;
    change: number;
}

export interface HistoricalDataItem {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
    volume: number;
}

export interface Shareholder {
    name: string;
    role: string;
    shares: string;
    percentage: number;
}

export interface PeerStock {
    ticker: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    volume: number;
    sparklineData: number[];
}

export interface NewsArticle {
    id: string;
    title: string;
    time: string;
    source: string;
    category: string;
    ticker: string;
}

export interface RecommendedStock {
    ticker: string;
    exchange: string;
    companyName: string;
    logoUrl: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    marketCap: string;
    volume: string;
    pe: string;
    chartData: number[];
}

// Financial Ratios
export interface FinancialRatioItem {
    year: number;
    quarter: number;
    pe: number | null;
    pb: number | null;
    ps: number | null;
    eps: number | null;
    bvps: number | null;
    roe: number | null;
    roa: number | null;
    roic: number | null;
    grossMargin: number | null;
    netMargin: number | null;
    ebitMargin: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    quickRatio: number | null;
    cashRatio: number | null;
    interestCoverageRatio: number | null;
    assetTurnover: number | null;
    inventoryTurnover: number | null;
    receivableDays: number | null;
    inventoryDays: number | null;
    payableDays: number | null;
    cashConversionCycle: number | null;
    evEbitda: number | null;
    dividendYield: number | null;
    marketCap: number | null;
    outstandingShares: number | null;
    pCashflow: number | null;
}

// Financial Reports
export interface FinancialPeriod {
    period: string;
    year: number;
    quarter: number;
}

export interface IncomeStatementItem {
    period: FinancialPeriod;
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    sellingExpenses: number;
    adminExpenses: number;
    operatingProfit: number;
    financialIncome: number;
    financialExpenses: number;
    interestExpenses: number;
    profitBeforeTax: number;
    incomeTax: number;
    netProfit: number;
    netProfitParent: number;
    eps: number;
    // Banking-specific extra fields (present when isBank=true)
    interestIncome?: number;           // Thu nhập lãi và các khoản tương tự
    interestExpenseBank?: number;      // Chi phí lãi và các khoản tương tự
    netInterestIncome?: number;        // Thu nhập lãi thuần (NII)
    netServiceFeeIncome?: number;      // Lãi thuần từ phí dịch vụ
    tradingFxIncome?: number;          // Lãi thuần từ kinh doanh ngoại hối
    tradingSecuritiesIncome?: number;  // Lãi thuần từ mua bán CK kinh doanh
    investmentSecuritiesIncome?: number; // Lãi thuần từ mua bán CK đầu tư
    otherOperatingIncome?: number;     // Lãi thuần từ hoạt động khác
    totalOperatingIncome?: number;     // Tổng thu nhập hoạt động (TOI)
    operatingExpenses?: number;        // Chi phí hoạt động (OPEX)
    prePpopProfit?: number;            // LN trước dự phòng (PPOP)
    provisionExpenses?: number;        // Chi phí dự phòng rủi ro tín dụng
}

export interface BalanceSheetItem {
    period: FinancialPeriod;
    totalAssets: number;
    currentAssets: number;
    cash: number;
    shortTermInvestments: number;
    shortTermReceivables: number;
    inventory: number;
    nonCurrentAssets: number;
    fixedAssets: number;
    longTermInvestments: number;
    totalLiabilities: number;
    currentLiabilities: number;
    longTermLiabilities: number;
    totalEquity: number;
    charterCapital: number;
    retainedEarnings: number;
    totalLiabilitiesAndEquity: number;
    // Banking-specific extra fields (present when isBank=true)
    loansToCustomers?: number;         // Cho vay và ứng trước khách hàng (thuần)
    loansToCustomersGross?: number;    // Cho vay KH (gộp)
    loanLossReserves?: number;         // Dự phòng rủi ro cho vay KH
    customerDeposits?: number;         // Tiền gửi của khách hàng
    sbvDeposits?: number;              // Tiền gửi tại NHNN
    interBankDeposits?: number;        // Tiền gửi tại TCTD khác
    tradingSecurities?: number;        // Chứng khoán kinh doanh
    investmentSecurities?: number;     // Chứng khoán đầu tư
    debtSecuritiesIssued?: number;     // Phát hành giấy tờ có giá
}

export interface CashFlowItem {
    period: FinancialPeriod;
    operatingCashFlow: number;
    profitBeforeTax: number;
    depreciationAmortization: number;
    provisionsAndReserves: number;
    workingCapitalChanges: number;
    interestPaid: number;
    incomeTaxPaid: number;
    investingCashFlow: number;
    purchaseOfFixedAssets: number;
    proceedsFromDisposal: number;
    investmentInSubsidiaries: number;
    financingCashFlow: number;
    proceedsFromBorrowing: number;
    repaymentOfBorrowing: number;
    dividendsPaid: number;
    proceedsFromEquity: number;
    netCashChange: number;
    beginningCash: number;
    endingCash: number;
}

export interface FinancialReportsData {
    isBank: boolean;
    industry: string;
    incomeStatement: IncomeStatementItem[];
    balanceSheet: BalanceSheetItem[];
    cashFlow: CashFlowItem[];
}

// Company Profile
export interface CompanyProfileData {
    overview: {
        ticker: string;
        companyName: string;
        companyNameFull: string;
        exchange: string;
        industry: string;
        subIndustry: string;
        sector: string;
        description: string;
        taxCode: string;
        charterCapital: number | null;
        outstandingShares: number | null;
        website: string;
    };
    shareholders: Shareholder[];
    events: { title: string; date: string; source: string; category: string }[];
    dividendHistory: Record<string, unknown>[];
}

// Stock Comparison
export interface ComparisonStock {
    ticker: string;
    companyName: string;
    exchange: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    pe: number | null;
    pb: number | null;
    roe: number | null;
    roa: number | null;
    grossMargin: number | null;
    netMargin: number | null;
    debtToEquity: number | null;
    marketCap: number | null;
    eps: number | null;
    dividendYield: number | null;
    priceHistory: PriceHistoryItem[];
}

export interface StockComparisonData {
    main: ComparisonStock;
    peers: ComparisonStock[];
}

// Deep Analysis
export interface DeepAnalysisData {
    balanceSheet: {
        overviewStats: OverviewStat[];
        healthIndicators: HealthIndicator[];
        trends: TrendYear[];
        leverageData: Record<string, unknown>[];
        liquidityData: Record<string, unknown>[];
    };
    incomeStatement: {
        overviewStats: OverviewStat[];
        dupont: DuPontFactor[];
        marginTrends: Record<string, unknown>[];
        costStructure: Record<string, unknown>[];
        growthData: Record<string, unknown>[];
        revenueBreakdown: Record<string, unknown>[];
    };
    cashFlow: {
        overviewStats: OverviewStat[];
        efficiencyMetrics: Record<string, unknown>[];
        selfFundingData: Record<string, unknown>[];
        earningsQuality: Record<string, unknown>[];
        trends: TrendYear[];
        waterfall: Record<string, unknown>[];
    };
}

export interface OverviewStat {
    label: string;
    value: string;
    subLabel: string;
    trend: string;
}

export interface HealthIndicator {
    name: string;
    value: number;
    status: string;
    description: string;
    threshold: string;
}

export interface TrendYear {
    year: number;
    totalAssets?: number | null;
    currentAssets?: number | null;
    nonCurrentAssets?: number | null;
    totalLiabilities?: number | null;
    currentLiabilities?: number | null;
    longTermLiabilities?: number | null;
    equity?: number | null;
    revenue?: number | null;
    grossProfit?: number | null;
    netProfit?: number | null;
    operatingCashFlow?: number | null;
    investingCashFlow?: number | null;
    financingCashFlow?: number | null;
}

export interface DuPontFactor {
    name: string;
    value: number;
    prior: number | null;
}

// Quant Analysis
export interface QuantAnalysisData {
    kpis: { label: string; value: number; suffix: string }[];
    wealthIndex: { date: string; value: number }[];
    monthlyReturns: { year: number; month: number; return: number }[];
    drawdownData: { date: string; value: number }[];
    rollingVolatility: { date: string; value: number }[];
    histogram: { bin: number; count: number }[];
    rollingSharpe: { date: string; value: number }[];
    varData: {
        var95: number;
        var99: number;
        cvar95: number;
        distribution: { bin: number; count: number }[];
    };
    radarMetrics: { axis: string; value: number }[];
    monteCarlo: {
        simulations: number;
        days: number;
        expectedPrice: number;
        p5: number;
        p95: number;
        percentiles: Record<string, number[]>;
        probUp: number;
    };
}

// Valuation
export interface ValuationData {
    summary: {
        intrinsicValue: number;
        currentPrice: number;
        upside: number;
        methods: { method: string; value: number }[];
    };
    dcf: {
        wacc: number;
        terminalGrowth: number;
        projections: { year: number; fcf: number; pv: number }[];
        sensitivityMatrix: number[][];
        intrinsicValue: number;
    };
    ddm: {
        intrinsicValue: number;
        dividendPerShare: number;
        costOfEquity: number;
        growthRate: number;
    };
    peBand: {
        dates: string[];
        prices: number[];
        highBand: number[];
        midBand: number[];
        lowBand: number[];
        avgBand: number[];
    };
    pbBand: {
        dates: string[];
        prices: number[];
        highBand: number[];
        midBand: number[];
        lowBand: number[];
        avgBand: number[];
    };
    peerValuation: {
        ticker: string;
        companyName: string;
        pe: number | null;
        pb: number | null;
        evEbitda: number | null;
        roe: number | null;
        marketCap: number | null;
    }[];
    footballField: {
        method: string;
        low: number;
        mid: number;
        high: number;
    }[];
}
