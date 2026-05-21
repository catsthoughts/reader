import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type { DictPair } from '../types';
import { ALL_DICT_PAIRS, DICT_PAIR_META } from '../types';
import { getBookDictPairs, setBookDictPairs, getDefaultDictPairs } from '../database/books';

interface BookDictionaryConfigScreenProps {
  navigation: any;
  route: {
    params: {
      bookId: number;
      bookTitle: string;
    };
  };
}

export default function BookDictionaryConfigScreen({ navigation, route }: BookDictionaryConfigScreenProps) {
  const { bookId, bookTitle } = route.params;
  const [selected, setSelected] = useState<DictPair[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    const [bookPairs, defaultPairs] = await Promise.all([
      getBookDictPairs(bookId),
      getDefaultDictPairs(),
    ]);
    setSelected(bookPairs.length > 0 ? bookPairs : defaultPairs);
    setLoaded(true);
  }

  const toggle = useCallback((pair: DictPair) => {
    setSelected((prev) =>
      prev.includes(pair)
        ? prev.filter((p) => p !== pair)
        : [...prev, pair]
    );
  }, []);

  const handleSave = useCallback(async () => {
    await setBookDictPairs(bookId, selected);
    Alert.alert('Done', 'Dictionary set updated for this book');
    navigation.goBack();
  }, [bookId, selected, navigation]);

  if (!loaded) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{bookTitle}</Text>
      <Text style={styles.subheading}>
        Select which dictionaries to search when looking up words in this book.
        If none selected, global defaults are used.
      </Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {ALL_DICT_PAIRS.map((pair) => {
          const meta = DICT_PAIR_META[pair];
          const isSelected = selected.includes(pair);
          return (
            <TouchableOpacity
              key={pair}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => toggle(pair)}
            >
              <View style={styles.cardContent}>
                <View style={styles.flags}>
                  <Text style={styles.flag}>{meta.sourceFlag}</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.flag}>{meta.targetFlag}</Text>
                </View>
                <Text style={styles.dictName}>{meta.sourceLabel} → {meta.targetLabel}</Text>
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: '#8e8e93',
    lineHeight: 18,
    marginBottom: 20,
  },
  list: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSelected: {
    borderLeftWidth: 3,
    borderLeftColor: '#4A90D9',
  },
  cardContent: {
    flexDirection: 'column',
    flex: 1,
  },
  flags: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flag: {
    fontSize: 24,
  },
  arrow: {
    fontSize: 16,
    marginHorizontal: 6,
    color: '#8e8e93',
  },
  dictName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    borderColor: '#4A90D9',
    backgroundColor: '#4A90D9',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#4A90D9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
