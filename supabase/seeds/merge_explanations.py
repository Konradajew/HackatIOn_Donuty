#!/usr/bin/env python3
"""
merge_explanations.py - splice subagent-generated explanations back into questions_en.csv.

Reads every supabase/seeds/_chunks/out_*.jsonl, builds a {idx -> explanation}
dict, then rewrites questions_en.csv in place with the explanation column
populated. Defensive trimming + "explanation == correct answer" rejection.
"""
from __future__ import annotations

import argparse
import csv
import json
import random
import re
import shutil
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_CSV = HERE / "questions_en.csv"
DEFAULT_CHUNKS = HERE / "_chunks"

MAX_EXPLANATION_LEN = 240
SENTENCE_END_RE = re.compile(r"[.!?](?=\s|$)")
WS_RE = re.compile(r"\s+")


def normalize(s: str) -> str:
    return WS_RE.sub(" ", s).strip()


def trim_to_max(text: str, max_len: int = MAX_EXPLANATION_LEN) -> str:
    text = normalize(text)
    if len(text) <= max_len:
        return text
    # Cut at last sentence-ending punctuation before max_len; fall back to hard truncate.
    snippet = text[:max_len]
    matches = list(SENTENCE_END_RE.finditer(snippet))
    if matches:
        return snippet[:matches[-1].end()].rstrip()
    return snippet.rstrip() + "..."


def is_just_the_answer(explanation: str, correct: str) -> bool:
    """Reject explanations that are just the correct answer with maybe punctuation."""
    e = re.sub(r"[^a-z0-9]+", "", explanation.lower())
    c = re.sub(r"[^a-z0-9]+", "", correct.lower())
    if not c:
        return False
    return e == c or (len(e) < len(c) + 5 and c in e)


def load_chunk_outputs(chunks_dir: Path) -> tuple[dict[int, str], Counter]:
    """Load every out_*.jsonl in chunks_dir; return ({idx -> explanation}, drop_reasons)."""
    if not chunks_dir.exists():
        raise SystemExit(f"chunks dir not found: {chunks_dir}")

    out_files = sorted(chunks_dir.glob("out_*.jsonl"))
    if not out_files:
        raise SystemExit(f"no out_*.jsonl files in {chunks_dir}")

    explanations: dict[int, str] = {}
    drops = Counter()
    for path in out_files:
        with path.open("r", encoding="utf-8") as fh:
            for line_no, line in enumerate(fh, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    drops["bad_json"] += 1
                    continue
                idx = obj.get("idx")
                expl = obj.get("explanation")
                if not isinstance(idx, int) or not isinstance(expl, str):
                    drops["bad_shape"] += 1
                    continue
                expl = normalize(expl)
                if not expl:
                    drops["empty"] += 1
                    continue
                explanations[idx] = expl  # later wins (idempotent re-runs OK)
    return explanations, drops


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:
            pass

    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    p.add_argument("--chunks", type=Path, default=DEFAULT_CHUNKS)
    p.add_argument("--no-cleanup", action="store_true",
                   help="Keep _chunks/ after merging")
    p.add_argument("--min-coverage", type=float, default=0.95,
                   help="Fail if non-empty explanation rate falls below this")
    args = p.parse_args()

    if not args.csv.exists():
        raise SystemExit(f"CSV not found: {args.csv}")

    explanations, drops = load_chunk_outputs(args.chunks)
    print(f"[merge] loaded {len(explanations)} unique explanations across "
          f"{len(list(args.chunks.glob('out_*.jsonl')))} chunk files")
    if drops:
        for reason, n in drops.most_common():
            print(f"  - dropped {n} ({reason})")

    # Read CSV
    with args.csv.open("r", newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh)
        rows = list(reader)
    if not rows:
        raise SystemExit("CSV is empty")
    header, *data_rows = rows
    col = {name: i for i, name in enumerate(header)}

    # Splice explanations
    expl_idx = col["explanation"]
    correct_idx = col["correct_answer"]
    updated = 0
    rejected_self_answer = 0
    trimmed = 0
    for i, row in enumerate(data_rows):
        if i not in explanations:
            continue
        candidate = explanations[i]
        if is_just_the_answer(candidate, row[correct_idx]):
            rejected_self_answer += 1
            continue
        new = trim_to_max(candidate)
        if new != candidate:
            trimmed += 1
        if row[expl_idx] != new:
            row[expl_idx] = new
            updated += 1

    # Write back
    with args.csv.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(header)
        writer.writerows(data_rows)

    # Summary
    total = len(data_rows)
    non_empty = sum(1 for r in data_rows if r[expl_idx].strip())
    coverage = non_empty / total if total else 0.0
    lengths = [len(r[expl_idx]) for r in data_rows if r[expl_idx].strip()]
    print(f"[merge] CSV rewritten: {args.csv}")
    print(f"[merge] rows total={total}  updated={updated}  non-empty={non_empty}  "
          f"coverage={coverage:.1%}")
    print(f"[merge] rejected as just-the-answer: {rejected_self_answer}")
    print(f"[merge] trimmed to <= {MAX_EXPLANATION_LEN} chars: {trimmed}")
    if lengths:
        print(f"[merge] explanation lengths: min={min(lengths)}  "
              f"max={max(lengths)}  avg={sum(lengths) // len(lengths)}")

    # 5 random samples for visual spot-check
    sample_idxs = random.sample(range(total), min(5, total))
    print("[merge] sample rows:")
    for i in sorted(sample_idxs):
        title = data_rows[i][col["title"]]
        ans = data_rows[i][correct_idx]
        expl = data_rows[i][expl_idx] or "(empty)"
        print(f"  #{i} [{data_rows[i][col['category']]}] Q: {title[:70]}")
        print(f"       A: {ans[:60]}")
        print(f"       E: {expl[:160]}")

    if args.min_coverage and coverage < args.min_coverage:
        print(f"[merge] FAIL: coverage {coverage:.1%} below threshold {args.min_coverage:.1%}",
              file=sys.stderr)
        return 1

    if not args.no_cleanup:
        shutil.rmtree(args.chunks)
        print(f"[merge] cleaned up {args.chunks}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
