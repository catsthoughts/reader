import { getDatabase } from './database';
import type { Book, DictPair } from '../types';

const BOOK_COLUMNS = `id, title, author, file_path as filePath, cover_path as coverPath,
  current_position as currentPosition, last_opened as lastOpened, progress`;

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

export async function deleteBook(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM books WHERE id = ?', [id]);
}

export async function getBookDictPairs(bookId: number): Promise<DictPair[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ dict_pair: string }>(
    'SELECT dict_pair FROM book_dictionaries WHERE book_id = ?',
    [bookId]
  );
  return rows.map((r) => r.dict_pair as DictPair);
}

export async function setBookDictPairs(
  bookId: number,
  dictPairs: DictPair[]
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM book_dictionaries WHERE book_id = ?', [bookId]);
  for (const pair of dictPairs) {
    await db.runAsync(
      'INSERT INTO book_dictionaries (book_id, dict_pair) VALUES (?, ?)',
      [bookId, pair]
    );
  }
}

export async function getDefaultDictPairs(): Promise<DictPair[]> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'default_dictionaries'"
  );
  if (!row?.value) return ['en_ru'];
  return row.value.split(',').filter(Boolean) as DictPair[];
}

export async function setDefaultDictPairs(pairs: DictPair[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('default_dictionaries', ?)",
    [pairs.join(',')]
  );
}
