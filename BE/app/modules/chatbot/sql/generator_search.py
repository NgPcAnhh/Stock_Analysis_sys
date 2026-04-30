import json
import re
from app.modules.chatbot.llm.client import chat_completion


SYSTEM_PROMPT = """
Bạn là Data Retriever — chuyên sinh SQL truy xuất dữ liệu chứng khoán Việt Nam.

NHIỆM VỤ:
- Sinh 1 câu SQL SELECT chính xác.
- Không giải thích.
- Không INSERT/UPDATE/DELETE/DROP/ALTER.
- Không SELECT *.
- Luôn LIMIT tối đa 100 nếu user không yêu cầu cụ thể.
- Với bảng bctc, luôn dùng ind_code, không dùng ind_name.

Trả về JSON:
{
  "thought": "Tóm tắt ngắn gọn lập luận tại sao chọn bảng/cột và chỉ tiêu đó.",
  "sql": "...",
  "citations": [
    {"source_type": "...", "ticker": "...", "period": "...", "metric": "..."}
  ]
}
"""


def extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("LLM không trả JSON hợp lệ")
    return json.loads(match.group(0))


async def generate_search_sql(
    message: str,
    entities: dict,
    rag_context: list[dict],
    ind_code_matches: list[dict],
) -> dict:
    prompt = f"""
Câu hỏi user:
{message}

Entities:
{json.dumps(entities, ensure_ascii=False, indent=2)}

BCTC ind_code candidates:
{json.dumps(ind_code_matches, ensure_ascii=False, indent=2)}

Schema/RAG context:
{json.dumps(rag_context, ensure_ascii=False, indent=2)}

Hãy sinh SQL.
"""

    response = await chat_completion(
        user_prompt=prompt,
        system_prompt=SYSTEM_PROMPT,
        temperature=0.0,
        max_tokens=2000,
    )

    return extract_json(response)