export type Language = 'ru' | 'en' | 'es' | 'ro' | 'it';

export interface Book {
  id: number;
  title: string;
  author: string | null;
  filePath: string;
  coverPath: string | null;
  currentPosition: string | null;
  lastOpened: string;
  progress: number;
}

export interface BookWord {
  id: number;
  word: string;
  language: Language;
  viewCount: number;
  knowledgeLevel: 1 | 2 | 3 | 4 | 5;
  lastViewed: string;
}

export interface DictionaryEntry {
  word: string;
  definition: string;
}

export interface WordLookupResult {
  dictionary: DictionaryEntry | null;
  userWord: BookWord | null;
}

export type RootStackParamList = {
  Home: undefined;
  Reader: { bookId: number };
};