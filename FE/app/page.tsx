"use client";

import { useState } from "react";
import { MarketIndexCards } from "@/components/dashboard/MarketIndexCards";
import { MainMarketChart } from "@/components/dashboard/MainMarketChart";
import { SectorPerformance } from "@/components/dashboard/SectorPerformance";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { MarketComparisonTable } from "@/components/dashboard/MarketComparisonTable";
import { MarketHeatmap } from "@/components/dashboard/MarketHeatmap";
import { ValuationChart } from "@/components/charts/ValuationChart";
import { LiquidityChart } from "@/components/charts/LiquidityChart";
import { TopStocks } from "@/components/dashboard/TopStocks";
import { MacroData } from "@/components/dashboard/MacroData";
import { NewsSection } from "@/components/dashboard/NewsSection";
import { Footer } from "@/components/layout/Footer";
import { BarChart3, TrendingUp, ChevronDown, Rocket, Activity, LineChart, Newspaper, ArrowRight, Database, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { PriceBoardPopup } from "@/components/dashboard/PriceBoardPopup";

export default function Home() {
    const [activeTicker, setActiveTicker] = useState("VNINDEX");
    const { isAuthenticated, openAuthModal } = useAuth();

    const scrollToMarket = () => {
        document.getElementById('market-overview')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen relative bg-background">
            {isAuthenticated && <PriceBoardPopup />}

            {/* Ambient Background Glows */}
            {!isAuthenticated && (
                <div className="absolute top-0 w-full h-[800px] overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen opacity-60"></div>
                    <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] mix-blend-screen opacity-50"></div>

                    {/* Faint stock chart watermark */}
                    <svg
                        viewBox="0 0 1400 800"
                        className="absolute inset-0 w-full h-full opacity-[0.11]"
                        preserveAspectRatio="xMidYMid slice"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
                                <stop offset="65%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Horizontal grid lines */}
                        <line x1="0" y1="120" x2="1400" y2="120" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.35" />
                        <line x1="0" y1="240" x2="1400" y2="240" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.35" />
                        <line x1="0" y1="360" x2="1400" y2="360" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.35" />
                        <line x1="0" y1="480" x2="1400" y2="480" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.35" />
                        <line x1="0" y1="600" x2="1400" y2="600" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.35" />
                        {/* Vertical grid lines */}
                        <line x1="200" y1="0" x2="200" y2="680" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.2" />
                        <line x1="400" y1="0" x2="400" y2="680" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.2" />
                        <line x1="600" y1="0" x2="600" y2="680" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.2" />
                        <line x1="800" y1="0" x2="800" y2="680" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.2" />
                        <line x1="1000" y1="0" x2="1000" y2="680" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.2" />
                        <line x1="1200" y1="0" x2="1200" y2="680" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeOpacity="0.2" />

                        {/* Area chart fill */}
                        <path
                            d="M0,520 L40,505 L80,488 L120,500 L160,480 L200,462 L240,475 L280,452 L320,435 L360,450 L400,428 L440,408 L480,422 L520,398 L560,378 L600,392 L640,365 L680,345 L720,358 L760,332 L800,312 L840,326 L880,298 L920,278 L960,292 L1000,268 L1040,248 L1080,262 L1120,235 L1160,215 L1200,228 L1240,202 L1280,182 L1320,195 L1360,168 L1400,148 L1400,680 L0,680 Z"
                            fill="url(#heroChartGrad)"
                        />

                        {/* Main price line */}
                        <polyline
                            points="0,520 40,505 80,488 120,500 160,480 200,462 240,475 280,452 320,435 360,450 400,428 440,408 480,422 520,398 560,378 600,392 640,365 680,345 720,358 760,332 800,312 840,326 880,298 920,278 960,292 1000,268 1040,248 1080,262 1120,235 1160,215 1200,228 1240,202 1280,182 1320,195 1360,168 1400,148"
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="2.5"
                            strokeOpacity="0.9"
                            strokeLinejoin="round"
                        />

                        {/* Moving average line (dashed) */}
                        <polyline
                            points="0,535 160,492 320,450 480,428 640,372 800,318 960,285 1120,242 1280,188 1400,155"
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="1.5"
                            strokeDasharray="12,6"
                            strokeOpacity="0.45"
                        />

                        {/* Bullish candlestick bodies */}
                        <g fill="hsl(var(--primary))" fillOpacity="0.55">
                            <rect x="30" y="498" width="20" height="18" rx="1" />
                            <rect x="150" y="472" width="20" height="18" rx="1" />
                            <rect x="270" y="444" width="20" height="18" rx="1" />
                            <rect x="430" y="400" width="20" height="18" rx="1" />
                            <rect x="630" y="357" width="20" height="18" rx="1" />
                            <rect x="750" y="324" width="20" height="18" rx="1" />
                            <rect x="870" y="290" width="20" height="18" rx="1" />
                            <rect x="1030" y="240" width="20" height="18" rx="1" />
                            <rect x="1150" y="207" width="20" height="18" rx="1" />
                            <rect x="1350" y="160" width="20" height="18" rx="1" />
                        </g>
                        {/* Bullish wicks */}
                        <g stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.5">
                            <line x1="40" y1="490" x2="40" y2="522" />
                            <line x1="160" y1="464" x2="160" y2="496" />
                            <line x1="280" y1="436" x2="280" y2="468" />
                            <line x1="440" y1="392" x2="440" y2="424" />
                            <line x1="640" y1="349" x2="640" y2="381" />
                            <line x1="760" y1="316" x2="760" y2="348" />
                            <line x1="880" y1="282" x2="880" y2="314" />
                            <line x1="1040" y1="232" x2="1040" y2="264" />
                            <line x1="1160" y1="199" x2="1160" y2="231" />
                            <line x1="1360" y1="152" x2="1360" y2="184" />
                        </g>

                        {/* Bearish candlestick bodies */}
                        <g fill="hsl(var(--destructive))" fillOpacity="0.45">
                            <rect x="110" y="482" width="20" height="22" rx="1" />
                            <rect x="230" y="466" width="20" height="22" rx="1" />
                            <rect x="350" y="432" width="20" height="22" rx="1" />
                            <rect x="550" y="370" width="20" height="22" rx="1" />
                            <rect x="710" y="340" width="20" height="22" rx="1" />
                            <rect x="950" y="272" width="20" height="22" rx="1" />
                            <rect x="1200" y="218" width="20" height="22" rx="1" />
                            <rect x="1310" y="186" width="20" height="22" rx="1" />
                        </g>
                        {/* Bearish wicks */}
                        <g stroke="hsl(var(--destructive))" strokeWidth="1.5" strokeOpacity="0.4">
                            <line x1="120" y1="474" x2="120" y2="510" />
                            <line x1="240" y1="458" x2="240" y2="494" />
                            <line x1="360" y1="424" x2="360" y2="460" />
                            <line x1="560" y1="362" x2="560" y2="398" />
                            <line x1="720" y1="332" x2="720" y2="368" />
                            <line x1="960" y1="264" x2="960" y2="300" />
                            <line x1="1210" y1="210" x2="1210" y2="246" />
                            <line x1="1320" y1="178" x2="1320" y2="214" />
                        </g>

                        {/* Volume bars — green */}
                        <g fill="hsl(var(--primary))" fillOpacity="0.35">
                            <rect x="0" y="653" width="35" height="27" rx="1" />
                            <rect x="40" y="656" width="35" height="24" rx="1" />
                            <rect x="80" y="648" width="35" height="32" rx="1" />
                            <rect x="160" y="657" width="35" height="23" rx="1" />
                            <rect x="240" y="650" width="35" height="30" rx="1" />
                            <rect x="280" y="654" width="35" height="26" rx="1" />
                            <rect x="360" y="658" width="35" height="22" rx="1" />
                            <rect x="440" y="647" width="35" height="33" rx="1" />
                            <rect x="480" y="655" width="35" height="25" rx="1" />
                            <rect x="520" y="652" width="35" height="28" rx="1" />
                            <rect x="600" y="657" width="35" height="23" rx="1" />
                            <rect x="640" y="648" width="35" height="32" rx="1" />
                            <rect x="760" y="653" width="35" height="27" rx="1" />
                            <rect x="800" y="646" width="35" height="34" rx="1" />
                            <rect x="880" y="656" width="35" height="24" rx="1" />
                            <rect x="920" y="651" width="35" height="29" rx="1" />
                            <rect x="1000" y="654" width="35" height="26" rx="1" />
                            <rect x="1040" y="648" width="35" height="32" rx="1" />
                            <rect x="1120" y="656" width="35" height="24" rx="1" />
                            <rect x="1160" y="650" width="35" height="30" rx="1" />
                            <rect x="1240" y="647" width="35" height="33" rx="1" />
                            <rect x="1280" y="654" width="35" height="26" rx="1" />
                            <rect x="1360" y="649" width="35" height="31" rx="1" />
                        </g>
                        {/* Volume bars — red */}
                        <g fill="hsl(var(--destructive))" fillOpacity="0.3">
                            <rect x="120" y="658" width="35" height="22" rx="1" />
                            <rect x="200" y="651" width="35" height="29" rx="1" />
                            <rect x="320" y="655" width="35" height="25" rx="1" />
                            <rect x="400" y="649" width="35" height="31" rx="1" />
                            <rect x="560" y="656" width="35" height="24" rx="1" />
                            <rect x="680" y="652" width="35" height="28" rx="1" />
                            <rect x="720" y="658" width="35" height="22" rx="1" />
                            <rect x="840" y="650" width="35" height="30" rx="1" />
                            <rect x="960" y="655" width="35" height="25" rx="1" />
                            <rect x="1080" y="651" width="35" height="29" rx="1" />
                            <rect x="1200" y="658" width="35" height="22" rx="1" />
                            <rect x="1320" y="653" width="35" height="27" rx="1" />
                        </g>
                    </svg>
                </div>
            )}

            {/* HERO SECTION - Only show if not logged in */}
            {!isAuthenticated && (
                <section className="relative px-6 pt-32 pb-24 mx-auto max-w-7xl flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse w-2 h-2"></span>
                        Nền tảng phân tích thế hệ mới
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/70 mb-8 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        Làm chủ thị trường với chứng khoán <span className="text-primary bg-none">FinVision</span>
                    </h1>

                    <p className="text-xl text-muted-foreground mb-12 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
                        Cung cấp dữ liệu theo thời gian thực, biểu đồ chuyên sâu và các công cụ phân tích toàn diện giúp bạn đưa ra quyết định đầu tư chính xác nhất.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
                        <Button size="lg" className="h-14 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform" onClick={scrollToMarket}>
                            Khám phá thị trường ngay <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="lg" className="h-14 px-8 text-base font-semibold border-border bg-background/50 backdrop-blur hover:bg-muted">
                            Mở tài khoản
                        </Button>
                    </div>

                    {/* Features Scroll Down Indicator */}
                    <div className="mt-24 text-muted-foreground animate-bounce cursor-pointer flex flex-col items-center" onClick={scrollToMarket}>
                        <span className="text-sm font-medium mb-2 opacity-70">Cuộn để xem</span>
                        <ChevronDown className="h-5 w-5 opacity-70" />
                    </div>
                </section>
            )}

            {/* SIGNATURE FEATURES */}
            {!isAuthenticated && (
                <section className="py-20 bg-muted/30 border-y border-border/50">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                {
                                    icon: BarChart3,
                                    title: "Thị trường toàn diện",
                                    desc: "Góc nhìn toàn cảnh về dòng tiền, mức biến động và bản đồ nhiệt của các nhóm ngành."
                                },
                                {
                                    icon: Activity,
                                    title: "Chỉ số & Bảng điện",
                                    desc: "Cập nhật real-time các chỉ mục VN-Index, HNX, UPCoM cùng bảng điện siêu tốc."
                                },
                                {
                                    icon: LineChart,
                                    title: "Phân tích Cổ phiếu",
                                    desc: "Dữ liệu chuyên sâu về từng mã cổ phiếu, định giá doanh nghiệp và hồ sơ công ty."
                                },
                                {
                                    icon: Newspaper,
                                    title: "Tin tức Tài chính",
                                    desc: "Tổng hợp tin tức kinh tế, sự kiện doanh nghiệp và biến động vĩ mô liên tục."
                                }
                            ].map((feature, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                        <feature.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* DASHBOARD CONTENT INTEGRATION */}
            <div className={`px-6 mx-auto max-w-7xl space-y-24 ${isAuthenticated ? 'py-8' : 'py-24'}`}>

                {/* Section 1: Toàn cảnh */}
                <section id="market-overview" className={`${!isAuthenticated ? 'scroll-mt-32' : ''}`}>
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-primary" /> Toàn cảnh thị trường
                        </h2>
                        <p className="text-muted-foreground mt-2">Theo dõi sát sao diễn biến các chỉ số quan trọng trong phiên</p>
                    </div>

                    <MarketIndexCards
                        activeIndex={activeTicker}
                        onIndexSelect={(id) => setActiveTicker(id)}
                    />

                    <div className="mt-8 mb-8 p-2 rounded-2xl bg-card">
                        <MainMarketChart ticker={activeTicker} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="p-2 rounded-2xl bg-card flex flex-col h-[400px]">
                            <MarketBreadth />
                        </div>
                        <div className="h-[400px] p-2 rounded-2xl bg-card overflow-hidden">
                            <MarketComparisonTable />
                        </div>
                    </div>
                </section>

                {/* Inline Product Introduction Feature Banner (Between sections 1 & 2) */}
                {!isAuthenticated && (
                    <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-8 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-full bg-primary/10 blur-[80px] rounded-full -z-10"></div>
                        <div className="max-w-xl">
                            <h3 className="text-2xl lg:text-3xl font-bold mb-4 flex items-center gap-3">
                                <Rocket className="h-8 w-8 text-primary" /> Phân tích dòng tiền thông minh
                            </h3>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Dữ liệu dòng tiền của FinVision được bóc tách sâu sắc theo từng nhóm ngành và mã cổ phiếu riêng lẻ, giúp bạn nhận diện cơ hội trước bờ vực bùng nổ của thị trường.
                            </p>
                        </div>
                        <Button size="lg" className="shrink-0 h-12 px-8 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 transition-transform" onClick={openAuthModal}>
                            Trải nghiệm công cụ
                        </Button>
                    </section>
                )}

                {/* Section 2: Dòng tiền & Cổ phiếu */}
                <section>
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <BarChart3 className="h-8 w-8 text-primary" /> Dòng tiền thị trường
                        </h2>
                        <p className="text-muted-foreground mt-2">Phân tích dòng tiền các nhóm ngành và cổ phiếu dẫn dắt</p>
                    </div>

                    <div className="h-[550px] p-2 rounded-2xl bg-card mb-8">
                        <MarketHeatmap />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="h-[400px] p-2 rounded-2xl bg-card">
                            <SectorPerformance />
                        </div>
                        <div className="h-[400px] p-2 rounded-2xl bg-card">
                            <TopStocks />
                        </div>
                    </div>
                </section>

                {/* Inline Product Introduction Banner (Between sections 2 & 3) */}
                {!isAuthenticated && (
                    <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-500/10 via-primary/5 to-background border border-blue-500/20 p-8 lg:p-12 flex flex-col lg:flex-row-reverse items-center justify-between gap-8 mt-8 mb-8">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-full bg-blue-500/10 blur-[80px] rounded-full -z-10"></div>
                        <div className="max-w-xl text-left lg:text-right">
                            <h3 className="text-2xl lg:text-3xl font-bold mb-4 flex items-center lg:justify-end gap-3">
                                Khám phá định giá thị trường <Globe className="h-8 w-8 text-blue-500" />
                            </h3>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Nắm bắt cơ hội đầu tư thông qua hệ thống phân tích định giá P/E, P/B chuyên sâu và tự tin đối chiếu sức hấp dẫn của chứng khoán Việt Nam so với thị trường quốc tế.
                            </p>
                        </div>
                        <Button variant="outline" size="lg" className="shrink-0 h-12 px-8 shadow-sm hover:scale-105 transition-transform" onClick={openAuthModal}>
                            Tìm hiểu thêm
                        </Button>
                    </section>
                )}

                {/* Section 3: Định giá & Quốc tế */}
                <section>
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            <Database className="h-8 w-8 text-primary" /> Định giá & Chỉ số
                        </h2>
                        <p className="text-muted-foreground mt-2">Đánh giá mức độ hấp dẫn của thị trường Việt Nam</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="h-[400px] p-2 rounded-2xl bg-card">
                            <ValuationChart />
                        </div>
                        <div className="h-[400px] p-2 rounded-2xl bg-card">
                            <LiquidityChart />
                        </div>
                    </div>

                    <div className="p-2 rounded-2xl bg-card">
                        <MacroData />
                    </div>
                </section>

                {/* Section 4: Tin tức */}
                <section>
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold mb-2">Tin tức nổi bật</h2>
                        <p className="text-muted-foreground">Cập nhật tin tức kinh tế tài chính mới nhất</p>
                    </div>
                    <div className="p-2 rounded-2xl bg-card">
                        <NewsSection />
                    </div>
                </section>

            </div>

            {/* Bottom CTA */}
            {!isAuthenticated && (
                <section className="py-24 relative overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute inset-0 bg-primary/5 -z-10"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-full bg-primary/10 blur-[100px] rounded-full -z-10"></div>

                    <h2 className="text-4xl font-bold mb-6">Sẵn sàng nâng tầm đầu tư?</h2>
                    <p className="text-xl text-muted-foreground mb-10 max-w-xl">
                        Tham gia cùng hàng ngàn nhà đầu tư khác sử dụng FinVision để phân tích và ra quyết định.
                    </p>
                    <Button size="lg" className="h-14 px-10 text-lg font-bold shadow-xl shadow-primary/25 hover:-translate-y-1 transition-transform" onClick={openAuthModal}>
                        Đăng ký miễn phí ngay
                    </Button>
                </section>
            )}

            <Footer />
        </div>
    );
}

