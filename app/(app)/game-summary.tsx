import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { arc, arcSpace } from '@/lib/arcade-theme';

type CardType = 'DMG' | 'HEAL' | 'DOT';

const PLAYED_CARDS = [
  { type: 'DMG' as CardType, cat: 'MATH', val: 6, ok: true, q: 'Smallest prime > 100?', t: '4.2s' },
  { type: 'HEAL' as CardType, cat: 'MED', val: 4, ok: true, q: 'Largest organ in the body?', t: '5.8s' },
  { type: 'DMG' as CardType, cat: 'TRVL', val: 5, ok: false, q: 'Capital of Mongolia?', t: '12s' },
  { type: 'DOT' as CardType, cat: 'SPCE', val: 3, ok: true, q: 'Hottest planet in the solar system?', t: '3.1s' },
  { type: 'HEAL' as CardType, cat: 'MOV', val: 5, ok: true, q: 'Who directed Inception?', t: '2.4s' },
];

const TYPE_COLORS: Record<CardType, string> = {
  DMG: arc.primaryContainer,
  HEAL: arc.secondaryContainer,
  DOT: arc.tertiary,
};

export default function GameSummaryScreen() {
  const router = useRouter();
  const { result } = useLocalSearchParams<{ result?: string }>();
  const isWin = result !== 'loss';

  const accentColor = isWin ? arc.tertiary : arc.primaryContainer;
  const heroColors: [string, string] = isWin
    ? [arc.tertiary, arc.tertiaryContainer]
    : [arc.primaryContainer, arc.onPrimary];

  const STATS = isWin
    ? [
        { l: 'CORRECT', v: '7/10', sub: '70%', c: arc.secondaryContainer },
        { l: 'AVG TIME', v: '6.4s', sub: 'fast', c: arc.tertiary },
        { l: 'COMBO', v: '×4', sub: 'best', c: arc.primaryContainer },
      ]
    : [
        { l: 'CORRECT', v: '3/10', sub: '30%', c: arc.primaryContainer },
        { l: 'AVG TIME', v: '9.2s', sub: 'slow', c: arc.outline },
        { l: 'COMBO', v: '×1', sub: 'best', c: arc.outline },
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
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>←</Text>
          </Pressable>
          <View style={s.headerTitle}>
            <Text style={s.titleText}>Match Recap</Text>
            <Text style={s.subtitleText}>
              {isWin ? 'VICTORY' : 'DEFEAT'} · 4:12
            </Text>
          </View>
          <View style={[s.resultChip, { borderColor: accentColor }]}>
            <Text style={[s.resultChipText, { color: accentColor }]}>
              {isWin ? 'WIN' : 'LOSS'}
            </Text>
          </View>
        </View>

        {/* Hero panel */}
        <LinearGradient
          colors={heroColors}
          style={s.heroBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[s.heroDecor, { borderColor: arc.bg + '22' }]} />
          <Text style={s.heroEarned}>YOU EARNED</Text>
          <Text style={s.heroXp}>
            {isWin ? '+148' : '−12'}
            <Text style={s.heroXpUnit}>xp</Text>
          </Text>
          <Text style={s.heroSub}>
            {isWin ? '+24◆ coins  ·  5-win streak' : '−5◆ coins  ·  streak reset'}
          </Text>
        </LinearGradient>

        {/* Stats row */}
        <View style={s.statsRow}>
          {STATS.map(stat => (
            <View key={stat.l} style={s.statTile}>
              <Text style={s.statL}>{stat.l}</Text>
              <Text style={[s.statV, { color: stat.c }]}>{stat.v}</Text>
              <Text style={s.statSub}>{stat.sub}</Text>
            </View>
          ))}
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
          {PLAYED_CARDS.map((c, i) => {
            const tc = TYPE_COLORS[c.type];
            return (
              <Pressable key={i} style={s.cardRow}>
                <View
                  style={[
                    s.statusIcon,
                    { backgroundColor: c.ok ? arc.tertiary + '22' : arc.primaryContainer + '22' },
                  ]}
                >
                  <Text
                    style={[
                      s.statusIconGlyph,
                      { color: c.ok ? arc.tertiary : arc.primaryContainer },
                    ]}
                  >
                    {c.ok ? '✓' : '✗'}
                  </Text>
                </View>
                <View style={s.cardRowBody}>
                  <View style={s.cardRowMeta}>
                    <View style={[s.typeTag, { backgroundColor: tc + '22' }]}>
                      <Text style={[s.typeTagText, { color: tc }]}>{c.type}</Text>
                    </View>
                    <Text style={s.cardMeta}>{c.cat} · {c.val}pt</Text>
                  </View>
                  <Text style={s.cardQuestion} numberOfLines={1}>{c.q}</Text>
                </View>
                <Text style={s.cardTime}>{c.t}</Text>
                <Text style={s.chevron}>›</Text>
              </Pressable>
            );
          })}
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
            onPress={() => router.replace('/game' as never)}
          >
            <Text style={s.playAgainBtnText}>Play again →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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

  // Hero
  heroBg: {
    padding: 22,
    marginBottom: arcSpace.sm,
    overflow: 'hidden',
  },
  heroDecor: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
  },
  heroEarned: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: arc.bg,
    opacity: 0.7,
  },
  heroXp: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 44,
    color: arc.bg,
    lineHeight: 50,
    letterSpacing: -1,
    marginTop: 4,
  },
  heroXpUnit: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    opacity: 0.7,
  },
  heroSub: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: arc.bg,
    marginTop: 8,
    opacity: 0.85,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: arcSpace.md,
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
  cardTime: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: arc.outline,
    letterSpacing: 0.5,
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
});
