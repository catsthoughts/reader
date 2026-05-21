import * as FileSystem from 'expo-file-system/legacy';
import { importDictionaryFromJSON, getDictionaryWordCount } from '../database/dictionaries';
import type { Language, DictionaryEntry, DictStatus } from '../types';

const GITHUB_REPO = 'catsthoughts/dictionaries';
const DICT_DIR = FileSystem.documentDirectory + 'dicts/';

export async function getDictCachePath(language: Language): string {
  return `${DICT_DIR}${language}.json`;
}

export async function downloadDictionary(
  language: Language
): Promise<void> {
  const url = `https://github.com/${GITHUB_REPO}/releases/latest/download/${language}.json`;
  const dest = getDictCachePath(language);

  await FileSystem.makeDirectoryAsync(DICT_DIR, { intermediates: true });

  const download = FileSystem.createDownloadResumable(url, dest);
  await download.downloadAsync();
}

export async function importDictionary(
  language: Language
): Promise<number> {
  const path = getDictCachePath(language);
  const content = await FileSystem.readAsStringAsync(path);
  const entries: DictionaryEntry[] = JSON.parse(content);
  return await importDictionaryFromJSON(language, entries);
}

export async function downloadAndImport(
  language: Language,
  onProgress?: (status: string) => void
): Promise<number> {
  onProgress?.('Downloading...');
  await downloadDictionary(language);

  onProgress?.('Importing...');
  const count = await importDictionary(language);

  onProgress?.('Done');
  return count;
}

export async function deleteCachedDict(language: Language): Promise<void> {
  const path = getDictCachePath(language);
  await FileSystem.deleteAsync(path, { idempotent: true });
}

export function getAllLanguageStatus(): Promise<DictStatus[]> {
  return Promise.all(
    (['ru', 'en', 'es', 'ro', 'it'] as Language[]).map(async (lang) => {
      const wordCount = await getDictionaryWordCount(lang);
      return { language: lang, wordCount, downloading: false };
    })
  );
}