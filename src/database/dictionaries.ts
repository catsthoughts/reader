import { getDatabase, getDictTableName } from './database';
import type { DictPair, DictionaryEntry } from '../types';

export async function lookupWord(
  word: string,
  dictPair: DictPair
): Promise<DictionaryEntry | null> {
  const db = await getDatabase();
  const table = getDictTableName(dictPair);
  const row = await db.getFirstAsync<{ word: string; definition: string }>(
    `SELECT word, definition FROM ${table} WHERE word MATCH ? LIMIT 1`,
    [word]
  );
  return row ?? null;
}

export async function lookupWordInDictPairs(
  word: string,
  dictPairs: DictPair[]
): Promise<{ entry: DictionaryEntry; dictPair: DictPair } | null> {
  for (const pair of dictPairs) {
    const entry = await lookupWord(word, pair);
    if (entry) return { entry, dictPair: pair };
  }
  return null;
}

export async function bulkLookupWords(
  words: string[],
  dictPair: DictPair
): Promise<Map<string, DictionaryEntry>> {
  const db = await getDatabase();
  const table = getDictTableName(dictPair);
  const result = new Map<string, DictionaryEntry>();

  const uniqueWords = [...new Set(words.map((w) => w.toLowerCase()))];
  if (uniqueWords.length === 0) return result;

  const placeholders = uniqueWords.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ word: string; definition: string }>(
    `SELECT word, definition FROM ${table} WHERE word IN (${placeholders})`,
    uniqueWords
  );

  for (const row of rows) {
    result.set(row.word.toLowerCase(), row);
  }

  return result;
}

export async function insertDictionaryEntries(
  dictPair: DictPair,
  entries: DictionaryEntry[]
): Promise<void> {
  const db = await getDatabase();
  const table = getDictTableName(dictPair);

  for (const entry of entries) {
    await db.runAsync(
      `INSERT INTO ${table} (word, definition) VALUES (?, ?)`,
      [entry.word, entry.definition]
    );
  }
}

export async function importDictionaryFromJSON(
  dictPair: DictPair,
  entries: DictionaryEntry[]
): Promise<number> {
  const db = await getDatabase();
  const table = getDictTableName(dictPair);

  await db.execAsync(`DELETE FROM ${table};`);

  let count = 0;
  for (const entry of entries) {
    await db.runAsync(
      `INSERT INTO ${table} (word, definition) VALUES (?, ?)`,
      [entry.word, entry.definition]
    );
    count++;
  }

  return count;
}

export async function getDictionaryWordCount(
  dictPair: DictPair
): Promise<number> {
  const db = await getDatabase();
  const table = getDictTableName(dictPair);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${table}`
  );
  return row?.count ?? 0;
}
