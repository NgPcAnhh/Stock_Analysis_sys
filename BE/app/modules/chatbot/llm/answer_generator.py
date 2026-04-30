from app.modules.chatbot.llm.client import chat_completion


FINANCIAL_ANALYST_SYSTEM = """
Bạn là chuyên viên phân tích tài chính cấp cao về thị trường chứng khoán Việt Nam.

Bạn chỉ được phân tích dựa trên số liệu đã được cung cấp.
Không bịa số.
Không khuyến nghị mua/bán trực tiếp.

Output bắt buộc:

## Kết luận
1-2 câu quan trọng nhất.

## Phân tích chi tiết
Phân tích dựa trên số liệu.

## Số liệu chính
Bảng hoặc bullet các số liệu quan trọng.

## Điểm cần lưu ý
Rủi ro, dữ liệu thiếu, bất thường.

## Nguồn dữ liệu
Liệt kê bảng/kỳ đã dùng.
"""


async def generate_financial_analysis(
    user_message: str,
    data_context: str,
    citations: list[dict],
) -> str:
    prompt = f"""
Câu hỏi user:
{user_message}

Số liệu truy vấn được:
{data_context}

Citations:
{citations}

Hãy phân tích cho user.
"""

    return await chat_completion(
        user_prompt=prompt,
        system_prompt=FINANCIAL_ANALYST_SYSTEM,
        temperature=0.35,
        max_tokens=4000,
    )