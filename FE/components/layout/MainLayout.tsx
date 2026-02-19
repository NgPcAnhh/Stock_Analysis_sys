"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { StockTicker } from "./StockTicker";
import { cn } from "@/lib/utils";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

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
                <main className="flex-1 overflow-y-auto scroll-smooth bg-muted/20">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
