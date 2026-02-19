"use client";

import {
    LayoutDashboard,
    BarChart2,
    LineChart,
    PieChart,
    Newspaper,
    Activity,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Monitor,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Tổng quan", href: "/", icon: LayoutDashboard },
    { name: "Thị trường", href: "/market", icon: BarChart2 },
    { name: "Bảng điện", href: "/price-board", icon: Monitor },
    { name: "Cổ phiếu", href: "/stocks", icon: LineChart },
    { name: "Phân tích", href: "/analysis", icon: PieChart },
    { name: "Tin tức", href: "/news", icon: Newspaper },
    { name: "Chỉ số", href: "/indices", icon: Activity },
    { name: "Cài đặt", href: "/settings", icon: Settings },
];

interface SidebarProps {
    className?: string;
    collapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ className, collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();

    return (
        <div className={cn(
            "flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
            collapsed ? "w-20" : "w-64",
            className
        )}>
            <div className={cn(
                "flex h-16 items-center border-b border-sidebar-border/50",
                collapsed ? "justify-center px-0" : "px-6 justify-between"
            )}>
                <div className="flex items-center gap-2 font-bold text-xl text-primary overflow-hidden">
                    <div className="h-8 w-8 min-w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                        V
                    </div>
                    {!collapsed && <span className="whitespace-nowrap transition-opacity duration-300">VNStock</span>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
                <nav className="grid gap-1 px-3">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative group",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                                    collapsed && "justify-center px-0"
                                )}
                                title={collapsed ? item.name : undefined}
                            >
                                <item.icon className="h-5 w-5 min-w-5" />
                                {!collapsed && <span className="whitespace-nowrap transition-opacity duration-300">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="border-t border-sidebar-border/50 p-4 flex flex-col gap-2">
                <button
                    onClick={onToggle}
                    className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors",
                        collapsed && "justify-center px-0"
                    )}
                >
                    {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    {!collapsed && <span>Thu gọn</span>}
                </button>

                <button className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors",
                    collapsed && "justify-center px-0"
                )}>
                    <LogOut className="h-5 w-5" />
                    {!collapsed && <span>Đăng xuất</span>}
                </button>
            </div>
        </div>
    );
}
