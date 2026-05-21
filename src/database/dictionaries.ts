import { getDatabase, getDictTableName } from './database';
import type { Language, DictionaryEntry } from '../types';

export async function lookupWord(
  word: string,
  language: Language
): Promise<DictionaryEntry | null> {
  const db = await getDatabase();
  const table = getDictTableName(language);
  const row = await db.getFirstAsync<{ word: string; definition: string }>(
    `SELECT word, definition FROM ${table} WHERE word MATCH ? LIMIT 1`,
    [word]
  );
  return row ?? null;
}

export async function lookupWordInLanguages(
  word: string,
  languages: Language[]
): Promise<{ entry: DictionaryEntry; language: Language } | null> {
  for (const lang of languages) {
    const entry = await lookupWord(word, lang);
    if (entry) return { entry, language: lang };
  }
  return null;
}

export async function bulkLookupWords(
  words: string[],
  language: Language
): Promise<Map<string, DictionaryEntry>> {
  const db = await getDatabase();
  const table = getDictTableName(language);
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
  language: Language,
  entries: DictionaryEntry[]
): Promise<void> {
  const db = await getDatabase();
  const table = getDictTableName(language);

  for (const entry of entries) {
    await db.runAsync(
      `INSERT INTO ${table} (word, definition) VALUES (?, ?)`,
      [entry.word, entry.definition]
    );
  }
}

export async function importDictionaryFromJSON(
  language: Language,
  entries: DictionaryEntry[]
): Promise<number> {
  const db = await getDatabase();
  const table = getDictTableName(language);

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
  language: Language
): Promise<number> {
  const db = await getDatabase();
  const table = getDictTableName(language);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${table}`
  );
  return row?.count ?? 0;
}