import HeroNewsSection from "@/components/news/HeroNewsSection";

export default function NewsPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1200px] mx-auto px-6 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    Tin tức & Sự kiện
                </h1>

                {/* Single-row news slider — 8 latest articles */}
                <HeroNewsSection />
            </div>

            {/* Footer */}
            <footer className="bg-slate-900 text-white mt-12 border-t-4 border-orange-500">
                <div className="max-w-[1200px] mx-auto p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-orange-400">VNStock</h3>
                        <p className="text-sm text-gray-400">
                            Nền tảng phân tích tài chính hàng đầu Việt Nam.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-bold text-md mb-4">Sản phẩm</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>Dữ liệu thị trường</li>
                            <li>Phân tích kỹ thuật</li>
                            <li>Tin tức</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-md mb-4">Hỗ trợ</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>Trung tâm trợ giúp</li>
                            <li>Điều khoản sử dụng</li>
                            <li>Chính sách bảo mật</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-md mb-4">Liên hệ</h3>
                        <p className="text-sm text-gray-400">
                            Email: support@vnstock.com<br />
                            Hotline: 1900 1234
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
