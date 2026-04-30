import asyncio
import re
from uuid import uuid4
from fastapi import APIRouter, HTTPException

from app.modules.chatbot.api.schemas import ChatRequest, ChatResponse, DataTable
from app.modules.chatbot.router.intent_detector import detect_mode
from app.modules.chatbot.router.entity_extractor import extract_entities
from app.modules.chatbot.router.prompt_refiner import refine_prompt
from app.modules.chatbot.retrieval.vector_search import vector_search
from app.modules.chatbot.retrieval.ind_code_lookup import lookup_ind_code
from app.modules.chatbot.sql.generator_search import generate_search_sql
from app.modules.chatbot.sql.generator_analysis import generate_analysis_sql
from app.modules.chatbot.sql.executor import execute_sql
from app.modules.chatbot.sql.formatter import rows_to_markdown_table, format_analysis_context
from app.modules.chatbot.llm.answer_generator import generate_financial_analysis

router = APIRouter(prefix="/chat", tags=["AI Chatbot"])


class StepTimeoutError(Exception):
    def __init__(self, step: str):
        super().__init__(step)
        self.step = step


async def _with_step_timeout(step: str, timeout: float, coro, bypass_timeout: bool = False):
    if bypass_timeout:
        return await coro
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError as exc:
        raise StepTimeoutError(step) from exc


def _quick_entities(message: str) -> dict:
    raw_tokens = re.findall(r"\b[A-Z]{3,4}\b", message.upper())
    excluded = {
        "CUA", "VA", "CHO", "VOI", "THEO", "GAN", "NHAT", "NAM", "QUY",
        "ROE", "ROA", "EPS", "PE", "PB", "YOY", "TTM", "TOP", "MUA", "BAN"
    }
    tickers: list[str] = []
    for token in raw_tokens:
        if token in excluded:
            continue
        if token not in tickers:
            tickers.append(token)
    metrics = [kw for kw in ["roe", "roa", "eps", "pe", "pb", "doanh thu", "loi nhuan"] if kw in message.lower()]
    return {
        "tickers": tickers,
        "metrics": metrics,
        "period": {"type": None, "quarters": [], "years": [], "n_recent": None},
        "sector": None,
        "comparison_mode": None,
    }


def _build_fast_search_sql(message: str, entities: dict) -> dict | None:
    msg = message.lower()
    tickers = entities.get("tickers") or []
    ticker = tickers[0] if tickers else None
    if not ticker:
        return None

    metric_map = {
        "roe": "roe",
        "roa": "roa",
        "eps": "eps",
        "pe": "pe",
        "p/e": "pe",
        "pb": "pb",
        "p/b": "pb",
    }

    metric_key = None
    metric_col = None
    for key, col in metric_map.items():
        if key in msg:
            metric_key = key
            metric_col = col
            break

    if not metric_col:
        return None

    limit = 8
    if "4 quy" in msg or "4 quý" in msg:
        limit = 4
    elif "8 quy" in msg or "8 quý" in msg:
        limit = 8

    sql = f"""
        SELECT ticker, year, quarter, {metric_col}
        FROM hethong_phantich_chungkhoan.financial_ratio
        WHERE ticker = '{ticker}'
          AND {metric_col} IS NOT NULL
        ORDER BY year DESC, quarter DESC
        LIMIT {limit}
    """.strip()

    return {
        "sql": sql,
        "citations": [
            {
                "source_type": "financial_ratio",
                "ticker": ticker,
                "metric": metric_key,
                "period": f"recent_{limit}_quarters",
            }
        ],
    }


@router.post("/ask", response_model=ChatResponse)
async def ask_chatbot(req: ChatRequest):
    trace_id = str(uuid4())

    try:
        mode = detect_mode(req.message, req.mode)
        
        if mode == "analysis" and req.mode != "analysis":
            return ChatResponse(
                mode_used="auto",
                action_required="confirm_analysis",
                answer="Hệ thống nhận thấy câu hỏi của bạn cần phân tích chuyên sâu đa chiều. Bạn có muốn chuyển sang chế độ **Chuyên viên Phân tích (Analyst)** để tôi lập luận chi tiết hơn không?",
                thought_process="Đã phát hiện ý định phân tích phức tạp, cần xin phép user để kích hoạt các Agent chuyên sâu.",
                data_tables=[]
            )

        refined_message = await _with_step_timeout("refine_prompt", 30.0, refine_prompt(req.message), bypass_timeout=(mode == "analysis"))

        entities = _quick_entities(refined_message)

        if mode == "analysis":
            try:
                entities = await _with_step_timeout("extract_entities", 60.0, extract_entities(refined_message), bypass_timeout=True)
            except Exception:
                entities = _quick_entities(refined_message)

        metrics = entities.get("metrics") or []
        metric_text = " ".join(metrics) if metrics else refined_message

        if mode == "search":
            fast_sql_payload = _build_fast_search_sql(refined_message, entities)
            if fast_sql_payload:
                sql = fast_sql_payload["sql"]
                rows = await _with_step_timeout("execute_search_sql", 12.0, execute_sql(sql))
                return ChatResponse(
                    mode_used="search",
                    answer=rows_to_markdown_table(rows),
                    thought_process=None,
                    data_tables=[DataTable(title="Kết quả truy vấn", rows=rows)],
                    citations=fast_sql_payload.get("citations", []),
                    sql_used=[sql],
                    confidence=None,
                    data_freshness=None,
                    trace_id=trace_id,
                )

        schema_context = await _with_step_timeout(
            "vector_search_metadata",
            12.0,
            vector_search(
                query=refined_message,
                doc_type="metadata",
                top_k=3,
            ),
            bypass_timeout=(mode == "analysis")
        )

        ind_code_matches = await _with_step_timeout(
            "lookup_ind_code",
            12.0,
            lookup_ind_code(metric_text, top_k=3),
            bypass_timeout=(mode == "analysis")
        )

        if mode == "search":
            sql_payload = await _with_step_timeout(
                "generate_search_sql",
                300.0,
                generate_search_sql(
                    message=refined_message,
                    entities=entities,
                    rag_context=schema_context,
                    ind_code_matches=ind_code_matches,
                ),
            )

            sql = sql_payload["sql"]
            rows = await _with_step_timeout("execute_search_sql", 12.0, execute_sql(sql))

            answer = rows_to_markdown_table(rows)
            citations = sql_payload.get("citations", [])

            return ChatResponse(
                mode_used="search",
                answer=answer,
                thought_process=sql_payload.get("thought"),
                data_tables=[
                    DataTable(title="Kết quả truy vấn", rows=rows)
                ],
                citations=citations,
                sql_used=[sql],
                confidence=None,
                data_freshness=None,
                trace_id=trace_id,
            )

        sql_payload = await _with_step_timeout(
            "generate_analysis_sql",
            300.0,
            generate_analysis_sql(
                message=refined_message,
                entities=entities,
                rag_context=schema_context,
                ind_code_matches=ind_code_matches,
            ),
            bypass_timeout=True
        )

        query_results = []
        sql_used = []

        for q in sql_payload.get("queries", []):
            name = q["name"]
            sql = q["sql"]
            rows = await _with_step_timeout("execute_analysis_sql", 12.0, execute_sql(sql), bypass_timeout=True)

            query_results.append({
                "name": name,
                "sql": sql,
                "rows": rows,
            })
            sql_used.append(sql)

        data_context = format_analysis_context(query_results)

        answer = await _with_step_timeout(
            "generate_financial_analysis",
            300.0,
            generate_financial_analysis(
                user_message=refined_message,
                data_context=data_context,
                citations=sql_payload.get("citations", []),
            ),
            bypass_timeout=True
        )

        return ChatResponse(
            mode_used="analysis",
            answer=answer,
            thought_process=sql_payload.get("thought"),
            data_tables=[
                DataTable(title=item["name"], rows=item["rows"])
                for item in query_results
            ],
            citations=sql_payload.get("citations", []),
            sql_used=sql_used,
            confidence=None,
            data_freshness=None,
            trace_id=trace_id,
        )

    except StepTimeoutError as e:
        raise HTTPException(status_code=504, detail={
            "trace_id": trace_id,
            "error": f"Chatbot processing timed out at step: {e.step}",
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "trace_id": trace_id,
            "error": str(e),
        })