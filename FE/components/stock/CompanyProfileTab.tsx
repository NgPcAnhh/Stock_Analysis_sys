"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockDetail } from "@/lib/StockDetailContext";
import {
    getCompanyProfileData,
    type BoardMember,
    type Subsidiary,
    type Milestone,
    type DividendHistory,
    type CompanyOverview,
} from "@/lib/companyProfileData";
import {
    Building2,
    Globe,
    Phone,
    Mail,
    MapPin,
    Users,
    CalendarDays,
    Landmark,
    ShieldCheck,
    TrendingUp,
    ExternalLink,
    Banknote,
    Factory,
    Award,
    GitBranch,
    CircleDot,
} from "lucide-react";

// ==================== HELPER COMPONENTS ====================

function SectionHeading({
    icon: Icon,
    title,
    color,
}: {
    icon: React.ElementType;
    title: string;
    color: string;
}) {
    const colorMap: Record<string, string> = {
        blue: "text-blue-600 bg-blue-50 border-blue-200",
        green: "text-green-600 bg-green-50 border-green-200",
        amber: "text-amber-600 bg-amber-50 border-amber-200",
        purple: "text-purple-600 bg-purple-50 border-purple-200",
        red: "text-red-600 bg-red-50 border-red-200",
        cyan: "text-cyan-600 bg-cyan-50 border-cyan-200",
    };
    const cls = colorMap[color] || colorMap.blue;
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cls}`}>
            <Icon className="w-4 h-4" />
            <span className="font-semibold text-sm">{title}</span>
        </div>
    );
}

function InfoRow({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
    return (
        <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0">
            <span className="text-xs text-gray-500 w-2/5">{label}</span>
            <span className={`text-xs font-medium text-gray-800 text-right w-3/5 ${mono ? "font-mono" : ""}`}>
                {value}
            </span>
        </div>
    );
}

function Badge({ text, variant }: { text: string; variant: "blue" | "green" | "amber" | "red" | "gray" }) {
    const cls: Record<string, string> = {
        blue: "bg-blue-50 text-blue-700 border-blue-200",
        green: "bg-green-50 text-green-700 border-green-200",
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        red: "bg-red-50 text-red-700 border-red-200",
        gray: "bg-gray-50 text-gray-600 border-gray-200",
    };
    return (
        <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${cls[variant]}`}>
            {text}
        </span>
    );
}

// ====================== SECTIONS ==========================

function CompanyOverviewSection({ data }: { data: CompanyOverview }) {
    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Giới thiệu chung
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Description */}
                <p className="text-xs text-gray-600 leading-relaxed">{data.description}</p>

                {/* Key info grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left card */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Thông tin doanh nghiệp
                        </h4>
                        <InfoRow label="Tên tiếng Anh" value={data.companyNameEn} />
                        <InfoRow label="Mã số thuế" value={data.taxCode} mono />
                        <InfoRow label="Ngành" value={data.industry} />
                        <InfoRow label="Ngành phụ" value={data.subIndustry} />
                        <InfoRow label="Ngày thành lập" value={data.foundedDate} />
                        <InfoRow label="Số nhân viên" value={data.employees.toLocaleString("vi-VN")} />
                        <InfoRow label="Số chi nhánh" value={data.branches} />
                        <InfoRow label="Kiểm toán" value={data.auditor} />
                    </div>

                    {/* Right card */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Thông tin liên hệ
                        </h4>
                        <div className="flex items-start gap-2 py-2 border-b border-gray-100">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                            <span className="text-xs text-gray-700">{data.headOffice}</span>
                        </div>
                        <div className="flex items-center gap-2 py-2 border-b border-gray-100">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-700">{data.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 py-2 border-b border-gray-100">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-500">Fax: {data.fax}</span>
                        </div>
                        <div className="flex items-center gap-2 py-2 border-b border-gray-100">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-xs text-blue-600">{data.email}</span>
                        </div>
                        <div className="flex items-center gap-2 py-2">
                            <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <a
                                href={data.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                                {data.website}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ListingInfoSection({ data }: { data: CompanyOverview }) {
    const foreignPct = data.foreignOwnership;
    const foreignLimit = data.foreignOwnershipLimit;
    const foreignBarWidth = foreignLimit > 0 ? (foreignPct / foreignLimit) * 100 : 0;

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-green-500" />
                    Thông tin niêm yết
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                        { label: "Sàn giao dịch", value: data.exchange, icon: "🏛️" },
                        { label: "Ngày niêm yết", value: data.listingDate, icon: "📅" },
                        { label: "Vốn điều lệ", value: data.charterCapital, icon: "💰" },
                        { label: "Mệnh giá", value: `${data.parValue.toLocaleString("vi-VN")} VND`, icon: "📄" },
                    ].map((item) => (
                        <div key={item.label} className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-lg p-3 text-center">
                            <div className="text-lg mb-1">{item.icon}</div>
                            <div className="text-[10px] text-gray-500 mb-0.5">{item.label}</div>
                            <div className="text-xs font-bold text-gray-800">{item.value}</div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {[
                        { label: "CP lưu hành", value: data.outstandingShares },
                        { label: "CP niêm yết", value: data.listedShares },
                        { label: "CP quỹ", value: data.treasuryShares },
                    ].map((item) => (
                        <div key={item.label} className="flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-xs text-gray-500">{item.label}</span>
                            <span className="text-xs font-semibold text-gray-800 font-mono">{item.value}</span>
                        </div>
                    ))}
                </div>

                {/* Foreign ownership bar */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-700">Tỷ lệ sở hữu nước ngoài</span>
                        <span className="text-xs font-bold text-blue-600">
                            {foreignPct}% / {foreignLimit}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(foreignBarWidth, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-gray-400">0%</span>
                        <span className="text-[10px] text-gray-400">Room: {foreignLimit}%</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function BoardMembersSection({ members }: { members: BoardMember[] }) {
    const [filter, setFilter] = useState<"all" | "board" | "executive" | "supervisor">("all");

    const filtered = filter === "all" ? members : members.filter((m) => m.type === filter);

    const tabs: { id: typeof filter; label: string; count: number }[] = [
        { id: "all", label: "Tất cả", count: members.length },
        { id: "board", label: "HĐQT", count: members.filter((m) => m.type === "board").length },
        { id: "executive", label: "Ban điều hành", count: members.filter((m) => m.type === "executive").length },
        { id: "supervisor", label: "Ban kiểm soát", count: members.filter((m) => m.type === "supervisor").length },
    ];

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    Ban lãnh đạo & Quản trị
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Filter tabs */}
                <div className="flex gap-1.5 mb-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                filter === tab.id
                                    ? "bg-amber-500 text-white shadow-sm"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            {tab.label}
                            <span className="ml-1 opacity-70">({tab.count})</span>
                        </button>
                    ))}
                </div>

                {/* Members grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map((member, idx) => (
                        <div
                            key={idx}
                            className="flex gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:shadow-sm transition-shadow"
                        >
                            {/* Avatar */}
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                                    member.type === "board"
                                        ? "bg-gradient-to-br from-amber-400 to-amber-600"
                                        : member.type === "executive"
                                        ? "bg-gradient-to-br from-blue-400 to-blue-600"
                                        : "bg-gradient-to-br from-gray-400 to-gray-600"
                                }`}
                            >
                                {member.name.split(" ").pop()?.charAt(0)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-gray-800 truncate">
                                        {member.name}
                                    </span>
                                    <Badge
                                        text={member.type === "board" ? "HĐQT" : member.type === "executive" ? "Điều hành" : "Kiểm soát"}
                                        variant={member.type === "board" ? "amber" : member.type === "executive" ? "blue" : "gray"}
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">{member.position}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                                    <span>📅 Từ {member.startDate}</span>
                                    <span>🎓 {member.education}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                                    <span>📊 SH: {member.sharesOwned} CP ({member.sharesPercent}%)</span>
                                    <span>{member.gender === "Nam" ? "👨" : "👩"} {member.yearOfBirth}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function SubsidiariesSection({ subsidiaries }: { subsidiaries: Subsidiary[] }) {
    const conList = subsidiaries.filter((s) => s.type === "con");
    const lkList = subsidiaries.filter((s) => s.type === "liên kết");

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Factory className="w-4 h-4 text-purple-500" />
                    Công ty con & Liên kết
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Subsidiaries table */}
                {conList.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-xs font-semibold text-purple-600 mb-2 flex items-center gap-1.5">
                            <GitBranch className="w-3.5 h-3.5" />
                            Công ty con ({conList.length})
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Tên công ty</th>
                                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Vốn điều lệ</th>
                                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Tỷ lệ SH</th>
                                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Ngành</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conList.map((s, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30">
                                            <td className="py-2 px-3 font-medium text-gray-800">{s.name}</td>
                                            <td className="py-2 px-3 text-right text-gray-600 font-mono">{s.charterCapital}</td>
                                            <td className="py-2 px-3 text-right">
                                                <span className={`font-semibold ${s.ownershipPercent >= 80 ? "text-green-600" : s.ownershipPercent >= 50 ? "text-blue-600" : "text-amber-600"}`}>
                                                    {s.ownershipPercent}%
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-gray-500">{s.industry}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Associates */}
                {lkList.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-cyan-600 mb-2 flex items-center gap-1.5">
                            <CircleDot className="w-3.5 h-3.5" />
                            Công ty liên kết ({lkList.length})
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Tên công ty</th>
                                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Vốn điều lệ</th>
                                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Tỷ lệ SH</th>
                                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Ngành</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lkList.map((s, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-cyan-50/30">
                                            <td className="py-2 px-3 font-medium text-gray-800">{s.name}</td>
                                            <td className="py-2 px-3 text-right text-gray-600 font-mono">{s.charterCapital}</td>
                                            <td className="py-2 px-3 text-right font-semibold text-amber-600">{s.ownershipPercent}%</td>
                                            <td className="py-2 px-3 text-gray-500">{s.industry}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function MilestonesSection({ milestones }: { milestones: Milestone[] }) {
    const categoryIcon: Record<string, { emoji: string; color: string }> = {
        foundation: { emoji: "🏗️", color: "border-blue-400 bg-blue-50" },
        listing: { emoji: "📈", color: "border-green-400 bg-green-50" },
        expansion: { emoji: "🚀", color: "border-purple-400 bg-purple-50" },
        dividend: { emoji: "💰", color: "border-amber-400 bg-amber-50" },
        award: { emoji: "🏆", color: "border-red-400 bg-red-50" },
        restructuring: { emoji: "🔄", color: "border-cyan-400 bg-cyan-50" },
    };

    const sorted = [...milestones].sort((a, b) => b.year - a.year);

    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-red-500" />
                    Lịch sử phát triển
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gray-200" />

                    <div className="space-y-3">
                        {sorted.map((m, i) => {
                            const cat = categoryIcon[m.category] || categoryIcon.expansion;
                            return (
                                <div key={i} className="flex gap-3 relative">
                                    {/* Timeline dot */}
                                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 z-10 text-sm ${cat.color}`}>
                                        {cat.emoji}
                                    </div>
                                    {/* Content */}
                                    <div className="flex-1 pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-800">
                                                {m.year}{m.quarter ? ` - ${m.quarter}` : ""}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{m.event}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DividendHistorySection({ dividends }: { dividends: DividendHistory[] }) {
    return (
        <Card className="shadow-sm border-gray-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-cyan-500" />
                    Lịch sử cổ tức
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Năm</th>
                                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Hình thức</th>
                                <th className="text-right py-2.5 px-3 font-semibold text-gray-600">Tiền mặt (VND/CP)</th>
                                <th className="text-center py-2.5 px-3 font-semibold text-gray-600">CP thưởng</th>
                                <th className="text-center py-2.5 px-3 font-semibold text-gray-600">Ngày GDKHQ</th>
                                <th className="text-center py-2.5 px-3 font-semibold text-gray-600">Ngày thanh toán</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dividends.map((d, i) => (
                                <tr key={i} className={`border-b border-gray-50 ${i === 0 ? "bg-blue-50/30" : "hover:bg-gray-50"}`}>
                                    <td className="py-2.5 px-3 font-bold text-gray-800">{d.year}</td>
                                    <td className="py-2.5 px-3">
                                        <Badge
                                            text={d.type}
                                            variant={
                                                d.type === "Tiền mặt"
                                                    ? "green"
                                                    : d.type === "Cổ phiếu"
                                                    ? "blue"
                                                    : d.type.includes("+")
                                                    ? "amber"
                                                    : d.type === "Không chia"
                                                    ? "red"
                                                    : "amber"
                                            }
                                        />
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-800">
                                        {d.cashPerShare > 0 ? d.cashPerShare.toLocaleString("vi-VN") : "-"}
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-gray-600">{d.stockRatio}</td>
                                    <td className="py-2.5 px-3 text-center text-gray-600">{d.exDate}</td>
                                    <td className="py-2.5 px-3 text-center text-gray-600">{d.paymentDate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

// ==================== MAIN COMPONENT ====================

export default function CompanyProfileTab() {
    const { stockInfo } = useStockDetail();
    const data = getCompanyProfileData(stockInfo.ticker);

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div>
                <h2 className="text-lg font-bold text-gray-800">
                    Hồ sơ doanh nghiệp - {stockInfo.ticker}
                </h2>
                <p className="text-xs text-gray-400 italic mt-0.5">
                    {data.overview.companyName}
                </p>
            </div>

            {/* Section 1: Company Overview */}
            <SectionHeading icon={Building2} title="Giới thiệu doanh nghiệp" color="blue" />
            <CompanyOverviewSection data={data.overview} />

            {/* Section 2: Listing Info */}
            <SectionHeading icon={Landmark} title="Thông tin niêm yết" color="green" />
            <ListingInfoSection data={data.overview} />

            {/* Section 3: Board & Leadership */}
            <SectionHeading icon={Users} title="Ban lãnh đạo & Quản trị" color="amber" />
            <BoardMembersSection members={data.boardMembers} />

            {/* Section 4: Subsidiaries */}
            <SectionHeading icon={Factory} title="Công ty con & Liên kết" color="purple" />
            <SubsidiariesSection subsidiaries={data.subsidiaries} />

            {/* Section 5: Milestones */}
            <SectionHeading icon={TrendingUp} title="Lịch sử phát triển" color="red" />
            <MilestonesSection milestones={data.milestones} />

            {/* Section 6: Dividend History */}
            <SectionHeading icon={Banknote} title="Lịch sử cổ tức" color="cyan" />
            <DividendHistorySection dividends={data.dividendHistory} />
        </div>
    );
}
