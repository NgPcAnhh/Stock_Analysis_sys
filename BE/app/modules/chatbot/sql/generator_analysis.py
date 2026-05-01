import json
import re
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt


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
    system_prompt = load_prompt("analysis_sql_agent.txt")

    prompt = f"""Câu hỏi user:
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
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=3000,
    )
    return extract_json(response)