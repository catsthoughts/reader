import { getDatabase } from './database';
import type { Book, Language } from '../types';

const BOOK_COLUMNS = `id, title, author, file_path as filePath, cover_path as coverPath,
  current_position as currentPosition, last_opened as lastOpened, progress,
  dictionary_language as dictionaryLanguage`;

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Book>(
    `SELECT ${BOOK_COLUMNS}
     FROM books ORDER BY last_opened DESC`
  );
  return rows;
}

export async function getBookById(id: number): Promise<Book | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Book>(
    `SELECT ${BOOK_COLUMNS}
     FROM books WHERE id = ?`,
    [id]
  );
  return row ?? null;
}

export async function upsertBook(book: {
  title: string;
  author: string | null;
  filePath: string;
  coverPath: string | null;
}): Promise<number> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM books WHERE file_path = ?',
    [book.filePath]
  );

  if (existing) {
    await db.runAsync(
      "UPDATE books SET title = ?, author = ?, cover_path = ?, last_opened = datetime('now') WHERE id = ?",
      [book.title, book.author, book.coverPath, existing.id]
    );
    return existing.id;
  }

  const result = await db.runAsync(
    'INSERT INTO books (title, author, file_path, cover_path) VALUES (?, ?, ?, ?)',
    [book.title, book.author, book.filePath, book.coverPath]
  );
  return result.lastInsertRowId;
}

export async function updateBookProgress(
  id: number,
  position: string,
  progress: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE books SET current_position = ?, progress = ?, last_opened = datetime('now') WHERE id = ?",
    [position, progress, id]
  );
}

export async function updateBookLanguage(
  id: number,
  language: Language | null
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE books SET dictionary_language = ? WHERE id = ?",
    [language, id]
  );
}

export async function deleteBook(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM books WHERE id = ?', [id]);
}

export async function getDefaultLanguage(): Promise<Language> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'default_language'"
  );
  return (row?.value as Language) || 'en';
}

export async function setDefaultLanguage(language: Language): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('default_language', ?)",
    [language]
  );
}