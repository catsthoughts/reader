#!/usr/bin/env python3
"""
Bridge bilingual dictionaries through English pivot.

For each English word entry, collects Spanish and Russian translations,
then creates es_ru and ru_es dictionaries.

Usage:
  source .venv/bin/activate
  python3 scripts/bridge_translations.py /tmp/kaikki_en.jsonl.gz dictionaries/es_ru.json dictionaries/ru_es.json
"""

import gzip
import json
import re
import sys
from collections import defaultdict
from typing import Optional

SKIP_POS = {"character", "syllable", "punctuation", "symbol", "circumfix", "infix", "combining_form"}
SKIP_PATTERN = re.compile(r"[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜа-яА-ЯёЁ '\-]")


def is_valid_word(w: str) -> bool:
    if not w or len(w) <= 1:
        return False
    if w.startswith("-"):
        return False
    if SKIP_PATTERN.search(w):
        return False
    return True


def collect_translations(entry: dict, target_code: str) -> list[str]:
    """Collect unique translation words for target language."""
    words: list[str] = []
    seen = set()

    for t in entry.get("translations", []):
        if t.get("code") == target_code:
            w = (t.get("word", "") or "").strip()
            if w and w not in seen and is_valid_word(w):
                seen.add(w)
                words.append(w)

    for s in entry.get("senses", []):
        for t in s.get("translations", []):
            if t.get("code") == target_code:
                w = (t.get("word", "") or "").strip()
                if w and w not in seen and is_valid_word(w):
                    seen.add(w)
                    words.append(w)

    return words


def extract_entry(entry: dict) -> Optional[dict]:
    word = entry.get("word", "").strip()
    pos = entry.get("pos", "")

    if not word or not pos:
        return None
    if pos in SKIP_POS:
        return None
    if not is_valid_word(word):
        return None

    es_words = collect_translations(entry, "es")
    ru_words = collect_translations(entry, "ru")

    if not es_words or not ru_words:
        return None

    return {
        "en_word": word,
        "en_pos": pos,
        "es_words": es_words,
        "ru_words": ru_words,
    }


def main():
    if len(sys.argv) < 4:
        print(f"Usage: {sys.argv[0]} <en.jsonl.gz> <es_ru_output.json> <ru_es_output.json>")
        sys.exit(1)

    en_path = sys.argv[1]
    es_ru_path = sys.argv[2]
    ru_es_path = sys.argv[3]

    es_ru: dict[str, set[str]] = defaultdict(set)
    ru_es: dict[str, set[str]] = defaultdict(set)

    line_count = 0
    bridge_count = 0
    with gzip.open(en_path, "rt", encoding="utf-8") as f:
        for line in f:
            line_count += 1
            entry = json.loads(line)

            if entry.get("lang_code") != "en":
                continue

            parsed = extract_entry(entry)
            if parsed is None:
                continue

            bridge_count += 1

            for es_w in parsed["es_words"]:
                es_ru[es_w].update(parsed["ru_words"])

            for ru_w in parsed["ru_words"]:
                ru_es[ru_w].update(parsed["es_words"])

            if line_count % 500000 == 0:
                print(f"  Processed {line_count} lines, {bridge_count} bridges", file=sys.stderr)

    # Build es_ru output
    es_ru_list = sorted(
        [{"word": w, "transcription": "", "pos": "", "definition": "; ".join(sorted(defs)), "details": ""}
         for w, defs in es_ru.items()],
        key=lambda e: e["word"].lower()
    )

    ru_es_list = sorted(
        [{"word": w, "transcription": "", "pos": "", "definition": "; ".join(sorted(defs)), "details": ""}
         for w, defs in ru_es.items()],
        key=lambda e: e["word"].lower()
    )

    with open(es_ru_path, "w", encoding="utf-8") as f:
        json.dump(es_ru_list, f, ensure_ascii=False, indent=1)

    with open(ru_es_path, "w", encoding="utf-8") as f:
        json.dump(ru_es_list, f, ensure_ascii=False, indent=1)

    print(f"Done: {line_count} lines, {bridge_count} bridges", file=sys.stderr)
    print(f"  es_ru: {len(es_ru_list)} entries → {es_ru_path}", file=sys.stderr)
    print(f"  ru_es: {len(ru_es_list)} entries → {ru_es_path}", file=sys.stderr)


if __name__ == "__main__":
    main()