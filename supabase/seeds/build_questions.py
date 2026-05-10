#!/usr/bin/env python3
"""
build_questions.py — generate questions_en.csv for Supabase `public.questions` import.

Pulls English MCQs from:
  1. alexandrainst/m_mmlu (English split, via HF datasets-server REST API)
  2. OpenTriviaDB REST API (entertainment categories MMLU lacks)
  3. A hard-coded English-language top-up list (grammar / vocab / idioms)

Maps every row into one of the 18 enum labels in `public.category`, applies a
difficulty heuristic, dedups across sources, and writes a single CSV ready for
Supabase Studio import. No DB writes; no commits.

Run:
    python build_questions.py [--out PATH] [--mmlu-only] [--otdb-only]
                              [--no-otdb] [--limit-per-cat N] [--max-mmlu-rows N]
"""
from __future__ import annotations

import argparse
import csv
import html
import json
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import requests

# -----------------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------------

VALID_CATEGORIES = {
    "math", "travel", "english", "medicine", "nature", "movies",
    "chemistry", "books", "space", "religion", "music", "culinary",
    "games", "history", "flags", "countries", "IT", "useless_facts",
}

# Difficulty seeds — chosen so that ROUND(diff_sum / diff_count) lands on the
# intended star rating used by public.effect_tier (migration 0013):
#   tier 1 (1-2★)  → DMG 12 / HEAL 10 / et 3s
#   tier 2 (3-4★)  → DMG 15 / HEAL 12 / et 5s
#   tier 3 (5★)    → DMG 20 / HEAL 15 / et 7s
DIFFICULTY_SEEDS = {
    "easy":   (18, 10),  # avg 1.8 → 2★ → tier 1
    "medium": (35, 10),  # avg 3.5 → 4★ → tier 2
    "hard":   (48, 10),  # avg 4.8 → 5★ → tier 3
}

YES_VOTES = 60  # > 50 eligibility filter in play_card (migration 0014, line 335)

# MMLU subject -> our category. Subjects NOT listed are skipped.
# Source: m_mmlu's id field is "<subject>/<split>/<n>", e.g. "astronomy/test/12".
#
# Trivia-fit only: we keep elementary_/high_school_ + general world-knowledge
# subjects. All college_*, professional_*, abstract_*, formal_* and medical-
# school detail are EXCLUDED (see MMLU_EXCLUDED_SUBJECTS) because they're
# academic-benchmark hard, not trivia. Net effect: only easy/medium tiers come
# from MMLU; tier-3 (5-star) rows are sourced from OpenTriviaDB "hard".
MMLU_SUBJECT_MAP = {
    # math (only school-level)
    "elementary_mathematics": "math",
    "high_school_mathematics": "math",
    "high_school_statistics": "math",
    # chemistry (only school-level)
    "high_school_chemistry": "chemistry",
    # nature (school biology + intuitive physics; no college physics)
    "high_school_biology": "nature",
    "conceptual_physics": "nature",
    "high_school_physics": "nature",
    # space
    "astronomy": "space",
    # IT (only school-level CS; no college CS / ML / security / electrical)
    "high_school_computer_science": "IT",
    # history (school history + prehistory)
    "high_school_european_history": "history",
    "high_school_us_history": "history",
    "high_school_world_history": "history",
    "prehistory": "history",
    # religion (world religions only; no philosophy / moral_disputes)
    "world_religions": "religion",
    # geography subjects need split logic - handled separately:
    # "high_school_geography" -> countries OR travel
    # "global_facts"          -> travel
    # nutrition needs split logic too - culinary OR useless_facts
    # "nutrition" -> culinary | useless_facts
    # "miscellaneous"         -> useless_facts
    # NOTE: medicine slot is now empty from MMLU - falls to OTDB if any added.
}

GEOGRAPHY_SUBJECT = "high_school_geography"
GLOBAL_FACTS_SUBJECT = "global_facts"
NUTRITION_SUBJECT = "nutrition"
MISC_SUBJECT = "miscellaneous"

# Subjects deliberately excluded - see plan for rationale.
# Trivia-fit cut: drop college/professional/abstract/formal + interpretive subjects.
MMLU_EXCLUDED_SUBJECTS = {
    # Original off-theme exclusions
    "moral_scenarios", "international_law", "professional_law", "jurisprudence",
    "management", "marketing", "business_ethics", "professional_accounting",
    "high_school_psychology", "professional_psychology", "econometrics",
    "security_studies", "sociology", "public_relations", "us_foreign_policy",
    "high_school_government_and_politics", "high_school_microeconomics",
    "high_school_macroeconomics",
    # NEW: too-hard-for-trivia exclusions
    "abstract_algebra", "college_mathematics", "formal_logic",
    "college_chemistry",
    "college_biology", "college_physics",
    "anatomy", "clinical_knowledge", "college_medicine", "human_aging",
    "medical_genetics", "professional_medicine", "virology",
    "college_computer_science", "computer_security", "machine_learning",
    "electrical_engineering",
    "philosophy", "moral_disputes",
}

COUNTRIES_HINT_RE = re.compile(
    r"\b(capital|currency|language|country|nation|government|"
    r"population|gdp|sovereign|republic|monarchy|prime\s+minister|president\s+of)\b",
    re.IGNORECASE,
)
CULINARY_HINT_RE = re.compile(
    r"\b(food|cuisine|dish|recipe|meal|cook(?:ed|ing)?|eat(?:en|ing)?|"
    r"drink|spice|herb|vegetable|fruit|meat|bread|cheese|wine|beer|pasta|pizza|"
    r"diet|fat|protein|carbohydrate|vitamin|nutrient|sugar|salt|chef)\b",
    re.IGNORECASE,
)

# Cleaning: drop dataset noise / unrenderable formatting AND patterns that
# can't be answered inside the in-game 15s timer (migration 0013, line 192).
NOISE_RE = re.compile(
    r"(?i)("
    r"the following are multiple choice questions"
    r"|<image>"
    r"|\\\("                                # \( - MathJax open
    r"|\\\)"                                # \) - MathJax close
    r"|\\\["                                # \[ - display math open
    r"|\\\]"                                # \] - display math close
    r"|\$[^$\n]{1,200}\$"                   # $...$ inline LaTeX math
    r"|\\[a-zA-Z]{2,}"                      # any \command - \frac, \div, ...
    r"|\^\{"                                # ^{ - LaTeX superscript
    r"|_\{"                                 # _{ - LaTeX subscript
    # --- Time-budget patterns (NEW) ---
    r"|\bStatement\s+\d\s*\|"               # Boolean two-claim MMLU rows
    r"|Which of the following statements"   # usually long enumerated options
    r"|Consider the following"              # multi-step setup
    r"|\bpassage\b"                         # implies an embedded text to read
    r"|\bparagraph\b"                       # ditto
    r")"
)

# OpenTriviaDB fetch plan, keyed by OTDB category id so each upstream category
# is queried ONCE (token-deduped) and routed locally to one of our 18 enum
# slots. For multi-target categories (e.g. Geography -> flags/countries/travel),
# entries are evaluated in order; first matching filter wins. A None filter is
# the catch-all and must come last.
OTDB_FETCH = {
    9:  [("culinary", CULINARY_HINT_RE)],                        # General Knowledge - food only
    10: [("books", None)],                                       # Books
    11: [("movies", None)],                                      # Film
    12: [("music", None)],                                       # Music
    15: [("games", None)],                                       # Video Games
    16: [("games", None)],                                       # Board Games
    17: [("nature", None)],                                      # Science & Nature
    18: [("IT", None)],                                          # Computers
    19: [("math", None)],                                        # Mathematics
    20: [("religion", None)],                                    # Mythology
    22: [
        ("flags", re.compile(r"\bflags?\b", re.IGNORECASE)),     # Flags first
        ("countries", re.compile(
            r"\b(capital|currency|country|countries|nation|nations|government|"
            r"language|languages|spoken|official)\b", re.IGNORECASE)),
        ("travel", None),                                        # everything else geo -> travel
    ],
    23: [("history", None)],                                     # History
    27: [("nature", None)],                                      # Animals -> nature
}

# -----------------------------------------------------------------------------
# Manual English-language top-up
# -----------------------------------------------------------------------------
# Pure grammar / vocab / idiom MCQs. Difficulty matches the plan's heuristic.

ENGLISH_TOPUP = [
    # ---------- easy ----------
    ("What is the past tense of \"go\"?", "went", ["goed", "gone", "wented"], "easy"),
    ("What is the plural of \"child\"?", "children", ["childs", "childes", "child"], "easy"),
    ("Which article goes before \"university\"?", "a", ["an", "the", "no article"], "easy"),
    ("Which word means \"happy\"?", "joyful", ["sad", "angry", "tired"], "easy"),
    ("What is the past tense of \"see\"?", "saw", ["seed", "seen", "sawed"], "easy"),
    ("What is the plural of \"mouse\" (the animal)?", "mice", ["mouses", "mices", "mouse"], "easy"),
    ("Which article goes before \"hour\"?", "an", ["a", "the", "no article"], "easy"),
    ("Complete the idiom: \"It's raining cats and ___\".", "dogs", ["mice", "fish", "birds"], "easy"),
    ("What is the past tense of \"eat\"?", "ate", ["eated", "eaten", "et"], "easy"),
    ("Which word is a synonym of \"begin\"?", "start", ["end", "finish", "stop"], "easy"),
    ("What is the plural of \"foot\"?", "feet", ["foots", "feets", "foot"], "easy"),
    ("What is the past tense of \"buy\"?", "bought", ["buyed", "boughted", "buyt"], "easy"),
    # ---------- medium ----------
    ("What is the past tense of \"swim\"?", "swam", ["swimmed", "swimed", "swum"], "medium"),
    ("Complete the idiom: \"It's a piece of ___\" (meaning easy).", "cake", ["pie", "bread", "fruit"], "medium"),
    ("What does \"procrastinate\" mean?", "to delay something", ["to act quickly", "to plan ahead", "to finish a task"], "medium"),
    ("What is the comparative form of \"good\"?", "better", ["gooder", "more good", "best"], "medium"),
    ("What is the antonym of \"ancient\"?", "modern", ["old", "classical", "historic"], "medium"),
    ("What does the idiom \"break a leg\" mean?", "good luck", ["be careful", "walk slowly", "take a rest"], "medium"),
    ("What is the past tense of \"think\"?", "thought", ["thinked", "thunk", "thoughted"], "medium"),
    ("Which word means \"to make something clear by giving examples\"?", "illustrate", ["ignore", "ridicule", "conceal"], "medium"),
    ("What is the past participle of \"write\"?", "written", ["wrote", "writed", "writ"], "medium"),
    ("Which word is a synonym of \"reluctant\"?", "unwilling", ["eager", "ready", "excited"], "medium"),
    # ---------- hard ----------
    ("What does \"ephemeral\" mean?", "lasting only a short time", ["lasting forever", "very energetic", "made of stone"], "hard"),
    ("What does \"ubiquitous\" mean?", "present everywhere", ["seen rarely", "very expensive", "extremely ancient"], "hard"),
    ("Which is the plural of \"octopus\" most accepted by modern dictionaries?", "octopuses", ["octopi", "octopodes only", "octopusses"], "hard"),
    ("What does \"pleonasm\" describe?", "the use of redundant words", ["a verse meter", "a dance step", "a type of bird"], "hard"),
    ("What does \"disinterested\" properly mean?", "impartial; unbiased", ["bored", "uninterested", "hostile"], "hard"),
    ("What does \"penultimate\" mean?", "second to last", ["the very last", "the very first", "the very best"], "hard"),
    ("In the second conditional, complete: \"If I ___ rich, I would travel the world.\"", "were", ["was", "am", "be"], "hard"),
    ("What does \"esoteric\" mean?", "understood by only a small group", ["happening outdoors", "extremely common", "very urgent"], "hard"),
    ("What does \"cacophony\" describe?", "a harsh, jarring mixture of sounds", ["a pleasing harmony", "complete silence", "a single melody"], "hard"),
]

# `medicine` is empty after the trivia-fit cuts (no MMLU medical subjects pass,
# no OTDB medicine category exists), so we top it up with a fixed list of
# common-knowledge medical-trivia MCQs. Same shape as ENGLISH_TOPUP.
MEDICINE_TOPUP = [
    # ---------- easy ----------
    ("How many bones does an adult human have?", "206", ["196", "212", "180"], "easy"),
    ("Which organ produces insulin?", "Pancreas", ["Liver", "Kidneys", "Stomach"], "easy"),
    ("What is the largest organ of the human body?", "Skin", ["Liver", "Lungs", "Brain"], "easy"),
    ("How many chambers does the human heart have?", "4", ["2", "3", "5"], "easy"),
    ("How many teeth does a typical adult human have?", "32", ["28", "30", "36"], "easy"),
    ("What is the normal human body temperature in Celsius?", "37", ["35", "39", "42"], "easy"),
    ("Which blood cells primarily fight infection?", "White blood cells", ["Red blood cells", "Platelets", "Plasma cells"], "easy"),
    ("What does \"BMI\" stand for?", "Body Mass Index", ["Bone Mass Indicator", "Blood Movement Index", "Basic Metabolic Indicator"], "easy"),
    ("Which vitamin does the skin produce when exposed to sunlight?", "Vitamin D", ["Vitamin A", "Vitamin C", "Vitamin K"], "easy"),
    ("Which organ filters blood and produces urine?", "Kidneys", ["Liver", "Lungs", "Spleen"], "easy"),
    ("What does \"CPR\" stand for?", "Cardiopulmonary resuscitation", ["Critical patient response", "Coronary pulse recovery", "Cardiac pressure relief"], "easy"),
    # ---------- medium ----------
    ("What are the four main blood groups in the ABO system?", "A, B, AB, O", ["A, B, C, D", "1, 2, 3, 4", "X, Y, Z, W"], "medium"),
    ("What is the normal resting heart rate range for an adult?", "60-100 bpm", ["40-60 bpm", "100-140 bpm", "20-40 bpm"], "medium"),
    ("What is the medical term for high blood pressure?", "Hypertension", ["Hypotension", "Hyperglycemia", "Hyperthermia"], "medium"),
    ("How many chromosomes does a typical human cell have?", "46", ["23", "44", "48"], "medium"),
    ("Vitamin C deficiency causes which disease?", "Scurvy", ["Rickets", "Pellagra", "Beriberi"], "medium"),
    ("Which part of the eye controls how much light enters?", "Iris", ["Cornea", "Retina", "Lens"], "medium"),
    ("Which gland is often called the body's \"master gland\"?", "Pituitary", ["Thyroid", "Adrenal", "Pineal"], "medium"),
    ("What is the largest artery in the human body?", "Aorta", ["Carotid", "Femoral", "Pulmonary"], "medium"),
    ("Which nutrient provides 9 kcal per gram?", "Fat", ["Protein", "Carbohydrate", "Fiber"], "medium"),
    # ---------- hard ----------
    ("What is the smallest bone in the human body?", "Stapes", ["Malleus", "Incus", "Hyoid"], "hard"),
    ("Which cells in the pancreas produce insulin?", "Beta cells", ["Alpha cells", "Delta cells", "PP cells"], "hard"),
    ("What does \"DNA\" stand for?", "Deoxyribonucleic acid", ["Diamine nucleic acid", "Deoxy-nitric acid", "Dual-nucleic adenine"], "hard"),
    ("Which neurotransmitter is most associated with reward and motivation?", "Dopamine", ["Serotonin", "Acetylcholine", "Glutamate"], "hard"),
    ("Which doctor is regarded as the father of modern medicine?", "Hippocrates", ["Galen", "Avicenna", "Pasteur"], "hard"),
]


# -----------------------------------------------------------------------------
# HTTP layer
# -----------------------------------------------------------------------------

class HttpError(RuntimeError):
    pass


def get_json(url: str, *, timeout: float = 30.0, max_retries: int = 12,
             base_sleep: float = 2.0, max_sleep: float = 60.0) -> dict:
    """GET with exponential backoff on 429 / 5xx (capped at max_sleep)."""
    for attempt in range(max_retries):
        try:
            r = requests.get(url, timeout=timeout, headers={"User-Agent": "donuty-build/1.0"})
        except requests.RequestException as e:
            if attempt == max_retries - 1:
                raise HttpError(f"network error after {max_retries} retries: {e}") from e
            time.sleep(min(max_sleep, base_sleep * (2 ** attempt)))
            continue

        if r.status_code == 200:
            return r.json()
        if r.status_code in (429, 500, 502, 503, 504):
            wait = min(max_sleep, base_sleep * (2 ** attempt))
            print(f"  ! HTTP {r.status_code} on {url[:90]} — sleeping {wait:.1f}s", file=sys.stderr)
            time.sleep(wait)
            continue
        raise HttpError(f"HTTP {r.status_code} on {url}: {r.text[:200]}")

    raise HttpError(f"max retries exceeded on {url}")


# -----------------------------------------------------------------------------
# Row dataclass (lightweight tuple)
# -----------------------------------------------------------------------------

# (title, correct_answer, [wrong1, wrong2, wrong3], category, difficulty_label, source_tag)
def make_row(title, correct, wrongs, category, difficulty, source):
    return (title, correct, list(wrongs), category, difficulty, source)


# -----------------------------------------------------------------------------
# MMLU loader
# -----------------------------------------------------------------------------

MMLU_PAGE_SIZE = 100
HF_BASE = ("https://datasets-server.huggingface.co/rows"
           "?dataset=alexandrainst/m_mmlu&config=en&split=test")
MMLU_PAGE_DELAY_S = 1.1  # ~55 req/min — HF datasets-server unauth limit is ~60/min
MMLU_CACHE_PATH = Path(__file__).resolve().parent / "_mmlu_cache.jsonl"
OTDB_CACHE_PATH = Path(__file__).resolve().parent / "_otdb_cache.jsonl"


def mmlu_difficulty(subject: str) -> str:
    # Post-revision: college_/professional_/abstract_/formal_ are excluded
    # entirely, so MMLU only contributes easy + medium tiers. Tier-3 (5-star)
    # comes exclusively from OTDB "hard".
    if subject.startswith("elementary_"):
        return "easy"
    return "medium"


def map_mmlu_subject(subject: str, instruction: str) -> str | None:
    """Return the target category for a given (subject, instruction), or None to skip."""
    if subject in MMLU_EXCLUDED_SUBJECTS:
        return None
    if subject in MMLU_SUBJECT_MAP:
        return MMLU_SUBJECT_MAP[subject]

    if subject == GEOGRAPHY_SUBJECT:
        return "countries" if COUNTRIES_HINT_RE.search(instruction) else "travel"
    if subject == GLOBAL_FACTS_SUBJECT:
        return "travel"
    if subject == NUTRITION_SUBJECT:
        return "culinary" if CULINARY_HINT_RE.search(instruction) else "useless_facts"
    if subject == MISC_SUBJECT:
        return "useless_facts"

    # Unknown subject — skip silently. New MMLU subjects may appear; we'd rather
    # under-include than mis-categorise.
    return None


def _load_jsonl_cache(path: Path) -> tuple[list[dict], int]:
    """Return (rows, last_offset) — last_offset is the next offset to fetch."""
    if not path.exists():
        return [], 0
    rows: list[dict] = []
    last_offset = 0
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if "_meta" in obj:
                last_offset = int(obj["_meta"].get("offset", last_offset))
                continue
            rows.append(obj)
    return rows, last_offset


def _append_jsonl(path: Path, items: list[dict], meta: dict | None = None) -> None:
    with path.open("a", encoding="utf-8") as fh:
        for it in items:
            fh.write(json.dumps(it, ensure_ascii=False) + "\n")
        if meta is not None:
            fh.write(json.dumps({"_meta": meta}, ensure_ascii=False) + "\n")


def fetch_mmlu(max_rows: int | None = None) -> list[tuple]:
    print("[MMLU] discovering total rows...")
    head = get_json(f"{HF_BASE}&offset=0&length=1")
    total = head.get("num_rows_total")
    if not isinstance(total, int) or total <= 0:
        raise HttpError(f"unexpected MMLU head response: {head!r}")
    print(f"[MMLU] total rows: {total}")
    if max_rows is not None:
        total = min(total, max_rows)

    expected_features = {"instruction", "option_a", "option_b", "option_c", "option_d", "answer", "id"}
    actual_features = {f["name"] for f in head.get("features", [])}
    if not expected_features.issubset(actual_features):
        raise HttpError(f"MMLU schema mismatch - expected {expected_features}, got {actual_features}")

    # Resume from cache if any
    cached_rows, start_offset = _load_jsonl_cache(MMLU_CACHE_PATH)
    if cached_rows:
        print(f"[MMLU] resuming from cache: {len(cached_rows)} raw rows, offset={start_offset}")

    raw_rows: list[dict] = list(cached_rows)
    offset = start_offset

    while offset < total:
        length = min(MMLU_PAGE_SIZE, total - offset)
        url = f"{HF_BASE}&offset={offset}&length={length}"
        page = get_json(url)
        page_rows = page.get("rows", [])
        if not page_rows:
            break

        chunk = [entry["row"] for entry in page_rows]
        raw_rows.extend(chunk)
        offset += length
        # Append-only checkpoint after every page so a crash never loses progress.
        _append_jsonl(MMLU_CACHE_PATH, chunk, meta={"offset": offset})

        if offset % 1000 == 0 or offset >= total:
            print(f"[MMLU] {offset}/{total} fetched")
        time.sleep(MMLU_PAGE_DELAY_S)

    # Map raw rows to our category space
    rows_out: list[tuple] = []
    by_subject: Counter = Counter()
    skipped_subject: Counter = Counter()
    for row in raw_rows:
        row_id = row.get("id") or ""
        subject = row_id.split("/", 1)[0] if row_id else ""
        if not subject:
            continue
        instruction = (row.get("instruction") or "").strip()
        cat = map_mmlu_subject(subject, instruction)
        if cat is None:
            skipped_subject[subject] += 1
            continue

        ans_letter = (row.get("answer") or "").strip().upper()
        opts = {
            "A": (row.get("option_a") or "").strip(),
            "B": (row.get("option_b") or "").strip(),
            "C": (row.get("option_c") or "").strip(),
            "D": (row.get("option_d") or "").strip(),
        }
        if ans_letter not in opts:
            continue
        correct = opts.pop(ans_letter)
        wrongs = list(opts.values())

        difficulty = mmlu_difficulty(subject)
        rows_out.append(make_row(instruction, correct, wrongs, cat, difficulty, f"mmlu:{subject}"))
        by_subject[subject] += 1

    print(f"[MMLU] kept {len(rows_out)} rows across {len(by_subject)} subjects (from {len(raw_rows)} raw)")
    if skipped_subject:
        top_skipped = ", ".join(f"{s}({n})" for s, n in skipped_subject.most_common(8))
        print(f"[MMLU] top skipped subjects: {top_skipped}")
    return rows_out


# -----------------------------------------------------------------------------
# OpenTriviaDB loader
# -----------------------------------------------------------------------------

OTDB_BASE = "https://opentdb.com/api.php"
OTDB_TOKEN_URL = "https://opentdb.com/api_token.php"
OTDB_REQUEST_DELAY_S = 5.2  # OTDB rate limit: 1 req / 5s per IP — give ourselves a margin


def otdb_get_token() -> str:
    data = get_json(f"{OTDB_TOKEN_URL}?command=request")
    if data.get("response_code") != 0:
        raise HttpError(f"OTDB token request failed: {data!r}")
    return data["token"]


def otdb_reset_token(token: str) -> None:
    data = get_json(f"{OTDB_TOKEN_URL}?command=reset&token={token}")
    if data.get("response_code") != 0:
        raise HttpError(f"OTDB token reset failed: {data!r}")


def _route_otdb_question(cat_id: int, title: str) -> str | None:
    """Map an OTDB cat_id + question title to our enum category.

    Walks OTDB_FETCH[cat_id] rules in declared order; first matching filter
    wins. A None filter matches everything (catch-all - must be last in its
    rule list). Returns None when no rule matches OR cat_id isn't configured.
    """
    rules = OTDB_FETCH.get(cat_id, [])
    for our_cat, filter_re in rules:
        if filter_re is None or filter_re.search(title):
            return our_cat
    return None


def _otdb_question_to_row(cat_id: int, q: dict) -> tuple | None:
    """Decode + validate a single OTDB question dict; return a row tuple or None."""
    title = html.unescape(q.get("question") or "").strip()
    correct = html.unescape(q.get("correct_answer") or "").strip()
    wrongs = [html.unescape(w).strip() for w in (q.get("incorrect_answers") or [])]
    if len(wrongs) != 3:
        return None
    our_cat = _route_otdb_question(cat_id, title)
    if our_cat is None:
        return None
    difficulty = q.get("difficulty") or "medium"
    if difficulty not in DIFFICULTY_SEEDS:
        difficulty = "medium"
    return make_row(title, correct, wrongs, our_cat, difficulty, f"otdb:{cat_id}")


def fetch_otdb(per_call: int = 50, max_calls_per_cat: int = 20) -> list[tuple]:
    # Resume: replay any cached entries; skip any cat_id whose "_done_cat" sentinel is in the cache.
    cached_raw, _ = _load_jsonl_cache(OTDB_CACHE_PATH)
    finished_cats: set[int] = set()
    cached_rows_out: list[tuple] = []
    if cached_raw:
        for entry in cached_raw:
            if entry.get("_done_cat") is not None:
                finished_cats.add(int(entry["_done_cat"]))
                continue
            cat_id = int(entry["cat_id"])
            row = _otdb_question_to_row(cat_id, entry["q"])
            if row is not None:
                cached_rows_out.append(row)
        print(f"[OTDB] resuming from cache: {len(cached_rows_out)} rows, "
              f"{len(finished_cats)} categories already finished")

    rows_out: list[tuple] = list(cached_rows_out)
    if all(cat_id in finished_cats for cat_id in OTDB_FETCH):
        print("[OTDB] all categories cached as finished, skipping fetch")
        return rows_out

    print("[OTDB] requesting session token...")
    token = otdb_get_token()
    last_request_at = 0.0

    for cat_id, rules in OTDB_FETCH.items():
        if cat_id in finished_cats:
            targets = ",".join(t for t, _ in rules)
            print(f"[OTDB] cat {cat_id} -> {targets}: skipped (cached)")
            continue
        targets_summary = ",".join(f"{t}{'(filt)' if f else ''}" for t, f in rules)
        print(f"[OTDB] cat {cat_id} -> {targets_summary}")
        kept_for_cat = 0
        for call_idx in range(max_calls_per_cat):
            elapsed = time.monotonic() - last_request_at
            if elapsed < OTDB_REQUEST_DELAY_S:
                time.sleep(OTDB_REQUEST_DELAY_S - elapsed)
            url = f"{OTDB_BASE}?amount={per_call}&category={cat_id}&type=multiple&token={token}"
            data = get_json(url)
            last_request_at = time.monotonic()

            code = data.get("response_code")
            if code == 4:
                print(f"[OTDB]   cat {cat_id}: token exhausted after {call_idx} calls")
                break
            if code == 5:
                print(f"[OTDB]   cat {cat_id}: rate-limited, sleeping 8s")
                time.sleep(8.0)
                continue
            if code == 1:
                print(f"[OTDB]   cat {cat_id}: no more results")
                break
            if code != 0:
                print(f"[OTDB]   cat {cat_id}: unexpected response_code={code}, stopping")
                break

            results = data.get("results") or []
            if not results:
                break

            cache_chunk = []
            for q in results:
                cache_chunk.append({"cat_id": cat_id, "q": q})
                row = _otdb_question_to_row(cat_id, q)
                if row is not None:
                    rows_out.append(row)
                    kept_for_cat += 1
            _append_jsonl(OTDB_CACHE_PATH, cache_chunk)

        # Mark this category finished so a partial future restart doesn't re-fetch it.
        _append_jsonl(OTDB_CACHE_PATH, [{"_done_cat": cat_id}])
        print(f"[OTDB]   cat {cat_id}: kept {kept_for_cat} (running total {len(rows_out)})")

    try:
        otdb_reset_token(token)
    except HttpError:
        pass

    return rows_out


# -----------------------------------------------------------------------------
# Top-up loader
# -----------------------------------------------------------------------------

def fetch_topup() -> list[tuple]:
    out = []
    for title, correct, wrongs, difficulty in ENGLISH_TOPUP:
        out.append(make_row(title, correct, list(wrongs), "english", difficulty, "topup:english"))
    en_count = len(out)
    for title, correct, wrongs, difficulty in MEDICINE_TOPUP:
        out.append(make_row(title, correct, list(wrongs), "medicine", difficulty, "topup:medicine"))
    med_count = len(out) - en_count
    print(f"[TOPUP] {en_count} English-language + {med_count} medicine rows = {len(out)}")
    return out


# -----------------------------------------------------------------------------
# Cleaning + dedup
# -----------------------------------------------------------------------------

WS_RE = re.compile(r"\s+")
# Tightened to fit the in-game 15s timer (migration 0013, line 192). Reading
# budget: ~5s for the title, ~5s to scan four ~50-char options, ~5s to decide.
MAX_TITLE_LEN = 130
MAX_ANSWER_LEN = 50


def clean_text(s: str) -> str:
    return WS_RE.sub(" ", s).strip()


def passes_filters(title: str, correct: str, wrongs: list[str]) -> tuple[bool, str]:
    if not title or not correct or len(wrongs) != 3:
        return False, "empty_or_arity"
    if any(not w for w in wrongs):
        return False, "empty_wrong"
    if len(title) > MAX_TITLE_LEN:
        return False, "title_too_long"
    if len(correct) > MAX_ANSWER_LEN or any(len(w) > MAX_ANSWER_LEN for w in wrongs):
        return False, "answer_too_long"
    if NOISE_RE.search(title):
        return False, "noise_pattern"
    options = {correct.lower(), *(w.lower() for w in wrongs)}
    if len(options) != 4:
        return False, "duplicate_option"
    return True, "ok"


def dedup_and_clean(rows: list[tuple]) -> tuple[list[tuple], Counter]:
    drop_reasons = Counter()
    seen_titles: set[str] = set()
    out: list[tuple] = []
    for title, correct, wrongs, cat, diff, source in rows:
        title = clean_text(title)
        correct = clean_text(correct)
        wrongs = [clean_text(w) for w in wrongs]

        ok, reason = passes_filters(title, correct, wrongs)
        if not ok:
            drop_reasons[reason] += 1
            continue
        key = title.casefold()
        if key in seen_titles:
            drop_reasons["dup_title"] += 1
            continue
        seen_titles.add(key)
        if cat not in VALID_CATEGORIES:
            drop_reasons["bad_category"] += 1
            continue
        out.append((title, correct, wrongs, cat, diff, source))
    return out, drop_reasons


# -----------------------------------------------------------------------------
# CSV emit
# -----------------------------------------------------------------------------

def to_pg_array(items: list[str]) -> str:
    """PostgreSQL text[] literal: {"a","b","c"} with internal " and \\ escaped."""
    parts = []
    for item in items:
        # Inside the {...} the array element is quoted; backslash and double-quote
        # must be escaped with backslash. The whole literal is then placed in a CSV
        # cell where the csv module handles outer quoting.
        escaped = item.replace("\\", "\\\\").replace('"', '\\"')
        parts.append(f'"{escaped}"')
    return "{" + ",".join(parts) + "}"


CSV_HEADER = ["title", "correct_answer", "wrong_answers", "category",
              "explanation", "yes_votes", "diff_sum", "diff_count"]


def write_csv(rows: list[tuple], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(CSV_HEADER)
        for title, correct, wrongs, cat, diff, _source in rows:
            diff_sum, diff_count = DIFFICULTY_SEEDS[diff]
            writer.writerow([
                title,
                correct,
                to_pg_array(wrongs),
                cat,
                "",                # explanation (NULL)
                YES_VOTES,
                diff_sum,
                diff_count,
            ])


# -----------------------------------------------------------------------------
# Self-checks
# -----------------------------------------------------------------------------

def verify_csv(out_path: Path) -> None:
    print("[verify] round-tripping CSV...")
    cats_seen: set[str] = set()
    cat_counts: Counter = Counter()
    diff_counts: Counter = Counter()
    bad_arr = 0
    bad_cat = 0
    total = 0

    with out_path.open("r", newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh)
        header = next(reader)
        if header != CSV_HEADER:
            raise SystemExit(f"[verify] header mismatch: {header}")
        for row in reader:
            total += 1
            if len(row) != len(CSV_HEADER):
                raise SystemExit(f"[verify] bad column count at row {total}: {row[:3]}")
            cat = row[3]
            cats_seen.add(cat)
            cat_counts[cat] += 1
            if cat not in VALID_CATEGORIES:
                bad_cat += 1
            wrongs_lit = row[2]
            try:
                parsed = parse_pg_array(wrongs_lit)
                if len(parsed) != 3:
                    bad_arr += 1
            except ValueError:
                bad_arr += 1
            ds, dc = int(row[6]), int(row[7])
            diff_counts[(ds, dc)] += 1

    if bad_cat:
        raise SystemExit(f"[verify] {bad_cat} rows with invalid category")
    if bad_arr:
        raise SystemExit(f"[verify] {bad_arr} rows where wrong_answers is not a 3-element array")

    missing = VALID_CATEGORIES - cats_seen
    if missing:
        print(f"[verify] WARNING: categories with zero rows: {sorted(missing)}", file=sys.stderr)

    print(f"[verify] OK — {total} rows, {len(cats_seen)}/18 categories present")
    print("[verify] per-category counts:")
    for cat in sorted(VALID_CATEGORIES):
        n = cat_counts.get(cat, 0)
        marker = "" if n > 0 else "  <- EMPTY"
        print(f"  {cat:<16} {n:>5d}{marker}")
    print("[verify] per-difficulty (diff_sum,diff_count) counts:")
    for (ds, dc), n in sorted(diff_counts.items()):
        print(f"  ({ds:>2d}, {dc:>2d}): {n}")


def parse_pg_array(literal: str) -> list[str]:
    """Inverse of to_pg_array — small parser for {"a","b","c"} with backslash escapes."""
    if not (literal.startswith("{") and literal.endswith("}")):
        raise ValueError(f"not a pg array literal: {literal[:40]}")
    body = literal[1:-1]
    out: list[str] = []
    i = 0
    n = len(body)
    while i < n:
        if body[i] == ",":
            i += 1
            continue
        if body[i] != '"':
            raise ValueError(f"expected '\"' at {i}: {body[i:i+10]!r}")
        i += 1
        buf: list[str] = []
        while i < n:
            c = body[i]
            if c == "\\" and i + 1 < n:
                buf.append(body[i + 1])
                i += 2
                continue
            if c == '"':
                i += 1
                break
            buf.append(c)
            i += 1
        else:
            raise ValueError("unterminated quote")
        out.append("".join(buf))
    return out


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

def main() -> int:
    # Windows consoles default to cp1250/cp1252 — force UTF-8 so log messages with
    # arrows/ellipses don't blow up encoding.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except Exception:
            pass

    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", type=Path,
                   default=Path(__file__).resolve().parent / "questions_en.csv")
    p.add_argument("--mmlu-only", action="store_true")
    p.add_argument("--otdb-only", action="store_true")
    p.add_argument("--no-otdb", action="store_true")
    p.add_argument("--no-topup", action="store_true")
    p.add_argument("--limit-per-cat", type=int, default=None,
                   help="Optional per-category cap applied AFTER cleaning")
    p.add_argument("--max-mmlu-rows", type=int, default=None,
                   help="Cap on MMLU rows fetched (debugging)")
    args = p.parse_args()

    use_mmlu = not args.otdb_only
    use_otdb = (not args.mmlu_only) and (not args.no_otdb)
    use_topup = (not args.mmlu_only) and (not args.otdb_only) and (not args.no_topup)

    all_rows: list[tuple] = []

    if use_mmlu:
        all_rows.extend(fetch_mmlu(max_rows=args.max_mmlu_rows))
    if use_otdb:
        all_rows.extend(fetch_otdb())
    if use_topup:
        all_rows.extend(fetch_topup())

    print(f"[merge] total rows before cleaning: {len(all_rows)}")
    cleaned, dropped = dedup_and_clean(all_rows)
    print(f"[clean] kept {len(cleaned)}, dropped {sum(dropped.values())}")
    for reason, n in dropped.most_common():
        print(f"  - {reason}: {n}")

    if args.limit_per_cat:
        capped: list[tuple] = []
        per_cat: Counter = Counter()
        for row in cleaned:
            cat = row[3]
            if per_cat[cat] < args.limit_per_cat:
                capped.append(row)
                per_cat[cat] += 1
        print(f"[cap] applied --limit-per-cat={args.limit_per_cat} → {len(capped)} rows")
        cleaned = capped

    write_csv(cleaned, args.out)
    print(f"[write] {args.out} ({len(cleaned)} data rows)")

    verify_csv(args.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
