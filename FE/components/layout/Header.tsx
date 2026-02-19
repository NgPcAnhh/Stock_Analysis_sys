"use client";

import {
    Search,
    Bell,
    User,
    ChevronDown,
    Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
    onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-1 items-center gap-4">
                <button className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-md" onClick={onMenuClick}>
                    <Menu className="h-6 w-6" />
                </button>
                <div className="relative w-full max-w-md hidden md:flex">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Tìm kiếm mã cổ phiếu, tin tức..."
                        className="w-full rounded-full bg-muted/50 px-9 py-2 text-sm outline-hidden focus:bg-background focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/20 transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                </Button>

                <div className="flex items-center gap-2 pl-2 border-l border-border/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        AD
                    </div>
                    <div className="hidden md:block text-sm">
                        <p className="font-medium leading-none">Admin</p>
                        <p className="text-xs text-muted-foreground">Pro Plan</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>
        </header>
    );
}
