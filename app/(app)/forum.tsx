import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { arc, arcSpace } from '@/lib/arcade-theme';
import { useQuestions, avgDifficulty, type Question } from '@/lib/forum-store';

const CHIPS: { l: string; cat: string | null }[] = [
  { l: 'ALL', cat: null },
  { l: 'MATH', cat: 'MATH' },
  { l: 'SPACE', cat: 'SPCE' },
  { l: 'MOVIES', cat: 'MOV' },
  { l: 'MED', cat: 'MED' },
];

// ── Atomy zgodne z home ─────────────────────────────────────────────────────
function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.statChip, { borderColor: color + '66' }]}>
      <Text style={[s.statChipText, { color }]}>{label}</Text>
    </View>
  );
}

function HudIconButton({
  icon,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.iconBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={arc.outline} />
    </TouchableOpacity>
  );
}

function QuestionCard({ q, onPress }: { q: Question; onPress: () => void }) {
  const avg = avgDifficulty(q);
  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={s.voteCol}>
        <Text style={[s.mono, { color: arc.tertiary, fontSize: 14 }]}>▲</Text>
        <Text style={[s.mono, { color: arc.ink, fontSize: 14, fontFamily: 'JetBrainsMono_500Medium' }]}>{q.up}</Text>
        <Text style={[s.mono, { color: arc.outline, fontSize: 12 }]}>{q.down}</Text>
        <Text style={[s.mono, { color: arc.errorContainer, fontSize: 14 }]}>▼</Text>
      </View>
      <View style={s.cardBody}>
        <View style={s.metaRow}>
          <View style={s.catBadge}>
            <Text style={s.catText}>{q.cat}</Text>
          </View>
          <View style={s.diffRow}>
            {[1, 2, 3, 4, 5].map(d => (
              <View key={d} style={[s.diffDot, { backgroundColor: d <= avg ? arc.primaryContainer : arc.surfaceHigh }]} />
            ))}
          </View>
        </View>
        <Text style={s.qText}>{q.t}</Text>
        <Text style={s.userText}>@{q.user} · 2h</Text>
      </View>
    </Pressable>
  );
}

// ── Główny ekran ────────────────────────────────────────────────────────────
export default function ForumScreen() {
  const router = useRouter();
  const { questions } = useQuestions();
  const [selectedChip, setSelectedChip] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [sortMode, setSortMode] = useState<'TOP' | 'NEW'>('TOP');

  const toggleSort = () => setSortMode(m => m === 'TOP' ? 'NEW' : 'TOP');

  const activeChip = CHIPS.find(c => c.l === selectedChip)!;
  const filtered = questions.filter(q => {
    if (activeChip.cat && q.cat !== activeChip.cat) return false;
    const term = search.trim().toLowerCase();
    if (term && !q.t.toLowerCase().includes(term) && !q.user.toLowerCase().includes(term)) return false;
    return true;
  });

  const sorted = sortMode === 'TOP'
    ? [...filtered].sort((a, b) => b.up - a.up)
    : filtered;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.crtOverlay} pointerEvents="none" />

      <SafeAreaView style={s.safe}>
        {/* ── HUD jak na home ── */}
        <View style={s.hud}>
          <View style={s.hudLeft}>
            <HudIconButton icon="arrow-back-outline" onPress={() => router.back()} />
          </View>
          <View style={s.hudRight}>
            <Chip label="◉ LIVE" color={arc.secondaryContainer} />
            <Chip label={`${questions.length}Q`} color={arc.tertiary} />
          </View>
        </View>

        {/* ── Tytuł z kropką jak FORUM. ── */}
        <View style={s.titleSection}>
          <Text style={s.title}>FORUM<Text style={{ color: arc.primaryContainer }}>.</Text></Text>
          <Text style={s.tagline}>COMMUNITY · QUESTIONS · VOTES</Text>
        </View>

        {/* ── Search + sort ── */}
        <View style={s.searchRow}>
          <View style={s.searchInput}>
            <Ionicons name="search-outline" size={16} color={arc.outline} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="search questions..."
              placeholderTextColor={arc.outline}
              style={s.searchField}
              returnKeyType="search"
            />
          </View>
          <Pressable style={s.sortBtn} onPress={toggleSort}>
            <Text style={s.sortBtnText}>{sortMode}</Text>
          </Pressable>
        </View>

        {/* ── Filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipsScroll}
          contentContainerStyle={s.chipsContent}
        >
          {CHIPS.map(c => (
            <Pressable
              key={c.l}
              onPress={() => setSelectedChip(c.l)}
              style={[
                s.chip,
                c.l === selectedChip
                  ? { backgroundColor: arc.secondaryContainer, borderColor: arc.secondaryContainer }
                  : { backgroundColor: arc.surface, borderColor: arc.surfaceHigh },
              ]}
            >
              <Text style={[s.chipText, { color: c.l === selectedChip ? arc.bg : arc.outline }]}>{c.l}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Question list ── */}
        <ScrollView
          style={s.questionList}
          contentContainerStyle={{ gap: 10, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {sorted.length === 0 ? (
            <Text style={s.emptyText}>// NO QUESTIONS</Text>
          ) : (
            sorted.map(q => (
              <QuestionCard
                key={q.id}
                q={q}
                onPress={() => router.push(`/question/${q.id}` as never)}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ── FAB jak SoloPlayButton (pill + glow) ── */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push('/add-question' as never)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={arc.bg} />
      </TouchableOpacity>
    </View>
  );
}

// ── StyleSheet ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: arc.bg },
  crtOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    opacity: 0.04,
  },
  safe: {
    flex: 1,
    paddingHorizontal: arcSpace.md,
  },

  // ── HUD
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: arcSpace.xs,
    paddingBottom: arcSpace.sm,
  },
  hudLeft: { flexDirection: 'row', gap: arcSpace.sm },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: arcSpace.sm },
  iconBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: arc.outlineVariant,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statChip: {
    paddingHorizontal: arcSpace.sm + 2,
    paddingVertical: arcSpace.xs + 1,
    backgroundColor: arc.surface,
    borderWidth: 1,
  },
  statChipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Title
  titleSection: {
    marginTop: arcSpace.sm,
    marginBottom: arcSpace.md,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 36,
    color: arc.ink,
    letterSpacing: 2,
    textShadowColor: arc.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  tagline: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: arc.outline,
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // ── Search + sort
  searchRow: {
    flexDirection: 'row',
    gap: arcSpace.sm,
    marginBottom: arcSpace.sm + 2,
  },
  searchInput: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: arcSpace.sm,
    paddingHorizontal: arcSpace.sm + 4,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
  },
  searchField: {
    flex: 1,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: arc.ink,
    padding: 0,
  },
  sortBtn: {
    paddingHorizontal: arcSpace.md,
    height: 44,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: arc.secondaryContainer,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: arc.secondaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  sortBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    color: arc.secondaryContainer,
    letterSpacing: 1.5,
  },

  // ── Filter chips (pill)
  chipsScroll: {
    flexGrow: 0,
    marginBottom: arcSpace.sm + 2,
  },
  chipsContent: {
    flexDirection: 'row',
    gap: arcSpace.xs + 2,
  },
  chip: {
    paddingVertical: arcSpace.xs + 2,
    paddingHorizontal: arcSpace.sm + 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 1,
  },

  // ── Question list
  questionList: { flex: 1 },
  emptyText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: arc.outline,
    textAlign: 'center',
    paddingTop: 40,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surfaceHigh,
    padding: arcSpace.md - 2,
    flexDirection: 'row',
    gap: arcSpace.sm + 2,
  },
  voteCol: {
    width: 32,
    alignItems: 'center',
    gap: 2,
  },
  cardBody: { flex: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: arcSpace.xs + 2,
    marginBottom: arcSpace.xs,
  },
  catBadge: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(25,240,220,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(25,240,220,0.33)',
  },
  catText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    color: arc.secondaryContainer,
    letterSpacing: 1,
  },
  diffRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  diffDot: { width: 6, height: 6 },
  qText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    color: arc.ink,
    lineHeight: 20,
    marginBottom: arcSpace.xs,
  },
  userText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: arc.outline,
  },

  // ── FAB (pill round, jak SoloPlayButton)
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: arc.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: arc.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 16,
    elevation: 10,
  },

  mono: {
    fontFamily: 'JetBrainsMono_500Medium',
  },
});
