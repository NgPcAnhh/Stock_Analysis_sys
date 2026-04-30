def rows_to_markdown_table(rows: list[dict], max_rows: int = 30) -> str:
    if not rows:
        return "Không có dữ liệu cho yêu cầu này."

    rows = rows[:max_rows]
    columns = list(rows[0].keys())

    header = "| " + " | ".join(columns) + " |"
    sep = "| " + " | ".join(["---"] * len(columns)) + " |"

    body = []
    for row in rows:
        body.append("| " + " | ".join(str(row.get(col, "")) for col in columns) + " |")

    return "\n".join([header, sep] + body)


def format_analysis_context(query_results: list[dict]) -> str:
    parts = []

    for item in query_results:
        name = item["name"]
        rows = item["rows"]

        parts.append(f"## {name}")
        parts.append(rows_to_markdown_table(rows))

    return "\n\n".join(parts)