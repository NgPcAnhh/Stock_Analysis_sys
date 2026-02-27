"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, ExternalLink, Newspaper } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface NewsItemData {
    id: number;
    title: string | null;
    source: string | null;
    published: string | null;
    summary: string | null;
    link: string | null;
}

function formatDate(isoDate: string | null): string {
    if (!isoDate) return "";
    try {
        const d = new Date(isoDate);
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const yyyy = d.getUTCFullYear();
        return `${dd}/${mm}/${yyyy}`;
    } catch {
        return "";
    }
}

// Static fallback news data so component works without backend
const FALLBACK_NEWS: NewsItemData[] = [
    { id: 1, title: "Thị trường chứng khoán Việt Nam tăng điểm phiên đầu tuần", source: "VnExpress", published: "2026-02-20T09:00:00Z", summary: "VN-Index tăng hơn 10 điểm trong phiên giao dịch đầu tuần nhờ lực kéo từ nhóm ngân hàng và bất động sản.", link: null },
    { id: 2, title: "Fed giữ nguyên lãi suất, tác động tới dòng vốn ngoại", source: "CafeF", published: "2026-02-19T14:30:00Z", summary: "Cục Dự trữ Liên bang Mỹ quyết định giữ nguyên lãi suất trong cuộc họp tháng 2.", link: null },
    { id: 3, title: "Nhóm cổ phiếu ngân hàng dẫn dắt thị trường", source: "VietStock", published: "2026-02-18T10:00:00Z", summary: "Nhiều mã ngân hàng lớn đồng loạt tăng giá, giúp VN-Index vượt mốc 1.250 điểm.", link: null },
    { id: 4, title: "Dòng tiền khối ngoại quay trở lại mua ròng", source: "TCBS", published: "2026-02-17T08:00:00Z", summary: "Khối ngoại mua ròng hơn 500 tỷ đồng trên sàn HOSE trong tuần qua.", link: null },
];

export function NewsSection() {
    const [news, setNews] = useState<NewsItemData[]>(FALLBACK_NEWS);
    const [loading, setLoading] = useState(false);

    // Optionally try to fetch from backend; fall back to static data on failure
    useEffect(() => {
        fetch(`${API_BASE}/api/v1/tong-quan/news?limit=8`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    setNews(data);
                }
            })
            .catch(() => {
                // Keep fallback data, no error shown
            });
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">Tin tức mới nhất</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="overflow-hidden animate-pulse">
                            <div className="h-32 bg-muted" />
                            <CardContent className="p-4 space-y-2">
                                <div className="h-4 bg-muted rounded w-3/4" />
                                <div className="h-3 bg-muted rounded w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight">Tin tức mới nhất</h2>
                <Link href="/news" className="text-sm font-medium text-primary hover:underline">
                    Xem tất cả
                </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {news.map((item) => (
                    <Card key={item.id} className="overflow-hidden group cursor-pointer hover:shadow-md transition-all">
                        {/* Placeholder visual header since DB has no image */}
                        <div className="h-28 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                            <Newspaper className="h-10 w-10 text-primary/30" />
                        </div>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <Badge variant="secondary" className="text-xs font-normal">
                                    {item.source || "Tin tức"}
                                </Badge>
                                <div className="flex items-center text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatDate(item.published)}
                                </div>
                            </div>
                            {item.link ? (
                                <a href={item.link} target="_blank" rel="noopener noreferrer">
                                    <h3 className="font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                        {item.title}
                                    </h3>
                                </a>
                            ) : (
                                <h3 className="font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                    {item.title}
                                </h3>
                            )}
                            {item.summary && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                    {item.summary}
                                </p>
                            )}
                            {item.link && (
                                <div className="flex items-center text-xs text-primary/70 mt-2 gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Đọc thêm</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
