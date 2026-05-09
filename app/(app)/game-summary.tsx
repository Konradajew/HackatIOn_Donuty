import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { arc, arcSpace } from '@/lib/arcade-theme';
import { useAuth } from '@/lib/auth-context';
import { getMatchSnapshot, getCardTypes, type CardType, type Snapshot, type AnswerLogEntry } from '@/lib/match-api';

type DisplayType = 'DMG' | 'HEAL' | 'DOT';
function toDisplay(ct: CardType): DisplayType {
  if (ct === 'HEAL' || ct === 'HEAL_REMOVE' || ct === 'TIME_BUFF') return 'HEAL';
  if (ct === 'POISON') return 'DOT';
  return 'DMG';
}

const TYPE_COLORS: Record<DisplayType, string> = {
  DMG: arc.primaryContainer,
  HEAL: arc.secondaryContainer,
  DOT: arc.tertiary,
};

export default function GameSummaryScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const { result, matchId } = useLocalSearchParams<{ result?: string; matchId?: string }>();
  const isWin  = result === 'win';
  const isDraw = result === 'draw';

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [cardTypes, setCardTypes] = useState<Record<number, CardType>>({});
  const [review, setReview] = useState<AnswerLogEntry | null>(null);

  useEffect(() => {
    const id = Number(matchId);
    if (!id) return;
    Promise.all([getMatchSnapshot(id), getCardTypes()])
      .then(([s, ct]) => { setSnap(s); setCardTypes(ct); })
      .catch(() => {});
  }, [matchId]);

  const accentColor = isWin ? arc.tertiary : isDraw ? arc.secondaryContainer : arc.primaryContainer;

  const myAnswers: AnswerLogEntry[] = (snap?.answer_log ?? []).filter(a => a.player_id === uid);
  const playedCards = myAnswers.length;
  const correctCount = myAnswers.filter(a => a.was_correct).length;
  const accPct = myAnswers.length > 0 ? Math.round((correctCount / myAnswers.length) * 100) : null;

  const startMs = snap ? new Date(snap.started_at).getTime() : 0;
  const endMs   = snap?.finished_at ? new Date(snap.finished_at).getTime() : (snap ? Date.now() : 0);
  const durSec  = snap ? Math.max(0, Math.round((endMs - startMs) / 1000)) : 0;
  const timeStr = snap ? `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, '0')}` : '—';

  const ROW1 = [
    { l: 'CARDS PLAYED', v: snap ? String(playedCards) : '—',                   sub: 'this match', c: arc.secondaryContainer },
    { l: 'ACCURACY',     v: snap ? (accPct != null ? `${accPct}%` : '—') : '—', sub: 'correct',    c: isWin ? arc.tertiary : arc.secondaryContainer },
    { l: 'TIME',         v: snap ? timeStr : '—',                                sub: 'duration',   c: arc.outline },
  ];
  const ROW2 = [
    { l: 'YOUR HP', v: snap ? `${snap.you.hp}` : '—',       sub: 'final', c: isWin ? arc.tertiary : arc.primaryContainer },
    { l: 'OPP HP',  v: snap ? `${snap.opponent.hp}` : '—',  sub: 'final', c: arc.outline },
  ];

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
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.push('/' as never)}>
            <Text style={s.backBtnText}>←</Text>
          </Pressable>
          <View style={s.headerTitle}>
            <Text style={s.titleText}>Match Recap</Text>
            <Text style={s.subtitleText}>
              {isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
            </Text>
          </View>
          <View style={[s.resultChip, { borderColor: accentColor }]}>
            <Text style={[s.resultChipText, { color: accentColor }]}>
              {isWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}
            </Text>
          </View>
        </View>

        {/* Stats rows */}
        <View style={s.statsBlock}>
          <View style={s.statsRow}>
            {ROW1.map(stat => (
              <View key={stat.l} style={s.statTile}>
                <Text style={s.statL}>{stat.l}</Text>
                <Text style={[s.statV, { color: stat.c }]}>{stat.v}</Text>
                <Text style={s.statSub}>{stat.sub}</Text>
              </View>
            ))}
          </View>
          <View style={s.statsRow}>
            {ROW2.map(stat => (
              <View key={stat.l} style={s.statTile}>
                <Text style={s.statL}>{stat.l}</Text>
                <Text style={[s.statV, { color: stat.c }]}>{stat.v}</Text>
                <Text style={s.statSub}>{stat.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cards list header */}
        <View style={s.cardsHeader}>
          <Text style={s.cardsTitle}>Cards Played</Text>
          <Text style={s.cardsTap}>TAP TO REVIEW</Text>
        </View>

        {/* Scrollable card history */}
        <ScrollView
          style={s.cardList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {snap == null ? (
            <ActivityIndicator color={arc.secondaryContainer} style={{ marginTop: 20 }} />
          ) : myAnswers.length === 0 ? (
            <Text style={[s.cardMeta, { textAlign: 'center', marginTop: 20 }]}>No cards played</Text>
          ) : (
            myAnswers.map((entry, i) => {
              const ct: CardType = cardTypes[entry.card_id] ?? 'DMG';
              const dt = toDisplay(ct);
              const tc = TYPE_COLORS[dt];
              return (
                <Pressable key={i} style={s.cardRow} onPress={() => setReview(entry)}>
                  <View style={[s.statusIcon, { backgroundColor: tc + '22' }]}>
                    <Text style={[s.statusIconGlyph, { color: tc }]}>{dt[0]}</Text>
                  </View>
                  <View style={s.cardRowBody}>
                    <View style={s.cardRowMeta}>
                      <View style={[s.typeTag, { backgroundColor: tc + '22' }]}>
                        <Text style={[s.typeTagText, { color: tc }]}>{entry.q_category}</Text>
                      </View>
                      <Text style={[s.cardMeta, { color: entry.was_correct ? arc.tertiary : arc.primaryContainer }]}>
                        {entry.was_correct ? '✓ correct' : entry.was_timeout ? '✗ timeout' : '✗ wrong'}
                      </Text>
                    </View>
                    <Text style={s.cardQuestion} numberOfLines={1}>{entry.q_title}</Text>
                  </View>
                  <Text style={s.chevron}>›</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {/* Bottom CTAs */}
        <View style={s.bottomRow}>
          <Pressable style={s.homeBtn} onPress={() => router.push('/' as never)}>
            <Text style={s.homeBtnText}>Home</Text>
          </Pressable>
          <Pressable
            style={[
              s.playAgainBtn,
              {
                backgroundColor: arc.secondaryContainer,
                shadowColor: arc.secondaryContainer,
                shadowOpacity: 0.45,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              },
            ]}
            onPress={() => router.replace('/' as never)}
          >
            <Text style={s.playAgainBtnText}>Play again →</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Review modal */}
      {review != null && (
        <Modal transparent animationType="fade" visible onRequestClose={() => setReview(null)}>
          <Pressable style={s.reviewOverlay} onPress={() => setReview(null)}>
            <View style={s.reviewBox}>
              <Text style={s.reviewQuestion}>{review.q_title}</Text>
              <View style={s.reviewOptions}>
                {review.q_options.map((opt, i) => {
                  const isCorrect = i === review.correct_idx;
                  const isWrong   = i === review.picked_idx && !review.was_correct;
                  const borderColor = isCorrect ? arc.tertiary : isWrong ? arc.primaryContainer : arc.surfaceHigh;
                  const bgColor     = isCorrect ? arc.tertiary + '22' : isWrong ? arc.primaryContainer + '22' : arc.surface;
                  return (
                    <View key={i} style={[s.reviewOption, { borderColor, backgroundColor: bgColor }]}>
                      <Text style={[s.reviewOptionText, {
                        color: isCorrect ? arc.tertiary : isWrong ? arc.primaryContainer : arc.ink,
                      }]}>{opt}</Text>
                      {isCorrect && <Text style={[s.reviewMark, { color: arc.tertiary }]}>✓</Text>}
                      {isWrong   && <Text style={[s.reviewMark, { color: arc.primaryContainer }]}>✗</Text>}
                    </View>
                  );
                })}
              </View>
              {(review.q_explanation?.trim().length ?? 0) > 0 && (
                <View style={s.explanationBox}>
                  <Text style={s.explanationLabel}>WHY?</Text>
                  <Text style={s.explanationBody}>{review.q_explanation}</Text>
                </View>
              )}
              <Pressable style={s.reviewClose} onPress={() => setReview(null)}>
                <Text style={s.reviewCloseText}>CLOSE</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: arc.bg,
  },
  glowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  glowBottom: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 260,
    height: 260,
  },
  safe: {
    flex: 1,
    paddingHorizontal: arcSpace.md,
  },

  // Header
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  backBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: arc.ink,
  },
  headerTitle: {
    flex: 1,
  },
  titleText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    color: arc.ink,
    letterSpacing: -0.3,
    lineHeight: 27,
  },
  subtitleText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  resultChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  resultChipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 1,
  },

  // Stats
  statsBlock: {
    gap: 8,
    marginBottom: arcSpace.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    padding: 12,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
  },
  statL: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    color: arc.outline,
    letterSpacing: 1,
  },
  statV: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    lineHeight: 26,
    marginTop: 6,
  },
  statSub: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    color: arc.outline,
    letterSpacing: 1,
    marginTop: 2,
  },

  // Cards list
  cardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardsTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: arc.ink,
  },
  cardsTap: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: arc.outline,
    letterSpacing: 1,
  },
  cardList: {
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
  },
  statusIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconGlyph: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  cardRowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  typeTagText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  cardMeta: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    color: arc.outline,
  },
  cardQuestion: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: arc.ink,
  },
  chevron: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: arc.outline,
  },

  // Bottom
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: arcSpace.md,
    paddingBottom: arcSpace.sm,
  },
  homeBtn: {
    flex: 1,
    height: 56,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
    color: arc.ink,
  },
  playAgainBtn: {
    flex: 2,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  playAgainBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: arc.bg,
  },

  // Review modal
  reviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13,12,28,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  reviewBox: {
    width: '100%',
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    padding: 18,
    gap: 12,
  },
  reviewQuestion: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: arc.ink,
    lineHeight: 24,
  },
  reviewOptions: {
    gap: 8,
  },
  reviewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    gap: 8,
  },
  reviewOptionText: {
    flex: 1,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 18,
  },
  reviewMark: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  explanationBox: {
    backgroundColor: arc.surfaceHigh,
    padding: 12,
    gap: 4,
  },
  explanationLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 9,
    color: arc.outline,
    letterSpacing: 1.5,
  },
  explanationBody: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: arc.ink,
    lineHeight: 18,
  },
  reviewClose: {
    height: 48,
    backgroundColor: arc.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  reviewCloseText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 13,
    color: arc.ink,
    letterSpacing: 2,
  },
});
