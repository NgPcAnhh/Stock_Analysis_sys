import re
from app.modules.chatbot.llm.client import chat_completion
from app.modules.chatbot.llm.prompt_loader import load_prompt


def format_llm_response(text: str) -> str:
    """
    Chuẩn hóa và làm đẹp câu trả lời (Markdown) từ LLM để UI hiển thị tốt hơn.
    """
    if not text:
        return text

    # 1. Đảm bảo luôn có 1 dòng trống trước các heading (##, ###)
    text = re.sub(r'([^\n])\n(#{2,4}\s)', r'\1\n\n\2', text)

    # 2. Đảm bảo có khoảng trắng chuẩn sau các gạch đầu dòng (vd "-Text" -> "- Text")
    text = re.sub(r'^([ \t]*[-*])[ \t]*([^\s*-])', r'\1 \2', text, flags=re.MULTILINE)

    # 3. Đảm bảo list (gạch đầu dòng) tách biệt với dòng text liền trước nó
    text = re.sub(r'([^\n])\n([ \t]*[-*]\s)', r'\1\n\n\2', text)

    # 4. Xóa khoảng trắng thừa ở cuối mỗi dòng
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)

    # 5. Dọn dẹp các dòng trống dư thừa (giới hạn tối đa 2 dòng \n liên tiếp)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


async def generate_financial_analysis(
    user_message: str,
    data_context: str,
    citations: list[dict],
) -> str:
    system_prompt = load_prompt("financial_analyst.txt")

    prompt = f"""Câu hỏi user:
{user_message}

Số liệu truy vấn được:
{data_context}

Citations:
{citations}

Hãy phân tích cho user.
"""
    raw_response = await chat_completion(
        user_prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.0,
        max_tokens=4000,
    )
    
    return format_llm_response(raw_response)