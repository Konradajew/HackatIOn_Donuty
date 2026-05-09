import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArcadeColors as C, ArcadeFonts as F, ArcadeSpacing as S } from "@/constants/theme";
import { useQuestions, avgDifficulty, type Question } from '@/lib/forum-store';

const CHIPS: { l: string; cat: string | null }[] = [
  { l: 'ALL',       cat: null },
  { l: 'MATH',      cat: 'math' },
  { l: 'SPACE',     cat: 'space' },
  { l: 'MED',       cat: 'medicine' },
  { l: 'MOVIES',    cat: 'movies' },
  { l: 'TRAVEL',    cat: 'travel' },
  { l: 'CHEMISTRY', cat: 'chemistry' },
  { l: 'BOOKS',     cat: 'books' },
  { l: 'ENGLISH',   cat: 'english' },
  { l: 'HISTORY',   cat: 'history' },
  { l: 'MUSIC',     cat: 'music' },
  { l: 'NATURE',    cat: 'nature' },
  { l: 'GAMES',     cat: 'games' },
  { l: 'IT',        cat: 'IT' },
  { l: 'CULINARY',  cat: 'culinary' },
  { l: 'FLAGS',     cat: 'flags' },
  { l: 'COUNTRIES', cat: 'countries' },
  { l: 'RELIGION',  cat: 'religion' },
  { l: 'FACTS',     cat: 'useless_facts' },
];

function QuestionCard({ q, onPress }: { q: Question; onPress: () => void }) {
  const avg = avgDifficulty(q);
  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={s.voteCol}>
        <Text style={[s.mono, { color: C.tertiaryDim, fontSize: 14 }]}>▲</Text>
        <Text style={[s.mono, { color: C.onSurface, fontSize: 14, fontFamily: 'JetBrainsMono_500Medium' }]}>{q.up}</Text>
        <Text style={[s.mono, { color: C.outline, fontSize: 12 }]}>{q.down}</Text>
        <Text style={[s.mono, { color: C.error, fontSize: 14 }]}>▼</Text>
      </View>
      <View style={s.cardBody}>
        <View style={s.metaRow}>
          <View style={s.catBadge}>
            <Text style={s.catText}>{q.cat}</Text>
          </View>
          <View style={s.diffRow}>
            {[1,2,3,4,5].map(d => (
              <View key={d} style={[s.diffDot, { backgroundColor: d <= avg ? C.primaryBright : C.surfaceContainerHigh }]} />
            ))}
          </View>
        </View>
        <Text style={s.qText}>{q.t}</Text>
        <Text style={s.userText}>@{q.user} · 2h</Text>
      </View>
    </Pressable>
  );
}

export default function ForumScreen() {
  const router = useRouter();
  const { questions, loading, refresh } = useQuestions();
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
        <View style={s.header}>
          <Text style={s.title}>FORUM<Text style={{ color: C.primaryBright }}>.</Text></Text>
        </View>

        <View style={s.searchRow}>
          <View style={s.searchInput}>
            <Text style={{ color: C.outline, fontSize: 15 }}>⊕</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="search 4,219 questions..."
              placeholderTextColor={C.outline}
              style={s.searchField}
              returnKeyType="search"
            />
          </View>
          <Pressable style={s.sortBtn} onPress={toggleSort}>
            <Text style={[s.mono, { color: C.secondaryBright, fontSize: 11, fontFamily: 'JetBrainsMono_500Medium', letterSpacing: 1 }]}>
              {sortMode}
            </Text>
          </Pressable>
        </View>

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
                  ? { backgroundColor: C.secondaryBright, borderColor: C.secondaryBright }
                  : { backgroundColor: C.surface, borderColor: C.surfaceContainerHigh },
              ]}
            >
              <Text style={[s.chipText, { color: c.l === selectedChip ? C.background : C.outline }]}>{c.l}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          style={s.questionList}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={() => refresh()}
        >
          {loading ? (
            <Text style={s.emptyText}>LOADING...</Text>
          ) : sorted.length === 0 ? (
            <Text style={s.emptyText}>NO QUESTIONS</Text>
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

      <Pressable style={s.fab} onPress={() => router.push('/add-question' as never)}>
        <Text style={s.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
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
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    color: C.onSurface,
    letterSpacing: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
  },
  searchField: {
    flex: 1,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 15,
    color: C.onSurface,
    padding: 0,
  },
  sortBtn: {
    width: 56,
    height: 44,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: 10,
  },
  chipsContent: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 1,
  },
  questionList: {
    flex: 1,
  },
  emptyText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: C.outline,
    textAlign: 'center',
    paddingTop: 40,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
  },
  voteCol: {
    width: 32,
    alignItems: 'center',
    gap: 2,
  },
  cardBody: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
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
    color: C.secondaryBright,
    letterSpacing: 1,
  },
  diffRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  diffDot: {
    width: 6,
    height: 6,
  },
  qText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    color: C.onSurface,
    lineHeight: 20,
    marginBottom: 4,
  },
  userText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: C.outline,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: C.primaryBright,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore - boxShadow supported in RN 0.81 new arch
    boxShadow: '0 0 20px rgba(255,72,152,0.53)',
  },
  fabIcon: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 32,
    color: C.background,
    lineHeight: 36,
  },
  mono: {
    fontFamily: 'JetBrainsMono_500Medium',
  },
});
