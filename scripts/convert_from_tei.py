import json, os, re, urllib.request, lzma, tarfile, io
import xml.etree.ElementTree as ET

NS = {'tei': 'http://www.tei-c.org/ns/1.0'}

def extract_pron(entry):
    pron_el = entry.find('.//tei:pron', NS)
    if pron_el is None or not pron_el.text:
        return ''
    raw = pron_el.text.strip()
    # Remove surrounding slashes if present (modern format: /IPA/)
    raw = re.sub(r'^/\s*|\s*/$', '', raw)
    return raw

def extract_translations(entry):
    translations = []
    for cit in entry.findall('.//tei:cit[@type="trans"]', NS):
        quote = cit.find('tei:quote', NS)
        if quote is not None and quote.text:
            translations.append(quote.text.strip())
    if not translations:
        for quote in entry.findall('.//tei:quote', NS):
            # Only quote directly in sense (not in cit)
            parent = quote.getparent() if hasattr(quote, 'getparent') else None
            if parent is not None and parent.tag == f'{{{NS["tei"]}}}sense':
                if quote.text:
                    translations.append(quote.text.strip())
    return ''.join(f'  {i+1}. {t}\n' for i, t in enumerate(translations)) if translations else ''

def extract_descriptions(entry):
    descs = []
    for note in entry.findall('.//tei:note', NS):
        if note.text:
            descs.append(note.text.strip())
    for def_el in entry.findall('.//tei:def', NS):
        if def_el.text:
            descs.append(def_el.text.strip())
    for usg in entry.findall('.//tei:usg', NS):
        if usg.text:
            descs.append(usg.text.strip())
    return ' '.join(descs) if descs else ''

def process_tei(content_bytes):
    root = ET.fromstring(content_bytes)
    entries = root.findall('.//tei:entry', NS)

    results = []
    for entry in entries:
        orth = entry.find('.//tei:orth', NS)
        if orth is None or not orth.text:
            continue

        word = orth.text.strip()
        pron = extract_pron(entry)
        pos_el = entry.find('.//tei:pos', NS)
        pos = pos_el.text.strip() if pos_el is not None and pos_el.text else ''

        translation = extract_translations(entry)
        description = extract_descriptions(entry)

        if not translation:
            continue

        results.append({
            'word': word,
            'transcription': pron,
            'pos': pos,
            'definition': translation.strip(),
            'details': description,
        })

    return results

def merge_entries(entries):
    merged = {}
    for e in entries:
        key = e['word'].lower()
        if key in merged:
            existing = merged[key]
            # Merge POS
            if e['pos'] and e['pos'] not in existing.get('pos', ''):
                existing['pos'] = (existing.get('pos', '') + ', ' + e['pos']).strip(', ')
            # Keep first transcription if missing
            if not existing.get('transcription') and e.get('transcription'):
                existing['transcription'] = e['transcription']
            # Concatenate definitions
            if e.get('definition'):
                existing['definition'] = (existing.get('definition', '') + ' | ' + e['definition']).strip(' | ')
            # Merge details
            if e.get('details'):
                existing['details'] = (existing.get('details', '') + '\n' + e['details']).strip()
        else:
            merged[key] = dict(e)
    return list(merged.values())

def urlopen_with_retry(url, max_retries=3):
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(url, timeout=180) as resp:
                return resp.read()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            print(f"    Retry {attempt + 1}: {e}")

def download_and_convert(dict_name, version):
    url = f'https://download.freedict.org/dictionaries/{dict_name}/{version}/freedict-{dict_name}-{version}.src.tar.xz'
    print(f"  Downloading {dict_name} ({version})...")
    data = urlopen_with_retry(url)

    tar_data = lzma.decompress(data)
    tar = tarfile.open(fileobj=io.BytesIO(tar_data))

    tei_content = None
    for member in tar.getmembers():
        if member.name.endswith('.tei'):
            print(f"  Reading {member.name} ({member.size // 1024 // 1024} MB)" if member.size > 1024 * 1024 else f"  Reading {member.name}")
            tei_content = tar.extractfile(member).read()
            break

    if not tei_content:
        raise Exception("No .tei file found in archive")

    entries = process_tei(tei_content)
    print(f"  Raw entries: {len(entries)}")
    entries = merge_entries(entries)
    print(f"  After dedup: {len(entries)}")

    return entries

# Configuration
dict_config = [
    ('eng-rus', '2025.11.23', 'en_ru'),
    ('spa-rus', '2025.11.23', 'es_ru'),
    ('spa-eng', '0.3.1', 'es_en'),
    ('ita-rus', '2025.11.23', 'it_ru'),
    ('rus-eng', '2025.11.23', 'ru_en'),
    ('rus-spa', '2025.11.23', 'ru_es'),
    ('eng-spa', '2025.11.23', 'en_es'),
    ('fra-rus', '2025.11.23', 'fr_ru'),
    ('rus-fra', '2025.11.23', 'ru_fr'),
    ('fra-eng', '0.4.1', 'fr_en'),
    ('eng-fra', '0.1.6', 'en_fr'),
    ('deu-rus', '2025.11.23', 'de_ru'),
    ('rus-deu', '2025.11.23', 'ru_de'),
    ('deu-eng', '1.9-fd1', 'de_en'),
    ('eng-deu', '1.9-fd1', 'en_de'),
]

dict_dir = 'dictionaries'
os.makedirs(dict_dir, exist_ok=True)

# Remove old format ro_ru
ro_path = os.path.join(dict_dir, 'ro_ru.json')
if os.path.exists(ro_path):
    os.remove(ro_path)
    print("Removed ro_ru.json")

for dict_name, version, pair in dict_config:
    print(f"\n=== {pair} ===")
    try:
        entries = download_and_convert(dict_name, version)
        out = os.path.join(dict_dir, f'{pair}.json')
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=1)
        print(f"  ✓ Written {len(entries)} entries")
    except Exception as e:
        print(f"  ✗ Error: {e}")

print("\nDone!")
