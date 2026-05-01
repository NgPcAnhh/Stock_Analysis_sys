import asyncio
import json
import re
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt
from app.modules.chatbot.sql.executor import execute_sql
from app.modules.chatbot.agents.subagents.yoy_query_agent import run_yoy_query_agent
from app.modules.chatbot.agents.subagents.peer_query_agent import run_peer_query_agent
from app.modules.chatbot.agents.subagents.tester_agent import run_tester_agent
from app.modules.chatbot.agents.subagents.insight_agent import run_insight_agent


def _extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("Analyst agent không trả JSON hợp lệ")
    return json.loads(match.group(0))


async def _execute_queries(queries: list[dict]) -> list[dict]:
    """Thực thi danh sách query song song, bỏ qua lỗi."""
    async def _exec_one(q: dict) -> dict | None:
        try:
            rows = await execute_sql(q["sql"])
            return {
                "name": q["name"],
                "sql": q["sql"],
                "purpose": q.get("purpose", ""),
                "rows": rows,
            }
        except Exception as e:
            return {
                "name": q["name"],
                "sql": q["sql"],
                "purpose": q.get("purpose", ""),
                "rows": [],
                "error": str(e),
            }

    results = await asyncio.gather(*[_exec_one(q) for q in queries])
    return [r for r in results if r is not None]


async def run_analyst_agent(
    message: str,
    entities: dict,
    schema_context: list[dict],
    ind_code_matches: list[dict],
) -> dict:
    """
    Agent Analyst điều phối toàn bộ pipeline phân tích:

    Bước 1 — Lập kế hoạch: quyết định cần sub-agent nào
    Bước 2 — Song song:
        5.1a Sub-agent YoY Query    (nếu need_yoy)
        5.1b Sub-agent Peer Query   (nếu need_peer)
    Bước 3 — Thực thi SQL song song
    Bước 4 — Sub-agent Tester Data kiểm tra chất lượng
    Bước 5 — Sub-agent Insight tổng hợp → bản phân tích hoàn thiện

    Returns:
        {
            "answer": str,
            "query_results": list[dict],
            "sql_used": list[str],
            "citations": list[dict],
            "thought": str,
            "tester_report": dict,
        }
    """

    # ── Bước 1: Lập kế hoạch ─────────────────────────────────────────
    plan_system = load_prompt("agent_analyst.txt")
    plan_prompt = f"""Câu hỏi user:
{message}

Entities:
{json.dumps(entities, ensure_ascii=False, indent=2)}

Hãy lập kế hoạch phân tích.
"""
    plan_raw = await chat_completion(
        user_prompt=plan_prompt,
        system_prompt=plan_system,
        temperature=0.0,
        max_tokens=500,
    )

    try:
        plan = _extract_json(plan_raw)
    except Exception:
        # Fallback: kích hoạt cả hai sub-agent
        plan = {
            "need_yoy": True,
            "need_peer": bool(entities.get("tickers")),
            "yoy_focus": "Phân tích xu hướng các chỉ tiêu tài chính theo quý",
            "peer_focus": "So sánh với các công ty cùng ngành",
            "reasoning": "Fallback plan",
        }

    need_yoy: bool = plan.get("need_yoy", True)
    need_peer: bool = plan.get("need_peer", False)
    yoy_focus: str = plan.get("yoy_focus", "")
    peer_focus: str = plan.get("peer_focus", "")
    thought: str = plan.get("reasoning", "")

    # ── Bước 2: Chạy song song sub-agent query ───────────────────────
    async def _empty_yoy():
        return {"queries": [], "citations": [], "thought": "Không cần YoY"}

    yoy_task = (
        run_yoy_query_agent(message, entities, schema_context, ind_code_matches, yoy_focus)
        if need_yoy
        else _empty_yoy()
    )

    async def _empty_peer():
        return {"queries": [], "citations": [], "thought": "Không cần Peer"}

    peer_task = (
        run_peer_query_agent(message, entities, schema_context, ind_code_matches, peer_focus)
        if need_peer
        else _empty_peer()
    )

    yoy_payload, peer_payload = await asyncio.gather(yoy_task, peer_task)

    # Gộp toàn bộ query + citations
    all_queries: list[dict] = [
        *yoy_payload.get("queries", []),
        *peer_payload.get("queries", []),
    ]
    citations: list[dict] = [
        *yoy_payload.get("citations", []),
        *peer_payload.get("citations", []),
    ]

    # ── Bước 3: Thực thi SQL song song ───────────────────────────────
    query_results = await _execute_queries(all_queries)
    sql_used = [r["sql"] for r in query_results]

    # ── Bước 4: Tester Data ───────────────────────────────────────────
    tester_report = await run_tester_agent(query_results)

    # ── Bước 5: Insight Agent → bản phân tích hoàn thiện ─────────────
    answer = await run_insight_agent(
        user_message=message,
        query_results=query_results,
        tester_report=tester_report,
        citations=citations,
    )

    return {
        "answer": answer,
        "query_results": query_results,
        "sql_used": sql_used,
        "citations": citations,
        "thought": (
            f"**Kế hoạch:** {thought}\n\n"
            f"**YoY:** {yoy_payload.get('thought', '')}\n\n"
            f"**Peer:** {peer_payload.get('thought', '')}\n\n"
            f"**Tester:** {tester_report.get('summary', '')}"
        ),
        "tester_report": tester_report,
    }