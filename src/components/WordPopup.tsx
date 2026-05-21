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

interface WordPopupProps {
  visible: boolean;
  word: string;
  dictionaryEntry: DictionaryEntry | null;
  userWord: BookWord | null;
  onClose: () => void;
  onKnowledgeLevelChange: (level: 1 | 2 | 3 | 4 | 5) => void;
}

const LEVELS: { level: 1 | 2 | 3 | 4 | 5; label: string; color: string }[] = [
  { level: 1, label: 'Don\'t know', color: '#FF3B30' },
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
            <View>
              <Text style={styles.wordText}>{word}</Text>
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
            {dictionaryEntry ? (
              <Text style={styles.definitionText}>
                {dictionaryEntry.definition}
              </Text>
            ) : (
              <Text style={styles.noDefinition}>
                Definition not found in dictionary
              </Text>
            )}
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
  wordText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
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
    maxHeight: 180,
    marginBottom: 16,
  },
  definitionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
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