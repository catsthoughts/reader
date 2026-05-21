import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import Reader from '../components/Reader';
import WordPopup from '../components/WordPopup';
import { getBookById, updateBookProgress, getActiveLanguages, updateBookLanguage } from '../database/books';
import { lookupWordInLanguages, lookupWord } from '../database/dictionaries';
import { getUserWord, upsertUserWord, updateKnowledgeLevel, getAllUserWords } from '../database/userwords';
import type { Book, Language, DictionaryEntry, BookWord, WordLookupResult } from '../types';

const LANG_LABELS: Record<Language, string> = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  ro: 'Romanian',
  it: 'Italian',
};

const ALL_LANGUAGES: Language[] = ['en', 'ru', 'es', 'ro', 'it'];

interface ReaderScreenProps {
  navigation: any;
  route: {
    params: {
      bookId: number;
    };
  };
}

export default function ReaderScreen({ navigation, route }: ReaderScreenProps) {
  const { bookId } = route.params;
  const [book, setBook] = useState<Book | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null);
  const [userWord, setUserWord] = useState<BookWord | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [activeLanguages, setActiveLanguages] = useState<Language[]>(['en']);
  const [knownWords, setKnownWords] = useState<Record<string, number>>({});
  const [lookupLanguage, setLookupLanguage] = useState<Language | null>(null);

  useEffect(() => {
    loadBook();
  }, [bookId]);

  useEffect(() => {
    loadKnownWords();
  }, [currentLanguage]);

  useEffect(() => {
    if (book) {
      navigation.setOptions({
        title: book.title,
        headerRight: () => (
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleLanguagePicker} style={styles.langButton}>
              <Text style={styles.langButtonText}>{LANG_LABELS[currentLanguage]}</Text>
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [book, currentLanguage, navigation]);

  async function loadKnownWords() {
    try {
      const words = await getAllUserWords(currentLanguage);
      const map: Record<string, number> = {};
      for (const w of words) {
        map[w.word.toLowerCase()] = w.knowledgeLevel;
      }
      setKnownWords(map);
    } catch {}
  }

  async function loadBook() {
    const loadedBook = await getBookById(bookId);
    if (loadedBook) {
      setBook(loadedBook);
      const active = await getActiveLanguages();
      setActiveLanguages(active);
      setCurrentLanguage((loadedBook.dictionaryLanguage as Language) || active[0] || 'en');
    }
  }

  const handleLanguagePicker = useCallback(() => {
    const labels = ALL_LANGUAGES.map((l) => LANG_LABELS[l]);
    const cancelIndex = labels.length;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...labels, 'Cancel'],
          cancelButtonIndex: cancelIndex,
          title: 'Dictionary language',
        },
        (index) => {
          if (index < cancelIndex) {
            changeLanguage(ALL_LANGUAGES[index]);
          }
        }
      );
    } else {
      Alert.alert(
        'Dictionary language',
        undefined,
        ALL_LANGUAGES.map((l) => ({
          text: LANG_LABELS[l],
          onPress: () => changeLanguage(l),
        })).concat({ text: 'Cancel', style: 'cancel' })
      );
    }
  }, []);

  async function changeLanguage(lang: Language) {
    setCurrentLanguage(lang);
    if (book) {
      await updateBookLanguage(book.id, lang);
    }
  }

  const handleWordLookup = useCallback(
    async (word: string): Promise<WordLookupResult | null> => {
      try {
        const searchLangs = [
          currentLanguage,
          ...activeLanguages.filter((l) => l !== currentLanguage),
        ];

        const found = await lookupWordInLanguages(word, searchLangs);
        const dictLanguage = found?.language ?? currentLanguage;

        const dictEntry = found?.entry ?? null;
        const uWord = await getUserWord(word, dictLanguage);
        await upsertUserWord(word, dictLanguage);
        const updatedUserWord = await getUserWord(word, dictLanguage);

        setSelectedWord(word);
        setDictionaryEntry(dictEntry);
        setUserWord(updatedUserWord);
        setLookupLanguage(dictLanguage);
        setPopupVisible(true);

        if (dictLanguage === currentLanguage) {
          setKnownWords((prev) => ({ ...prev, [word.toLowerCase()]: updatedUserWord?.knowledgeLevel ?? 1 }));
        }

        return {
          dictionary: dictEntry,
          userWord: updatedUserWord,
        };
      } catch (err) {
        console.error('Word lookup failed:', err);
        return null;
      }
    },
    [currentLanguage, activeLanguages]
  );

  const handleKnowledgeLevelChange = useCallback(
    async (level: 1 | 2 | 3 | 4 | 5) => {
      const lang = lookupLanguage ?? currentLanguage;
      try {
        await updateKnowledgeLevel(selectedWord, lang, level);
        setUserWord((prev) => (prev ? { ...prev, knowledgeLevel: level } : prev));
        if (lang === currentLanguage) {
          setKnownWords((prev) => ({ ...prev, [selectedWord.toLowerCase()]: level }));
        }
      } catch (err) {
        console.error('Failed to update knowledge level:', err);
      }
    },
    [selectedWord, currentLanguage, lookupLanguage]
  );

  const handlePositionChange = useCallback(
    async (positionId: string, progress: number) => {
      if (book) {
        await updateBookProgress(book.id, positionId, progress);
      }
    },
    [book]
  );

  const handleClosePopup = useCallback(() => {
    setPopupVisible(false);
  }, []);

  if (!book) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Reader
        filePath={book.filePath}
        language={currentLanguage}
        currentPosition={book.currentPosition ?? undefined}
        onPositionChange={handlePositionChange}
        onWordLookup={handleWordLookup}
        knownWords={knownWords}
      />

      <WordPopup
        visible={popupVisible}
        word={selectedWord}
        dictionaryEntry={dictionaryEntry}
        userWord={userWord}
        onClose={handleClosePopup}
        onKnowledgeLevelChange={handleKnowledgeLevelChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
  },
  langButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90D9',
  },
});