import React, { useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import type { Book } from '../types';

interface BookListProps {
  books: Book[];
  onBookPress: (book: Book) => void;
  onAddBook: () => void;
  onDeleteBook: (book: Book) => void;
  onBookConfig: (book: Book) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US');
}

function BookCard({ book, onPress, onDelete, onConfig }: { book: Book; onPress: () => void; onDelete: () => void; onConfig: () => void }) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          Alert.alert(
            'Delete book',
            `Delete "${book.title}"?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete() },
            ]
          );
        }}
      >
        <Animated.Text style={[styles.deleteActionText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} rightThreshold={40}>
      <TouchableOpacity style={styles.bookCard} onPress={onPress} activeOpacity={0.7}>
        {book.coverPath ? (
          <Image source={{ uri: book.coverPath }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText}>
              {(book.title || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {book.title}
          </Text>
          {book.author && (
            <Text style={styles.bookAuthor} numberOfLines={1}>
              {book.author}
            </Text>
          )}
          <View style={styles.bookMeta}>
            <Text style={styles.bookDate}>{formatDate(book.lastOpened)}</Text>
            {book.progress > 0 && (
              <Text style={styles.bookProgress}>
                {Math.round(book.progress * 100)}%
              </Text>
            )}
          </View>
          {book.progress > 0 && (
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${book.progress * 100}%` }]}
              />
            </View>
          )}
        </View>
<TouchableOpacity onPress={onConfig} style={styles.configBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
  <Text style={styles.configBtnText}>⋯</Text>
</TouchableOpacity>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function BookList({ books, onBookPress, onAddBook, onDeleteBook, onBookConfig }: BookListProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <FlatList
          data={books}
          renderItem={({ item }) => (
            <BookCard
              book={item}
              onPress={() => onBookPress(item)}
              onDelete={() => onDeleteBook(item)}
              onConfig={() => onBookConfig(item)}
            />
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No books</Text>
              <Text style={styles.emptyText}>
                Tap + to add an EPUB file
              </Text>
            </View>
          }
        />
      </View>
      <TouchableOpacity style={styles.fab} onPress={onAddBook} activeOpacity={0.7}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  cover: {
    width: 70,
    height: 100,
    borderRadius: 8,
  },
  coverPlaceholder: {
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bookMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bookDate: {
    fontSize: 12,
    color: '#999',
  },
  bookProgress: {
    fontSize: 12,
    color: '#4A90D9',
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90D9',
    borderRadius: 2,
  },
  configBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  configBtnText: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#bbb',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 30,
  },
  deleteAction: {
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 12,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});