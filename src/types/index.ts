export type DictPair = 'en_ru' | 'es_ru' | 'es_en' | 'ro_ru' | 'it_ru';

export const ALL_DICT_PAIRS: DictPair[] = ['en_ru', 'es_ru', 'es_en', 'ro_ru', 'it_ru'];

export interface DictPairInfo {
  id: DictPair;
  sourceLabel: string;
  sourceFlag: string;
  targetLabel: string;
  targetFlag: string;
}

export const DICT_PAIR_META: Record<DictPair, DictPairInfo> = {
  en_ru: { id: 'en_ru', sourceLabel: 'English', sourceFlag: '🇬🇧', targetLabel: 'Russian', targetFlag: '🇷🇺' },
  es_ru: { id: 'es_ru', sourceLabel: 'Spanish', sourceFlag: '🇪🇸', targetLabel: 'Russian', targetFlag: '🇷🇺' },
  es_en: { id: 'es_en', sourceLabel: 'Spanish', sourceFlag: '🇪🇸', targetLabel: 'English', targetFlag: '🇬🇧' },
  ro_ru: { id: 'ro_ru', sourceLabel: 'Romanian', sourceFlag: '🇷🇴', targetLabel: 'Russian', targetFlag: '🇷🇺' },
  it_ru: { id: 'it_ru', sourceLabel: 'Italian', sourceFlag: '🇮🇹', targetLabel: 'Russian', targetFlag: '🇷🇺' },
};

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
  language: string;
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

export interface DictStatus {
  dictPair: DictPair;
  wordCount: number;
  downloading: boolean;
  error?: string;
}

export type RootStackParamList = {
  Home: undefined;
  Reader: { bookId: number };
  DictionarySettings: undefined;
  BookDictionaryConfig: { bookId: number; bookTitle: string };
};
