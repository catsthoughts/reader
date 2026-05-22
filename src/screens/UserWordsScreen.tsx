import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { DictPair } from '../types';
import { ALL_DICT_PAIRS, DICT_PAIR_META } from '../types';
import { getUserWordsStats, resetUserWordsForLanguage } from '../database/userwords';
import type { LanguageStats } from '../database/userwords';

const LEVEL_LABELS: Record<number, string> = {
  1: 'Unknown',
  2: 'Learning',
  3: 'Familiar',
  4: 'Known',
  5: 'Mastered',
};

const LEVEL_COLORS: Record<number, string> = {
  1: '#FF3B30',
  2: '#FF9500',
  3: '#FFCC00',
  4: '#34C759',
  5: '#007AFF',
};

export default function UserWordsScreen() {
  const [stats, setStats] = useState<LanguageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getUserWordsStats();
    setStats(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReset = useCallback((language: string) => {
    const meta = DICT_PAIR_META[language as DictPair];
    Alert.alert(
      'Reset words',
      `Delete all saved words for ${meta.sourceLabel} → ${meta.targetLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(language);
            await resetUserWordsForLanguage(language);
            await load();
            setResetting(null);
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

  const hasWords = stats.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>YOUR WORDS</Text>
      <Text style={styles.subheading}>
        Words you've looked up, grouped by dictionary and knowledge level.
      </Text>

      {!hasWords && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No words saved yet.{'\n'}Tap any word while reading to add it here.</Text>
        </View>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {ALL_DICT_PAIRS.map((pair) => {
          const meta = DICT_PAIR_META[pair];
          const s = stats.find((st) => st.language === pair);
          if (!s) return null;

          return (
            <View key={pair} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.flags}>
                  <Text style={styles.flag}>{meta.sourceFlag}</Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.flag}>{meta.targetFlag}</Text>
                </View>
                <Text style={styles.langName}>{meta.sourceLabel} → {meta.targetLabel}</Text>
                <Text style={styles.total}>{s.total} words</Text>
              </View>

              {([5, 4, 3, 2, 1] as const).map((level) => (
                <View key={level} style={styles.levelRow}>
                  <View style={[styles.levelDot, { backgroundColor: LEVEL_COLORS[level] }]} />
                  <Text style={styles.levelLabel}>{LEVEL_LABELS[level]}</Text>
                  <View style={styles.levelBar}>
                    <View
                      style={[
                        styles.levelBarFill,
                        {
                          backgroundColor: LEVEL_COLORS[level],
                          width: s.total > 0 ? `${(s.levels[level] / s.total) * 100}%` : '0%',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.levelCount}>{s.levels[level]}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => handleReset(pair)}
                disabled={resetting === pair}
              >
                {resetting === pair ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <Text style={styles.resetBtnText}>Reset</Text>
                )}
              </TouchableOpacity>
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
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  flags: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flag: {
    fontSize: 20,
  },
  arrow: {
    fontSize: 14,
    marginHorizontal: 5,
    color: '#8e8e93',
  },
  langName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  total: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  levelLabel: {
    width: 80,
    fontSize: 13,
    color: '#555',
  },
  levelBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: 6,
    borderRadius: 3,
  },
  levelCount: {
    width: 30,
    fontSize: 13,
    color: '#555',
    textAlign: 'right',
  },
  resetBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  resetBtnText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
});
