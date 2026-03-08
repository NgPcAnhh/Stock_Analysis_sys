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

export default function Home() {
    const [activeTicker, setActiveTicker] = useState("VNINDEX");
    const { isAuthenticated, openAuthModal } = useAuth();

    const scrollToMarket = () => {
        document.getElementById('market-overview')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen relative bg-background">
            {/* Ambient Background Glows */}
            {!isAuthenticated && (
                <div className="absolute top-0 w-full h-[800px] overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen opacity-60"></div>
                    <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] mix-blend-screen opacity-50"></div>
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
                        Làm chủ thị trường với chứng khoán <span className="text-primary bg-none">StockPro</span>
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
                                Dữ liệu dòng tiền của StockPro được bóc tách sâu sắc theo từng nhóm ngành và mã cổ phiếu riêng lẻ, giúp bạn nhận diện cơ hội trước bờ vực bùng nổ của thị trường.
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
                        Tham gia cùng hàng ngàn nhà đầu tư khác sử dụng StockPro để phân tích và ra quyết định.
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

