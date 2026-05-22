import * as SQLite from 'expo-sqlite';
import type { DictPair } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

const DICT_PAIRS: DictPair[] = ['en_ru', 'es_ru', 'es_en', 'it_ru',
  'ru_en', 'ru_es', 'en_es',
  'fr_ru', 'ru_fr', 'fr_en', 'en_fr',
  'de_ru', 'ru_de', 'de_en', 'en_de',
];

const DICT_TABLES: Record<DictPair, string> = {
  en_ru: 'dict_en_ru',
  es_ru: 'dict_es_ru',
  es_en: 'dict_es_en',
  it_ru: 'dict_it_ru',
  ru_en: 'dict_ru_en',
  ru_es: 'dict_ru_es',
  en_es: 'dict_en_es',
  fr_ru: 'dict_fr_ru',
  ru_fr: 'dict_ru_fr',
  fr_en: 'dict_fr_en',
  en_fr: 'dict_en_fr',
  de_ru: 'dict_de_ru',
  ru_de: 'dict_ru_de',
  de_en: 'dict_de_en',
  en_de: 'dict_en_de',
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
  await migrateV2(database);
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

async function migrateV2(database: SQLite.SQLiteDatabase): Promise<void> {
  const extraColumns = ['transcription', 'pos', 'details', 'morphology'];
  for (const pair of DICT_PAIRS) {
    const table = DICT_TABLES[pair];
    for (const col of extraColumns) {
      try {
        const row = await database.getFirstAsync<{ name: string }>(
          `SELECT name FROM pragma_table_info('${table}') WHERE name = ?`,
          [col]
        );
        if (!row) {
          await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT;`);
        }
      } catch (_) {}
    }
  }
}

export function getDictTableName(dictPair: DictPair): string {
  return DICT_TABLES[dictPair];
}
