-- ============================================================
-- Performance indexes for high-concurrency queries
-- Run once on PostgreSQL to eliminate sequential scans
-- ============================================================
-- Schema: hethong_phantich_chungkhoan
-- ============================================================

SET search_path TO hethong_phantich_chungkhoan;

-- ────────────────────────────────────────────────────────────
-- history_price — used in EVERY ranked_dates CTE + JOINs
-- PK is (ticker, trading_date) but we need reverse order
-- ────────────────────────────────────────────────────────────
-- For ranked_dates CTE: GROUP BY trading_date ORDER BY DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hp_trading_date_desc
    ON history_price (trading_date DESC);

-- For JOINs: WHERE ticker = X AND trading_date = Y (covering index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hp_ticker_date_close
    ON history_price (ticker, trading_date DESC)
    INCLUDE (close, volume);

-- ────────────────────────────────────────────────────────────
-- electric_board — used for MAX(trading_date), sector heatmap
-- ────────────────────────────────────────────────────────────
-- For MAX(trading_date) WHERE match_price IS NOT NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eb_date_desc
    ON electric_board (trading_date DESC)
    WHERE match_price IS NOT NULL;

-- For ticker lookup on latest date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eb_ticker_date
    ON electric_board (ticker, trading_date DESC)
    INCLUDE (match_price, ref_price, accumulated_volume, exchange,
             foreign_buy_volume, foreign_sell_volume);

-- For foreign flow GROUP BY trading_date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eb_date_match
    ON electric_board (trading_date)
    WHERE match_price IS NOT NULL AND match_price > 0;

-- ────────────────────────────────────────────────────────────
-- company_overview — used for sector grouping (icb_name2)
-- ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_co_sector
    ON company_overview (icb_name2)
    WHERE icb_name2 IS NOT NULL;

-- For ticker lookup with sector name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_co_ticker_sector
    ON company_overview (ticker)
    INCLUDE (icb_name2, exchange, organ_short_name);

-- ────────────────────────────────────────────────────────────
-- financial_ratio — used for DISTINCT ON (ticker) ORDER BY year, quarter
-- ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fr_ticker_period
    ON financial_ratio (ticker, year DESC, quarter DESC)
    INCLUDE (pe, pb, eps, roe, roa, market_cap, dividend_yield, debt_to_equity);

-- ────────────────────────────────────────────────────────────
-- market_index — used for CROSS JOIN LATERAL (ORDER BY trading_date DESC LIMIT 1)
-- ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mi_ticker_date
    ON market_index (ticker, trading_date DESC)
    INCLUDE (close);

-- ────────────────────────────────────────────────────────────
-- bctc — used for earnings growth (DISTINCT ON ticker)
-- ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bctc_earnings
    ON bctc (ticker, year DESC, quarter DESC)
    WHERE ind_code = 'IS24' AND value IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- news — used for listing / search
-- ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_published
    ON news (published DESC NULLS LAST);

-- For ILIKE search (trigram index — requires pg_trgm extension)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_title_trgm
--     ON news USING gin (title gin_trgm_ops);
