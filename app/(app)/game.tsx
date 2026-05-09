import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { arc, arcSpace } from '@/lib/arcade-theme';
import { BattleCard } from '@/components/arcade/BattleCard';
import { QuestionSheet } from '@/components/arcade/QuestionSheet';
import { VictoryOverlay } from '@/components/arcade/VictoryOverlay';
import { DefeatOverlay } from '@/components/arcade/DefeatOverlay';
import { getGameQuestion, type GameQuestion } from '@/lib/forum-api';
import { applyEffect } from '@/lib/difficulty';

type CardType = 'DMG' | 'HEAL' | 'DOT';

const HAND: { type: CardType; cat: string; val: number }[] = [
  { type: 'DMG',  cat: 'MATH', val: 6 },
  { type: 'HEAL', cat: 'MED',  val: 4 },
  { type: 'DMG',  cat: 'TRVL', val: 5 },
  { type: 'DOT',  cat: 'SPCE', val: 3 },
  { type: 'HEAL', cat: 'MOV',  val: 5 },
];

const TOTAL_ROUNDS = 10;

export default function GameScreen() {
  const router = useRouter();
  const [selectedCard, setSelectedCard]   = useState(2);
  const [questionOpen, setQuestionOpen]   = useState(false);
  const [victoryOpen, setVictoryOpen]     = useState(false);
  const [defeatOpen, setDefeatOpen]       = useState(false);
  const [opponentHp, setOpponentHp]       = useState(62);
  const [playerHp, setPlayerHp]           = useState(84);
  const [round, setRound]                 = useState(4);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [noQuestionCat, setNoQuestionCat]     = useState<string | null>(null);
  const [lastPlay, setLastPlay] = useState<{
    type: CardType; cat: string; val: number; correct: boolean; scaledVal: number;
  } | null>({ type: 'DMG', cat: 'MATH', val: 6, correct: true, scaledVal: 6 });

  const card = HAND[selectedCard];

  const handlePlayCard = useCallback(async () => {
    const q = await getGameQuestion(card.cat);
    if (!q) {
      setNoQuestionCat(card.cat);
      setTimeout(() => setNoQuestionCat(null), 3000);
      return;
    }
    setCurrentQuestion(q);
    setQuestionOpen(true);
  }, [card.cat]);

  const handleAnswer = useCallback((answerIndex: number | null) => {
    setQuestionOpen(false);
    const difficulty = currentQuestion?.difficulty ?? 1;
    const scaledVal  = applyEffect(card.val, card.type, difficulty);
    const isCorrect  = answerIndex !== null && answerIndex === (currentQuestion?.correctIndex ?? -1);

    setRound(r => Math.min(r + 1, TOTAL_ROUNDS));
    setLastPlay({ ...card, correct: isCorrect, scaledVal });

    if (isCorrect) {
      setOpponentHp(prev => {
        const next = Math.max(0, prev - scaledVal);
        if (next <= 0) setTimeout(() => setVictoryOpen(true), 350);
        return next;
      });
    } else {
      setPlayerHp(prev => {
        const next = Math.max(0, prev - 6);
        if (next <= 0) setTimeout(() => setDefeatOpen(true), 350);
        return next;
      });
    }
  }, [card, currentQuestion]);

  const TYPE_LABEL: Record<CardType, string> = { DMG: 'DMG · DAMAGE', HEAL: 'HEAL · RESTORE', DOT: 'DOT · POISON' };
  const TYPE_COLOR: Record<CardType, string> = {
    DMG:  arc.primaryContainer,
    HEAL: arc.secondaryContainer,
    DOT:  arc.tertiary,
  };
  const accent      = TYPE_COLOR[card.type];
  const difficulty  = currentQuestion?.difficulty ?? 1;
  const previewVal  = applyEffect(card.val, card.type, difficulty);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(255,72,152,0.08)', 'transparent']} style={s.glowTop}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} pointerEvents="none" />
      <LinearGradient colors={['rgba(0,235,215,0.06)', 'transparent']} style={s.glowBottom}
        start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }} pointerEvents="none" />

      <SafeAreaView style={s.safe}>
        {/* Top bar */}
        <View style={s.topBar}>
          <Pressable style={s.iconBtn} onPress={() => router.back()}>
            <Text style={s.iconBtnText}>×</Text>
          </Pressable>
          <View style={s.roundCenter}>
            <Text style={s.roundLabel}>ROUND {round} / {TOTAL_ROUNDS}</Text>
            <Text style={s.turnText}>Your Turn</Text>
          </View>
          <View style={s.timerBox}>
            <Text style={s.timerText}>0:12</Text>
          </View>
        </View>

        {/* Opponent panel */}
        <View style={s.opponentPanel}>
          <View style={s.opponentInner}>
            <View style={s.opponentAvatar}>
              <Text style={s.opponentAvatarText}>G</Text>
            </View>
            <View style={s.opponentInfo}>
              <View style={s.opponentNameRow}>
                <Text style={s.opponentName}>Glazer</Text>
                <Text style={s.opponentHpLabel}>{opponentHp}/100</Text>
              </View>
              <View style={s.hpTrack}>
                <LinearGradient
                  colors={[arc.primaryContainer, arc.errorContainer]}
                  style={[s.hpFill, { width: `${opponentHp}%` }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </View>
              <View style={s.opponentChips}>
                <View style={[s.statusChip, { backgroundColor: arc.tertiary + '22' }]}>
                  <Text style={[s.statusChipText, { color: arc.tertiary }]}>POISON · 2T</Text>
                </View>
                <Text style={s.levelText}>LV.24 BOSS</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Battlefield — last play */}
        <View style={s.battlefield}>
          {noQuestionCat ? (
            <>
              <Text style={s.lastPlayLabel}>NO QUESTION AVAILABLE</Text>
              <Text style={[s.noPlayText, { color: arc.outline, marginTop: 6 }]}>
                {noQuestionCat} HAS NO APPROVED QUESTIONS YET
              </Text>
            </>
          ) : lastPlay ? (
            <>
              <Text style={s.lastPlayLabel}>LAST PLAY</Text>
              <View style={s.lastPlayRow}>
                <BattleCard type={lastPlay.type} cat={lastPlay.cat} val={lastPlay.scaledVal} w={70} sel />
                <View style={s.lastPlayMeta}>
                  <Text style={[s.damageText, { color: lastPlay.correct ? arc.primaryContainer : arc.secondaryContainer }]}>
                    {lastPlay.correct ? `−${lastPlay.scaledVal} HP` : '+6 DMG TO YOU'}
                  </Text>
                  <Text style={[s.answerResult, { color: arc.secondaryContainer }]}>
                    {lastPlay.correct ? 'ANSWER ✓ CORRECT' : 'ANSWER ✗ WRONG'}
                  </Text>
                  {lastPlay.correct && <Text style={s.comboText}>+2 COMBO</Text>}
                </View>
              </View>
            </>
          ) : (
            <Text style={s.noPlayText}>— PLAY A CARD —</Text>
          )}
        </View>

        {/* Player HP */}
        <View style={s.playerHpSection}>
          <View style={s.playerHpHeader}>
            <Text style={s.playerLabel}>You</Text>
            <Text style={[s.opponentHpLabel, { color: arc.secondaryContainer }]}>{playerHp}/100</Text>
          </View>
          <View style={s.hpTrackPlayer}>
            <LinearGradient
              colors={[arc.secondaryContainer, arc.tertiary]}
              style={[s.hpFill, { width: `${playerHp}%` }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        {/* Hand meta */}
        <View style={s.handMeta}>
          <Text style={s.handMetaLeft}>YOUR HAND · {HAND.length}</Text>
          <Text style={s.handMetaRight}>DECK 27 · DISCARD 13</Text>
        </View>

        {/* Card hand */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.handScroll} style={s.handScrollView}>
          {HAND.map((c, i) => (
            <Pressable key={i} onPress={() => setSelectedCard(i)}>
              <BattleCard {...c} w={62} sel={selectedCard === i} />
            </Pressable>
          ))}
        </ScrollView>

        {/* Selected card detail */}
        <View style={[s.cardDetail, { borderColor: accent + '88' }]}>
          <View style={s.cardDetailMeta}>
            <View style={[s.cardTypeChip, { backgroundColor: accent + '22' }]}>
              <Text style={[s.cardTypeChipText, { color: accent }]}>{TYPE_LABEL[card.type]}</Text>
            </View>
            <Text style={s.diffStars}>
              {'★'.repeat(difficulty)}{'☆'.repeat(5 - difficulty)}
            </Text>
            <View style={s.spacer} />
            <Text style={[s.dmgLabel, { color: accent }]}>{previewVal} DMG</Text>
          </View>
          <Pressable
            style={[s.playBtn, { backgroundColor: accent, shadowColor: accent }]}
            onPress={handlePlayCard}
          >
            <Text style={s.playBtnText}>Play card ↗</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <QuestionSheet
        visible={questionOpen}
        onClose={() => setQuestionOpen(false)}
        onSubmit={handleAnswer}
        card={card}
        question={currentQuestion?.title ?? ''}
        answers={currentQuestion?.shuffledAnswers ?? []}
        timerSec={8}
        durationSec={8}
        difficulty={difficulty}
      />
      <VictoryOverlay
        visible={victoryOpen}
        onClose={() => router.push('/game-summary?result=win' as never)}
        onContinue={() => router.push('/game-summary?result=win' as never)}
        xp={148} coins={24}
        stats={{ cards: '7/10', acc: '85%', time: '4:12' }}
      />
      <DefeatOverlay
        visible={defeatOpen}
        onClose={() => router.push('/game-summary?result=loss' as never)}
        onContinue={() => router.push('/game-summary?result=loss' as never)}
        stats={{ cards: '3/10', acc: '30%', time: '2:45' }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: arc.bg },
  glowTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  glowBottom: { position: 'absolute', bottom: 0, right: 0, width: 260, height: 260 },
  safe: { flex: 1, paddingHorizontal: arcSpace.md },

  topBar: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: {
    width: 44, height: 44, backgroundColor: arc.surface,
    borderWidth: 1, borderColor: arc.surfaceHigh, alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 22, color: arc.ink, lineHeight: 26 },
  roundCenter: { flex: 1, alignItems: 'center' },
  roundLabel: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, color: arc.outline, letterSpacing: 2 },
  turnText:   { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: arc.ink, letterSpacing: -0.3, marginTop: 2 },
  timerBox: {
    width: 56, height: 44, backgroundColor: arc.surface,
    borderWidth: 1, borderColor: arc.secondaryContainer + '55', alignItems: 'center', justifyContent: 'center',
  },
  timerText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 16, color: arc.secondaryContainer },

  opponentPanel: {
    borderWidth: 1, borderColor: arc.surfaceHigh,
    backgroundColor: arc.surface, padding: 14, marginBottom: arcSpace.sm,
  },
  opponentInner:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  opponentAvatar:  {
    width: 48, height: 48, backgroundColor: arc.primaryContainer + '22',
    borderWidth: 1, borderColor: arc.primaryContainer + '66', alignItems: 'center', justifyContent: 'center',
  },
  opponentAvatarText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 18, color: arc.primaryContainer },
  opponentInfo:    { flex: 1 },
  opponentNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  opponentName:    { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: arc.ink },
  opponentHpLabel: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 14, color: arc.primaryContainer },
  hpTrack:      { height: 8,  backgroundColor: arc.surfaceHigh, marginBottom: 6, overflow: 'hidden' },
  hpTrackPlayer:{ height: 10, backgroundColor: arc.surfaceHigh, overflow: 'hidden' },
  hpFill: { height: '100%' },
  opponentChips:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusChip:      { paddingHorizontal: 6, paddingVertical: 2 },
  statusChipText:  { fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, letterSpacing: 0.5 },
  levelText:       { fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, color: arc.outline, letterSpacing: 0.5 },

  battlefield:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: arcSpace.sm },
  lastPlayLabel:{ fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, color: arc.outline, letterSpacing: 3, marginBottom: 10 },
  lastPlayRow:  { flexDirection: 'row', alignItems: 'center', gap: 16 },
  lastPlayMeta: { gap: 4 },
  damageText:   { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
  answerResult: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, letterSpacing: 1 },
  comboText:    { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, color: arc.outline, letterSpacing: 1 },
  noPlayText:   { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, color: arc.outline, letterSpacing: 3 },

  playerHpSection: { marginBottom: arcSpace.sm },
  playerHpHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  playerLabel:     { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: arc.ink },

  handMeta:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: arcSpace.sm },
  handMetaLeft: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, color: arc.outline, letterSpacing: 2 },
  handMetaRight:{ fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, color: arc.outline, letterSpacing: 2 },
  handScrollView: { flexGrow: 0, marginBottom: arcSpace.sm },
  handScroll:     { gap: 10 },

  cardDetail: {
    backgroundColor: arc.surface, borderWidth: 1, padding: 14, gap: 12, marginBottom: arcSpace.sm,
  },
  cardDetailMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTypeChip:   { paddingHorizontal: 8, paddingVertical: 4 },
  cardTypeChipText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 9, letterSpacing: 1 },
  diffStars: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: arc.outline },
  spacer:    { flex: 1 },
  dmgLabel:  { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16 },
  playBtn: {
    height: 56, alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  playBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17, color: arc.bg, letterSpacing: 0.5 },
});
