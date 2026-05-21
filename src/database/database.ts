import * as SQLite from 'expo-sqlite';
import type { Language } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

const LANGUAGES: Language[] = ['ru', 'en', 'es', 'ro', 'it'];

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('reader.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`PRAGMA journal_mode = WAL;`);

  for (const lang of LANGUAGES) {
    await database.execAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS dict_${lang}
      USING fts5(word, definition, tokenize='unicode61');
    `);
  }

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS user_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL COLLATE NOCASE,
      language TEXT NOT NULL,
      view_count INTEGER DEFAULT 1,
      knowledge_level INTEGER DEFAULT 1 CHECK(knowledge_level BETWEEN 1 AND 5),
      last_viewed TEXT DEFAULT (datetime('now')),
      UNIQUE(word, language)
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      file_path TEXT NOT NULL UNIQUE,
      cover_path TEXT,
      current_position TEXT,
      last_opened TEXT DEFAULT (datetime('now')),
      progress REAL DEFAULT 0,
      dictionary_language TEXT
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await database.execAsync(`
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('active_languages', 'en');
  `);

  await migrateV1(database);
}

async function migrateV1(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const row = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM pragma_table_info('books') WHERE name = 'dictionary_language'"
    );
    if (!row) {
      await database.execAsync("ALTER TABLE books ADD COLUMN dictionary_language TEXT");
    }
  } catch (_) {}
}

export function getDictTableName(language: Language): string {
  return `dict_${language}`;
}