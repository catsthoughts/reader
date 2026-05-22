import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { DictionaryEntry, BookWord } from '../types';

const POS_COLORS: Record<string, string> = {
  n: '#007AFF',
  v: '#34C759',
  adj: '#FF9500',
  adv: '#FF3B30',
  pn: '#AF52DE',
  interjection: '#5856D6',
  suffix: '#8E8E93',
  prefix: '#8E8E93',
  pron: '#FF6482',
  prep: '#00C7BE',
  conj: '#FF9500',
  num: '#FF9500',
  det: '#007AFF',
};

function getPosColor(pos: string): string {
  return POS_COLORS[pos.toLowerCase()] || '#8E8E93';
}

interface WordPopupProps {
  visible: boolean;
  word: string;
  dictionaryEntry: DictionaryEntry | null;
  userWord: BookWord | null;
  onClose: () => void;
  onKnowledgeLevelChange: (level: 1 | 2 | 3 | 4 | 5) => void;
}

const LEVELS: { level: 1 | 2 | 3 | 4 | 5; label: string; color: string }[] = [
  { level: 1, label: "Don't know", color: '#FF3B30' },
  { level: 2, label: 'Heard it', color: '#FF9500' },
  { level: 3, label: 'Recognize', color: '#007AFF' },
  { level: 4, label: 'Almost know', color: '#34C759' },
  { level: 5, label: 'Know well', color: '#8E8E93' },
];

export default function WordPopup({
  visible,
  word,
  dictionaryEntry,
  userWord,
  onClose,
  onKnowledgeLevelChange,
}: WordPopupProps) {
  const currentLevel = (userWord?.knowledgeLevel ?? 1) as 1 | 2 | 3 | 4 | 5;
  const viewCount = userWord?.viewCount ?? 0;

  const transcription = dictionaryEntry?.transcription;
  const pos = dictionaryEntry?.pos;
  const definition = dictionaryEntry?.definition;
  const details = dictionaryEntry?.details;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.container}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.wordRow}>
                <Text style={styles.wordText}>{word}</Text>
                {pos ? (
                  <View style={[styles.posBadge, { backgroundColor: getPosColor(pos) }]}>
                    <Text style={styles.posText}>{pos}</Text>
                  </View>
                ) : null}
              </View>
              {transcription ? (
                <Text style={styles.transcription}>{transcription}</Text>
              ) : null}
              <Text style={styles.viewCount}>
                {viewCount} {viewCount === 1 ? 'view' : 'views'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.definitionScroll}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {definition ? (
              <Text style={styles.definitionText}>{definition}</Text>
            ) : null}

            {details ? (
              <Text style={styles.detailsText}>{details}</Text>
            ) : null}

            {!dictionaryEntry ? (
              <Text style={styles.noDefinition}>
                Definition not found in dictionary
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.levelSection}>
            {LEVELS.map(({ level, label, color }) => {
              const active = level === currentLevel;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.levelRow, active && styles.levelRowActive]}
                  activeOpacity={0.6}
                  onPress={() => onKnowledgeLevelChange(level)}
                >
                  <View style={[styles.levelDot, { backgroundColor: color }]} />
                  <Text style={[styles.levelLabel, active && styles.levelLabelActive]}>
                    {label}
                  </Text>
                  {active && <Text style={[styles.checkmark, { color }]}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  wordText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  posBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  posText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  transcription: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'Menlo',
    marginTop: 4,
  },
  viewCount: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  definitionScroll: {
    maxHeight: 200,
    marginBottom: 16,
  },
  definitionText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  detailsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginTop: 8,
  },
  noDefinition: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  levelSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 4,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  levelRowActive: {
    backgroundColor: '#f5f5f5',
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  levelLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  levelLabelActive: {
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    width: 22,
    textAlign: 'center',
  },
});