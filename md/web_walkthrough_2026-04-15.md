# Báo cáo lướt web một lượt (read-only)

Ngày kiểm tra: 2026-04-15  
Phạm vi: FE `web_ptich_ck/FE` + API backend `web_ptich_ck/BE`  
Chế độ: chỉ xem, không sửa code

## 1) Trạng thái dịch vụ

- Backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000` chạy OK.
- Frontend: đang có instance Next.js ở `http://localhost:3000` chạy OK.
- Lần khởi động thêm Next.js bị lock `.next/dev/lock` do instance cũ đang chạy (không ảnh hưởng kết quả lướt web).

## 2) Smoke test route FE

Các route kiểm tra bằng HTTP GET đều trả 200:

- `/`
- `/market`
- `/indices`
- `/news`
- `/stock/VNM`
- `/analysis`
- `/portfolio-assumption`
- `/settings`
- `/admin`

## 3) Smoke test API BE

Các endpoint đại diện trả 200:

- `/api/v1/tong-quan/market-index-cards`
- `/api/v1/news/latest?limit=5`
- `/api/v1/indices/market`
- `/api/v1/stock-list/overview?page=1&page_size=5`
- `/redoc`

## 4) Build/Lint snapshot FE

### 4.1 Build

`npm run build` thất bại với TypeScript error:

- File: `app/portfolio-assumption/page.tsx` (line ~308)
- Lỗi: `Info` icon từ lucide nhận prop `title` không hợp lệ (`Property 'title' does not exist on type LucideProps`).

### 4.2 Lint

`npm run lint` có nhiều lỗi, nổi bật:

1. `components/price-board/IndexBar.tsx`
- nhiều lỗi `react-hooks/refs`: truy cập ref trong render (`totalVolume`, `totalValue`, `priceHistory.current`, `storeRef.current`).

2. `components/price-board/StockRow.tsx`
- `react-hooks/set-state-in-effect`: setState synchronous trong effect.
- `react-hooks/refs`: truyền `stateRef.current` trong render.

3. `components/stock/CompanyProfileTab.tsx`
- `react-hooks/static-components`: tạo component `SortIcon` bên trong render.

4. `components/stock/BalanceSheetDeepDive.tsx`
- nhiều lỗi `no-explicit-any`.

## 5) Quan sát kiến trúc vận hành

1. Hardcode base URL xuất hiện nhiều nơi
- Nhiều file fallback hoặc cứng `http://localhost:8000` / `http://localhost:8000/api/v1`.
- Rủi ro lệch môi trường staging/prod nếu không chuẩn hóa env.

2. WebSocket realtime đang dùng endpoint cố định
- `wss://stream2.simplize.vn/ws`.
- Cần theo dõi SLA endpoint này vì ảnh hưởng trực tiếp price board.

3. Có dấu vết lỗi `excludedPeers` trong file log cũ (`errors.txt`)
- Trong source hiện tại đã có state `excludedPeers`; lỗi build hiện tại không nằm ở phần này.

## 6) Hạn chế của lượt kiểm tra này

- Mình có mở trang qua integrated browser nhưng môi trường hiện tại không cho đọc nội dung DOM trực tiếp từ tool browser, nên phần “lượt web” được xác nhận bằng:
  - HTTP status route,
  - build/lint,
  - smoke API backend,
  - và kiểm tra kiến trúc code hiện có.

## 7) Kết luận nhanh

- Hệ thống FE/BE đang chạy được ở mức route/API cơ bản.
- Chất lượng build/lint FE chưa đạt (có lỗi compile + nhiều lint errors).
- Với yêu cầu hiện tại “chỉ xem”, chưa thực hiện sửa bất kỳ file mã nguồn nào.