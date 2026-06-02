#!/usr/bin/env python3
"""
Parse English Kaikki JSONL → extract translations to target language → our JSON format.

Usage:
  source .venv/bin/activate
  python3 scripts/parse_kaikki_translations.py <source_lang> <target_lang> <input.jsonl.gz> <output.json>
  
Example:
  python3 scripts/parse_kaikki_translations.py en es /tmp/kaikki_en.jsonl.gz dictionaries/en_es.json
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


def extract_entry(entry: dict, target_code: str) -> Optional[dict]:
    word = entry.get("word", "").strip()
    pos = entry.get("pos", "")
    lang_code = entry.get("lang_code", "")

    if not word or not pos:
        return None
    if pos in SKIP_POS:
        return None
    if len(word) <= 1:
        return None
    if re.search(r"[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ ']", word):
        return None

    # Collect all translations for target language
    translations: list[tuple[str, str]] = []
    seen = set()

    for t in entry.get("translations", []):
        if t.get("code") == target_code:
            tw = (t.get("word", "") or "").strip()
            ts = (t.get("sense", "") or "").strip()
            if tw and tw not in seen:
                seen.add(tw)
                translations.append((tw, ts))

    for s in entry.get("senses", []):
        for t in s.get("translations", []):
            if t.get("code") == target_code:
                tw = (t.get("word", "") or "").strip()
                ts = (t.get("sense", "") or "").strip()
                if tw and tw not in seen:
                    seen.add(tw)
                    translations.append((tw, ts))

    if not translations:
        return None

    # Build definition: "translation_word (sense)"
    defs = []
    for tw, ts in translations:
        if ts:
            defs.append(f"{tw} ({ts})")
        else:
            defs.append(tw)
    definition = "; ".join(defs)

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
    if len(sys.argv) < 5:
        print(f"Usage: {sys.argv[0]} <source_lang> <target_code> <input.jsonl.gz> <output.json>")
        print(f"Example: {sys.argv[0]} en es /tmp/kaikki_en.jsonl.gz dictionaries/en_es.json")
        sys.exit(1)

    source_lang = sys.argv[1]
    target_code = sys.argv[2]
    input_path = sys.argv[3]
    output_path = sys.argv[4]

    word_data: dict[str, dict] = {}

    line_count = 0
    with gzip.open(input_path, "rt", encoding="utf-8") as f:
        for line in f:
            line_count += 1
            entry = json.loads(line)

            if entry.get("lang_code") != source_lang:
                continue

            parsed = extract_entry(entry, target_code)
            if parsed is None:
                continue

            w = parsed["word"]
            word_data[w] = parsed

            if line_count % 500000 == 0:
                print(f"  Processed {line_count} lines, {len(word_data)} words kept", file=sys.stderr)

    result = list(word_data.values())
    result.sort(key=lambda e: e["word"].lower())

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    print(f"Done: {line_count} lines → {len(result)} entries → {output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()