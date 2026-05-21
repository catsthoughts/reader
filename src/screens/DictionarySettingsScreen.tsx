import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import type { Language, DictStatus } from '../types';
import { getAllLanguageStatus, downloadAndImport, deleteCachedDict } from '../services/dictionaryDownload';
import { getActiveLanguages, setActiveLanguages } from '../database/books';

const LANG: { key: Language; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'ru', label: 'Russian', flag: '🇷🇺' },
  { key: 'es', label: 'Spanish', flag: '🇪🇸' },
  { key: 'ro', label: 'Romanian', flag: '🇷🇴' },
  { key: 'it', label: 'Italian', flag: '🇮🇹' },
];

export default function DictionarySettingsScreen() {
  const [statuses, setStatuses] = useState<DictStatus[]>([]);
  const [activeLangs, setActiveLangs] = useState<Language[]>(['en']);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<Language | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [stats, active] = await Promise.all([
      getAllLanguageStatus(),
      getActiveLanguages(),
    ]);
    setStatuses(stats);
    setActiveLangs(active);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = useCallback(async (lang: Language) => {
    const next = activeLangs.includes(lang)
      ? activeLangs.filter((l) => l !== lang)
      : [...activeLangs, lang];
    setActiveLangs(next);
    await setActiveLanguages(next);
  }, [activeLangs]);

  const handleDownload = useCallback(async (lang: Language) => {
    setWorking(lang);
    try {
      const count = await downloadAndImport(lang, (status) => {
        setStatuses((prev) =>
          prev.map((s) =>
            s.language === lang ? { ...s, downloading: status !== 'Done' } : s
          )
        );
      });
      await load();
      Alert.alert('Done', `${LANG.find((l) => l.key === lang)?.label} dictionary: ${count.toLocaleString()} words imported`);
    } catch (err: any) {
      Alert.alert('Error', `Failed to download: ${err.message}`);
    } finally {
      setWorking(null);
    }
  }, [load]);

  const handleDelete = useCallback(async (lang: Language) => {
    const label = LANG.find((l) => l.key === lang)?.label;
    Alert.alert(
      'Delete dictionary',
      `Remove ${label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCachedDict(lang);
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
        Active dictionaries are searched when looking up words.
        Enable multiple to search across languages.
      </Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {LANG.map(({ key, label, flag }) => {
          const status = statuses.find((s) => s.language === key);
          const isActive = activeLangs.includes(key);
          const hasWords = (status?.wordCount ?? 0) > 0;
          const isWorking = working === key;

          return (
            <View key={key} style={[styles.card, isActive && styles.cardActive]}>
              <View style={styles.cardLeft}>
                <Text style={styles.flag}>{flag}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.langName}>{label}</Text>
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
                    onPress={() => handleDelete(key)}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => handleDownload(key)}
                  >
                    <Text style={styles.downloadBtnText}>Download</Text>
                  </TouchableOpacity>
                )}

                {hasWords && (
                  <View style={styles.switchWrap}>
                    <Switch
                      value={isActive}
                      onValueChange={() => toggleActive(key)}
                      trackColor={{ false: '#e0e0e0', true: '#4A90D9' }}
                      thumbColor={isActive ? '#fff' : '#f4f3f4'}
                      ios_backgroundColor="#e0e0e0"
                    />
                  </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 28,
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  langName: {
    fontSize: 17,
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
  },
  switchWrap: {
    marginLeft: 4,
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
});