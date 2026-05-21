import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import BookList from '../components/BookList';
import { getAllBooks, upsertBook, deleteBook } from '../database/books';
import { parseEpubMetadata } from '../utils/epub';
import type { Book } from '../types';

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [books, setBooks] = useState<Book[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('DictionarySettings')} style={styles.settingsButton}>
          <Text style={styles.settingsButtonText}>⋯</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  React.useEffect(() => {
    loadBooks();
    const unsubscribe = navigation.addListener('focus', loadBooks);
    return unsubscribe;
  }, [navigation]);

  async function loadBooks() {
    try {
      const allBooks = await getAllBooks();
      setBooks(allBooks);
    } catch (err) {
      console.error('Failed to load books:', err);
    }
  }

  const handleAddBook = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      if (!file.name?.toLowerCase().endsWith('.epub')) {
        Alert.alert('Invalid file', 'Please select an EPUB file');
        return;
      }

      let sourceUri = file.uri;
      const metadata = await parseEpubMetadata(sourceUri);

      const documentsDir = FileSystem.documentDirectory + 'books/';
      await FileSystem.makeDirectoryAsync(documentsDir, { intermediates: true });
      const fileName = `${Date.now()}_${file.name}`;
      const destPath = documentsDir + fileName;

      await FileSystem.copyAsync({ from: sourceUri, to: destPath });

      const bookId = await upsertBook({
        title: metadata.title,
        author: metadata.author,
        filePath: destPath,
        coverPath: metadata.coverPath,
      });

      if (bookId) {
        await loadBooks();
        Alert.alert('Success', `Book "${metadata.title}" added`);
      }
    } catch (err: any) {
      console.error('Add book error:', err);
      Alert.alert('Error', err?.message || err?.toString() || 'Failed to add the book');
    }
  }, []);

  const handleBookPress = useCallback(
    (book: Book) => {
      navigation.navigate('Reader', { bookId: book.id });
    },
    [navigation]
  );

  const handleBookConfig = useCallback(
    (book: Book) => {
      navigation.navigate('BookDictionaryConfig', { bookId: book.id, bookTitle: book.title });
    },
    [navigation]
  );

  const handleDeleteBook = useCallback(async (book: Book) => {
    try {
      await deleteBook(book.id);
      await FileSystem.deleteAsync(book.filePath, { idempotent: true });
      await loadBooks();
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
  }, []);

  return (
    <View style={styles.container}>
      <BookList
        books={books}
        onBookPress={handleBookPress}
        onAddBook={handleAddBook}
        onDeleteBook={handleDeleteBook}
        onBookConfig={handleBookConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 22,
    color: '#1a1a1a',
  },
});