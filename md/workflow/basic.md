## 🛠 Tech Stack của Dự án

### 1. Frontend (`/FE`)
- **Core**: Next.js 16.x, React 19.
- **UI/Styling**: Tailwind CSS v4, shadcn/ui, Radix UI.
- **Charts**: ECharts (`echarts-for-react`).
- **Language**: TypeScript.

### 2. Backend (`/BE`)
- **Core**: FastAPI 0.115 (Python 3).
- **DB & Caching**: PostgreSQL (SQLAlchemy Async, Alembic), Redis, Celery.
- **Validation & Auth**: Pydantic 2.x, JWT.
- **Data & Testing**: Pandas, TA-Lib, `pytest`, Ruff/Black/Mypy.

---

## 📝 Quy trình Dev - Test (4 Bước)

### Bước 1: Planning (Phân tích & Thiết kế)
- Đọc yêu cầu: Xác định phạm vi tác động (FE, BE hay Fullstack).
- Dự đoán rủi ro: Đảm bảo không phá vỡ luồng dữ liệu hiện tại.
- Clarify: Chủ động hỏi nếu thiếu thông tin về UI, API Response hoặc logic nghiệp vụ.

### Bước 2: BE Implementation (Phát triển Backend)
- **Database/Schema**: Cập nhật SQLAlchemy Model, chạy migrate Alembic, định nghĩa Pydantic Schema.
- **Business Logic**: Xử lý ở Service, chú ý tối ưu Async DB và Cache (Redis/Celery) cho tính toán tài chính.
- **API**: Tạo Endpoint FastAPI chuẩn REST.
- **Test**: Viết Unit/Integration test bằng `pytest`.

### Bước 3: FE Implementation (Phát triển Frontend)
- **API Mapping**: Khai báo TypeScript Interface khớp tuyệt đối với BE.
- **UI Components**: Tái sử dụng/phát triển các Atomic Component (Tailwind v4, shadcn/ui).
- **State/UX**: Xử lý mượt mà trạng thái (Loading, Error/Success). Tích hợp chính xác biểu đồ ECharts.

### Bước 4: Verification (Xác thực & Bàn giao)
- **Self-Review**: Chạy Linter (BE: Ruff/Mypy, FE: Eslint/TSC). Dọn dẹp console.log.
- **E2E Test**: Test toàn bộ chu trình hoàn chỉnh (FE Server-Action/Fetch -> BE -> DB -> FE Render). Kiểm tra cả happy case & error case.
- **Notify**: Tóm tắt lại file thay đổi và logic vào docs nếu cần, báo cáo trực tiếp hoàn thiện cho USER.
