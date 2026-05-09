import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { arc, arcFont } from '@/lib/arcade-theme';
import { useQuestions, avgDifficulty, type Question } from '@/lib/forum-store';

const CHIPS: { l: string; cat: string | null }[] = [
  { l: 'ALL', cat: null },
  { l: 'MATH', cat: 'MATH' },
  { l: 'SPACE', cat: 'SPCE' },
  { l: 'MOVIES', cat: 'MOV' },
  { l: 'MED', cat: 'MED' },
];

function QuestionCard({ q, onPress }: { q: Question; onPress: () => void }) {
  const avg = avgDifficulty(q);
  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={s.voteCol}>
        <Text style={[s.mono, { color: arc.lime, fontSize: 14 }]}>▲</Text>
        <Text style={[s.mono, { color: arc.ink, fontSize: 14, fontFamily: arcFont.monoBold }]}>{q.up}</Text>
        <Text style={[s.mono, { color: arc.dim, fontSize: 12 }]}>{q.down}</Text>
        <Text style={[s.mono, { color: arc.red, fontSize: 14 }]}>▼</Text>
      </View>
      <View style={s.cardBody}>
        <View style={s.metaRow}>
          <View style={s.catBadge}>
            <Text style={s.catText}>{q.cat}</Text>
          </View>
          <View style={s.diffRow}>
            {[1,2,3,4,5].map(d => (
              <View key={d} style={[s.diffDot, { backgroundColor: d <= avg ? arc.pink : arc.surface2 }]} />
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
      <LinearGradient
        colors={['rgba(255,31,143,0.08)', 'transparent']}
        style={s.glowTop}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(25,240,220,0.06)', 'transparent']}
        style={s.glowBottom}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        pointerEvents="none"
      />

      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.title}>FORUM<Text style={{ color: arc.pink }}>.</Text></Text>
        </View>

        <View style={s.searchRow}>
          <View style={s.searchInput}>
            <Text style={{ color: arc.dim, fontSize: 15 }}>⊕</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="search 4,219 questions..."
              placeholderTextColor={arc.dim}
              style={s.searchField}
              returnKeyType="search"
            />
          </View>
          <Pressable style={s.sortBtn} onPress={toggleSort}>
            <Text style={[s.mono, { color: arc.cyan, fontSize: 11, fontFamily: arcFont.monoBold, letterSpacing: 1 }]}>
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
                  ? { backgroundColor: arc.cyan, borderColor: arc.cyan }
                  : { backgroundColor: arc.surface, borderColor: arc.surface2 },
              ]}
            >
              <Text style={[s.chipText, { color: c.l === selectedChip ? arc.bg : arc.dim }]}>{c.l}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          style={s.questionList}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {sorted.length === 0 ? (
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
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: arcFont.display,
    fontSize: 28,
    color: arc.ink,
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
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surface2,
  },
  searchField: {
    flex: 1,
    fontFamily: arcFont.mono,
    fontSize: 15,
    color: arc.ink,
    padding: 0,
  },
  sortBtn: {
    width: 56,
    height: 44,
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surface2,
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
    fontFamily: arcFont.monoBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  questionList: {
    flex: 1,
  },
  emptyText: {
    fontFamily: arcFont.mono,
    fontSize: 12,
    color: arc.dim,
    textAlign: 'center',
    paddingTop: 40,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: arc.surface,
    borderWidth: 1,
    borderColor: arc.surface2,
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
    fontFamily: arcFont.monoBold,
    fontSize: 11,
    color: arc.cyan,
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
    fontFamily: arcFont.displayMd,
    fontSize: 15,
    color: arc.ink,
    lineHeight: 20,
    marginBottom: 4,
  },
  userText: {
    fontFamily: arcFont.mono,
    fontSize: 12,
    color: arc.dim,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: arc.pink,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore - boxShadow supported in RN 0.81 new arch
    boxShadow: '0 0 20px rgba(255,31,143,0.53)',
  },
  fabIcon: {
    fontFamily: arcFont.display,
    fontSize: 32,
    color: arc.bg,
    lineHeight: 36,
  },
  mono: {
    fontFamily: arcFont.mono,
  },
});
