import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { DictPair, DictStatus } from '../types';
import { ALL_DICT_PAIRS, DICT_PAIR_META } from '../types';
import { getAllDictStatus, downloadAndImport, deleteCachedDict } from '../services/dictionaryDownload';
import { getDefaultDictPairs, setDefaultDictPairs } from '../database/books';

export default function DictionarySettingsScreen() {
  const [statuses, setStatuses] = useState<DictStatus[]>([]);
  const [defaultDicts, setDefaultDicts] = useState<DictPair[]>(['en_ru']);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<DictPair | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [stats, defaults] = await Promise.all([
      getAllDictStatus(),
      getDefaultDictPairs(),
    ]);
    setStatuses(stats);
    setDefaultDicts(defaults);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleDefault = useCallback(async (pair: DictPair) => {
    const next = defaultDicts.includes(pair)
      ? defaultDicts.filter((p) => p !== pair)
      : [...defaultDicts, pair];
    setDefaultDicts(next);
    await setDefaultDictPairs(next);
  }, [defaultDicts]);

  const handleDownload = useCallback(async (pair: DictPair) => {
    setWorking(pair);
    try {
      const count = await downloadAndImport(pair, (status) => {
        setStatuses((prev) =>
          prev.map((s) =>
            s.dictPair === pair ? { ...s, downloading: status !== 'Done' } : s
          )
        );
      });
      await load();
      const meta = DICT_PAIR_META[pair];
      Alert.alert('Done', `${meta.sourceLabel} → ${meta.targetLabel}: ${count.toLocaleString()} words imported`);
    } catch (err: any) {
      Alert.alert('Error', `Failed to download: ${err.message}`);
    } finally {
      setWorking(null);
    }
  }, [load]);

  const handleDelete = useCallback(async (pair: DictPair) => {
    const meta = DICT_PAIR_META[pair];
    Alert.alert(
      'Delete dictionary',
      `Remove ${meta.sourceLabel} → ${meta.targetLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCachedDict(pair);
            await load();
          },
        },
      ]
    );
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>DICTIONARIES</Text>
      <Text style={styles.subheading}>
        Download bilingual dictionaries. Select defaults — they are used when a book has no custom selection.
        Tap a book's gear icon to assign specific dictionaries.
      </Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {ALL_DICT_PAIRS.map((pair) => {
          const meta = DICT_PAIR_META[pair];
          const status = statuses.find((s) => s.dictPair === pair);
          const isDefault = defaultDicts.includes(pair);
          const hasWords = (status?.wordCount ?? 0) > 0;
          const isWorking = working === pair;

          return (
            <View key={pair} style={[styles.card, isDefault && styles.cardActive]}>
              <View style={styles.cardLeft}>
                <View style={styles.flags}>
                  <Text style={styles.flag}>{meta.sourceFlag}</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.flag}>{meta.targetFlag}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.langName}>{meta.sourceLabel} → {meta.targetLabel}</Text>
                  <Text style={styles.langStatus}>
                    {isWorking
                      ? 'Working...'
                      : hasWords
                        ? `${status!.wordCount.toLocaleString()} words`
                        : 'Not installed'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardRight}>
                {isWorking ? (
                  <ActivityIndicator size="small" color="#4A90D9" />
                ) : hasWords ? (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(pair)}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => handleDownload(pair)}
                  >
                    <Text style={styles.downloadBtnText}>Download</Text>
                  </TouchableOpacity>
                )}

                {hasWords && (
                  <TouchableOpacity
                    style={[
                      styles.defaultBtn,
                      isDefault && styles.defaultBtnActive,
                    ]}
                    onPress={() => toggleDefault(pair)}
                  >
                    <Text
                      style={[
                        styles.defaultBtnText,
                        isDefault && styles.defaultBtnTextActive,
                      ]}
                    >
                      {isDefault ? 'Default' : 'Set default'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cardActive: {
    borderLeftWidth: 3,
    borderLeftColor: '#4A90D9',
  },
  cardLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
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
  cardInfo: {
    flex: 1,
  },
  langName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  langStatus: {
    fontSize: 13,
    color: '#8e8e93',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  downloadBtn: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deleteBtnText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  defaultBtn: {
    borderWidth: 1,
    borderColor: '#4A90D9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  defaultBtnActive: {
    backgroundColor: '#4A90D9',
  },
  defaultBtnText: {
    color: '#4A90D9',
    fontSize: 12,
    fontWeight: '600',
  },
  defaultBtnTextActive: {
    color: '#fff',
  },
});
