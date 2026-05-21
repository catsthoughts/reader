import * as SQLite from 'expo-sqlite';
import type { DictPair } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

const DICT_PAIRS: DictPair[] = ['en_ru', 'es_ru', 'es_en', 'ro_ru', 'it_ru'];

const DICT_TABLES: Record<DictPair, string> = {
  en_ru: 'dict_en_ru',
  es_ru: 'dict_es_ru',
  es_en: 'dict_es_en',
  ro_ru: 'dict_ro_ru',
  it_ru: 'dict_it_ru',
};

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('reader.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`PRAGMA journal_mode = WAL;`);

  for (const pair of DICT_PAIRS) {
    await database.execAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${DICT_TABLES[pair]}
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
      progress REAL DEFAULT 0
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS book_dictionaries (
      book_id INTEGER NOT NULL,
      dict_pair TEXT NOT NULL,
      PRIMARY KEY (book_id, dict_pair),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  await database.execAsync(`
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('default_dictionaries', 'en_ru');
  `);

  await migrateV1(database);
}

async function migrateV1(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const row = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM pragma_table_info('books') WHERE name = 'dictionary_language'"
    );
    if (row) {
      await database.execAsync("ALTER TABLE books DROP COLUMN dictionary_language");
    }
  } catch (_) {}

  try {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS book_dictionaries (
        book_id INTEGER NOT NULL,
        dict_pair TEXT NOT NULL,
        PRIMARY KEY (book_id, dict_pair),
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
  } catch (_) {}

  try {
    await database.execAsync(`
      INSERT OR IGNORE INTO app_settings (key, value) VALUES ('default_dictionaries', 'en_ru')
    `);
  } catch (_) {}
}

export function getDictTableName(dictPair: DictPair): string {
  return DICT_TABLES[dictPair];
}
