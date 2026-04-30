import json
import re
from app.modules.chatbot.llm.client import chat_completion


SYSTEM_PROMPT = """
Bạn là bộ trích xuất entity cho chatbot chứng khoán Việt Nam.
Chỉ trả về JSON thuần. Không giải thích.

Schema:
{
  "tickers": [],
  "metrics": [],
  "period": {
    "type": "quarter|year|range|recent|null",
    "quarters": [],
    "years": [],
    "n_recent": null
  },
  "sector": null,
  "comparison_mode": null
}
"""


def extract_json_block(text: str) -> dict:
    text = text.strip()

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)

    return json.loads(text)


async def extract_entities(message: str) -> dict:
    response = await chat_completion(
        user_prompt=f"Câu hỏi: {message}",
        system_prompt=SYSTEM_PROMPT,
        temperature=0.0,
        max_tokens=300,
    )

    try:
        return extract_json_block(response)
    except Exception:
        return {
            "tickers": [],
            "metrics": [],
            "period": {
                "type": None,
                "quarters": [],
                "years": [],
                "n_recent": None,
            },
            "sector": None,
            "comparison_mode": None,
        }