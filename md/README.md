# 📚 Tài Liệu Dự Án — Stock Analysis System

Thư mục này chứa toàn bộ tài liệu kỹ thuật của dự án **Stock Analysis System**.

---

## 📁 Cấu Trúc Thư Mục

```
md/
├── README.md                        ← File này — tổng quan và mục lục
│
├── be/                              ← Tài liệu Backend (FastAPI)
│   ├── overview.md                  ← Tổng quan kiến trúc BE
│   ├── core/
│   │   ├── config.md                ← Cấu hình ứng dụng
│   │   ├── cache.md                 ← Redis cache utility
│   │   └── logging.md               ← Cấu hình logging
│   ├── database/
│   │   ├── database.md              ← Kết nối async database
│   │   └── schema.md                ← Schema cơ sở dữ liệu
│   ├── modules/
│   │   └── tong_quan.md             ← Module "Tổng quan" — 13 API endpoints
│   └── websocket.md                 ← WebSocket manager
│
└── fe/                              ← Tài liệu Frontend (Next.js)
    ├── overview.md                  ← Tổng quan kiến trúc FE
    ├── pages/
    │   ├── dashboard.md             ← Trang chủ / Dashboard (/)
    │   ├── analysis.md              ← Trang phân tích kỹ thuật (/analysis)
    │   ├── analysis-detail.md       ← Chi tiết phân tích (/analysis/[ticker])
    │   ├── market.md                ← Trang thị trường (/market)
    │   ├── news.md                  ← Trang tin tức (/news)
    │   ├── price-board.md           ← Bảng giá (/price-board)
    │   ├── stocks.md                ← Danh sách cổ phiếu (/stocks)
    │   ├── stock-detail.md          ← Chi tiết cổ phiếu (/stock/[ticker])
    │   └── indices.md               ← Chỉ số thị trường (/indices)
    ├── lib.md                       ← Thư viện (lib/): context, types, mock data, migration guide
    └── components/
        ├── layout.md                ← Layout components (MainLayout, Sidebar, Header, StockTicker, Footer)
        ├── dashboard-components.md  ← Components trang chủ (props, state, API, UI states đầy đủ)
        ├── stock-components.md      ← Components chi tiết cổ phiếu (23 components, context pattern)
        ├── analysis-components.md   ← Components phân tích kỹ thuật (chart modes, drawing tools)
        ├── market-components.md     ← Components trang thị trường
        └── shared-components.md     ← Components dùng chung (charts, price-board, news, indices, ui)
```

---

## 🏗️ Tổng Quan Dự Án

| Thành phần | Công nghệ | Mô tả |
|---|---|---|
| **Backend** | FastAPI + Python | REST API phục vụ dữ liệu chứng khoán |
| **Database** | PostgreSQL + asyncpg | Lưu trữ dữ liệu thị trường |
| **Cache** | Redis | Cache response API, giảm tải DB |
| **Frontend** | Next.js 16 + React 19 | Giao diện phân tích chứng khoán |
| **UI Library** | TailwindCSS v4 + shadcn/ui | Component system |
| **Charts** | Apache ECharts | Biểu đồ tài chính |

---

## 🔗 Điểm Vào

- **BE API**: `http://localhost:8000`
- **API Docs (Swagger)**: `http://localhost:8000/docs`
- **FE**: `http://localhost:3000`
