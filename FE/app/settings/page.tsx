"use client";

import { useState } from "react";
import {
    useSettings,
    SIDEBAR_ICON_MAP,
    DEFAULT_SIDEBAR_ITEMS,
} from "@/lib/SettingsContext";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    User,
    Moon,
    Sun,
    ChevronUp,
    ChevronDown,
    Check,
    Crown,
    Zap,
    Shield,
    BarChart2,
    LayoutGrid,
    GripVertical,
    RefreshCcw,
    Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Plan data ───────────────────────────────────────────────────────────────
const PLANS = [
    {
        id: "free",
        name: "Cơ bản",
        price: "Miễn phí",
        priceNote: "mãi mãi",
        icon: Shield,
        color: "text-muted-foreground",
        borderColor: "border-border",
        badge: null,
        features: [
            "Xem giá cổ phiếu thời gian thực",
            "Biểu đồ cơ bản (1D, 1W)",
            "Tin tức thị trường",
            "5 cổ phiếu theo dõi",
            "Dữ liệu lịch sử 3 tháng",
        ],
        disabled: ["Phân tích kỹ thuật nâng cao", "Dự báo AI/ML", "API access", "Xuất báo cáo PDF"],
    },
    {
        id: "pro",
        name: "Pro",
        price: "99.000₫",
        priceNote: "/ tháng",
        icon: Zap,
        color: "text-orange-500",
        borderColor: "border-orange-400",
        badge: "Phổ biến",
        features: [
            "Tất cả tính năng Cơ bản",
            "Biểu đồ nâng cao (1m, 5m, 15m, 1H…)",
            "Phân tích kỹ thuật đầy đủ (20+ chỉ báo)",
            "Dự báo AI/ML",
            "Unlimited danh sách theo dõi",
            "Dữ liệu lịch sử 2 năm",
            "Cảnh báo giá real-time",
            "Xuất báo cáo PDF",
        ],
        disabled: ["API access không giới hạn"],
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: "299.000₫",
        priceNote: "/ tháng",
        icon: Crown,
        color: "text-yellow-500",
        borderColor: "border-yellow-400",
        badge: "Toàn quyền",
        features: [
            "Tất cả tính năng Pro",
            "API access không giới hạn",
            "Dữ liệu lịch sử 10 năm",
            "Hỗ trợ ưu tiên 24/7",
            "Môi trường sandbox riêng",
            "Tùy chỉnh dashboard không giới hạn",
            "Báo cáo phân tích chuyên sâu",
            "Multi-account management",
        ],
        disabled: [],
    },
];


// ─── Dark Mode Switch ─────────────────────────────────────────────────────────
function DarkModeSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            className={cn(
                "relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                value ? "bg-primary" : "bg-muted-foreground/30"
            )}
        >
            <span
                className={cn(
                    "inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300",
                    value ? "translate-x-8" : "translate-x-1"
                )}
            >
                {value ? (
                    <Moon className="size-3 text-primary" />
                ) : (
                    <Sun className="size-3 text-yellow-500" />
                )}
            </span>
        </button>
    );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const {
        darkMode, setDarkMode,
        sidebarItems, moveSidebarItem, toggleSidebarItem, resetSidebarItems,
    } = useSettings();
    const { user, isAuthenticated } = useAuth();
    const [currentPlan] = useState("free");
    const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

    const handleUpgrade = (planId: string) => {
        setUpgradeSuccess(planId);
        setTimeout(() => setUpgradeSuccess(null), 3000);
    };

    const initials = user?.full_name
        ? user.full_name.split(" ").map((n) => n[0]).slice(-2).join("").toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? "?";

    const joinedDate = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })
        : null;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Cài đặt</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Quản lý tài khoản, giao diện và tùy chọn hiển thị của bạn.
                </p>
            </div>

            <Tabs defaultValue="account" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 h-11">
                    <TabsTrigger value="account" className="gap-1.5 text-xs sm:text-sm">
                        <User className="size-3.5" />
                        <span className="hidden sm:inline">Tài khoản</span>
                        <span className="sm:hidden">TK</span>
                    </TabsTrigger>
                    <TabsTrigger value="plans" className="gap-1.5 text-xs sm:text-sm">
                        <Crown className="size-3.5" />
                        <span className="hidden sm:inline">Gói dịch vụ</span>
                        <span className="sm:hidden">Gói</span>
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="gap-1.5 text-xs sm:text-sm">
                        <BarChart2 className="size-3.5" />
                        <span className="hidden sm:inline">Giao diện</span>
                        <span className="sm:hidden">Giao diện</span>
                    </TabsTrigger>
                    <TabsTrigger value="layout" className="gap-1.5 text-xs sm:text-sm">
                        <LayoutGrid className="size-3.5" />
                        <span className="hidden sm:inline">Bố cục</span>
                        <span className="sm:hidden">Bố cục</span>
                    </TabsTrigger>
                </TabsList>

                {/* ── Tab: Tài khoản ─────────────────────────────────────── */}
                <TabsContent value="account" className="space-y-4">
                    <Card className="p-6">
                        <div className="flex items-start gap-6">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                {user?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={user.avatar_url}
                                        alt="avatar"
                                        className="size-20 rounded-full object-cover border-2 border-primary/30"
                                    />
                                ) : (
                                    <div className="size-20 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/30">
                                        {initials}
                                    </div>
                                )}
                                <span className={cn(
                                    "absolute bottom-0 right-0 size-4 rounded-full border-2 border-background",
                                    isAuthenticated ? "bg-green-500" : "bg-muted-foreground/50"
                                )} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg font-semibold truncate text-foreground">
                                        {user?.full_name || "Chưa cập nhật tên"}
                                    </h2>
                                    <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="text-xs">
                                        {user?.role === "admin" ? "Quản trị viên" : "Thành viên"}
                                    </Badge>
                                    {user?.is_verified && (
                                        <Badge variant="outline" className="text-xs text-green-500 border-green-500/50">
                                            <Check className="size-3 mr-1" /> Đã xác thực
                                        </Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    <div className="space-y-0.5">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                                        <p className="font-medium truncate text-foreground">{user?.email || "—"}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Đăng nhập qua</p>
                                        <p className="font-medium capitalize text-foreground">{user?.auth_provider || "—"}</p>
                                    </div>
                                    {joinedDate && (
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Thành viên từ</p>
                                            <p className="font-medium text-foreground">{joinedDate}</p>
                                        </div>
                                    )}
                                    <div className="space-y-0.5">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Gói hiện tại</p>
                                        <p className="font-medium text-primary">Cơ bản (Miễn phí)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Bảo mật</h3>
                        <Separator />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm text-foreground">Mật khẩu</p>
                                    <p className="text-xs text-muted-foreground">Thay đổi mật khẩu đăng nhập</p>
                                </div>
                                <Button variant="outline" size="sm" disabled>Đổi mật khẩu</Button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm text-foreground">Xác thực 2 bước</p>
                                    <p className="text-xs text-muted-foreground">Tăng cường bảo mật tài khoản</p>
                                </div>
                                <Badge variant="outline" className="text-xs text-muted-foreground">Sắp ra mắt</Badge>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* ── Tab: Gói dịch vụ ──────────────────────────────────── */}
                <TabsContent value="plans" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {PLANS.map((plan) => {
                            const Icon = plan.icon;
                            const isCurrent = plan.id === currentPlan;
                            return (
                                <Card
                                    key={plan.id}
                                    className={cn(
                                        "p-6 flex flex-col gap-5 relative transition-all duration-200",
                                        isCurrent && "ring-2 ring-primary shadow-md",
                                        plan.borderColor
                                    )}
                                >
                                    {isCurrent && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-0.5 rounded-full">
                                            Gói hiện tại
                                        </span>
                                    )}
                                    {plan.badge && !isCurrent && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                                            {plan.badge}
                                        </span>
                                    )}
                                    <div className="space-y-2">
                                        <div className={cn("flex items-center gap-2", plan.color)}>
                                            <Icon className="size-5" />
                                            <span className="font-bold text-base">{plan.name}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                                            <span className="text-xs text-muted-foreground">{plan.priceNote}</span>
                                        </div>
                                    </div>
                                    <Separator />
                                    <ul className="space-y-2 flex-1">
                                        {plan.features.map((f) => (
                                            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                                                <Check className="size-3.5 text-green-500 mt-0.5 shrink-0" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                        {plan.disabled.map((f) => (
                                            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/50 line-through">
                                                <Check className="size-3.5 mt-0.5 shrink-0 opacity-30" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        className="w-full mt-2"
                                        variant={isCurrent ? "outline" : plan.id === "pro" ? "default" : "outline"}
                                        disabled={isCurrent}
                                        onClick={() => handleUpgrade(plan.id)}
                                    >
                                        {isCurrent
                                            ? "Đang sử dụng"
                                            : upgradeSuccess === plan.id
                                              ? "✓ Đã đăng ký!"
                                              : `Nâng cấp lên ${plan.name}`}
                                    </Button>
                                </Card>
                            );
                        })}
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                        Tất cả gói đều bao gồm 7 ngày dùng thử miễn phí. Hủy bất kỳ lúc nào.
                    </p>
                </TabsContent>

                {/* ── Tab: Giao diện ────────────────────────────────────── */}
                <TabsContent value="appearance" className="space-y-4">
                    {/* Dark mode toggle */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    {darkMode ? <Moon className="size-4 text-primary" /> : <Sun className="size-4 text-yellow-500" />}
                                    <h3 className="font-semibold text-foreground">Chế độ tối</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Chuyển đổi giữa giao diện sáng và tối. Thay đổi áp dụng ngay, lưu vĩnh viễn.
                                </p>
                                <Badge variant="outline" className="text-xs w-fit text-foreground">
                                    {darkMode ? "Đang bật — Dark mode" : "Đang tắt — Light mode"}
                                </Badge>
                            </div>
                            <DarkModeSwitch value={darkMode} onChange={setDarkMode} />
                        </div>
                    </Card>

                </TabsContent>

                {/* ── Tab: Bố cục — Sidebar nav items ──────────────────── */}
                <TabsContent value="layout" className="space-y-4">
                    <Card className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-foreground">Menu điều hướng (Sidebar)</h3>
                                <p className="text-sm text-muted-foreground">
                                    Ẩn/hiện và sắp xếp thứ tự các mục trong sidebar. Thay đổi lưu tự động.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={resetSidebarItems} className="gap-1.5 shrink-0">
                                <RefreshCcw className="size-3.5" />
                                Đặt lại
                            </Button>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            {sidebarItems.map((item, index) => {
                                const IconComponent = SIDEBAR_ICON_MAP[item.iconName];
                                const isPinned = item.id === "settings";
                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-150",
                                            item.enabled
                                                ? "bg-card hover:bg-muted/40"
                                                : "bg-muted/20 opacity-60"
                                        )}
                                    >
                                        <GripVertical className="size-4 text-muted-foreground/40 shrink-0" />

                                        {/* Order number */}
                                        <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                            {index + 1}
                                        </span>

                                        {/* Icon */}
                                        {IconComponent && (
                                            <IconComponent className={cn(
                                                "size-4 shrink-0",
                                                item.enabled ? "text-foreground" : "text-muted-foreground"
                                            )} />
                                        )}

                                        {/* Label + pinned badge */}
                                        <span className={cn(
                                            "flex-1 text-sm font-medium",
                                            !item.enabled && "line-through text-muted-foreground",
                                            item.enabled && "text-foreground"
                                        )}>
                                            {item.name}
                                        </span>

                                        {isPinned && (
                                            <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                                                <Pin className="size-2.5" /> Cố định
                                            </Badge>
                                        )}

                                        {/* Toggle */}
                                        <button
                                            onClick={() => toggleSidebarItem(item.id)}
                                            disabled={isPinned}
                                            title={isPinned ? "Mục này không thể ẩn" : item.enabled ? "Ẩn khỏi sidebar" : "Hiện trong sidebar"}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed",
                                                item.enabled ? "bg-primary" : "bg-muted-foreground/30"
                                            )}
                                        >
                                            <span className={cn(
                                                "inline-block size-3.5 transform rounded-full bg-white shadow-sm transition-transform",
                                                item.enabled ? "translate-x-4" : "translate-x-1"
                                            )} />
                                        </button>

                                        {/* Move up/down */}
                                        <div className="flex flex-col gap-0.5 shrink-0">
                                            <button
                                                onClick={() => moveSidebarItem(index, index - 1)}
                                                disabled={index === 0}
                                                className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronUp className="size-3.5" />
                                            </button>
                                            <button
                                                onClick={() => moveSidebarItem(index, index + 1)}
                                                disabled={index === sidebarItems.length - 1}
                                                className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronDown className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Mục <span className="font-medium text-foreground">Cài đặt</span> luôn hiển thị và không thể ẩn.
                        </p>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
