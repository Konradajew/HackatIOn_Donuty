import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Modal, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArcadeColors as C } from "@/constants/theme";
import { useQuestions } from '@/lib/forum-store';
import { useAuth } from "@/lib/auth-context";

const CATEGORIES = [
  'math', 'space', 'medicine', 'movies', 'travel',
  'chemistry', 'books', 'english', 'history', 'music',
  'nature', 'games', 'IT', 'culinary', 'flags',
  'countries', 'religion', 'useless_facts',
];

const CATEGORY_TO_TYPE: Record<string, string> = {
  math: 'DMG', travel: 'DMG', english: 'DMG',
  medicine: 'HEAL', nature: 'HEAL', movies: 'HEAL',
  chemistry: 'POISON', books: 'POISON', space: 'POISON',
  religion: 'DMG_BLOCK', music: 'DMG_BLOCK', culinary: 'DMG_BLOCK',
  games: 'HEAL_REMOVE', history: 'HEAL_REMOVE', flags: 'HEAL_REMOVE',
  IT: 'TIME_BUFF', countries: 'TIME_BUFF', useless_facts: 'TIME_BUFF',
};

const TYPE_COLOR: Record<string, string> = {
  DMG: '#FF1F8F',
  HEAL: '#C8FF1A',
  POISON: '#a100ff',
  DMG_BLOCK: '#fff87a',
  HEAL_REMOVE: '#19F0DC',
  TIME_BUFF: '#009dff',
};
const ANSWER_LABELS = ['A', 'B', 'C', 'D'] as const;
type AnswerLabel = typeof ANSWER_LABELS[number];

export default function AddQuestionScreen() {
  const router = useRouter();
  const { addQuestion } = useQuestions();
  const { profile } = useAuth();

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('math');
  const [answers, setAnswers] = useState<Record<AnswerLabel, string>>({ A: '', B: '', C: '', D: '' });
  const [correct, setCorrect] = useState<AnswerLabel>('C');
  const [explanation, setExplanation] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cardType = CATEGORY_TO_TYPE[category] ?? 'DMG';
  const cardColor = TYPE_COLOR[cardType] ?? C.primaryBright;

  const handleSubmit = async () => {
    setSubmitError(null);
    const title = question.trim();
    if (title.length < 5 || title.length > 100) {
      setSubmitError('Title must be 5–100 characters.');
      return;
    }
    if (Object.values(answers).some(a => !a.trim())) {
      setSubmitError('All four answers are required.');
      return;
    }
    try {
      await addQuestion({
        cat: category,
        t: title,
        user: profile?.nickname?.toLowerCase() ?? 'you',
        answers,
        correct,
        explanation: explanation.trim(),
      });
      router.back();
    } catch (e: unknown) {
      const errMsg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message: unknown }).message === 'string'
            ? (e as { message: string }).message
            : String(e);
      if (errMsg.includes('title_length_invalid')) setSubmitError('Title must be 5–100 characters.');
      else if (errMsg.includes('wrong_answers_must_be_3')) setSubmitError('All four answers are required.');
      else if (errMsg.includes('explanation_too_long')) setSubmitError('Explanation too long (max 1000 chars).');
      else if (errMsg.includes('not_authenticated')) setSubmitError('Session expired — please sign in again.');
      else setSubmitError(errMsg);
    }
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
              <View style={[s.dmgTag, { backgroundColor: cardColor }]}>
                <Text style={s.dmgTagText}>{cardType}</Text>
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
              placeholderTextColor={C.outline}
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
                    <View key={label} style={[s.answerCard, { borderColor: isCorrect ? C.tertiaryDim : C.surfaceContainerHigh }]}>
                      <Pressable onPress={() => setCorrect(label)}>
                        <View style={s.answerHeaderRow}>
                          <View style={[s.answerBadge, { backgroundColor: isCorrect ? C.tertiaryDim : C.surfaceContainerHigh }]}>
                            <Text style={[s.answerBadgeText, { color: isCorrect ? C.background : C.outline }]}>
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
                        placeholderTextColor={C.outline}
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
              placeholderTextColor={C.outline}
              placeholder="Explain the correct answer..."
            />
          </View>

          {/* Error display */}
          {submitError ? (
            <Text style={s.errorText}>{submitError}</Text>
          ) : null}

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
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat}
                  style={[s.modalItem, cat === category && { backgroundColor: `${C.secondaryBright}22` }]}
                  onPress={() => { setCategory(cat); setShowCatModal(false); }}
                >
                  <Text style={[s.modalItemText, { color: cat === category ? C.secondaryBright : C.onSurface }]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
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
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: C.onSurface,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    color: C.onSurface,
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: C.outline,
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
    color: C.secondaryBright,
  },

  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 24 },

  typeCard: {
    padding: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: C.outline,
    letterSpacing: 1,
  },
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dmgTag: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    backgroundColor: C.primaryBright,
  },
  dmgTagText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: C.background,
    letterSpacing: 1,
  },
  catTag: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    backgroundColor: C.surfaceContainerHigh,
  },
  catTagText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: C.onSurface,
    letterSpacing: 1,
  },

  fieldContainer: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    padding: 12,
    gap: 8,
  },
  textInput: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    color: C.onSurface,
    lineHeight: 22,
    minHeight: 40,
    padding: 0,
  },
  textInputTall: { minHeight: 80 },

  answersGrid: { gap: 8 },
  answersRow: { flexDirection: 'row', gap: 8 },
  answerCard: {
    flex: 1,
    backgroundColor: C.surface,
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
    color: C.tertiaryDim,
    letterSpacing: 0.5,
  },
  answerInput: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: C.onSurface,
    padding: 0,
    minHeight: 20,
  },

  errorText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: C.error,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: -4,
  },

  footerRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: C.onSurface,
    letterSpacing: 2,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: C.tertiaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore - boxShadow supported in RN 0.81 new arch
    boxShadow: '0 0 14px rgba(167,215,0,0.4)',
  },
  submitText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    color: C.background,
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
    maxHeight: 380,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.secondaryBright,
    padding: 8,
    gap: 2,
  },
  modalTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: C.secondaryBright,
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceContainerHigh,
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
