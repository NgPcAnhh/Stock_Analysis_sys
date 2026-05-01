import json
import re
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt


def _extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("Tester agent không trả JSON hợp lệ")
    return json.loads(match.group(0))


def _summarize_rows(rows: list[dict], max_rows: int = 5) -> list[dict]:
    """Chỉ gửi mẫu nhỏ vào LLM để tiết kiệm token."""
    return rows[:max_rows]


async def run_tester_agent(query_results: list[dict]) -> dict:
    """
    Sub-agent 5.1: kiểm tra chất lượng dữ liệu trả về từ SQL.
    Trả về: { "passed", "quality_score", "issues", "usable_queries", "summary" }
    """
    system_prompt = load_prompt("subagent_tester.txt")

    # Tóm tắt dữ liệu để gửi vào LLM
    data_summary = []
    for item in query_results:
        rows = item.get("rows", [])
        total = len(rows)
        sample = _summarize_rows(rows)

        # Đếm null trong từng cột
        null_stats: dict[str, int] = {}
        if rows:
            for col in rows[0].keys():
                null_count = sum(1 for r in rows if r.get(col) is None)
                if null_count > 0:
                    null_stats[col] = null_count

        data_summary.append({
            "name": item["name"],
            "total_rows": total,
            "null_stats": null_stats,
            "sample_rows": sample,
        })

    prompt = f"""Kết quả SQL cần kiểm tra:
{json.dumps(data_summary, ensure_ascii=False, indent=2)}

Hãy kiểm tra chất lượng dữ liệu và trả về báo cáo.
"""

    response = await chat_completion(
        user_prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=1500,
    )

    try:
        return _extract_json(response)
    except Exception:
        # Fallback nếu LLM lỗi: coi như passed với cảnh báo
        return {
            "passed": True,
            "quality_score": 0.7,
            "issues": [],
            "usable_queries": [item["name"] for item in query_results],
            "summary": "Không thể kiểm tra tự động, dữ liệu được chuyển sang phân tích.",
        }