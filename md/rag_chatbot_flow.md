# Tài liệu chi tiết xây dựng luồng RAG Chatbot hỏi đáp thị trường chứng khoán

Phiên bản: v1.0  
Ngày: 2026-04-15  
Ngôn ngữ: Tiếng Việt

## 1) Mục tiêu

Xây dựng chatbot hỏi đáp về thị trường chứng khoán Việt Nam, trả lời dựa trên dữ liệu nội bộ hệ thống (giá, BCTC, chỉ số tài chính, tin tức, vĩ mô), có trích dẫn nguồn và hạn chế hallucination.

## 2) Mục tiêu nghiệp vụ

1. Trả lời nhanh câu hỏi nhà đầu tư cá nhân:
- “ROE của FPT 3 năm gần nhất?”
- “Mã ngân hàng nào có NIM cao nhất quý gần đây?”
- “Giá VNM giảm bao nhiêu từ đầu năm?”
- “Tin mới nhất ảnh hưởng nhóm bất động sản?”

2. Trả lời có căn cứ:
- Có citation nguồn dữ liệu + thời điểm dữ liệu.
- Có cảnh báo khi dữ liệu thiếu hoặc stale.

3. Khả năng mở rộng:
- Bổ sung nguồn dữ liệu mới (báo cáo PDF, phân tích nội bộ, macro feeds).
- Hỗ trợ chế độ streaming câu trả lời.

## 3) Dữ liệu đầu vào cho RAG

## 3.1 Nguồn dữ liệu chính hiện có

Schema `hethong_phantich_chungkhoan`:
- `history_price`: giá lịch sử EOD
- `realtime_quotes`: quote realtime/tick
- `bctc`: chỉ tiêu BCTC chuẩn hóa
- `financial_ratio`: tỷ số tài chính
- `company_overview`: hồ sơ doanh nghiệp/ngành
- `news`: tin tức thị trường
- `market_index`, `macro_economy`, `vn_macro_yearly`

Schema `system`:
- logs tương tác người dùng (gợi ý hot topics, personalization nhẹ)

Nguồn tài liệu nội bộ trong thư mục `md/`:
- tài liệu dashboard theo ngành
- tài liệu phân tích định lượng
- bối cảnh kiến trúc hệ thống

## 3.2 Phân loại tri thức

1. Structured facts (SQL-first)
- số liệu định lượng: EPS, ROE, P/E, giá, volume

2. Semi-structured text
- mô tả doanh nghiệp, event, summary news

3. Unstructured docs
- tài liệu nghiệp vụ markdown/PDF

## 4) Kiến trúc tổng thể

```text
[Data Sources]
  |-- PostgreSQL tables (price, bctc, ratios, news, macro)
  |-- Internal docs (md/pdf)
          |
          v
[Ingestion + Normalization Pipeline]
  |-- Extract
  |-- Clean/normalize entities (ticker, sector, period)
  |-- Chunking + metadata enrichment
          |
          v
[Embedding + Indexing]
  |-- Embedding model
  |-- Vector DB (Qdrant/pgvector)
  |-- Hybrid index (vector + keyword/BM25)
          |
          v
[Retrieval Orchestrator]
  |-- Query understanding (intent, entities)
  |-- Router: SQL tool vs RAG vs hybrid
  |-- Re-ranker + filters (ticker/date/source)
          |
          v
[LLM Answer Generator]
  |-- Grounded prompt
  |-- Citation formatter
  |-- Safety/guardrails
          |
          v
[Chat API + Frontend Chat UI]
  |-- Streaming response
  |-- Session memory
  |-- Feedback loop
```

## 5) Luồng xử lý E2E chi tiết

## 5.1 Luồng ingest/index (offline + near-real-time)

Bước 1: Extract
- Lấy dữ liệu theo batch từ Postgres (incremental theo `import_time`, `inserted_at`, `ts`).
- Lấy tài liệu từ `md/`, có thể mở rộng sang object storage.

Bước 2: Normalize
- Chuẩn hóa ticker uppercase.
- Chuẩn hóa kỳ thời gian (`Q1/2025`, `FY2025`, `YYYY-MM-DD`).
- Chuẩn hóa đơn vị (VND, tỷ VND, triệu CP).

Bước 3: Chunking
- Với bảng dạng facts: chunk theo “entity + period + metric group”.
- Với tin tức/tài liệu: chunk theo đoạn 300-800 tokens, overlap 50-120 tokens.

Bước 4: Metadata enrichment
- Metadata bắt buộc:
  - `source_type` (`sql_table`, `news`, `doc`)
  - `source_name`
  - `source_id`
  - `ticker[]`
  - `sector`
  - `period`
  - `published_at` / `as_of`
  - `language`
  - `freshness_score`

Bước 5: Embedding + index
- Tạo embedding cho chunk text.
- Ghi vector vào vector DB.
- Đồng thời lưu sparse index (BM25/keyword) để hybrid retrieval.

Bước 6: Validation index
- Kiểm tra tỷ lệ chunk lỗi, duplicate hash, metadata thiếu.
- Báo cáo ingestion dashboard.

## 5.2 Luồng truy vấn online

Bước 1: Query understanding
- NER/intent:
  - ticker(s), ngành, chỉ số, thời gian, loại câu hỏi.
- Ví dụ intent:
  - `numerical_compare`, `trend_explain`, `news_summary`, `valuation_screen`.

Bước 2: Retrieval strategy selection
- SQL-first nếu câu hỏi thuần số liệu định lượng.
- RAG-first nếu câu hỏi giải thích/ngữ cảnh/tin tức.
- Hybrid nếu vừa cần số liệu vừa cần giải thích.

Bước 3: Candidate retrieval
- Vector top-k (k=20-50).
- Keyword search top-k.
- Filter metadata theo ticker/date/sector/source.

Bước 4: Re-ranking
- Cross-encoder hoặc LLM re-ranker để lấy top-n context cuối (n=5-12).

Bước 5: Grounded generation
- Prompt ép buộc chỉ trả lời dựa trên context truy hồi.
- Nếu không đủ chứng cứ: trả lời “không đủ dữ liệu” + gợi ý câu hỏi bổ sung.

Bước 6: Citation + output shaping
- Trả lời kèm citation theo format:
  - `[Nguồn: news#123 | 2026-04-01]`
  - `[Nguồn: financial_ratio | FPT | Q4/2025]`

Bước 7: Logging + feedback
- Log query, retrieved docs, latency, token usage, user feedback.

## 6) Query Router: SQL vs RAG

## 6.1 Khi dùng SQL tool

Dùng khi câu hỏi dạng:
- “ROE của VCB quý gần nhất là bao nhiêu?”
- “Top 10 mã có P/E thấp nhất ngành ngân hàng?”

Nguyên tắc:
- Sinh SQL từ template an toàn, whitelist bảng/cột.
- Giới hạn `LIMIT`, timeout, read-only transaction.
- Chuẩn hóa kết quả thành context văn bản ngắn cho LLM tóm tắt.

## 6.2 Khi dùng RAG text

Dùng khi câu hỏi dạng:
- “Vì sao cổ phiếu nhóm thép giảm gần đây?”
- “Tóm tắt tin tức ảnh hưởng đến FPT tuần này.”

## 6.3 Khi dùng Hybrid

- Truy SQL lấy facts + truy vector lấy ngữ cảnh.
- LLM sinh câu trả lời kết hợp facts và narrative.

## 7) Thiết kế prompt và guardrails

## 7.1 System prompt cốt lõi

- Vai trò: trợ lý phân tích chứng khoán Việt Nam.
- Chỉ dùng dữ liệu truy hồi.
- Không đưa khuyến nghị mua bán chắc chắn.
- Nếu dữ liệu cũ/stale thì cảnh báo rõ.

## 7.2 Prompt template

1. User question
2. Structured facts (nếu có)
3. Retrieved passages + metadata
4. Required output format:
- `Kết luận ngắn`
- `Phân tích`
- `Số liệu chính`
- `Nguồn tham chiếu`
- `Mức độ tin cậy`

## 7.3 Guardrails

- Chặn nội dung ngoài phạm vi tài chính/chứng khoán nếu không liên quan.
- Không tạo số liệu không có nguồn.
- Không dùng dữ liệu quá hạn mà không cảnh báo.
- PII redaction nếu log có dữ liệu nhạy cảm.

## 8) API contract đề xuất

## 8.1 Backend

`POST /api/v1/chat/ask`

Request:
```json
{
  "session_id": "uuid",
  "message": "ROE của FPT 3 năm gần nhất?",
  "context": {
    "tickers": ["FPT"],
    "period_hint": "3Y",
    "mode": "auto"
  }
}
```

Response:
```json
{
  "answer": "...",
  "citations": [
    {
      "source_type": "financial_ratio",
      "source_ref": "FPT-Q4-2025",
      "as_of": "2025-12-31"
    }
  ],
  "confidence": 0.86,
  "latency_ms": 1320,
  "trace_id": "..."
}
```

## 8.2 Streaming

`POST /api/v1/chat/ask/stream` (SSE/WebSocket)
- event: `delta`, `citation`, `final`, `error`

## 9) Thiết kế dữ liệu vector index

## 9.1 Collection đề xuất

1. `stock_news_chunks`
2. `financial_docs_chunks`
3. `company_profile_chunks`
4. `sql_fact_narratives` (facts đã serialize thành câu)

## 9.2 ID strategy

`{source_type}:{source_id}:{chunk_no}:{version_hash}`

## 9.3 Metadata index

- keyword filter: `ticker`, `sector`, `period`, `published_at`
- freshness ranking: ưu tiên nguồn mới hơn

## 10) Đánh giá chất lượng (Evaluation)

## 10.1 Bộ metric online

- Faithfulness
- Answer relevance
- Citation precision
- Retrieval hit-rate
- Latency p50/p95
- Cost per question

## 10.2 Bộ test offline

- Golden set 200-500 câu hỏi tiếng Việt theo domain:
  - fundamentals
  - technical/macro
  - news-driven explanation
  - cross-ticker compare

## 10.3 Tiêu chí pass giai đoạn đầu

- Faithfulness >= 0.85
- Citation precision >= 0.9
- p95 latency <= 3.5s (không streaming) hoặc first token <= 1.2s (streaming)

## 11) Vận hành và giám sát

1. Dashboard bắt buộc
- ingestion success/fail
- embedding queue lag
- retrieval latency
- LLM latency/token
- feedback thumbs up/down

2. Alerting
- realtime data stale
- index build fail
- citation missing ratio tăng đột biến

3. Tracing
- mỗi request có `trace_id`
- lưu top retrieved docs + điểm rank

## 12) Bảo mật và tuân thủ

- Read-only DB user cho query tool.
- API key/secret qua env + secret manager.
- Mask dữ liệu nhạy cảm trong logs.
- Rate limit chat endpoints.
- Audit log cho admin actions.

## 13) Lộ trình triển khai theo phase

## Phase 1 (2-3 tuần): MVP
- Chat API cơ bản
- RAG từ `news` + `company_overview` + markdown docs
- Citation cơ bản
- FE chat box đơn giản

## Phase 2 (2-4 tuần): Hybrid SQL + RAG
- Query router
- SQL templates cho FAQ định lượng
- Re-ranker
- Monitoring dashboard

## Phase 3 (3-4 tuần): Production hardening
- Evaluation pipeline tự động
- Prompt safety nâng cao
- Caching + tối ưu chi phí
- A/B test prompt/retrieval

## 14) Checklist nghiệm thu

1. Chat trả lời được >= 80% bộ câu hỏi chuẩn.
2. 100% câu trả lời có nguồn hoặc thông báo thiếu nguồn.
3. Không phát sinh write vào DB nghiệp vụ từ luồng chat.
4. Dữ liệu stale được cảnh báo rõ ràng trong answer.
5. Có dashboard giám sát đầy đủ ingestion + serving.

## 15) Gợi ý stack kỹ thuật (tham khảo)

- Orchestration: LangChain hoặc LlamaIndex
- Vector DB: Qdrant hoặc pgvector
- Embedding: OpenAI / multilingual-e5 / bge-m3
- Re-ranker: bge-reranker / cross-encoder
- LLM: model tiếng Việt/đa ngôn ngữ phù hợp latency-cost
- API: FastAPI + SSE
- FE: Next.js chat UI (stream rendering)

## 16) Rủi ro và giảm thiểu

1. Rủi ro dữ liệu không nhất quán ticker
- Giảm thiểu: canonical ticker map + validation ETL.

2. Rủi ro answer sai khi thiếu context
- Giảm thiểu: confidence threshold + abstain policy.

3. Rủi ro chi phí cao
- Giảm thiểu: semantic cache, prompt compression, model tiering.

4. Rủi ro độ trễ cao
- Giảm thiểu: hybrid top-k tối ưu, re-rank giới hạn, streaming.

---

Tài liệu này là blueprint triển khai chi tiết để bắt đầu xây dựng RAG chatbot trên nền dữ liệu chứng khoán hiện có của hệ thống.