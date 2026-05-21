import * as FileSystem from 'expo-file-system/legacy';
import { importDictionaryFromJSON, getDictionaryWordCount } from '../database/dictionaries';
import type { DictPair, DictStatus } from '../types';
import { ALL_DICT_PAIRS } from '../types';

const GITHUB_REPO = 'catsthoughts/reader';
const DICT_DIR = FileSystem.documentDirectory + 'dicts/';

const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/dictionary-management/dictionaries`;

export function getDictCachePath(dictPair: DictPair): string {
  return `${DICT_DIR}${dictPair}.json`;
}

export async function downloadDictionary(dictPair: DictPair): Promise<void> {
  const url = `${GITHUB_RAW_URL}/${dictPair}.json`;
  const dest = getDictCachePath(dictPair);

  await FileSystem.makeDirectoryAsync(DICT_DIR, { intermediates: true });

  const download = FileSystem.createDownloadResumable(url, dest);
  const result = await download.downloadAsync();
  if (!result) {
    throw new Error('Download failed — no response');
  }
}

export async function importDictionary(dictPair: DictPair): Promise<number> {
  const path = getDictCachePath(dictPair);
  const content = await FileSystem.readAsStringAsync(path);
  const entries: { word: string; definition: string }[] = JSON.parse(content);
  return await importDictionaryFromJSON(dictPair, entries);
}

export async function downloadAndImport(
  dictPair: DictPair,
  onProgress?: (status: string) => void
): Promise<number> {
  onProgress?.('Downloading...');
  await downloadDictionary(dictPair);

  onProgress?.('Importing...');
  const count = await importDictionary(dictPair);

  onProgress?.('Done');
  return count;
}

export async function deleteCachedDict(dictPair: DictPair): Promise<void> {
  const path = getDictCachePath(dictPair);
  await FileSystem.deleteAsync(path, { idempotent: true });
}

export async function getAllDictStatus(): Promise<DictStatus[]> {
  return Promise.all(
    ALL_DICT_PAIRS.map(async (pair) => {
      const wordCount = await getDictionaryWordCount(pair);
      return { dictPair: pair, wordCount, downloading: false };
    })
  );
}
