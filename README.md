# EPUB Reader

An iOS EPUB reader app with bilingual FTS5 dictionaries and word tracking. Built with Expo SDK 54.

## Requirements

- Node.js 18+
- macOS with Xcode (not required — works via Expo Go on iPhone)
- [Expo Go](https://expo.dev/client) installed on your iPhone (App Store)

## Setup

```bash
npm install
```

## Run

```bash
npx expo start -c   # -c clears Metro cache
```

Scan the QR code with your iPhone camera and open in Expo Go.

## How it works

| Feature | Detail |
|---------|--------|
| Import | Tap `+` to pick an `.epub` file from Files |
| Read | Swipe left/right to turn pages |
| Look up | Double-tap any word to see its dictionary definition |
| Track | Set a knowledge level (1–5) for each word |
| Highlight | Words are color-coded based on your level |

## Dictionaries

Bilingual pairs downloaded from GitHub raw URL and imported into FTS5 tables.

| Pair | Source → Target |
|------|----------------|
| `en_ru` | English → Russian |
| `es_ru` | Spanish → Russian |
| `es_en` | Spanish → English |
| `ro_ru` | Romanian → Russian |
| `it_ru` | Italian → Russian |

**Per-book config:** tap `⋯` on a book card to choose which dictionaries to search.
**Defaults:** set in the global Dictionaries screen (`⋯` header button) — used when a book has no custom selection.

## Notes

- Books are stored in the app's document directory
- Dictionaries are downloaded from `catsthoughts/reader` repo (`dictionaries/` folder)
- JSON source files in `dictionaries/` at repo root