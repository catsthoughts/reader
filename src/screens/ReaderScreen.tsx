import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
} from 'react-native';
import Reader from '../components/Reader';
import WordPopup from '../components/WordPopup';
import { getBookById, updateBookProgress, getBookDictPairs, getDefaultDictPairs } from '../database/books';
import { lookupWordInDictPairs } from '../database/dictionaries';
import { getUserWord, upsertUserWord, updateKnowledgeLevel, getAllUserWords } from '../database/userwords';
import type { Book, DictPair, DictionaryEntry, BookWord, WordLookupResult } from '../types';

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
  const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null);
  const [userWord, setUserWord] = useState<BookWord | null>(null);
  const [knownWords, setKnownWords] = useState<Record<string, number>>({});
  const [currentDictPair, setCurrentDictPair] = useState<string>('en_ru');

  useEffect(() => {
    loadBook();
  }, [bookId]);

  useEffect(() => {
    loadKnownWords();
  }, [currentDictPair]);

  async function loadKnownWords() {
    try {
      const words = await getAllUserWords(currentDictPair);
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
      const [bookPairs, defaultPairs] = await Promise.all([
        getBookDictPairs(bookId),
        getDefaultDictPairs(),
      ]);
      const pairs = bookPairs.length > 0 ? bookPairs : defaultPairs;
      setCurrentDictPair(pairs[0] || 'en_ru');
    }
  }

  const handleWordLookup = useCallback(
    async (word: string): Promise<WordLookupResult | null> => {
      try {
        const [bookPairs, defaultPairs] = await Promise.all([
          getBookDictPairs(bookId),
          getDefaultDictPairs(),
        ]);
        const searchPairs = bookPairs.length > 0 ? bookPairs : defaultPairs;

        const found = await lookupWordInDictPairs(word, searchPairs);
        const dictPair = found?.dictPair ?? searchPairs[0] ?? 'en_ru';
        const dictEntry = found?.entry ?? null;

        const uWord = await getUserWord(word, dictPair);
        await upsertUserWord(word, dictPair);
        const updatedUserWord = await getUserWord(word, dictPair);
        const wordLang = (updatedUserWord?.language || dictPair) as string;

        setSelectedWord(word);
        setDictEntry(dictEntry);
        setUserWord(updatedUserWord);
        setCurrentDictPair(wordLang);
        setPopupVisible(true);

        setKnownWords((prev) => ({ ...prev, [word.toLowerCase()]: updatedUserWord?.knowledgeLevel ?? 1 }));

        return {
          dictionary: dictEntry,
          userWord: updatedUserWord,
        };
      } catch (err) {
        console.error('Word lookup failed:', err);
        return null;
      }
    },
    [bookId]
  );

  const handleKnowledgeLevelChange = useCallback(
    async (level: 1 | 2 | 3 | 4 | 5) => {
      const lang = currentDictPair;
      try {
        await updateKnowledgeLevel(selectedWord, lang, level);
        setUserWord((prev) => (prev ? { ...prev, knowledgeLevel: level } : prev));
        setKnownWords((prev) => ({ ...prev, [selectedWord.toLowerCase()]: level }));
      } catch (err) {
        console.error('Failed to update knowledge level:', err);
      }
    },
    [selectedWord, currentDictPair]
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
        currentPosition={book.currentPosition ?? undefined}
        onPositionChange={handlePositionChange}
        onWordLookup={handleWordLookup}
        knownWords={knownWords}
      />

      <WordPopup
        visible={popupVisible}
        word={selectedWord}
        dictionaryEntry={dictEntry}
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
});