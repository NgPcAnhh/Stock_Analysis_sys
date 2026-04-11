"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { StockTicker } from "./StockTicker";
import ScrollToTopButton from "./ScrollToTopButton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useSessionTracking, usePageViewTracking, useErrorTracking } from "@/hooks/useTracking";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);

    const { isAuthenticated, isLoading, user, openAuthModal } = useAuth();

    // Theo dõi thời gian phiên làm việc
    useSessionTracking(user?.id);
    // Tự động track page view khi route thay đổi
    usePageViewTracking(user?.id);
    // Tự động bắt lỗi JS runtime & promise rejections
    useErrorTracking(user?.id);

    // Route Protection Guard
    useEffect(() => {
        if (!isLoading && !isAuthenticated && pathname !== "/") {
            // Bỏ qua chặn các route public khác nếu có
            if (!pathname.startsWith("/auth/callback") && !pathname.startsWith("/reset-password")) {
                router.push("/");
                openAuthModal();
            }
        }
    }, [isLoading, isAuthenticated, pathname, router, openAuthModal]);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar - Hidden on mobile, visible on lg */}
            <div className="hidden lg:block transition-all duration-300 ease-in-out">
                <Sidebar
                    collapsed={isCollapsed}
                    onToggle={() => setIsCollapsed(!isCollapsed)}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar - Fixed position */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden bg-sidebar border-r border-sidebar-border shadow-lg",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <Sidebar className="h-full w-full border-none" />
            </div>

            <div className="flex flex-col flex-1 overflow-hidden w-full transition-all duration-300">
                <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
                {pathname === "/" && <StockTicker />}
                <main data-scroll-root="app" className="flex-1 overflow-y-auto scroll-smooth bg-muted/20">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>

            <ScrollToTopButton />
        </div>
    );
}
