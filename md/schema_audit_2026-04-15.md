# Báo cáo kiểm tra schema database (read-only)

Ngày kiểm tra: 2026-04-15  
Phạm vi: schema `hethong_phantich_chungkhoan` và `system` trên Postgres runtime (`dwh-postgres`)  
Chế độ: chỉ đọc (không DDL/DML)

## 1) Môi trường kiểm tra

- DB runtime: PostgreSQL 16.12
- Container: `dwh-postgres`
- Kết nối: `postgresql://admin:***@localhost:5432/postgres`
- Nguồn đối chiếu tĩnh:
  - `BE/app/database/schema_v1.sql`
  - `BE/app/database/schema_system.sql`
  - `BE/app/database/indexes.sql`

## 2) Inventory runtime

### 2.1 Bảng dữ liệu

- `hethong_phantich_chungkhoan`: 12 bảng
- `system`: 16 bảng
- Tổng: 28 bảng

### 2.2 Bảng lớn theo dung lượng

1. `history_price`: ~840 MB (ước lượng ~4.68M rows)
2. `bctc`: ~496 MB (ước lượng ~2.38M rows)
3. `realtime_quotes`: ~169 MB (ước lượng ~370K rows)
4. `financial_ratio`: ~51 MB (ước lượng ~54K rows)

## 3) Phát hiện chính

## 3.1 Critical

1. `bctc` không có PRIMARY KEY ở runtime
- Runtime query `pg_constraint` trả 0 rows cho `bctc`.
- Trong file DDL tĩnh có khai báo PK `(ticker, year, quarter, ind_code)` nhưng trạng thái runtime hiện tại không có.
- Rủi ro: trùng dòng dữ liệu BCTC, join sai, tăng chi phí query và sai số tổng hợp.

2. Thiếu PK ở các bảng nghiệp vụ
- `owner`: không có PK.
- `event`: không có PK.
- Rủi ro: duplicate records không kiểm soát, update/delete khó định danh.

3. Không có FK ở schema nghiệp vụ chính
- Runtime FK chỉ có ở schema `system`; schema `hethong_phantich_chungkhoan` hiện không có FK.
- Có orphan dữ liệu theo ticker:
  - `bctc_orphan_ticker`: 12,712 rows
  - `financial_ratio_orphan_ticker`: 623 rows
  - `owner_orphan_ticker`: 926 rows
- Rủi ro: dữ liệu phân tích theo ticker thiếu nhất quán.

## 3.2 High

4. Dữ liệu thời gian dùng kiểu `text` ở bảng lớn
- `history_price.trading_date`: text
- `market_index.trading_date`: text
- `event.public_date`: text
- Rủi ro: tối ưu filter/sort theo thời gian kém, khó enforce định dạng ngày.

5. Dữ liệu realtime stale
- `realtime_quotes.max(ts) = 2026-01-31 10:45:09`
- Lag tại thời điểm kiểm tra: ~2 tháng 15 ngày
- `ticks_24h = 0`
- Rủi ro: chức năng realtime/websocket mất ý nghĩa nghiệp vụ nếu dashboard kỳ vọng dữ liệu live.

6. Dấu hiệu duplicate cao ở `owner`
- Top ticker duplicate count (owner rows): STB 244, VPB 194, VSC 188, VNM 184...
- Vì không có PK/unique business key nên duplicate có thể là lỗi ingest hoặc bản ghi lịch sử không phân biệt phiên bản.

## 3.3 Medium

7. Tỷ lệ seq scan cao trên một số bảng
- `bctc`: seq_scan cao, idx_scan bằng 0 ở snapshot thống kê.
- `stock_price_alerts`, `session_logs` cũng có seq_scan đáng kể.
- Lưu ý: `pg_stat_*` có thể bị ảnh hưởng bởi chưa `ANALYZE` hoặc workload gần đây.

8. Nhiều index có `idx_scan=0` trong snapshot
- Ví dụ: `idx_realtime_quotes_symbol_ts`, `financial_ratio_pkey`, một số index của MV và tracking.
- Cần theo dõi theo chu kỳ dài hơn trước khi kết luận index thừa.

## 4) Kết luận mức độ sẵn sàng dữ liệu

- **Mức tổng thể**: Trung bình, có rủi ro cao về toàn vẹn dữ liệu trên schema nghiệp vụ.
- **Điểm mạnh**: dữ liệu phong phú, volume lớn, có hệ thống tracking schema `system` tương đối chuẩn.
- **Điểm yếu trọng tâm**: thiếu khóa/ràng buộc ở schema chính và độ tươi dữ liệu realtime.

## 5) Khuyến nghị (chưa áp dụng trong phiên này)

1. Khôi phục PK cho `bctc` theo composite key chuẩn.
2. Bổ sung PK cho `owner`, `event` (hoặc surrogate key + unique business key).
3. Bổ sung FK mềm theo `ticker`/`symbol` hoặc tối thiểu kiểm tra orphan trong ETL.
4. Chuẩn hóa kiểu ngày `text -> date` cho `history_price`, `market_index`, `event.public_date`.
5. Thiết lập giám sát freshness cho `realtime_quotes` (SLA theo phút/phiên).
6. Rà soát index usage sau khi `ANALYZE` và theo dõi đủ chu kỳ workload.

## 6) Các truy vấn read-only đã dùng

```sql
SELECT current_database(), current_user, version();
SELECT table_schema, table_name FROM information_schema.tables ...;
SELECT ... FROM pg_class ... pg_total_relation_size ...;
SELECT ... FROM information_schema.table_constraints ...;
SELECT ... tables without PK ...;
SELECT ... FK map ...;
SELECT ... FROM pg_stat_user_tables ...;
SELECT ... FROM pg_stat_user_indexes ...;
SELECT MAX(ts), AGE(NOW(), MAX(ts)), ... FROM hethong_phantich_chungkhoan.realtime_quotes;
SELECT conname, contype, pg_get_constraintdef(...) FROM pg_constraint ... WHERE relname='bctc';
SELECT ... orphan ticker checks ...;
```

## 7) Ghi chú

Báo cáo này chỉ phản ánh snapshot tại thời điểm kiểm tra, không thực hiện thay đổi dữ liệu hay cấu trúc DB.