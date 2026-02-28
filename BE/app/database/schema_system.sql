-- ============================================================
-- Schema: system — Theo dõi hành vi người dùng
-- ============================================================
-- Dữ liệu tin tức gốc nằm ở schema: hethong_phantich_chungkhoan
-- Schema này chỉ lưu hành động của user (click, search)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS system;

-- ────────────────────────────────────────────────────────────
-- 1. article_clicks — Mỗi lần user click vào bài báo
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 click event (append-only, dễ phân tích)
-- Indexes tối ưu cho:
--   • Top bài được click nhiều nhất (article_id)
--   • Thống kê theo thời gian (clicked_at)
--   • Phân tích hành vi per session (session_id)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.article_clicks (
    id          BIGSERIAL   PRIMARY KEY,
    article_id  INTEGER     NOT NULL,                              -- FK → hethong_phantich_chungkhoan.news.id
    session_id  VARCHAR(64) NOT NULL DEFAULT 'anonymous',          -- Fingerprint / UUID từ FE
    ip_address  VARCHAR(45),                                       -- IPv4 hoặc IPv6
    clicked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index cho truy vấn top bài click nhiều nhất (GROUP BY article_id)
CREATE INDEX IF NOT EXISTS idx_article_clicks_article
    ON system.article_clicks (article_id);

-- Index cho thống kê theo thời gian (filtered by date range)
CREATE INDEX IF NOT EXISTS idx_article_clicks_time
    ON system.article_clicks (clicked_at DESC);

-- Composite index cho đếm unique sessions per article
CREATE INDEX IF NOT EXISTS idx_article_clicks_article_session
    ON system.article_clicks (article_id, session_id);

-- ────────────────────────────────────────────────────────────
-- 2. search_logs — Mỗi lần user tìm kiếm từ khóa
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 search event
-- Hot search = GROUP BY keyword → COUNT DESC
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.search_logs (
    id          BIGSERIAL   PRIMARY KEY,
    keyword     VARCHAR(255) NOT NULL,                             -- Từ khóa tìm kiếm (đã trim + lowercase)
    session_id  VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
    ip_address  VARCHAR(45),
    searched_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index cho hot search (GROUP BY keyword)
CREATE INDEX IF NOT EXISTS idx_search_logs_keyword
    ON system.search_logs (keyword);

-- Index cho thống kê theo thời gian
CREATE INDEX IF NOT EXISTS idx_search_logs_time
    ON system.search_logs (searched_at DESC);

-- Composite cho phân tích trend theo keyword + thời gian
CREATE INDEX IF NOT EXISTS idx_search_logs_keyword_time
    ON system.search_logs (keyword, searched_at DESC);

-- ────────────────────────────────────────────────────────────
-- 3. stock_clicks — Mỗi lần user click vào mã cổ phiếu
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 click event (append-only)
-- Dùng để thống kê top mã được quan tâm nhất
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.stock_clicks (
    id          BIGSERIAL    PRIMARY KEY,
    ticker      VARCHAR(20)  NOT NULL,                             -- Mã cổ phiếu (VCB, FPT, ...)
    session_id  VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
    ip_address  VARCHAR(45),
    clicked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index cho top mã click nhiều nhất
CREATE INDEX IF NOT EXISTS idx_stock_clicks_ticker
    ON system.stock_clicks (ticker);

-- Index cho thống kê theo thời gian
CREATE INDEX IF NOT EXISTS idx_stock_clicks_time
    ON system.stock_clicks (clicked_at DESC);

-- Composite cho đếm unique sessions per ticker
CREATE INDEX IF NOT EXISTS idx_stock_clicks_ticker_session
    ON system.stock_clicks (ticker, session_id);

-- ────────────────────────────────────────────────────────────
-- 4. stock_search_logs — Mỗi lần user tìm kiếm mã cổ phiếu
-- ────────────────────────────────────────────────────────────
-- Thiết kế: 1 row = 1 search event
-- Hot stock search = GROUP BY keyword → COUNT DESC
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.stock_search_logs (
    id          BIGSERIAL    PRIMARY KEY,
    keyword     VARCHAR(255) NOT NULL,                             -- Từ khóa tìm kiếm (mã CK hoặc tên)
    session_id  VARCHAR(64)  NOT NULL DEFAULT 'anonymous',
    ip_address  VARCHAR(45),
    searched_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index cho hot stock search
CREATE INDEX IF NOT EXISTS idx_stock_search_logs_keyword
    ON system.stock_search_logs (keyword);

-- Index cho thống kê theo thời gian
CREATE INDEX IF NOT EXISTS idx_stock_search_logs_time
    ON system.stock_search_logs (searched_at DESC);

-- Composite cho trend theo keyword + thời gian
CREATE INDEX IF NOT EXISTS idx_stock_search_logs_keyword_time
    ON system.stock_search_logs (keyword, searched_at DESC);

-- ────────────────────────────────────────────────────────────
-- Quyền (tuỳ setup, uncomment nếu cần)
-- ────────────────────────────────────────────────────────────
-- ALTER TABLE system.article_clicks      OWNER TO admin;
-- ALTER TABLE system.search_logs         OWNER TO admin;
-- ALTER TABLE system.stock_clicks        OWNER TO admin;
-- ALTER TABLE system.stock_search_logs   OWNER TO admin;
