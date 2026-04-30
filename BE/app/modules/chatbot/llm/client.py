import httpx
from app.core.config import get_settings

settings = get_settings()


def _openai_chat_url_from(url: str) -> str:
    cleaned = url.rstrip("/")
    if cleaned.endswith("/api/v1/chat"):
        return cleaned[: -len("/api/v1/chat")] + "/v1/chat/completions"
    if cleaned.endswith("/v1/chat/completions"):
        return cleaned
    if cleaned.endswith("/v1"):
        return cleaned + "/chat/completions"
    return cleaned + "/v1/chat/completions"


def _legacy_chat_url_from(url: str) -> str:
    cleaned = url.rstrip("/")
    if cleaned.endswith("/v1/chat/completions"):
        return cleaned[: -len("/v1/chat/completions")] + "/api/v1/chat"
    if cleaned.endswith("/api/v1/chat"):
        return cleaned
    return cleaned + "/api/v1/chat"


def _extract_text_output(data: dict) -> str:
    if "output" in data and isinstance(data["output"], str):
        return data["output"]

    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        message = choices[0].get("message", {})
        content = message.get("content")
        if isinstance(content, str):
            return content

    return str(data)


async def chat_completion(
    user_prompt: str,
    system_prompt: str = "",
    temperature: float = 0.0,
    max_tokens: int = 2048,
) -> str:
    legacy_payload = {
        "model": settings.LM_STUDIO_CHAT_MODEL,
        "system_prompt": system_prompt,
        "input": user_prompt,
        "temperature": temperature,
    }   

    openai_payload = {
        "model": settings.LM_STUDIO_CHAT_MODEL,
        "messages": [
            *([{"role": "system", "content": system_prompt}] if system_prompt else []),
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_completion_tokens": max_tokens,
    }

    preferred_url = settings.LM_STUDIO_CHAT_URL
    fallback_url = (
        _legacy_chat_url_from(preferred_url)
        if preferred_url.rstrip("/").endswith("/v1/chat/completions")
        else _openai_chat_url_from(preferred_url)
    )

    preferred_payload = (
        openai_payload
        if preferred_url.rstrip("/").endswith("/v1/chat/completions")
        else legacy_payload
    )
    fallback_payload = legacy_payload if preferred_payload is openai_payload else openai_payload

    first_error: str | None = None

    async with httpx.AsyncClient(timeout=300.0) as client:
        for url, payload in ((preferred_url, preferred_payload), (fallback_url, fallback_payload)):
            try:
                res = await client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                return _extract_text_output(data)
            except Exception as exc:
                if first_error is None:
                    first_error = f"{url} -> {exc}"
                else:
                    raise RuntimeError(f"LLM chat call failed. First: {first_error}; Second: {url} -> {exc}") from exc

    raise RuntimeError(f"LLM chat call failed: {first_error}")


async def embed_text(text: str) -> list[float]:
    payload = {
        "model": settings.LM_STUDIO_EMBED_MODEL,
        "input": [text],
    }

    async with httpx.AsyncClient(timeout=120) as client:
        res = await client.post(settings.LM_STUDIO_EMBED_URL, json=payload)
        res.raise_for_status()
        data = res.json()

    return data["data"][0]["embedding"]