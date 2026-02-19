"use client";

import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="w-full bg-[#0f172a] text-white pt-16 pb-8">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Column 1: Brand & Desc */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 font-bold text-2xl text-[#f97316]">
                            <div className="h-10 w-10 rounded-xl bg-[#f97316] flex items-center justify-center text-white">
                                V
                            </div>
                            <span>VNStock</span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Nền tảng phân tích chứng khoán hàng đầu Việt Nam. Cung cấp dữ liệu thực, biểu đồ chuyên sâu và công cụ lọc cổ phiếu mạnh mẽ giúp nhà đầu tư ra quyết định chính xác.
                        </p>
                        <div className="flex gap-4 pt-2">
                            <Link href="#" className="text-slate-400 hover:text-[#f97316] transition-colors"><Facebook size={20} /></Link>
                            <Link href="#" className="text-slate-400 hover:text-[#f97316] transition-colors"><Twitter size={20} /></Link>
                            <Link href="#" className="text-slate-400 hover:text-[#f97316] transition-colors"><Linkedin size={20} /></Link>
                            <Link href="#" className="text-slate-400 hover:text-[#f97316] transition-colors"><Youtube size={20} /></Link>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div>
                        <h4 className="font-bold text-lg mb-6 text-white">Về VNStock</h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li><Link href="#" className="hover:text-[#f97316] transition-colors">Giới thiệu về chúng tôi</Link></li>
                            <li><Link href="#" className="hover:text-[#f97316] transition-colors">Đội ngũ chuyên gia</Link></li>
                            <li><Link href="#" className="hover:text-[#f97316] transition-colors">Tuyển dụng nhân tài</Link></li>
                            <li><Link href="#" className="hover:text-[#f97316] transition-colors">Tin tức & Sự kiện</Link></li>
                            <li><Link href="#" className="hover:text-[#f97316] transition-colors">Đối tác chiến lược</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Products */}
                    <div>
                        <h4 className="font-bold text-lg mb-6 text-white">Sản phẩm & Dịch vụ</h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li><Link href="#" className="hover:text-[#f97316] transition-colors">Dữ liệu thị trường Real-time</Link></li>
                            <li><Link href="#" className="hover:text-[#f97316] transition-colors">Bộ lọc Cổ phiếu Thông minh</Link></li>
                            <li><Link href="#" className="hover:text-[#f97316] transition-colors">Biểu đồ Kỹ thuật Pro</Link></li>
                            <li><Link href="#" className="hover:text-[#f97316] transition-colors">Báo cáo Phân tích</Link></li>
                            <li><Link href="#" className="hover:text-[#f97316] transition-colors">Khóa học Đầu tư</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Contact */}
                    <div>
                        <h4 className="font-bold text-lg mb-6 text-white">Liên hệ & Hỗ trợ</h4>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li className="flex gap-2">
                                <span className="text-[#f97316] font-semibold">Hotline:</span>
                                <span>1900 1234 (8:00 - 17:30)</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-[#f97316] font-semibold">Email:</span>
                                <span>support@vnstock.vn</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-[#f97316] font-semibold">Địa chỉ:</span>
                                <span>Tòa nhà Bitexco Financial Tower, Số 2 Hải Triều, Q.1, TP.HCM</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                    <p>© 2024 VNStock JSC. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-white transition-colors">Điều khoản sử dụng</Link>
                        <Link href="#" className="hover:text-white transition-colors">Chính sách bảo mật</Link>
                        <Link href="#" className="hover:text-white transition-colors">Quy chế hoạt động</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
