"""
LLM client:
- chat_completion → OpenAI (httpx thuần)
- embed_text      → BGE M3 qua LM Studio / local embedding server
"""

import httpx
import logging
import asyncio
from openai import AsyncOpenAI
from app.core.config import get_settings

settings = get_settings()


async def chat_completion(
    user_prompt: str,
    system_prompt: str = "",
    temperature: float = 0.0,
    max_tokens: int = 2048,
    retries: int = 3,
) -> str:
    # Use finetuned model if provided, else root model
    model = getattr(settings, "OPENAI_FINETUNED_MODEL") or getattr(settings, "OPENAI_MODEL", "gpt-4o")
    
    logger = logging.getLogger(__name__)
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    for attempt in range(max(1, retries)):
        try:
            kwargs = {
                "model": model,
                "input": user_prompt,
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "store": True,
            }
            if system_prompt:
                kwargs["instructions"] = system_prompt

            res = await client.responses.create(**kwargs)
            return res.output_text
        except Exception as exc:
            if attempt < retries - 1:
                logger.warning(f"LLM request error: {exc}. Retry {attempt+1}/{retries}")
                await asyncio.sleep(5)
                continue
            raise
                
    raise RuntimeError("LLM chat completion failed after retries")


async def embed_text(text: str) -> list[float]:
    """Embedding giữ nguyên BGE M3."""
    payload = {
        "model": settings.LM_STUDIO_EMBED_MODEL,
        "input": [text],
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post(settings.LM_STUDIO_EMBED_URL, json=payload)
        res.raise_for_status()
        data = res.json()
    return data["data"][0]["embedding"]