ĐẶC TẢ NGHIỆP VỤ & PHÂN TÍCH: DASHBOARD TÀI CHÍNH DNBH

Mục tiêu: Mô tả chi tiết cấu trúc dữ liệu, các chỉ số đo lường, quy tắc tính toán và ý nghĩa phân tích của một Dashboard giám sát sức khỏe tài chính Doanh nghiệp Bảo hiểm (DNBH).

1. NGỮ CẢNH VÀ BỘ LỌC PHÂN TÍCH (GLOBAL FILTERS)

Sức khỏe của một DNBH phụ thuộc hoàn toàn vào hệ quy chiếu (Khung vốn) và mô hình kinh doanh (Loại hình). Do đó, Dashboard phải được điều khiển bởi các bộ lọc toàn cục sau:

Doanh nghiệp & Kỳ báo cáo: Chọn pháp nhân và thời điểm phân tích (Quý/Năm).

Khung vốn (Capital Framework): Cực kỳ quan trọng, quyết định cách định nghĩa "Vốn".

LOCAL_VN: Khung pháp lý Việt Nam (Biên KNTT Thực tế / Biên KNTT Tối thiểu).

Solvency II (SII): Chuẩn Châu Âu (Eligible Own Funds / SCR).

IAIS ICS: Chuẩn quốc tế cho tập đoàn (Qualifying Capital / ICS Requirement).

Loại hình bảo hiểm (Line of Business - LOB):

NON_LIFE (Phi nhân thọ): Đánh giá trọng tâm vào tỷ lệ kết hợp (Combined Ratio), bồi thường ngắn hạn.

LIFE (Nhân thọ): Không dùng Combined Ratio. Dòng tiền dài hạn.

2. CHI TIẾT CÁC MÀN HÌNH PHÂN TÍCH (TABS)

TAB 1: BÁO CÁO TÀI CHÍNH (FINANCIAL POSITION)

Mục đích: Đánh giá quy mô bảng cân đối kế toán, rủi ro đầu tư và chênh lệch kỳ hạn (ALM).

Bộ 4 Chỉ số quy mô (KPIs):

Tổng tài sản & Vốn chủ sở hữu: Thể hiện quy mô và bộ đệm rủi ro.

Tài sản đầu tư (Invested Assets): Tài sản sinh lời thực tế của DNBH (không bao gồm tài sản cố định, phải thu...).

Dự phòng kỹ thuật (Technical Provisions): Nghĩa vụ cốt lõi với khách hàng. Lưu ý nghiệp vụ: Chỉ số này tăng không hẳn là xấu, nó có thể phản ánh việc DNBH đang bán được nhiều hợp đồng mới.

Cơ cấu Bảng cân đối (Biểu đồ thành phần):

Tỷ trọng TS Đầu tư: Phân tách "TS Đầu tư truyền thống" (DNBH chịu rủi ro) và "TS Unit-linked" (Khách hàng chịu rủi ro).

Cơ cấu nguồn vốn: So sánh tỷ trọng giữa Dự phòng KT, Nợ khác và Vốn chủ. Cho thấy đòn bẩy tài chính của DNBH.

Phân tích Đầu tư (Biểu đồ vạch ngang):

Phân bổ TS: Tỷ trọng vào TPCP, TPDN, Cổ phiếu, Tiền gửi... Phản ánh khẩu vị rủi ro thị trường.

Chất lượng tín dụng: Chia theo hạng Investment Grade, Sub-IG, Unrated và Tỷ lệ trích lập ECL.

Xu hướng ALM (Biểu đồ miền chồng - Stacked Area):

Vẽ 2 đường: TS Đầu tư và Dự phòng Kỹ thuật qua các quý.

Ý nghĩa: Chênh lệch giữa 2 đường này cho thấy DNBH có đang "hụt" tài sản sinh lời để bù đắp nghĩa vụ hay không.

Các mốc An toàn cơ bản (Gauges): Solvency Coverage, Tỷ lệ Vốn/Tổng TS, Đòn bẩy khai thác (NWP/Capital).

TAB 2: VỐN & THANH KHOẢN (CAPITAL & SOLVENCY)

Mục đích: Bóc tách khả năng đáp ứng ngưỡng an toàn vốn tối thiểu của cơ quan quản lý.

Luồng tính toán Solvency (Công thức trực quan):

[Vốn khả dụng] ÷ [Vốn yêu cầu] = [Tỷ lệ An toàn] -> [Dư địa vốn (Headroom)]

Lưu ý: Label của Vốn khả dụng/Vốn yêu cầu phải thay đổi linh hoạt theo bộ lọc "Khung vốn" đã chọn.

Dư địa vốn chi tiết (Biểu đồ Gauge nửa vòng):

Hiển thị Tỷ lệ an toàn hiện tại nằm ở đâu so với 2 mốc: Ngưỡng vi phạm (100%) và Ngưỡng cần can thiệp (ví dụ 150%).

Thanh khoản nhanh (Biểu đồ vạch):

Đo lường: Tỷ lệ TS lỏng / Tổng TS; TS Lỏng / Dự kiến bồi thường 30 ngày. Đảm bảo DNBH có tiền mặt ngay khi xảy ra sự kiện bảo hiểm.

Bảng đối soát (Table): Hiển thị chi tiết số dư Tài sản, Nghĩa vụ, VCSH qua 5 quý gần nhất để kiểm tra tính cân bằng (TS = NV + VCSH).

TAB 3: HIỆU QUẢ KINH DOANH (BUSINESS PERFORMANCE)

Mục đích: Đánh giá khả năng sinh lời từ 2 động cơ: Khai thác bảo hiểm (Underwriting) và Đầu tư (Investment).

Bộ KPI Hiệu quả:

Net Earned Premium (NEP): Doanh thu phí thuần (sau khi nhượng tái).

Combined Ratio (Tỷ lệ kết hợp): (Bồi thường + Chi phí) / NEP. Dưới 100% là có lãi khai thác.

Underwriting Result: Lợi nhuận/lỗ từ khai thác thuần.

Investment Income: Lợi nhuận từ đầu tư.

Phân tích Tỷ lệ kết hợp (Combined Ratio):

Trend: Biểu đồ cột ghép (NEP & Claims) kết hợp đường xu hướng Combined Ratio.

Waterfall: Phân rã nguyên nhân làm thay đổi CR so với năm ngoái: Do tỷ lệ bồi thường tăng? Do chi phí quản lý tăng? Hay do mẫu số (Phí) giảm?

Phân rã ROE (Sơ đồ cây DuPont):

ROE bảo hiểm = Tax Burden × UW Margin × Inv Yield × Đòn bẩy đầu tư × Đòn bẩy khai thác.

Ý nghĩa: Giúp lãnh đạo biết ROE 15% đến từ việc bán bảo hiểm giỏi (UW Margin) hay do đánh cược rủi ro trên thị trường chứng khoán (Inv Yield).

So sánh Lợi nhuận (Cột & Đường): Lãi khai thác (thường rất mỏng hoặc âm) vs Lãi đầu tư (thường lớn, gánh toàn bộ hệ thống).

TAB 4: THU NHẬP & CHI PHÍ (INCOME & EXPENSE ANALYSIS)

Mục đích: Bóc tách cơ cấu chi phí vận hành và nguồn hình thành lợi nhuận.

Cơ cấu thành phần (Biểu đồ Donut):

Chi phí khai thác: Tỷ trọng Hoa hồng (phân phối), Chi phí quản lý (G&A), Chi phí giải quyết bồi thường.

Lợi nhuận: Tỷ trọng đến từ Khai thác, Đầu tư, và Tái bảo hiểm.

Cảnh báo tăng trưởng (Biểu đồ 2 đường):

So sánh Tốc độ tăng trưởng Phí (NEP Growth) vs Tốc độ tăng trưởng Lợi nhuận (Net Profit Growth).

Ý nghĩa: Nếu Phí tăng mạnh nhưng Lợi nhuận đi lùi -> Dấu hiệu DNBH đang hạ giá bán (underpricing) hoặc quản lý bồi thường kém.

TAB 5: THANH KHOẢN & TÁI BẢO HIỂM (LIQUIDITY & REINSURANCE STRESS)

Mục đích: Đánh giá khả năng sinh tồn trong kịch bản thảm họa (Bão lũ, Động đất) và rủi ro đối tác tái bảo hiểm.

Chỉ báo rủi ro nhanh (KPIs):

Survival Horizon (Số ngày sống sót không cần huy động thêm vốn).

Tỷ lệ phụ thuộc tái bảo hiểm (Reinsurance Recoverables / Claims).

Tỷ lệ nợ tái BH quá hạn (Rủi ro đối tác không trả tiền).

Bài toán Stress Test (Công thức trực quan):

[Tài sản lỏng hiện có] - [Dòng tiền chi ra kịch bản Thảm họa] = [Thặng dư/Thiếu hụt]

Nếu âm -> Nguy cơ vỡ nợ thanh khoản.

Mô phỏng Dòng tiền thảm họa (Biểu đồ Đường cắt Vùng):

Trục X là số ngày (từ 1 đến 90 ngày sau thảm họa).

Vẽ vùng ngang đại diện cho Tài sản lỏng. Vẽ đường dốc lên đại diện cho Dòng tiền chi ra tích lũy (Cumulative Outflows).

Ý nghĩa: Điểm mà đường cắt qua vùng chính là "Breach Day" - Ngày cạn kiệt thanh khoản.

3. CÁC QUY TẮC LOGIC CỐT LÕI (CẦN TUÂN THỦ KHI CODE)

Quy tắc "Lower is Better" (Càng thấp càng tốt):

Áp dụng cho: Combined Ratio, Expense Ratio, Loss Ratio.

Logic màu sắc: Khi các chỉ số này giảm (âm) YoY/QoQ -> Báo hiệu Tốt. Khi tăng -> Báo hiệu Xấu/Rủi ro.

Quy tắc theo Loại hình (LOB Logic):

Nếu bộ lọc đang chọn là Loại hình = Nhân thọ (LIFE): Toàn bộ các chỉ số Combined Ratio, Expense Ratio, Underwriting Result, Loss Ratio, và Mô hình phân rã ROE DuPont phải bị ẩn đi hoặc chuyển thành trạng thái N/A (Vì các chỉ số này chỉ có ý nghĩa đối với bảo hiểm Phi nhân thọ).

Quan hệ Kế toán (Toán học trong data giả lập):

Dữ liệu fake phải tuân thủ: Tổng Tài Sản = Dự phòng Kỹ thuật + Nợ khác + Vốn chủ sở hữu.

Lợi nhuận Khai thác = Net Earned Premium - Net Claims Incurred - Expenses Incurred.

Lợi nhuận Trước Thuế = Lợi nhuận Khai thác + Lợi nhuận Đầu tư + Thu nhập khác.