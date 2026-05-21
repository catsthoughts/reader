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
import type { Language, DictStatus } from '../types';
import { getAllLanguageStatus, downloadAndImport, deleteCachedDict } from '../services/dictionaryDownload';
import { getDefaultLanguage, setDefaultLanguage } from '../database/books';

const LANG_LABELS: Record<Language, string> = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  ro: 'Romanian',
  it: 'Italian',
};

export default function DictionarySettingsScreen() {
  const [statuses, setStatuses] = useState<DictStatus[]>([]);
  const [defaultLang, setDefaultLang] = useState<Language>('en');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<Language | null>(null);

  const loadStatuses = useCallback(async () => {
    setLoading(true);
    const [stats, def] = await Promise.all([
      getAllLanguageStatus(),
      getDefaultLanguage(),
    ]);
    setStatuses(stats);
    setDefaultLang(def);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

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
      await loadStatuses();
      Alert.alert('Done', `${LANG_LABELS[lang]} dictionary: ${count} words imported`);
    } catch (err: any) {
      Alert.alert('Error', `Failed to download ${LANG_LABELS[lang]} dictionary: ${err.message}`);
    } finally {
      setWorking(null);
    }
  }, [loadStatuses]);

  const handleDelete = useCallback(async (lang: Language) => {
    Alert.alert(
      'Delete dictionary',
      `Remove ${LANG_LABELS[lang]} dictionary?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCachedDict(lang);
            await loadStatuses();
          },
        },
      ]
    );
  }, [loadStatuses]);

  const handleSetDefault = useCallback(async (lang: Language) => {
    await setDefaultLanguage(lang);
    setDefaultLang(lang);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DEFAULT LANGUAGE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.defaultRow}>
          {(['en', 'ru', 'es', 'ro', 'it'] as Language[]).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.defaultChip, defaultLang === lang && styles.defaultChipActive]}
              onPress={() => handleSetDefault(lang)}
            >
              <Text style={[styles.defaultChipText, defaultLang === lang && styles.defaultChipTextActive]}>
                {LANG_LABELS[lang]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.hint}>
          Used when a book has no specific dictionary assigned
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DICTIONARIES</Text>
        {statuses.map((s) => (
          <View key={s.language} style={styles.dictRow}>
            <View style={styles.dictInfo}>
              <Text style={styles.dictLang}>{LANG_LABELS[s.language]}</Text>
              <Text style={styles.dictCount}>
                {s.wordCount > 0 ? `${s.wordCount.toLocaleString()} words` : 'Not installed'}
              </Text>
            </View>
            <View style={styles.dictActions}>
              {working === s.language ? (
                <ActivityIndicator size="small" color="#4A90D9" />
              ) : s.wordCount > 0 ? (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(s.language)}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => handleDownload(s.language)}
                >
                  <Text style={styles.downloadBtnText}>Download</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  defaultRow: {
    flexDirection: 'row',
  },
  defaultChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  defaultChipActive: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  defaultChipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  defaultChipTextActive: {
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  dictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dictInfo: {
    flex: 1,
  },
  dictLang: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  dictCount: {
    fontSize: 13,
    color: '#8e8e93',
  },
  dictActions: {
    marginLeft: 12,
  },
  downloadBtn: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteBtnText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
});