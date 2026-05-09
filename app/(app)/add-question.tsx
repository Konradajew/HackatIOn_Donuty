import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { arc } from '@/lib/arcade-theme';
import { useQuestions } from '@/lib/forum-store';

const CATEGORIES = ['MATH', 'SPCE', 'MED', 'MOV', 'TRVL', 'CHEM', 'BOOKS', 'ENG'];
const ANSWER_LABELS = ['A', 'B', 'C', 'D'] as const;
type AnswerLabel = typeof ANSWER_LABELS[number];

export default function AddQuestionScreen() {
  const router = useRouter();
  const { addQuestion } = useQuestions();

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('MATH');
  const [answers, setAnswers] = useState<Record<AnswerLabel, string>>({ A: '', B: '', C: '', D: '' });
  const [correct, setCorrect] = useState<AnswerLabel>('C');
  const [explanation, setExplanation] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);

  const handleSubmit = () => {
    if (!question.trim()) return;
    addQuestion({ cat: category, t: question.trim(), user: 'you', answers, correct, explanation: explanation.trim() });
    router.back();
  };

  const setAnswer = (label: AnswerLabel, value: string) =>
    setAnswers(prev => ({ ...prev, [label]: value }));

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(255,72,152,0.08)', 'transparent']}
        style={s.glowTop}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(0,235,215,0.06)', 'transparent']}
        style={s.glowBottom}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        pointerEvents="none"
      />

      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.headerRow}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backArrow}>←</Text>
          </Pressable>
          <View style={s.headerText}>
            <Text style={s.headerTitle}>NEW QUESTION</Text>
            <Text style={s.headerSub}>+15 XP ON APPROVAL</Text>
          </View>
          <View style={s.draftBadge}>
            <Text style={s.draftText}>DRAFT</Text>
          </View>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category row */}
          <View style={s.typeCard}>
            <Text style={s.fieldLabel}>TYPE / CATEGORY</Text>
            <View style={s.tagsRow}>
              <View style={s.dmgTag}>
                <Text style={s.dmgTagText}>DMG</Text>
              </View>
              <Pressable style={s.catTag} onPress={() => setShowCatModal(true)}>
                <Text style={s.catTagText}>{category} ▾</Text>
              </Pressable>
            </View>
          </View>

          {/* Question field */}
          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>QUESTION · max 100 chars</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              maxLength={100}
              multiline
              style={s.textInput}
              placeholderTextColor={arc.outline}
              placeholder="Type your question..."
            />
          </View>

          {/* Answer fields A/B/C/D */}
          <View style={s.answersGrid}>
            {([['A','B'],['C','D']] as AnswerLabel[][]).map((row, ri) => (
              <View key={ri} style={s.answersRow}>
                {row.map(label => {
                  const isCorrect = correct === label;
                  return (
                    <View key={label} style={[s.answerCard, { borderColor: isCorrect ? arc.tertiary : arc.surfaceHigh }]}>
                      <Pressable onPress={() => setCorrect(label)}>
                        <View style={s.answerHeaderRow}>
                          <View style={[s.answerBadge, { backgroundColor: isCorrect ? arc.tertiary : arc.surfaceHigh }]}>
                            <Text style={[s.answerBadgeText, { color: isCorrect ? arc.bg : arc.outline }]}>
                              {label}
                            </Text>
                          </View>
                          {isCorrect && (
                            <Text style={s.correctLabel}>✓ correct</Text>
                          )}
                        </View>
                      </Pressable>
                      <TextInput
                        value={answers[label]}
                        onChangeText={v => setAnswer(label, v)}
                        placeholder={`Answer ${label}`}
                        placeholderTextColor={arc.outline}
                        style={s.answerInput}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Explanation field */}
          <View style={s.fieldContainer}>
            <Text style={s.fieldLabel}>EXPLANATION · max 1000 chars</Text>
            <TextInput
              value={explanation}
              onChangeText={setExplanation}
              maxLength={1000}
              multiline
              style={[s.textInput, s.textInputTall]}
              placeholderTextColor={arc.outline}
              placeholder="Explain the correct answer..."
            />
          </View>

          {/* Footer buttons */}
          <View style={s.footerRow}>
            <Pressable style={s.cancelBtn} onPress={() => router.back()}>
              <Text style={s.cancelText}>CANCEL</Text>
            </Pressable>
            <Pressable style={s.submitBtn} onPress={handleSubmit}>
              <Text style={s.submitText}>✓ SUBMIT</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Category modal */}
      <Modal transparent animationType="fade" visible={showCatModal} onRequestClose={() => setShowCatModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowCatModal(false)}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>SELECT CATEGORY</Text>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat}
                style={[s.modalItem, cat === category && { backgroundColor: `${arc.secondaryContainer}22` }]}
                onPress={() => { setCategory(cat); setShowCatModal(false); }}
              >
                <Text style={[s.modalItemText, { color: cat === category ? arc.secondaryContainer : arc.ink }]}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: arc.bg },
  glowTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  glowBottom: { position: 'absolute', bottom: 0, right: 0, width: 260, height: 260 },
  safe: { flex: 1, paddingHorizontal: 16 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 18,
  },
  backBtn: {
    width: 32,
    height: 32,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: arc.ink,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    color: arc.ink,
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: arc.outline,
    letterSpacing: 1,
    marginTop: 2,
  },
  draftBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,235,215,0.33)',
    backgroundColor: 'rgba(0,235,215,0.07)',
  },
  draftText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 13,
    color: arc.secondaryContainer,
  },

  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 24 },

  typeCard: {
    padding: 12,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: arc.outline,
    letterSpacing: 1,
  },
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dmgTag: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    backgroundColor: arc.primaryContainer,
  },
  dmgTagText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: arc.bg,
    letterSpacing: 1,
  },
  catTag: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    backgroundColor: arc.surfaceHigh,
  },
  catTagText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: arc.ink,
    letterSpacing: 1,
  },

  fieldContainer: {
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    padding: 12,
    gap: 8,
  },
  textInput: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    color: arc.ink,
    lineHeight: 22,
    minHeight: 40,
    padding: 0,
  },
  textInputTall: { minHeight: 80 },

  answersGrid: { gap: 8 },
  answersRow: { flexDirection: 'row', gap: 8 },
  answerCard: {
    flex: 1,
    backgroundColor: arc.surface,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  answerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  answerBadge: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerBadgeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    letterSpacing: 1,
  },
  correctLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: arc.tertiary,
    letterSpacing: 0.5,
  },
  answerInput: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: arc.ink,
    padding: 0,
    minHeight: 20,
  },

  footerRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: arc.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: arc.ink,
    letterSpacing: 2,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: arc.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore - boxShadow supported in RN 0.81 new arch
    boxShadow: '0 0 14px rgba(167,215,0,0.4)',
  },
  submitText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    color: arc.bg,
    letterSpacing: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,11,20,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    width: 220,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.secondaryContainer,
    padding: 8,
    gap: 2,
  },
  modalTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: arc.secondaryContainer,
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: arc.surfaceHigh,
    marginBottom: 4,
  },
  modalItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalItemText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    letterSpacing: 1,
  },
});
