import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { arc } from '@/lib/arcade-theme';
import { useQuestions, type AnswerKey } from '@/lib/forum-store';

const ANSWER_ROWS: AnswerKey[][] = [['A', 'B'], ['C', 'D']];

export default function QuestionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { questions, submitVote, hasVotedYesNo, loading } = useQuestions();

  const [pendingDiff, setPendingDiff] = useState<number>(0);
  const [pendingVerdict, setPendingVerdict] = useState<'up' | 'down' | null>(null);

  const q = questions.find(x => x.id === id);

  if (!q && loading) {
    return (
      <View style={s.root}><StatusBar style="light" />
        <SafeAreaView style={s.safe}>
          <Text style={s.notFound}>LOADING...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!q) {
    return (
      <View style={s.root}>
        <StatusBar style="light" />
        <SafeAreaView style={s.safe}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backArrow}>←</Text>
          </Pressable>
          <Text style={s.notFound}>QUESTION NOT FOUND</Text>
        </SafeAreaView>
      </View>
    );
  }

  const alreadyVoted = hasVotedYesNo(q.id);
  const canSubmit = !alreadyVoted && pendingDiff > 0 && pendingVerdict !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await submitVote(q.id, { diff: pendingDiff, verdict: pendingVerdict! });
  };

  const hint =
    pendingDiff === 0 && pendingVerdict === null ? 'pick difficulty + verdict' :
    pendingDiff === 0 ? 'pick a difficulty rating' :
    'pick yes or no';

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
          <View style={s.catBadge}>
            <Text style={s.catText}>{q.cat}</Text>
          </View>
          <Text style={s.headerTitle}>QUESTION</Text>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Question text */}
          <View style={s.questionCard}>
            <Text style={s.questionText}>{q.t}</Text>
            <Text style={s.authorText}>@{q.user} · 2h</Text>
          </View>

          {/* Answers grid */}
          <View style={s.answersGrid}>
            {ANSWER_ROWS.map((row, ri) => (
              <View key={ri} style={s.answersRow}>
                {row.map(label => {
                  const isCorrect = q.correct === label;
                  return (
                    <View key={label} style={[s.answerCard, { borderColor: isCorrect ? arc.tertiary : arc.surfaceHigh }]}>
                      <View style={s.answerHeaderRow}>
                        <View style={[s.answerBadge, { backgroundColor: isCorrect ? arc.tertiary : arc.surfaceHigh }]}>
                          <Text style={[s.answerBadgeText, { color: isCorrect ? arc.bg : arc.outline }]}>{label}</Text>
                        </View>
                        {isCorrect && <Text style={s.correctLabel}>✓ correct</Text>}
                      </View>
                      <Text style={s.answerText}>{q.answers[label] || '—'}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={[s.statIcon, { color: arc.tertiary }]}>▲</Text>
              <Text style={[s.statValue, { color: arc.tertiary }]}>{q.up}</Text>
              <Text style={s.statLabel}>YES</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statIcon, { color: arc.errorContainer }]}>▼</Text>
              <Text style={[s.statValue, { color: arc.errorContainer }]}>{q.down}</Text>
              <Text style={s.statLabel}>NO</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statIcon, { color: arc.secondaryContainer }]}>◆</Text>
              <Text style={[s.statValue, { color: arc.secondaryContainer }]}>{q.diffAvg !== null ? `${q.diffAvg.toFixed(1)}/5` : '?/5'}</Text>
              <Text style={s.statLabel}>DIFF</Text>
            </View>
          </View>

          {/* Explanation */}
          {q.explanation ? (
            <View style={s.sectionCard}>
              <Text style={s.sectionLabel}>EXPLANATION</Text>
              <Text style={s.explanationText}>{q.explanation}</Text>
            </View>
          ) : null}

          {/* 1. Rate difficulty */}
          <View style={s.sectionCard}>
            <Text style={s.sectionLabel}>1. RATE DIFFICULTY</Text>
            <View style={s.diffDotsRow}>
              {[1,2,3,4,5].map(d => (
                <Pressable
                  key={d}
                  onPress={() => !alreadyVoted && setPendingDiff(d)}
                  disabled={alreadyVoted}
                  style={s.diffDotBtn}
                >
                  <View style={[
                    s.diffDot,
                    { backgroundColor: d <= pendingDiff ? arc.primaryContainer : arc.surfaceHigh },
                    alreadyVoted && { opacity: 0.5 },
                  ]} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* 2. Yes / No */}
          <View style={s.sectionCard}>
            <Text style={s.sectionLabel}>2. DOES THIS QUESTION DESERVE TO STAY?</Text>
            <View style={s.voteRow}>
              <Pressable
                style={[s.voteBtn, {
                  backgroundColor: pendingVerdict === 'up' ? arc.tertiary : arc.surfaceHigh,
                  borderColor: arc.tertiary,
                  opacity: alreadyVoted ? 0.4 : 1,
                }]}
                onPress={() => !alreadyVoted && setPendingVerdict('up')}
                disabled={alreadyVoted}
              >
                <Text style={[s.voteBtnText, { color: pendingVerdict === 'up' ? arc.bg : arc.tertiary }]}>✓ YES</Text>
              </Pressable>
              <Pressable
                style={[s.voteBtn, {
                  backgroundColor: pendingVerdict === 'down' ? arc.errorContainer : arc.surfaceHigh,
                  borderColor: arc.errorContainer,
                  opacity: alreadyVoted ? 0.4 : 1,
                }]}
                onPress={() => !alreadyVoted && setPendingVerdict('down')}
                disabled={alreadyVoted}
              >
                <Text style={[s.voteBtnText, { color: pendingVerdict === 'down' ? arc.ink : arc.errorContainer }]}>✗ NO</Text>
              </Pressable>
            </View>
          </View>

          {/* Submit vote */}
          <Pressable
            style={[s.submitVoteBtn, {
              backgroundColor: canSubmit ? arc.secondaryContainer : arc.surfaceHigh,
              // @ts-ignore - boxShadow supported in RN 0.81 new arch
              boxShadow: canSubmit ? '0 0 14px rgba(0,235,215,0.4)' : undefined,
            }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={[s.submitVoteText, { color: canSubmit ? arc.bg : arc.outline }]}>
              {alreadyVoted ? '✓ VOTE SUBMITTED' : 'SUBMIT VOTE'}
            </Text>
          </Pressable>

          {!alreadyVoted && !canSubmit && (
            <Text style={s.hintText}>{hint}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
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
    marginBottom: 20,
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
  catBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,235,215,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(0,235,215,0.33)',
  },
  catText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: arc.secondaryContainer,
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    color: arc.ink,
    letterSpacing: 2,
    flex: 1,
  },

  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 32 },

  questionCard: {
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    padding: 16,
    gap: 10,
  },
  questionText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: arc.ink,
    lineHeight: 30,
  },
  authorText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: arc.outline,
  },

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
  answerText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: arc.ink,
    lineHeight: 20,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
  },
  statValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    letterSpacing: 1,
  },
  statLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 1,
  },

  sectionCard: {
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: arc.outline,
    letterSpacing: 1,
  },
  explanationText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    color: arc.ink,
    lineHeight: 22,
  },

  diffDotsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  diffDotBtn: {
    padding: 4,
  },
  diffDot: {
    width: 24,
    height: 24,
  },

  voteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voteBtn: {
    flex: 1,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  voteBtnText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    letterSpacing: 2,
  },

  submitVoteBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitVoteText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 15,
    letterSpacing: 2,
  },

  hintText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: arc.outline,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: -4,
  },

  notFound: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: arc.outline,
    textAlign: 'center',
    marginTop: 60,
    letterSpacing: 2,
  },
});
