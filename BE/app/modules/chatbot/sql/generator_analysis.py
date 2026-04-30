import json
import re
from app.modules.chatbot.llm.client import chat_completion


SYSTEM_PROMPT = """
Bạn là Analysis SQL Agent.

Vai trò của bạn KHÔNG phải phân tích văn bản.
Vai trò của bạn là sinh nhiều SQL SELECT để lấy số liệu phục vụ chuyên viên phân tích tài chính.

Bắt buộc tạo các nhóm query nếu có đủ dữ kiện:
1. Chỉ tiêu chính theo 4-8 quý gần nhất.
2. So sánh YoY.
3. Financial ratio: ROE, ROA, PE, PB, EPS nếu liên quan.
4. Peer comparison cùng ngành nếu có ticker.
5. Tin tức hoặc sự kiện gần đây nếu cần.

QUY TẮC:
- Chỉ SELECT/WITH.
- Không SELECT *.
- Luôn LIMIT hợp lý.
- Với bctc luôn dùng ind_code.
- Không đưa ra nhận định đầu tư.

Trả về JSON:
{
  "thought": "Mô tả suy nghĩ và lập luận của bạn khi chọn các chỉ tiêu, bảng và mốc thời gian. Tại sao lại cần những dữ liệu này?",
  "queries": [
    {
      "name": "Tên query",
      "sql": "SELECT ..."
    }
  ],
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


async def generate_analysis_sql(
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

Hãy sinh danh sách SQL phục vụ phân tích.
"""

    response = await chat_completion(
        user_prompt=prompt,
        system_prompt=SYSTEM_PROMPT,
        temperature=0.0,
        max_tokens=3000,
    )

    return extract_json(response)