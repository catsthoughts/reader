import { getDatabase } from './database';
import type { Language, BookWord } from '../types';

export async function upsertUserWord(
  word: string,
  language: Language,
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
  language: Language
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
  language: Language,
  level: 1 | 2 | 3 | 4 | 5
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE user_words SET knowledge_level = ?, last_viewed = datetime('now') WHERE word = ? AND language = ?",
    [level, word, language]
  );
}

export async function getAllUserWords(language: Language): Promise<BookWord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<BookWord>(
    `SELECT id, word, language, view_count as viewCount, knowledge_level as knowledgeLevel, last_viewed as lastViewed
     FROM user_words WHERE language = ?`,
    [language]
  );
  return rows;
}

export async function getRecentUserWords(
  language: Language,
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

export async function getKnownWordsCount(language: Language): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM user_words WHERE language = ? AND knowledge_level >= 4',
    [language]
  );
  return row?.count ?? 0;
}