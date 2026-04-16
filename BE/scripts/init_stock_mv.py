import asyncio
from pathlib import Path
from urllib.parse import urlparse

import asyncpg

from app.core.config import get_settings

SCHEMA = "hethong_phantich_chungkhoan"
MV_NAME = "mv_stock_screener_base"


def _normalize_dsn(raw: str) -> str:
    dsn = raw.strip()
    if "+psycopg2" in dsn:
        dsn = dsn.replace("+psycopg2", "")
    if "+asyncpg" in dsn:
        dsn = dsn.replace("+asyncpg", "")
    return dsn


def _split_sql_statements(sql_text: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []
    in_single_quote = False

    i = 0
    while i < len(sql_text):
        ch = sql_text[i]

        if ch == "'":
            if in_single_quote and i + 1 < len(sql_text) and sql_text[i + 1] == "'":
                current.append(ch)
                current.append(sql_text[i + 1])
                i += 2
                continue
            in_single_quote = not in_single_quote
            current.append(ch)
            i += 1
            continue

        if ch == ";" and not in_single_quote:
            stmt = "".join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
            i += 1
            continue

        current.append(ch)
        i += 1

    tail = "".join(current).strip()
    if tail:
        statements.append(tail)

    cleaned = []
    for stmt in statements:
        lines = []
        for line in stmt.splitlines():
            stripped = line.strip()
            if stripped.startswith("--"):
                continue
            lines.append(line)
        merged = "\n".join(lines).strip()
        if merged:
            cleaned.append(merged)

    return cleaned


async def main() -> None:
    settings = get_settings()
    dsn = _normalize_dsn(settings.DATABASE_URL)

    sql_file = Path(__file__).resolve().parents[1] / "app" / "database" / "materialized_views_stock_list.sql"
    sql_text = sql_file.read_text(encoding="utf-8")
    statements = _split_sql_statements(sql_text)

    parsed = urlparse(dsn)
    host = (parsed.hostname or "").lower()
    use_ssl = host not in {"localhost", "127.0.0.1"}

    conn = await asyncpg.connect(dsn=dsn, command_timeout=3600, ssl=use_ssl)
    try:
        for idx, stmt in enumerate(statements, start=1):
            first_line = stmt.splitlines()[0][:120]
            print(f"[{idx}/{len(statements)}] {first_line}")
            await conn.execute(stmt)

        exists = await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT 1
                FROM pg_matviews
                WHERE schemaname = $1 AND matviewname = $2
            )
            """,
            SCHEMA,
            MV_NAME,
        )
        if not exists:
            raise RuntimeError(f"Materialized view {SCHEMA}.{MV_NAME} was not created")

        print(f"DONE: {SCHEMA}.{MV_NAME} is ready")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
