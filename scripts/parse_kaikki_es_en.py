#!/usr/bin/env python3
"""
Parse Kaikki JSONL Spanish data → our es_en.json format.

Filters out:
- Inflectional forms (conjugations, plurals, etc.)
- Suffixes (entries starting with -)
- Character/symbol/punctuation entries
- Very short words (1 char)

Usage:
  source .venv/bin/activate
  curl -L -o /tmp/kaikki_es.jsonl.gz https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl.gz
  python3 scripts/parse_kaikki_es_en.py /tmp/kaikki_es.jsonl.gz dictionaries/es_en.json
"""

import gzip
import json
import re
import sys
from typing import Optional

SKIP_POS = {"character", "syllable", "punctuation", "symbol", "circumfix", "infix", "combining_form"}

INFLECTION_RE = re.compile(
    r"(first|second|third)[/-]person"
    r"|(masculine|feminine) (singular|plural)"
    r"|(singular|plural) (imperfect|preterite|future|conditional|present|past) "
    r"|(imperfect|preterite|future|conditional) (subjunctive|indicative)"
    r"|(present|past) (subjunctive|indicative|participle)"
    r"|^plural of "
    r"|^infinitive of "
    r"|^gerund of "
    r"|^participle of "
    r"|^compound (infinitive|gerund)"
    r"|^form of "
    r"|^superlative (of|form)"
    r"|^comparative (of|form)"
    r"|^diminutive of "
    r"|^augmentative of "
    r"|^misspelling of"
    r"|^only used in os "
    r"|^inflection of "
    r"|^(uncommon|rare|obsolete) form of "
    r"|^alternative (form|spelling) of "
    r"|^archaic form of "
    r"|^(imperfect|preterite|future|conditional) (form|tense)",
    re.IGNORECASE,
)


def clean_ipa(ipa: str) -> str:
    return ipa.strip("/[] ")


def is_inflectional(definition: str) -> bool:
    return bool(INFLECTION_RE.search(definition))


def extract_entry(entry: dict) -> Optional[dict]:
    word = entry.get("word", "").strip()
    pos = entry.get("pos", "")
    lang_code = entry.get("lang_code", "")

    if not word or not pos:
        return None
    if pos in SKIP_POS:
        return None
    if lang_code != "es":
        return None
    if word.startswith("-"):
        return None
    if len(word) <= 1:
        return None
    if re.search(r"[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ ']", word):
        return None

    senses = entry.get("senses", [])
    glosses: list[str] = []
    for s in senses:
        for g in s.get("glosses", []):
            glosses.append(g.strip())

    if not glosses:
        return None

    definition = "; ".join(glosses)

    if is_inflectional(definition):
        return None

    sounds = entry.get("sounds", [])
    ipa = ""
    for s in sounds:
        if "ipa" in s:
            ipa = clean_ipa(s["ipa"])
            break

    return {
        "word": word,
        "transcription": ipa,
        "pos": pos,
        "definition": definition,
        "details": "",
    }


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <input.jsonl.gz> <output.json>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    word_data: dict[str, dict] = {}

    line_count = 0
    with gzip.open(input_path, "rt", encoding="utf-8") as f:
        for line in f:
            line_count += 1
            entry = json.loads(line)
            parsed = extract_entry(entry)
            if parsed is None:
                continue

            w = parsed["word"]
            if w in word_data:
                existing = word_data[w]
                if not is_inflectional(existing["definition"]):
                    continue
                existing["definition"] = parsed["definition"]
                existing["pos"] = parsed["pos"]
                existing["transcription"] = parsed["transcription"] or existing["transcription"]
                continue

            word_data[w] = parsed

            if line_count % 200000 == 0:
                print(f"  Processed {line_count} lines, {len(word_data)} words kept", file=sys.stderr)

    result = list(word_data.values())

    result.sort(key=lambda e: e["word"].lower())

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    print(f"Done: {line_count} lines → {len(result)} entries → {output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()