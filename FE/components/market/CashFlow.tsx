"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CashFlow() {
    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-800">Phân bố dòng tiền</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex h-12 w-full rounded-lg overflow-hidden font-bold text-white text-xs">
                    <div className="bg-green-500 flex items-center justify-center transition-all hover:bg-green-600 cursor-pointer" style={{ width: "55%" }}>
                        Tăng 15.2K tỷ
                    </div>
                    <div className="bg-yellow-400 flex items-center justify-center text-slate-900 transition-all hover:bg-yellow-500 cursor-pointer" style={{ width: "15%" }}>
                        2.1K
                    </div>
                    <div className="bg-red-500 flex items-center justify-center transition-all hover:bg-red-600 cursor-pointer" style={{ width: "30%" }}>
                        Giảm 8.5K tỷ
                    </div>
                </div>
                <div className="mt-4 flex justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Tăng: 245 mã</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        <span>TC: 65 mã</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>Giảm: 120 mã</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
