# EPUB Reader

An iOS EPUB reader app with a built-in FTS5 dictionary and word tracking. Built with Expo SDK 54.

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

**Important:** Before testing, shake your phone to open the Expo dev menu and ensure "Fast Refresh" is enabled.

## How it works

| Feature | Detail |
|---------|--------|
| Import | Tap `+` to pick an `.epub` file from Files |
| Read | Swipe left/right to turn pages |
| Look up | Double-tap any word to see its dictionary definition |
| Track | Set a knowledge level (1–5) for each word |
| Highlight | Words are color-coded based on your level |

## Notes

- Books are stored in the app's document directory
- Dictionaries support 5 languages: Russian, English, Spanish, Romanian, Italian
- Dictionary data must be imported via SQLite FTS5 tables (`dict_ru`, `dict_en`, etc.)