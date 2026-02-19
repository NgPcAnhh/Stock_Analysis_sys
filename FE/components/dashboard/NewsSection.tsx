"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock } from "lucide-react";

const news = [
    {
        id: 1,
        title: "Ngân hàng Nhà nước hút ròng 15.000 tỷ đồng qua kênh tín phiếu",
        source: "VnEconomy",
        time: "30 phút trước",
        image: "https://images.unsplash.com/photo-1611974765270-ca12586343bb?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZmluYW5jZXxlbnwwfHwwfHx8MA%3D%3D",
        category: "Vĩ mô"
    },
    {
        id: 2,
        title: "Vinhomes (VHM) dự kiến mở bán dự án mới tại Hải Phòng vào Q2/2024",
        source: "Cafef",
        time: "1 giờ trước",
        image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnVpbGRpbmd8ZW58MHx8MHx8fDA%3D",
        category: "Doanh nghiệp"
    },
    {
        id: 3,
        title: "Giá thép xây dựng tiếp tục đà giảm, doanh nghiệp thép gặp khó",
        source: "NguoiDongHanh",
        time: "2 giờ trước",
        image: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGluZHVzdHJ5fGVufDB8fDB8fHww",
        category: "Hàng hóa"
    },
    {
        id: 4,
        title: "Chứng khoán Mỹ lập đỉnh mới: S&P 500 vượt mốc 5.100 điểm",
        source: "Bloomberg",
        time: "3 giờ trước",
        image: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y2hhcnR8ZW58MHx8MHx8fDA%3D",
        category: "Quốc tế"
    }
];

export function NewsSection() {
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
                        <div className="aspect-video w-full overflow-hidden">
                            <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <Badge variant="secondary" className="text-xs font-normal">
                                    {item.category}
                                </Badge>
                                <div className="flex items-center text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {item.time}
                                </div>
                            </div>
                            <h3 className="font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                {item.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-2">{item.source}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
