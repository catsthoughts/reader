export type DictPair = 'en_ru' | 'es_ru' | 'es_en' | 'it_ru'
  | 'ru_en' | 'ru_es' | 'en_es'
  | 'fr_ru' | 'ru_fr' | 'fr_en' | 'en_fr'
  | 'de_ru' | 'ru_de' | 'de_en' | 'en_de';

export const ALL_DICT_PAIRS: DictPair[] = ['en_ru', 'es_ru', 'es_en', 'it_ru',
  'ru_en', 'ru_es', 'en_es',
  'fr_ru', 'ru_fr', 'fr_en', 'en_fr',
  'de_ru', 'ru_de', 'de_en', 'en_de',
];

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
  it_ru: { id: 'it_ru', sourceLabel: 'Italian', sourceFlag: '🇮🇹', targetLabel: 'Russian', targetFlag: '🇷🇺' },
  ru_en: { id: 'ru_en', sourceLabel: 'Russian', sourceFlag: '🇷🇺', targetLabel: 'English', targetFlag: '🇬🇧' },
  ru_es: { id: 'ru_es', sourceLabel: 'Russian', sourceFlag: '🇷🇺', targetLabel: 'Spanish', targetFlag: '🇪🇸' },
  en_es: { id: 'en_es', sourceLabel: 'English', sourceFlag: '🇬🇧', targetLabel: 'Spanish', targetFlag: '🇪🇸' },
  fr_ru: { id: 'fr_ru', sourceLabel: 'French', sourceFlag: '🇫🇷', targetLabel: 'Russian', targetFlag: '🇷🇺' },
  ru_fr: { id: 'ru_fr', sourceLabel: 'Russian', sourceFlag: '🇷🇺', targetLabel: 'French', targetFlag: '🇫🇷' },
  fr_en: { id: 'fr_en', sourceLabel: 'French', sourceFlag: '🇫🇷', targetLabel: 'English', targetFlag: '🇬🇧' },
  en_fr: { id: 'en_fr', sourceLabel: 'English', sourceFlag: '🇬🇧', targetLabel: 'French', targetFlag: '🇫🇷' },
  de_ru: { id: 'de_ru', sourceLabel: 'German', sourceFlag: '🇩🇪', targetLabel: 'Russian', targetFlag: '🇷🇺' },
  ru_de: { id: 'ru_de', sourceLabel: 'Russian', sourceFlag: '🇷🇺', targetLabel: 'German', targetFlag: '🇩🇪' },
  de_en: { id: 'de_en', sourceLabel: 'German', sourceFlag: '🇩🇪', targetLabel: 'English', targetFlag: '🇬🇧' },
  en_de: { id: 'en_de', sourceLabel: 'English', sourceFlag: '🇬🇧', targetLabel: 'German', targetFlag: '🇩🇪' },
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
  transcription?: string;
  pos?: string;
  details?: string;
  morphology?: string;
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
