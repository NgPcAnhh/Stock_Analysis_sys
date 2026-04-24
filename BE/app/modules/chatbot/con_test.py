import requests

LM_STUDIO_CHAT_URL = "http://localhost:1234/api/v1/chat"
LM_STUDIO_MODEL = "google/gemma-4-e4b"


def test_connection():
    payload = {
        "model": LM_STUDIO_MODEL,
        "system_prompt": "Bạn là trợ lý AI. Trả lời ngắn gọn.",
        "input": "ping",
    }

    try:
        response = requests.post(
            LM_STUDIO_CHAT_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30,
        )
        response.raise_for_status()

        data = response.json()

        print("Kết nối tới LM Studio thành công")
        print(f"Gọi model {LM_STUDIO_MODEL} thành công")
        print("Phản hồi:")
        print(data)

    except requests.exceptions.RequestException as e:
        print("Lỗi kết nối tới LM Studio")
        print(f"Chi tiết lỗi: {e}")


if __name__ == "__main__":
    test_connection()