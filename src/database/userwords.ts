import { getDatabase } from './database';
import type { BookWord } from '../types';

export interface LanguageStats {
  language: string;
  total: number;
  levels: Record<number, number>;
}

export async function getUserWordsStats(): Promise<LanguageStats[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ language: string; knowledgeLevel: number; count: number }>(
    `SELECT language, knowledge_level as knowledgeLevel, COUNT(*) as count
     FROM user_words GROUP BY language, knowledge_level ORDER BY language, knowledge_level`
  );

  const map = new Map<string, LanguageStats>();
  for (const r of rows) {
    if (!map.has(r.language)) {
      map.set(r.language, { language: r.language, total: 0, levels: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    }
    const s = map.get(r.language)!;
    s.levels[r.knowledgeLevel] = r.count;
    s.total += r.count;
  }
  return Array.from(map.values());
}

export async function resetUserWordsForLanguage(language: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM user_words WHERE language = ?', [language]);
}

export async function upsertUserWord(
  word: string,
  language: string,
  knowledgeLevel?: 1 | 2 | 3 | 4 | 5
): Promise<void> {
  const db = await getDatabase();

  const existing = await db.getFirstAsync<{ id: number; viewCount: number }>(
    'SELECT id, view_count as viewCount FROM user_words WHERE word = ? AND language = ?',
    [word, language]
  );

  if (existing) {
    await db.runAsync(
      "UPDATE user_words SET view_count = view_count + 1, last_viewed = datetime('now') WHERE id = ?",
      [existing.id]
    );
    if (knowledgeLevel) {
      await db.runAsync(
        'UPDATE user_words SET knowledge_level = ? WHERE id = ?',
        [knowledgeLevel, existing.id]
      );
    }
  } else {
    await db.runAsync(
      'INSERT INTO user_words (word, language, view_count, knowledge_level) VALUES (?, ?, 1, ?)',
      [word, language, knowledgeLevel ?? 1]
    );
  }
}

export async function getUserWord(
  word: string,
  language: string
): Promise<BookWord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<BookWord>(
    `SELECT id, word, language, view_count as viewCount, knowledge_level as knowledgeLevel, last_viewed as lastViewed
     FROM user_words WHERE word = ? AND language = ?`,
    [word, language]
  );
  return row ?? null;
}

export async function updateKnowledgeLevel(
  word: string,
  language: string,
  level: 1 | 2 | 3 | 4 | 5
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE user_words SET knowledge_level = ?, last_viewed = datetime('now') WHERE word = ? AND language = ?",
    [level, word, language]
  );
}

export async function getAllUserWords(language: string): Promise<BookWord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<BookWord>(
    `SELECT id, word, language, view_count as viewCount, knowledge_level as knowledgeLevel, last_viewed as lastViewed
     FROM user_words WHERE language = ?`,
    [language]
  );
  return rows;
}

export async function getRecentUserWords(
  language: string,
  limit: number = 50
): Promise<BookWord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<BookWord>(
    `SELECT id, word, language, view_count as viewCount, knowledge_level as knowledgeLevel, last_viewed as lastViewed
     FROM user_words WHERE language = ? ORDER BY last_viewed DESC LIMIT ?`,
    [language, limit]
  );
  return rows;
}

export async function getKnownWordsCount(language: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM user_words WHERE language = ? AND knowledge_level >= 4',
    [language]
  );
  return row?.count ?? 0;
}