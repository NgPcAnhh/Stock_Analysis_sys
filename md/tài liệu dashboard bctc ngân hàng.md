ĐẶC TẢ NGHIỆP VỤ & PHÂN TÍCH: DASHBOARD TÀI CHÍNH NGÂN HÀNG (PUBLIC DATA)

Phiên bản: Cập nhật theo giao diện BankInsight DeepDive
Phạm vi dữ liệu: Chỉ sử dụng dữ liệu được công bố trên Báo cáo tài chính (BCTC) và Bản thuyết minh BCTC của các Ngân hàng Thương mại tại Việt Nam.

1. TỔNG QUAN HỆ THỐNG

Dashboard được thiết kế theo tư duy "Top-down" và "Root-cause Analysis", cho phép người dùng (Analyst, CFO, Nhà đầu tư) đánh giá toàn diện sức khỏe tài chính ngân hàng thông qua 5 Màn hình phân tích (Tabs).

Mọi dữ liệu được điều khiển bởi hệ thống Bộ lọc Toàn cục (Global Filters):

Ngân hàng: Lọc theo pháp nhân (VD: VCB, BIDV, TCB). Thay đổi ngân hàng sẽ reload toàn bộ data.

Kỳ báo cáo: Chọn mốc thời gian chốt số (Snapshot). Các thẻ KPI lấy số liệu tại kỳ này, trong khi các biểu đồ xu hướng sẽ hiển thị mốc này và lùi về các quý trước.

Đơn vị: Tỷ VND / Triệu VND (chỉ tác động lên số tuyệt đối, không làm thay đổi các tỷ lệ %).

2. CHI TIẾT 5 LĂNG KÍNH PHÂN TÍCH

TAB 1: BẢNG CÂN ĐỐI KẾ TOÁN (BALANCE SHEET)

Đánh giá quy mô, cơ cấu vốn và cách ngân hàng phân bổ tài sản.

Bộ 4 Chỉ số Quy mô (KPIs Headline):

Tổng tài sản: Đo lường quy mô chung.

Tiền gửi khách hàng: Nguồn vốn lõi, thể hiện thị phần huy động và sự ổn định.

Cho vay khách hàng (Gộp): Tài sản sinh lời cốt lõi, thể hiện quy mô cấp tín dụng.

Vốn chủ sở hữu: Bộ đệm rủi ro phòng thủ của ngân hàng.

Khối Phân tích Cơ cấu (Pie & Bar Charts):

Tỷ trọng Tài sản Sinh lời (Donut): Tổng TS sinh lời (Cho vay, TP, LNH) so với Tài sản không sinh lời (Tiền mặt, TSCĐ). Ngưỡng lý tưởng: > 85%.

Cơ cấu Nguồn vốn (Stacked Bar): Đánh giá sự phụ thuộc giữa Tiền gửi KH (bền vững), Trái phiếu, Liên ngân hàng và Vốn chủ.

Cơ cấu Tiền gửi CASA (Donut): Phân rã Tiền gửi Không kỳ hạn (CASA) vs Có kỳ hạn. CASA cao = Chi phí vốn thấp = Biên lãi tốt.

Cơ cấu Cho vay KH (Horizontal Bar): Tỷ trọng dư nợ theo tệp (Bán lẻ, SME, DN Lớn, BĐS). Dùng để đánh giá mức độ tập trung tín dụng.

Khối Xu hướng & An toàn:

Trend Nguồn vốn (Stacked Area): Nhìn nhận xu thế huy động dài hạn.

Chỉ số An toàn KQ (Gauges): Theo dõi nhanh CAR (An toàn vốn), LDR (Tỷ lệ cấp tín dụng/huy động) và SMLR (Vốn ngắn hạn cho vay trung dài hạn).

TAB 2: CHẤT LƯỢNG TÀI SẢN (ASSET QUALITY)

Đánh giá rủi ro tín dụng, nguy cơ mất vốn và khả năng phòng vệ (Dự phòng).

Bộ 4 KPIs Rủi ro:

NPL Ratio (Tỷ lệ nợ xấu): Nợ nhóm 3,4,5 / Tổng dư nợ. Ngưỡng NHNN: Dưới 3%.

Coverage Ratio - LLR (Bao phủ nợ xấu): Quỹ dự phòng / Nợ xấu. Trên 100% nghĩa là ngân hàng có đủ dự phòng bao trọn 100% nợ xấu.

Credit Cost (Chi phí tín dụng): Chi phí dự phòng / Dư nợ bình quân. Phản ánh ngân hàng đang "mất" bao nhiêu % lợi nhuận cho rủi ro.

Tỷ lệ Nợ nhóm 2 (Nợ cần chú ý): Chỉ báo cảnh báo sớm (SICR). Khoản vay chưa thành nợ xấu nhưng đã chậm trả hoặc có dấu hiệu rủi ro.

Khối Phân tích Sâu:

Cơ cấu Nhóm nợ (Stacked Bar): Xu hướng dịch chuyển của nợ nhóm 2 đến nhóm 5 qua các quý.

Xu hướng NPL & LLR (Line + Bar): Hai chỉ báo thường đi ngược chiều nhau. LLR cao giúp phòng thủ vững chắc trước NPL tăng.

Phân bổ Tài sản thế chấp (Donut): Trích từ thuyết minh. BĐS tỷ trọng cao giúp giảm khả năng mất trắng nhưng mang rủi ro thanh khoản tài sản.

Roll-forward Dự phòng (Data Table): Bảng đối soát số dư dự phòng: Dư đầu kỳ + Trích lập mới (từ P&L) - Dùng để xử lý/xóa nợ = Dư cuối kỳ.

TAB 3: HIỆU QUẢ KINH DOANH (DUPONT ANALYSIS)

Bóc tách khả năng sinh lời, đánh giá hiệu quả vận hành và cấu trúc đòn bẩy.

Bộ KPIs Hiệu quả (6 mốc):

NII (Lãi thuần), NIM (Biên lãi thuần), Net Fee Income (Thu phí), CIR (Tỷ lệ Chi phí/Thu nhập), Chi phí Dự phòng và Lợi nhuận trước thuế.

Phân rã Biến động:

Trend NII & NIM (Bar + Line): NII tăng nhưng NIM giảm báo hiệu ngân hàng đang hi sinh biên lợi nhuận để đổi lấy quy mô (tăng lãi huy động hoặc giảm lãi cho vay).

CIR Waterfall (Biểu đồ thác nước): Chỉ ra CIR thay đổi là do yếu tố nào (Lương bổng tăng, Thu nhập lãi sụt giảm, hay do chi cho công nghệ).

Mô hình Cây Phân rã ROE (DuPont Model):

Phân tách công thức: ROE = Tax Burden × Earning Power × Efficiency × Asset Yield × Leverage.

Ý nghĩa thực tiễn: * Leverage cao → Rủi ro vốn cao.

Efficiency (1-CIR) cao → Ngân hàng vận hành tối ưu.

Earning Power thấp → Lợi nhuận đang bị ăn mòn nặng nề bởi dự phòng tín dụng.

TAB 4: THU NHẬP & CHI PHÍ (INCOME & EXPENSE)

Đánh giá sự đa dạng hóa và tính bền vững của các dòng thu/chi.

Khối Cơ cấu (Pie & Stacked Charts):

Cơ cấu Tổng Thu nhập HĐ (TOI): NII (Thu lãi) vs Thu phí (Bền vững) vs Trading/Ngoại hối (Bấp bênh).

Phân rã Lãi thuần Dịch vụ: Rất quan trọng để theo dõi sức khỏe của mảng Bancassurance, Thẻ và Thanh toán (Trích từ thuyết minh BCTC).

Cơ cấu Opex (Chi phí): Tỷ trọng chi Lương nhân viên vs Khấu hao TSCĐ (đầu tư IT/Số hóa).

Khối Theo dõi P&L:

Tăng trưởng YoY (Line Chart): NII YoY vs Lợi nhuận YoY. Nếu hai đường phân kỳ (NII tăng nhưng Lợi nhuận giảm), ngân hàng đang bị kéo lùi bởi chi phí dự phòng.

Bảng Kết quả KD (Table): Bảng P&L đối soát theo từng quý.

TAB 5: THANH KHOẢN & ALM GAP

Sử dụng "Ma trận thời gian đáo hạn" từ Thuyết minh BCTC để đánh giá rủi ro kỳ hạn và thanh khoản.

Khối KPIs NHNN:

LDR (Cho vay / Huy động), SMLR (Vốn ngắn hạn cho vay Trung/Dài hạn), Dự trữ thanh khoản và Tỷ trọng TG Bán lẻ.

Phân tích Khe hở thanh khoản (Maturity Gap Analysis):

Biểu đồ ALM Gap (Bar + Line): Ánh xạ Dòng tiền vào (Tài sản đáo hạn) và Dòng tiền ra (Nợ đáo hạn) vào các rổ kỳ hạn: <1 Tháng, 1-3 Tháng, 3-12 Tháng, 1-5 Năm, >5 Năm.

Dòng Cumulative Gap (Khe hở lũy kế): * Thường ÂM ở kỳ hạn ngắn (đặc tính mượn ngắn) và DƯƠNG ở kỳ hạn dài (cho vay dài).

Nếu mức Âm ở <1 Tháng quá lớn, ngân hàng đối mặt với rủi ro tái cấp vốn (Rollover Risk) cực cao nếu thị trường đóng băng.

Bảng Ma trận ALM Gap (Table): Bảng số tuyệt đối bóc tách Khe hở ròng (Net Gap) và Khe hở lũy kế (Cumulative Gap) để cán bộ Treasury/ALM tính toán lượng vốn bù đắp cần thiết.

3. QUY TẮC HIỂN THỊ TRỰC QUAN (VISUAL RULES)

3.1. Logic Màu sắc "Lower is Better" (Càng thấp càng tốt)

Hệ thống tự động hoán đổi màu sắc dựa trên bản chất nghiệp vụ của chỉ số:

Nhóm Higher is Better (Càng cao càng tốt): Tăng = Xanh lá (Tốt), Giảm = Đỏ/Cam (Xấu).

Ví dụ: ROE, NIM, CAR, LLR (Bao phủ nợ xấu), NII.

Nhóm Lower is Better (Càng thấp càng tốt): Giảm = Xanh lá (Tốt), Tăng = Đỏ/Cam (Xấu).

Ví dụ: NPL Ratio (Tỷ lệ nợ xấu), Nợ Nhóm 2, CIR, Chi phí tín dụng.

3.2. Hệ thống Tooltip Chuẩn hóa

Khi người dùng di chuột (hover) vào bất kỳ thẻ KPI, Bar, Line hay node trên DuPont Tree, Tooltip tùy chỉnh sẽ hiện ra bao gồm:

Tên chỉ số / Hạng mục

Giá trị hiện tại

Hệ số thay đổi (QoQ / YoY) kèm màu nền (Badge: Xanh/Đỏ/Xám) thể hiện tính tích cực hay tiêu cực.

Giải nghĩa nghiệp vụ / Ngưỡng an toàn (Bằng tiếng Việt thân thiện).

3.3. Cảnh báo Toàn cục (Global Alerts)

Hệ thống có cơ chế quét các ngưỡng cứng. Nếu phát hiện vi phạm nghiêm trọng (Ví dụ: NPL > 3.0%, CAR < 8% hoặc LLR < 50%), một Banner màu đỏ (Critical Warning) sẽ xuất hiện cố định ở trên cùng của Dashboard, thu hút sự chú ý của quản trị viên ngay lập tức.