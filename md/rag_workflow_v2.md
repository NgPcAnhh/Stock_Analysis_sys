# Tài liệu Workflow: Hybrid RAG + Text-to-SQL Chatbot Chứng khoán

**Phiên bản:** v2.0  
**Ngày:** 2026-04-23  
**Mục tiêu:** Blueprint vibe coding — mô tả đủ chi tiết để bắt đầu code ngay

---

## 0. Tổng quan kiến trúc

Chatbot được thiết kế theo mô hình **Hybrid: RAG + Text-to-SQL**, giải quyết bài toán chi phí embed toàn bộ dữ liệu chứng khoán (quá lớn, quá tốn kém) bằng cách:

- **Chỉ embed:** metadata schema + bảng `bctc` (đặc thù, khó query nếu không hiểu `ind_code`)
- **Còn lại dùng Text-to-SQL:** giá, tỷ số tài chính, realtime, tin tức → sinh SQL trực tiếp

Model AI dùng xuyên suốt hệ thống: **Gemma 4** tự deploy trên máy cá nhân qua **LM Studio**.

---

## 1. Kết nối LM Studio (Quan trọng)

LM Studio expose một OpenAI-compatible REST API. Mọi nơi trong code kết nối AI đều dùng base URL này:

```python
# config.py
LM_STUDIO_BASE_URL = "http://localhost:1234/v1"  # cổng mặc định LM Studio
LM_STUDIO_MODEL = "gemma-4"                       # tên model đang load trong LM Studio
LM_STUDIO_API_KEY = "lm-studio"                   # bất kỳ string nào, LM Studio không check

# Dùng với openai SDK (tương thích)
from openai import OpenAI

client = OpenAI(
    base_url=LM_STUDIO_BASE_URL,
    api_key=LM_STUDIO_API_KEY,
)

# Gọi chat completion
response = client.chat.completions.create(
    model=LM_STUDIO_MODEL,
    messages=[{"role": "user", "content": "test"}],
    temperature=0.0,
)

# Gọi embedding (cần bật embedding model riêng trong LM Studio)
embedding_response = client.embeddings.create(
    model="text-embedding-nomic-embed-text-v1.5",  # hoặc model embed đang load
    input="văn bản cần embed",
)
```

> **Lưu ý:** LM Studio phải đang chạy và đã load model trước khi gọi API. Kiểm tra tại `http://localhost:1234/v1/models`.

---

## 2. Chiến lược Embedding — Chỉ embed những gì cần thiết

Hệ thống chỉ sử dụng 2 tài liệu cốt lõi để đưa vào cơ sở dữ liệu vector. Cả hai tài liệu này đều sử dụng chung một cơ chế xử lý embedding (cùng model embedding qua LM Studio, cùng cách lưu trữ vector).

### 2.1 Những gì được embed (RAG knowledge base)

| Nguồn | Lý do embed | Chunk strategy |
|---|---|---|
| `metadata.md` — Mô tả metadata của dữ liệu | Cung cấp thông tin cấu trúc, ý nghĩa để model hiểu dữ liệu | **Semantic Chunking:** Phân tách dựa trên ý nghĩa ngữ cảnh (semantic embedding) thay vì cắt cứng theo độ dài, giúp giữ trọn vẹn ngữ nghĩa của từng phần cấu trúc. |
| Mô tả chỉ tiêu BCTC — Mô tả chi tiết các chỉ tiêu trong bảng `bctc` | Các `ind_code` hoặc chỉ tiêu BCTC mang tính đặc thù cao, cần RAG để hỗ trợ tra cứu chính xác | **Fixed-size Chunking:** Chia chunk với kích thước cố định (ví dụ: chunk size 500, overlap 50) để đảm bảo không bỏ sót bất kỳ chỉ tiêu nào khi tra cứu. |

### 2.2 Những gì KHÔNG embed (dùng SQL thay thế)

`history_price`, `realtime_quotes`, `financial_ratio`, `market_index`, `macro_economy`, `electric_board`, `news`, `event`, `vn_macro_yearly` — tất cả đều có cấu trúc rõ ràng, query trực tiếp bằng SQL nhanh và chính xác hơn.

### 2.3 Ingestion pipeline (chạy offline / scheduled)

Cơ chế xử lý (embedding) cho cả 2 loại tài liệu đều đi qua chung một luồng để đảm bảo tính nhất quán:

```text
[Tài liệu 1: metadata.md] ---> (Semantic Chunking)
                                                  \
                                                   +---> [Chung Embedding Model qua LM Studio] ---> [Vector DB (Qdrant/pgvector)]
                                                  /
[Tài liệu 2: Mô tả BCTC]  ---> (Fixed-size Chunking)
```

---

## 3. Workflow tổng thể (E2E)

```
[User nhập câu hỏi trên FE]
        |
        v
[FE: Intent Selector — UI button hoặc auto-detect]
   "Tìm kiếm số liệu" (Search)  |  "Phân tích chuyên sâu" (Analysis)
        |                                      |
        v                                      v
[NHÁNH A: DATA RETRIEVER]          [NHÁNH B: FINANCIAL ANALYST]
 - temperature: min (0.0~0.1)       - temperature: balanced (0.3~0.5)
 - System prompt: Data Retriever    - System prompt: Financial Analyst
 - Output: Bảng số liệu JSON/MD     - Output: Báo cáo phân tích + insight
        |                                      |
        v                                      v
[SQL Generator]                     [Multi-query SQL Generator]
 - 1 query đơn giản                  - Nhiều query: cùng kỳ, cùng ngành,
 - Trả đúng số theo yêu cầu           lịch sử nhiều năm
                                     - Join/aggregate phức tạp
        |                                      |
        v                                      v
[Execute SQL trên PostgreSQL — read-only]
        |
        v
[Kết quả SQL → format context]
        |
        |---(nếu cần RAG: bctc mapping, schema lookup)--->[Vector Search]
        |
        v
[LLM Answer Generator — Gemma 4 via LM Studio]
        |
        v
[Output + Citation]  →  [FE render]
```

---

## 4. Nhánh A — Data Retriever (Tìm kiếm số liệu)

### 4.1 System Prompt

> **Lưu ý quan trọng về cấu trúc thư mục:** Toàn bộ các file chứa nội dung system prompt của hệ thống (bao gồm prompt cho Data Retriever, Financial Analyst, v.v.) phải được đặt chung trong một folder riêng biệt mang tên `system_prompt` tại thư mục gốc hoặc trong thư mục `backend`, ví dụ: `BE/system_prompt/`.

```text
Bạn là Data Retriever — chuyên viên truy xuất dữ liệu chứng khoán Việt Nam.
Nhiệm vụ DUY NHẤT của bạn: sinh câu SQL chính xác để lấy đúng số liệu người dùng yêu cầu.

QUY TẮC BẮT BUỘC:
1. Chỉ trả về kết quả dạng BẢNG (markdown table hoặc JSON array). Không giải thích, không bình luận.
2. Luôn kèm theo: nguồn bảng dữ liệu, kỳ dữ liệu (quý/năm), thời điểm cập nhật gần nhất.
3. Nếu không tìm thấy dữ liệu, trả về: "Không có dữ liệu cho yêu cầu này" — không được đoán.
4. Không được SELECT * — chỉ lấy đúng các cột cần thiết.
5. Luôn thêm LIMIT hợp lý (tối đa 100 rows nếu không có yêu cầu cụ thể).
6. Với bảng bctc: luôn dùng ind_code thay vì ind_name.

SCHEMA bạn được phép truy vấn:
[chèn metadata.md tóm tắt ở đây]
```

### 4.2 Query Flow

```
User: "Doanh thu thuần của FPT 4 quý gần nhất?"
        |
        v
[Intent Extraction]
   ticker = ["FPT"]
   metric = "doanh_thu_thuan" (→ ind_code lookup từ vector DB)
   period = "4 quý gần nhất"
        |
        v
[RAG lookup: tìm ind_code cho "doanh thu thuần"]
   → ind_code = "doanh_thu_thuan" (từ bctc mapping)
        |
        v
[SQL Generation]
   SELECT ticker, year, quarter, value
   FROM bctc
   WHERE ticker = 'FPT'
     AND ind_code = 'doanh_thu_thuan'
   ORDER BY year DESC, quarter DESC
   LIMIT 4;
        |
        v
[Execute + format bảng]
   | Quý   | Năm  | Doanh thu thuần (tỷ VND) |
   |-------|------|--------------------------|
   | Q4    | 2025 | ...                      |
   ...
        |
        v
[LM Studio: format output ngắn gọn, kèm citation]
   temperature = 0.0
```

### 4.3 Temperature & Sampling

```python
retriever_config = {
    "temperature": 0.0,      # Deterministic — không sáng tạo
    "top_p": 1.0,
    "max_tokens": 1024,
    "stop": None,
}
```

---

## 5. Nhánh B — Financial Analyst (Phân tích chuyên sâu)

### 5.1 System Prompt

```
Bạn là chuyên viên phân tích tài chính cấp cao chuyên về thị trường chứng khoán Việt Nam.
Bạn có kiến thức sâu về phân tích cơ bản, phân tích ngành và đánh giá định giá cổ phiếu.

NHIỆM VỤ: Phân tích đa chiều dựa trên số liệu truy vấn được và đưa ra insight có giá trị.

PHƯƠNG PHÁP PHÂN TÍCH BẮT BUỘC:
1. So sánh cùng kỳ năm trước (YoY) — tăng/giảm bao nhiêu %, nguyên nhân gì?
2. So sánh với trung bình ngành (sector peer comparison).
3. Xu hướng 4-8 quý gần nhất — tăng trưởng bền vững hay biến động?
4. Các chỉ số định giá (P/E, P/B, ROE, ROA) so với lịch sử và ngành.
5. Rủi ro cần chú ý (đòn bẩy, nợ vay, dòng tiền).

ĐỊNH DẠNG OUTPUT BẮT BUỘC:
## Kết luận
[1-2 câu tóm tắt quan trọng nhất]

## Phân tích chi tiết
[Phân tích theo từng góc độ, có dẫn số liệu cụ thể]

## Số liệu chính
[Bảng tóm tắt các chỉ số quan trọng]

## Điểm cần lưu ý
[Rủi ro, điểm bất thường, câu hỏi cần làm rõ thêm]

## Nguồn dữ liệu
[Liệt kê bảng, kỳ dữ liệu đã dùng]

QUY TẮC:
- KHÔNG đưa ra khuyến nghị mua/bán trực tiếp.
- Nếu dữ liệu thiếu hoặc cũ (>3 tháng), cảnh báo rõ ràng trong output.
- Chỉ phân tích dựa trên số liệu thực tế — không suy đoán không có căn cứ.
```

### 5.2 Multi-Query Strategy

Với phân tích sâu, sinh nhiều SQL song song:

```python
analysis_queries = [
    # Query 1: Chỉ tiêu BCTC của ticker mục tiêu
    "SELECT ... FROM bctc WHERE ticker = '{ticker}' AND year >= {year-3}",
    
    # Query 2: Tỷ số tài chính so sánh nhiều năm
    "SELECT ... FROM financial_ratio WHERE ticker = '{ticker}' ORDER BY year DESC, quarter DESC LIMIT 12",
    
    # Query 3: Peer comparison trong cùng ngành (lấy top 5 cùng ICB sector)
    """
    SELECT fr.ticker, co.organ_short_name, co.icb_name2,
           fr.roe, fr.roa, fr.net_margin, fr.pe, fr.pb
    FROM financial_ratio fr
    JOIN company_overview co ON fr.ticker = co.ticker
    WHERE co.icb_name2 = (SELECT icb_name2 FROM company_overview WHERE ticker = '{ticker}')
      AND fr.year = {latest_year} AND fr.quarter = {latest_quarter}
    ORDER BY fr.market_cap DESC
    LIMIT 10
    """,
    
    # Query 4: Lịch sử giá + volume để nhìn xu hướng
    "SELECT trading_date, close, volume FROM history_price WHERE ticker = '{ticker}' ORDER BY trading_date DESC LIMIT 90",
    
    # Query 5: Tin tức gần đây
    "SELECT title, published, summary FROM news WHERE title ILIKE '%{ticker}%' ORDER BY published DESC LIMIT 5",
]
```

### 5.3 Temperature & Sampling

```python
analyst_config = {
    "temperature": 0.35,    # Balanced — có sáng tạo nhưng vẫn có căn cứ
    "top_p": 0.9,
    "max_tokens": 3000,
    "stop": None,
}
```

---

## 6. Query Router & Intent Detection

### 6.1 Logic phân loại intent

```python
# Cách 1: FE cho user chọn (đơn giản, tin cậy nhất)
# - Button "Tìm số liệu" → mode = "search"
# - Button "Phân tích" → mode = "analysis"

# Cách 2: Auto-detect bằng keyword matching
SEARCH_KEYWORDS = [
    "là bao nhiêu", "bằng bao nhiêu", "giá", "khối lượng", "EPS", "ROE", "P/E",
    "doanh thu", "lợi nhuận", "bảng", "số liệu", "thống kê", "cho tôi biết",
    "hiện tại", "gần nhất", "quý", "năm"
]

ANALYSIS_KEYWORDS = [
    "phân tích", "đánh giá", "nhận xét", "so sánh", "xu hướng", "triển vọng",
    "tại sao", "vì sao", "như thế nào", "có nên", "rủi ro", "cơ hội",
    "tăng trưởng", "bền vững", "định giá"
]

def detect_mode(user_query: str) -> str:
    query_lower = user_query.lower()
    search_score = sum(1 for kw in SEARCH_KEYWORDS if kw in query_lower)
    analysis_score = sum(1 for kw in ANALYSIS_KEYWORDS if kw in query_lower)
    
    if analysis_score > search_score:
        return "analysis"
    return "search"  # default to search nếu không rõ
```

### 6.2 Entity extraction (chạy trước khi vào router)

```python
# Dùng LM Studio để extract entity với temperature = 0
ENTITY_EXTRACTION_PROMPT = """
Trích xuất thông tin từ câu hỏi sau. Trả về JSON thuần, không có text thêm.

Câu hỏi: {query}

JSON schema:
{
  "tickers": [],          // Mã cổ phiếu, viết hoa, ví dụ ["FPT", "VNM"]
  "metrics": [],          // Chỉ tiêu tài chính, ví dụ ["ROE", "doanh thu thuần"]
  "period": {
    "type": "quarter|year|range|recent",
    "quarters": [],       // ["Q1/2025", "Q4/2024"]
    "years": [],          // [2023, 2024, 2025]
    "n_recent": null      // số kỳ gần nhất nếu dùng "3 quý gần nhất"
  },
  "sector": null,         // Ngành nếu có, ví dụ "ngân hàng"
  "comparison_mode": null // "peer" | "historical" | "sector_avg" | null
}
"""
```

---

## 7. SQL Generator — Chi tiết kỹ thuật

### 7.1 Bảng whitelist và rule

```python
ALLOWED_TABLES = [
    "history_price", "market_index", "owner", "company_overview",
    "bctc", "realtime_quotes", "macro_economy", "financial_ratio",
    "electric_board", "event", "news", "vn_macro_yearly"
]

SQL_RULES = """
RULES sinh SQL:
1. Chỉ dùng READ — tuyệt đối không INSERT, UPDATE, DELETE, DROP.
2. Luôn có WHERE ticker = '...' nếu câu hỏi về cổ phiếu cụ thể.
3. Bảng bctc: luôn filter bằng ind_code (không dùng ind_name).
4. Cột trading_date trong history_price là TEXT — cast trước khi so sánh ngày:
   WHERE trading_date::date >= '2025-01-01'
5. LIMIT tối đa 200 nếu không có yêu cầu cụ thể.
6. Dùng CTE nếu cần nhiều bước tính toán (WITH ... AS ...).
7. Schema: hethong_phantich_chungkhoan — prefix nếu cần.
"""
```

### 7.2 ind_code lookup flow (đặc thù bảng bctc)

```
User nhắc đến "doanh thu" hoặc "revenue"
        |
        v
[Semantic search trong vector DB — collection bctc_mapping]
   query: "doanh thu"
   top_k: 5
        |
        v
Kết quả:
   ind_code = "doanh_thu_thuan"    norm_name = "Doanh thu thuần"
   ind_code = "tong_doanh_thu"     norm_name = "Tổng doanh thu"
   ...
        |
        v
[Nếu duy nhất → dùng thẳng]
[Nếu nhiều kết quả → hỏi lại user hoặc dùng tất cả với OR]
```

---

## 8. Vector Search — Setup pgvector

```sql
-- Tạo extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Tạo bảng lưu chunks
CREATE TABLE chatbot_knowledge_base (
    id          SERIAL PRIMARY KEY,
    chunk_id    TEXT UNIQUE NOT NULL,       -- {source_type}:{source_id}:{chunk_no}
    content     TEXT NOT NULL,              -- text đã chunk
    embedding   VECTOR(768),               -- kích thước theo model embed
    source_type TEXT,                       -- "schema_doc" | "bctc_mapping" | "company_profile" | "doc"
    source_name TEXT,
    tickers     TEXT[],
    table_name  TEXT,
    period      TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Index cho similarity search
CREATE INDEX ON chatbot_knowledge_base
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Query similarity search
SELECT content, source_type, source_name, tickers,
       1 - (embedding <=> $1::vector) AS similarity
FROM chatbot_knowledge_base
WHERE source_type = ANY($2)          -- filter theo loại nguồn nếu cần
ORDER BY embedding <=> $1::vector
LIMIT $3;
```

---

## 9. Citation Format

Mỗi câu trả lời đều phải kèm citation. Format chuẩn:

```
[Nguồn: financial_ratio | FPT | Q4/2025 | Cập nhật: 2026-01-15]
[Nguồn: bctc | FPT | Q3/2025 | Doanh thu thuần]
[Nguồn: news | ID#4521 | 2026-04-20]
[Nguồn: company_overview | FPT | ICB: Công nghệ thông tin]
```

```python
def build_citation(source_type: str, **kwargs) -> str:
    parts = [f"Nguồn: {source_type}"]
    if "ticker" in kwargs: parts.append(kwargs["ticker"])
    if "period" in kwargs: parts.append(kwargs["period"])
    if "metric" in kwargs: parts.append(kwargs["metric"])
    if "as_of" in kwargs: parts.append(f"Cập nhật: {kwargs['as_of']}")
    return f"[{' | '.join(parts)}]"
```

---

## 10. API Contract

### Request

```
POST /api/v1/chat/ask
```

```json
{
  "session_id": "uuid",
  "message": "ROE của FPT 4 quý gần nhất so với ngành IT?",
  "mode": "auto",           // "search" | "analysis" | "auto"
  "context": {
    "tickers": ["FPT"],
    "period_hint": null
  }
}
```

### Response

```json
{
  "mode_used": "analysis",
  "answer": "## Kết luận\nROE của FPT đang ở mức...",
  "data_tables": [
    {
      "title": "ROE theo quý",
      "columns": ["ticker", "year", "quarter", "roe"],
      "rows": [["FPT", 2025, 4, 0.28], ...]
    }
  ],
  "citations": [
    {
      "source_type": "financial_ratio",
      "ticker": "FPT",
      "period": "Q4/2025",
      "as_of": "2026-01-10"
    }
  ],
  "sql_used": ["SELECT ..."],
  "confidence": 0.87,
  "data_freshness": "fresh",   // "fresh" | "stale" | "missing"
  "latency_ms": 1850,
  "trace_id": "abc-123"
}
```

### Streaming

```
POST /api/v1/chat/ask/stream   (SSE)
```

Events: `delta` | `citation` | `table_data` | `sql_preview` | `final` | `error`

---

## 11. Guardrails & Safety

```python
GUARDRAILS = {
    # Không write vào DB
    "sql_readonly": True,
    "sql_timeout_seconds": 10,
    "sql_max_rows": 200,
    
    # Không phát sinh khuyến nghị mua bán tuyệt đối
    "block_buy_sell_recommendation": True,
    
    # Cảnh báo data stale
    "stale_threshold_days": 90,
    
    # Giới hạn phạm vi câu hỏi
    "domain_filter": "finance_vietnam",  # chặn câu hỏi ngoài chủ đề
    
    # Không bịa số
    "hallucination_guard": "only_cite_retrieved_data",
}
```

Khi `data_freshness == "stale"`, bắt buộc thêm prefix vào answer:

```
⚠️ Dữ liệu sử dụng có thể đã cũ (cập nhật lần cuối: {as_of}). Kết quả chỉ mang tính tham khảo.
```

---

## 12. File & Folder Structure gợi ý

```text
BE/
├── system_prompt/               # Folder chứa toàn bộ nội dung system prompt
│   ├── data_retriever.txt       # System prompt + template Search
│   ├── financial_analyst.txt    # System prompt + template Analysis
│   └── entity_extract.txt       # Prompt extract entity
│
└── chatbot/
    ├── config.py                    # LM Studio URL, DB conn, params
    ├── main.py                      # FastAPI app entry point
    │
    ├── ingestion/
    │   ├── chunker.py               # Logic chunking metadata + bctc
    │   ├── embedder.py              # Gọi LM Studio embedding API
    │   └── indexer.py               # Ghi vào pgvector
    │
    ├── retrieval/
    │   ├── vector_search.py         # Semantic search pgvector
    │   └── ind_code_lookup.py       # Tra ind_code từ vector DB
    │
    ├── router/
    │   ├── intent_detector.py       # Phân loại search vs analysis
    │   └── entity_extractor.py      # Extract ticker, metric, period
    │
    ├── sql/
    │   ├── generator_search.py      # SQL đơn giản cho Search mode
    │   ├── generator_analysis.py    # Multi-SQL cho Analysis mode
    │   ├── executor.py              # Execute read-only, timeout
    │   └── formatter.py             # Kết quả SQL → context text
    │
    ├── llm/
    │   ├── client.py                # LM Studio OpenAI-compat client
    │   └── answer_generator.py      # Ghép context → gọi LM Studio
    │
    ├── citation/
    │   └── builder.py               # Build citation object
    │
    └── api/
        ├── routes.py                # /ask, /ask/stream
        └── schemas.py               # Pydantic models request/response
```

---

## 13. Lộ trình vibe coding (Phase theo tuần)

### Phase 1 — Tuần 1-2: Foundation
- [ ] Setup LM Studio kết nối, test ping model
- [ ] Setup pgvector, tạo bảng `chatbot_knowledge_base`
- [ ] Viết ingestion pipeline cho `metadata.md` + `bctc_description.md`
- [ ] API `/ask` cơ bản, chỉ mode Search, SQL đơn giản
- [ ] FE: chat box đơn giản, có toggle Search/Analysis

### Phase 2 — Tuần 3-4: SQL Generator nâng cao
- [ ] Entity extractor qua LM Studio
- [ ] `ind_code` lookup từ vector search
- [ ] Multi-query generator cho Analysis mode
- [ ] Peer comparison query (JOIN company_overview)
- [ ] Citation builder + data freshness check

### Phase 3 — Tuần 5-6: Polish
- [ ] Streaming SSE response
- [ ] Guardrails: stale warning, domain filter
- [ ] Logging + trace_id
- [ ] Monitoring dashboard ingestion + serving

---

## 14. Checklist nghiệm thu

- [ ] LM Studio connect thành công, model response < 3s first token
- [ ] `ind_code` lookup chính xác >95% với bộ test 50 chỉ tiêu
- [ ] Search mode trả bảng số liệu đúng, không có text thừa
- [ ] Analysis mode có đủ 5 phần output theo template
- [ ] 100% câu trả lời có citation hoặc thông báo thiếu dữ liệu
- [ ] Không có SQL write nào được thực thi
- [ ] Data stale được cảnh báo rõ ràng
- [ ] FE toggle Search/Analysis hoạt động đúng