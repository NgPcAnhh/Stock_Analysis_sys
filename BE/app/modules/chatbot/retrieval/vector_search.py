import asyncpg
from app.core.config import get_settings
from app.modules.chatbot.llm.client import embed_text

settings = get_settings()


async def vector_search(
    query: str,
    doc_type: str | None = None,
    top_k: int = 5,
) -> list[dict]:
    query_embedding = await embed_text(query)
    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"

    conn = await asyncpg.connect(settings.DATABASE_URL_SYNC)

    if doc_type:
        rows = await conn.fetch(
            """
            SELECT
                id,
                doc_type,
                source_file,
                chunk_id,
                chunk_index,
                content,
                payload,
                1 - (embedding <=> $1::vector) AS similarity
            FROM hethong_phantich_chungkhoan.chatbot_knowledge_base
            WHERE doc_type = $2
            ORDER BY embedding <=> $1::vector
            LIMIT $3
            """,
            embedding_str,
            doc_type,
            top_k,
        )
    else:
        rows = await conn.fetch(
            """
            SELECT
                id,
                doc_type,
                source_file,
                chunk_id,
                chunk_index,
                content,
                payload,
                1 - (embedding <=> $1::vector) AS similarity
            FROM hethong_phantich_chungkhoan.chatbot_knowledge_base
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            """,
            embedding_str,
            top_k,
        )

    await conn.close()
    return [dict(row) for row in rows]