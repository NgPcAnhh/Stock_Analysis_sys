"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    LineChart,
    Line,
    Legend,
    AreaChart,
    Area,
    BarChart,
    Bar,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    PieChart,
    Pie,
    Cell,
    ComposedChart,
} from "recharts";
import { Plus, Trash2, Sigma, ShieldAlert, Goal, RefreshCw, BrainCircuit, Info } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type AssetInput = {
    ticker: string;
    weight: number;
    expected_return?: number;
    volatility?: number;
};

type AnalyzeResponse = {
    allocations: Array<{ ticker: string; weight: number; amount: number; expected_return: number; volatility: number }>;
    kpis: {
        expected_return: number;
        volatility: number;
        sharpe_ratio: number;
        var_95: number;
        var_95_amount: number;
        cvar_95: number;
        cvar_95_amount: number;
        lvar_95_amount: number;
        days_to_liquidate: number;
    };
    frontier: Array<{ expected_return: number; volatility: number; sharpe_ratio: number }>;
    bl_frontier: Array<{ expected_return: number; volatility: number; sharpe_ratio: number }>;
    optimal_sharpe_weights: Array<{ ticker: string; weight: number; amount: number; expected_return: number; volatility: number }>;
    monte_carlo: {
        best_case_end: number;
        median_end: number;
        worst_case_end: number;
        var_95_end: number;
        paths: Array<{ name: string; values: number[] }>;
    };
    monte_carlo_heston_bands: Array<{ day: number; p10: number; p50: number; p90: number; p95: number; p99: number }>;
    fundamentals: Array<{ ticker: string; pe: number | null; pb: number | null; roe: number | null; debt_to_equity: number | null }>;
    correlation_heatmap: { labels: string[]; values: number[][] };
    drawdown_series: Array<{ index: number; drawdown_pct: number }>;
    return_distribution: Array<{ center: number; count: number; normal_count: number }>;
    factor_risk_contribution: Array<{ name: string; exposure: number; contribution_pct: number }>;
    macro_stress_test: Array<{ scenario: string; pnl_pct: number }>;
    bl_posterior_returns: Array<{ ticker: string; implied_return: number; posterior_return: number }>;
    liquidity_tiers: Array<{ tier: string; value: number }>;
    liquidity_details: Array<{ ticker: string; adv: number; spread_estimate: number; days_to_liquidate: number }>;
};

const HEATMAP_SCALES = [
    { bg: "#7f1d1d", text: "#ffffff" },
    { bg: "#991b1b", text: "#ffffff" },
    { bg: "#dc2626", text: "#ffffff" },
    { bg: "#fca5a5", text: "#7f1d1d" },
    { bg: "#f8fafc", text: "#0f172a" },
    { bg: "#bbf7d0", text: "#14532d" },
    { bg: "#4ade80", text: "#14532d" },
    { bg: "#16a34a", text: "#ffffff" },
    { bg: "#15803d", text: "#ffffff" },
];
const PIE_COLORS = ["#16a34a", "#0ea5e9", "#f97316", "#dc2626"];

const defaultAssets: AssetInput[] = [
    { ticker: "VNM", weight: 35 },
    { ticker: "FPT", weight: 30 },
    { ticker: "VCB", weight: 20 },
    { ticker: "HPG", weight: 15 },
];

function formatPercent(v: number): string {
    return `${(v * 100).toFixed(2)}%`;
}

function formatMoney(v: number): string {
    return `${Math.round(v).toLocaleString("vi-VN")} VND`;
}

function getHeatStyle(value: number): React.CSSProperties {
    const clamped = Math.max(-1, Math.min(1, value));
    const normalized = (clamped + 1) / 2;
    const idx = Math.min(HEATMAP_SCALES.length - 1, Math.floor(normalized * HEATMAP_SCALES.length));
    const scale = HEATMAP_SCALES[idx];
    return { backgroundColor: scale.bg, color: scale.text };
}

export default function PortfolioAssumptionPage() {
    const [totalCapital, setTotalCapital] = useState<number>(1000000000);
    const [riskFreeRate, setRiskFreeRate] = useState<number>(0.04);
    const [assets, setAssets] = useState<AssetInput[]>(defaultAssets);
    const [result, setResult] = useState<AnalyzeResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");

    const totalWeight = useMemo(
        () => assets.reduce((sum, asset) => sum + (Number.isFinite(asset.weight) ? asset.weight : 0), 0),
        [assets]
    );

    const updateAsset = (index: number, patch: Partial<AssetInput>) => {
        setAssets((prev) => prev.map((asset, i) => (i === index ? { ...asset, ...patch } : asset)));
    };

    const addAsset = () => {
        setAssets((prev) => [...prev, { ticker: "", weight: 0 }]);
    };

    const removeAsset = (index: number) => {
        setAssets((prev) => prev.filter((_, i) => i !== index));
    };

    const analyze = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const payload = {
                total_capital: totalCapital,
                risk_free_rate: riskFreeRate,
                confidence_level: 0.95,
                trading_days: 252,
                simulations: 120,
                assets: assets
                    .filter((a) => a.ticker.trim().length > 0)
                    .map((a) => ({
                        ticker: a.ticker.trim().toUpperCase(),
                        weight: a.weight,
                        expected_return: a.expected_return,
                        volatility: a.volatility,
                    })),
            };

            const res = await fetch(`${API}/portfolio-assumption/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.detail || "Không thể phân tích danh mục");
            setResult(data as AnalyzeResponse);
        } catch (e: any) {
            setError(e?.message || "Đã xảy ra lỗi");
        } finally {
            setLoading(false);
        }
    }, [totalCapital, riskFreeRate, assets]);

    // Manual workflow: compute only when user clicks Analyze
    // useEffect(() => {
    //     const timer = setTimeout(() => {
    //         analyze();
    //     }, 350);
    //     return () => clearTimeout(timer);
    // }, [analyze]);

    const histogramData = useMemo(() => {
        if (!result?.return_distribution?.length) return [];
        return result.return_distribution.map((x) => ({
            bin: x.center,
            actual: x.count,
            normal: x.normal_count,
        }));
    }, [result]);

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-[1360px] mx-auto px-4 py-8 space-y-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1 text-sm font-medium">
                        <Sigma className="h-4 w-4" />
                        Giả định danh mục - Enterprise V2.0
                    </div>
                    <h1 className="text-3xl font-bold">Hệ thống Quản trị Rủi ro & Tối ưu Danh mục</h1>
                    <p className="text-muted-foreground">
                        Phân tích Black-Litterman, CVaR, L-VaR, factor attribution, stress-test và Monte Carlo Heston.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>1. Cấu hình danh mục</span>
                            <Button variant="outline" onClick={analyze} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                                {loading ? "Đang tính toán..." : "Phân tích ngay"}
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="text-sm text-muted-foreground">Tổng vốn (VND)</label>
                                <Input type="number" value={totalCapital} onChange={(e) => setTotalCapital(Number(e.target.value || 0))} />
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Lãi suất phi rủi ro (Năm)</label>
                                <Input type="number" step="0.001" value={riskFreeRate} onChange={(e) => setRiskFreeRate(Number(e.target.value || 0))} />
                            </div>
                            <div className="flex items-end">
                                <div className={`w-full rounded-md border px-3 py-2 text-sm font-medium ${Math.abs(totalWeight - 100) > 0.0001 ? "border-red-300 text-red-600 animate-pulse" : "border-emerald-300 text-emerald-600"}`}>
                                    Tổng tỷ trọng: {totalWeight.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {assets.map((asset, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                    <Input className="md:col-span-2" placeholder="Mã CP" value={asset.ticker} onChange={(e) => updateAsset(index, { ticker: e.target.value })} />
                                    <Input className="md:col-span-2" type="number" placeholder="Tỷ trọng %" value={asset.weight} onChange={(e) => updateAsset(index, { weight: Number(e.target.value || 0) })} />
                                    <Input className="md:col-span-3" type="number" step="0.001" placeholder="Lợi nhuận kỳ vọng" value={asset.expected_return ?? ""} onChange={(e) => updateAsset(index, { expected_return: e.target.value ? Number(e.target.value) : undefined })} />
                                    <Input className="md:col-span-3" type="number" step="0.001" placeholder="Độ biến động" value={asset.volatility ?? ""} onChange={(e) => updateAsset(index, { volatility: e.target.value ? Number(e.target.value) : undefined })} />
                                    <Button variant="outline" className="md:col-span-2" onClick={() => removeAsset(index)} disabled={assets.length <= 2}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Xoá
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Button variant="secondary" onClick={addAsset}>
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm tài sản
                        </Button>

                        {error && <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
                    </CardContent>
                </Card>

                {result && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <Card><CardHeader><CardTitle className="text-sm">Lợi nhuận Kỳ vọng</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatPercent(result.kpis.expected_return)}</CardContent></Card>
                            <Card><CardHeader><CardTitle className="text-sm">Độ biến động</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatPercent(result.kpis.volatility)}</CardContent></Card>
                            <Card><CardHeader><CardTitle className="text-sm">Sharpe Ratio</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{result.kpis.sharpe_ratio.toFixed(2)}</CardContent></Card>
                            <Card><CardHeader><CardTitle className="text-sm">CVaR 95%</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{formatPercent(result.kpis.cvar_95)}</CardContent></Card>
                            <Card><CardHeader><CardTitle className="text-sm">L-VaR + DTL</CardTitle></CardHeader><CardContent className="text-sm font-semibold">{formatMoney(result.kpis.lvar_95_amount)} | {result.kpis.days_to_liquidate.toFixed(2)}d</CardContent></Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>1) Ma trận Tương quan</span>
                                        <Info className="h-4 w-4 text-muted-foreground" aria-label="Đo lường mức độ đồng pha. Càng gần 1, các mã càng biến động giống nhau. Gần -1 giúp giảm thiểu rủi ro." />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-auto">
                                        <table className="w-full min-w-[460px] border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="border p-2 text-xs font-semibold text-center bg-muted">Mã CP</th>
                                                    {result.correlation_heatmap.labels.map((lbl) => (
                                                        <th key={lbl} className="border p-2 text-xs font-semibold text-center bg-muted">{lbl}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.correlation_heatmap.values.map((row, i) => (
                                                    <tr key={result.correlation_heatmap.labels[i] || i}>
                                                        <td className="border p-2 text-xs font-semibold text-center bg-muted">{result.correlation_heatmap.labels[i]}</td>
                                                        {row.map((v, j) => (
                                                            <td key={`${i}-${j}`} className="border p-2 text-xs text-center font-medium" style={getHeatStyle(v)}>
                                                                {v.toFixed(2)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>2) Mức sụt giảm Lịch sử</span>
                                        <div title="Hiển thị độ sụt giảm lớn nhất từ đỉnh (Drawdown) trong quá khứ. Giúp đánh giá rủi ro lỗ tối đa.">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={result.drawdown_series}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="index" />
                                            <YAxis />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="drawdown_pct" stroke="#dc2626" fill="#fecaca" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>3) Phân phối Lợi nhuận</span>
                                        <div title="So sánh thực tế (cột xanh) và xác suất chuẩn (đường cam). Nếu lệch hẳn sang trái, rủi ro lỗ nặng cao hơn bình thường.">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={histogramData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="bin" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="actual" fill="#60a5fa" name="Thực tế" />
                                            <Line type="monotone" dataKey="normal" stroke="#f97316" dot={false} name="Chuẩn" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>4) Nguồn gốc rủi ro theo Yếu tố</span>
                                        <div title="Phân tích rủi ro tổng thể đến từ đâu: Thị trường, Cổ phiếu Giá trị, Quy mô hay Động lượng.">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={result.factor_risk_contribution}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="contribution_pct" stackId="a" fill="#16a34a" name="% Đóng góp" />
                                            <Bar dataKey="exposure" stackId="b" fill="#f97316" name="Độ nhạy (Exposure)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>5) Sức chịu đựng Vĩ mô</span>
                                        <div title="Dự phóng danh mục sẽ tăng giảm ra sao nếu kinh tế gặp các cú sốc: Khủng hoảng, lạm phát...">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={result.macro_stress_test}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="scenario" tick={{ fontSize: 11 }} />
                                            <PolarRadiusAxis />
                                            <Radar name="PnL %" dataKey="pnl_pct" stroke="#7c3aed" fill="#a78bfa" fillOpacity={0.5} />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>6) Đường biên Lợi nhuận/Rủi ro</span>
                                        <div title="Đánh giá Lợi nhuận vs Rủi ro. Black-Litterman ổn định và an toàn hơn so với tính toán cổ điển Markowitz.">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" dataKey="volatility" name="Độ biến động" />
                                            <YAxis type="number" dataKey="expected_return" name="Lợi nhuận" />
                                            <Tooltip />
                                            <Legend />
                                            <Scatter data={result.frontier} fill="#60a5fa" name="Markowitz" />
                                            <Scatter data={result.bl_frontier} fill="#f97316" name="Black-Litterman" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>7) Cấu trúc Thanh khoản</span>
                                        <div title="Bao nhiêu % tiền nằm ở cổ phiếu dễ bán (cao), bao nhiêu nằm ở cổ phiếu khó bán (thấp).">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={result.liquidity_tiers} dataKey="value" nameKey="tier" outerRadius={110} innerRadius={56} label>
                                                {result.liquidity_tiers.map((_, index) => (
                                                    <Cell key={`tier-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any) => formatMoney(Number(value) || 0)} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span className="flex items-center gap-2"><Goal className="h-4 w-4" />8) Tỷ trọng Tối ưu</span>
                                        <div title="Tỷ trọng mua lý tưởng nhất (Weight %) và Số ngày dự kiến để bán được hết sạch (DTL).">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 max-h-80 overflow-auto">
                                    {result.optimal_sharpe_weights.map((item) => {
                                        const liq = result.liquidity_details.find((l) => l.ticker === item.ticker);
                                        return (
                                            <div key={item.ticker} className="rounded-md border p-2 text-sm flex items-center justify-between">
                                                <div>
                                                    <div className="font-semibold">{item.ticker}</div>
                                                    <div className="text-xs text-muted-foreground">Tỷ trọng {(item.weight * 100).toFixed(2)}%</div>
                                                </div>
                                                <div className="text-right text-xs">
                                                    <div>DTL {liq?.days_to_liquidate?.toFixed(2) ?? "-"} ngày</div>
                                                    <div>Spread {(liq?.spread_estimate ?? 0).toFixed(4)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span className="flex items-center gap-2"><BrainCircuit className="h-4 w-4" />9) Lợi nhuận Hậu nghiệm (Black-Litterman)</span>
                                    <div title="Lợi nhuận được chuẩn hoá lại giúp cho việc đánh giá danh mục ổn định hơn so với cách tính trung bình cổ điển.">
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-auto">
                                <table className="w-full min-w-[600px] text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-2">Mã CP</th>
                                            <th className="text-right p-2">Lợi nhuận Hàm ý</th>
                                            <th className="text-right p-2">Lợi nhuận Hậu nghiệm</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.bl_posterior_returns.map((r) => (
                                            <tr key={r.ticker} className="border-b">
                                                <td className="p-2 font-semibold">{r.ticker}</td>
                                                <td className="p-2 text-right">{formatPercent(r.implied_return)}</td>
                                                <td className="p-2 text-right text-primary font-semibold">{formatPercent(r.posterior_return)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <Footer />
        </div>
    );
}
