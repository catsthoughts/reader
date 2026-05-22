import { getDatabase, getDictTableName } from './database';
import type { DictPair, DictionaryEntry } from '../types';

const ALL_COLS = 'word, definition, transcription, pos, details, morphology';

function mapRow(row: {
  word: string;
  definition?: string;
  transcription?: string;
  pos?: string;
  details?: string;
  morphology?: string;
}): DictionaryEntry {
  return {
    word: row.word,
    definition: row.definition ?? '',
    transcription: row.transcription ?? undefined,
    pos: row.pos ?? undefined,
    details: row.details ?? undefined,
    morphology: row.morphology ?? undefined,
  };
}

export async function lookupWord(
  word: string,
  dictPair: DictPair
): Promise<DictionaryEntry | null> {
  const db = await getDatabase();
  const table = getDictTableName(dictPair);
  const row = await db.getFirstAsync<any>(
    `SELECT ${ALL_COLS} FROM ${table} WHERE word MATCH ? LIMIT 1`,
    [word]
  );
  return row ? mapRow(row) : null;
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
  const rows = await db.getAllAsync<any>(
    `SELECT ${ALL_COLS} FROM ${table} WHERE word IN (${placeholders})`,
    uniqueWords
  );

  for (const row of rows) {
    result.set(row.word.toLowerCase(), mapRow(row));
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
      `INSERT INTO ${table} (word, definition, transcription, pos, details, morphology) VALUES (?, ?, ?, ?, ?, ?)`,
      [entry.word, entry.definition, entry.transcription ?? null, entry.pos ?? null, entry.details ?? null, entry.morphology ?? null]
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

export async function importEnrichedDictionary(
  dictPair: DictPair,
  entries: {
    word: string;
    definition?: string;
    transcription?: string;
    pos?: string;
    details?: string;
  }[]
): Promise<number> {
  const db = await getDatabase();
  const table = getDictTableName(dictPair);

  await db.execAsync(`DELETE FROM ${table};`);

  let count = 0;
  for (const entry of entries) {
    await db.runAsync(
      `INSERT INTO ${table} (word, definition, transcription, pos, details) VALUES (?, ?, ?, ?, ?)`,
      [entry.word, entry.definition ?? '', entry.transcription ?? null, entry.pos ?? null, entry.details ?? null]
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