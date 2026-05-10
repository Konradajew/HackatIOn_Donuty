#!/usr/bin/env python3
"""
split_chunks.py - split questions_en.csv into N-row JSON files for subagents.

Each chunk file is at supabase/seeds/_chunks/in_NNN.json and contains a JSON
array of {idx, title, correct, wrongs, category} objects. `idx` is the row's
0-based position in the post-header CSV; the merge step uses it as a join key.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_CSV = HERE / "questions_en.csv"
DEFAULT_OUT = HERE / "_chunks"

PG_ARRAY_ELEM_RE = re.compile(r'"((?:\\.|[^"\\])*)"')


def parse_pg_array(literal: str) -> list[str]:
    """Parse '{"a","b","c"}' into ['a','b','c']. Inverse of build_questions.to_pg_array."""
    if not (literal.startswith("{") and literal.endswith("}")):
        raise ValueError(f"not a pg array literal: {literal[:60]}")
    body = literal[1:-1]
    out: list[str] = []
    for m in PG_ARRAY_ELEM_RE.finditer(body):
        # Reverse the backslash-escapes used by build_questions.to_pg_array.
        out.append(m.group(1).replace('\\"', '"').replace("\\\\", "\\"))
    return out


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:
            pass

    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    p.add_argument("--chunk-size", type=int, default=100)
    args = p.parse_args()

    if not args.csv.exists():
        raise SystemExit(f"CSV not found: {args.csv}")

    args.out.mkdir(parents=True, exist_ok=True)

    rows: list[dict] = []
    with args.csv.open("r", newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh)
        header = next(reader)
        col = {name: i for i, name in enumerate(header)}
        for required in ("title", "correct_answer", "wrong_answers", "category", "explanation"):
            if required not in col:
                raise SystemExit(f"missing column in CSV: {required}")
        for idx, row in enumerate(reader):
            if len(row) != len(header):
                raise SystemExit(f"row {idx} has {len(row)} cols, expected {len(header)}")
            wrongs = parse_pg_array(row[col["wrong_answers"]])
            if len(wrongs) != 3:
                raise SystemExit(f"row {idx}: wrong_answers has {len(wrongs)} elements, expected 3")
            rows.append({
                "idx": idx,
                "title": row[col["title"]],
                "correct": row[col["correct_answer"]],
                "wrongs": wrongs,
                "category": row[col["category"]],
            })

    n = len(rows)
    chunks: list[list[dict]] = [rows[i:i + args.chunk_size] for i in range(0, n, args.chunk_size)]
    print(f"[split] {n} rows -> {len(chunks)} chunks of <= {args.chunk_size}")

    for i, chunk in enumerate(chunks, start=1):
        out_path = args.out / f"in_{i:03d}.json"
        with out_path.open("w", encoding="utf-8") as fh:
            json.dump(chunk, fh, ensure_ascii=False)
        print(f"  wrote {out_path.name} ({len(chunk)} rows)")

    print(f"[split] done -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
