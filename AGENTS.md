# Epub Reader

iOS app for reading EPUB books with a built-in dictionary.

## Run

```bash
export PATH="$HOME/.local/bin:$PATH"
npx expo start -c   # -c clears Metro cache
```

Scan the QR code in Expo Go on iPhone.

## Architecture

| Path | Description |
|------|-------------|
| `App.tsx` | Entry point, `GestureHandlerRootView` + `NavigationContainer` |
| `src/screens/HomeScreen.tsx` | Home screen — book list, EPUB import |
| `src/screens/ReaderScreen.tsx` | Reader screen — connects Reader + WordPopup |
| `src/components/BookList.tsx` | Book list with FAB `+` button, swipe-to-delete |
| `src/components/Reader.tsx` | WebView reader, wraps words in `<span>`, double-tap → dictionary |
| `src/components/WordPopup.tsx` | Dictionary modal (definition + knowledge level 1–5) |
| `src/database/database.ts` | SQLite init, FTS5 tables for 5 languages |
| `src/database/books.ts` | Book CRUD, SELECT with aliases (snake_case → camelCase) |
| `src/database/dictionaries.ts` | Word lookup via FTS5 MATCH, dictionary import |
| `src/database/userwords.ts` | Word view tracking, knowledge level |
| `src/utils/epub.ts` | EPUB parsing: metadata, content, image embedding |
| `src/types/index.ts` | TypeScript types (Book, BookWord, Language, etc.) |

## Languages

Supported: `ru`, `en`, `es`, `ro`, `it`.

Dictionaries are created as virtual FTS5 tables: `dict_ru`, `dict_en`, etc.

Dictionary import:
```typescript
import { importDictionaryFromJSON } from './src/database/dictionaries';
await importDictionaryFromJSON('en', [{ word: 'hello', definition: 'hi' }]);
```

## Important notes

- `expo-sqlite` uses async API (`openDatabaseAsync`, `execAsync`, `getAllAsync`, `runAsync`)
- SELECT queries use explicit aliases (`file_path as filePath`) for snake_case → camelCase mapping
- Uses `expo-file-system/legacy` instead of the new `File`/`Directory` API
- Uses `jszip` instead of `@zip.js/zip.js` (Hermes-compatible)
- `react-native-gesture-handler` requires `GestureHandlerRootView` at the app root
- `assets/icon.png` is missing — removed from `app.json`

## TODO

- [ ] Page navigation within the WebView (currently all 21 pages load at once, only the first is shown)
- [ ] Forward/backward page navigation
- [ ] Book language selection for dictionary
- [ ] Reading progress tracking
- [ ] Learned words statistics screen
- [ ] `SafeAreaView` deprecated — replace with `react-native-safe-area-context`
