import json
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt
from app.modules.chatbot.sql.formatter import format_analysis_context


async def run_insight_agent(
    user_message: str,
    query_results: list[dict],
    tester_report: dict,
    citations: list[dict],
) -> str:
    """
    Sub-agent 5.2: tổng hợp toàn bộ dữ liệu → bản phân tích hoàn thiện.
    Chỉ dùng các query đã được Tester đánh dấu là usable.
    """
    system_prompt = load_prompt("subagent_insight.txt")

    # Lọc chỉ lấy query usable theo Tester
    usable_names = set(tester_report.get("usable_queries", []))
    if usable_names:
        usable_results = [r for r in query_results if r["name"] in usable_names]
    else:
        usable_results = query_results  # fallback dùng tất cả

    data_context = format_analysis_context(usable_results)

    # Đính kèm báo cáo Tester để Insight biết cảnh báo nào cần nêu
    tester_notes = ""
    if tester_report.get("issues"):
        issues_text = "\n".join(
            f"- [{i['severity'].upper()}] {i['query_name']}: {i['description']}"
            for i in tester_report["issues"]
        )
        tester_notes = f"\n\nCẢNH BÁO TỪ TESTER DATA:\n{issues_text}"

    prompt = f"""Câu hỏi user:
{user_message}

Dữ liệu đã truy vấn:
{data_context}{tester_notes}

Citations:
{json.dumps(citations, ensure_ascii=False, indent=2)}

Chất lượng dữ liệu (Tester): {tester_report.get('summary', 'Không có báo cáo')}

Hãy viết bản phân tích hoàn thiện.
"""

    return await chat_completion(
        user_prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.5,
        max_tokens=4000,
    )