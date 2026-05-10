import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArcadeColors as C } from "@/constants/theme";
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

const QuestionCard = memo(function QuestionCard({ q }: { q: Question }) {
  const router = useRouter();
  const avg = avgDifficulty(q);
  const score = q.up - q.down;
  const scoreColor = score > 0 ? C.tertiaryDim : score < 0 ? C.error : C.outline;
  return (
    <Pressable style={s.card} onPress={() => router.push(`/question/${q.id}` as never)}>
      <View style={s.voteCol}>
        <Text style={[s.mono, { color: scoreColor, fontSize: 10 }]}>
          {score > 0 ? '▲' : score < 0 ? '▼' : '•'}
        </Text>
        <Text style={[
          s.mono,
          {
            color: scoreColor,
            fontSize: 16,
            fontFamily: 'JetBrainsMono_700Bold'
          }
        ]}>
          {score}
        </Text>
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
        <Text style={s.userText}>@{q.user}</Text>
      </View>
    </Pressable>
  );
});

export default function ForumScreen() {
  const router = useRouter();
  const {
    questions, loading, isFetchingMore, hasMore,
    category, searchInput, sortMode,
    setCategory, setSearch, setSortMode,
    loadMore, refresh,
  } = useQuestions();

  const selectedChipLabel = CHIPS.find(c => c.cat === category)?.l ?? 'ALL';
  const toggleSort = () => setSortMode(sortMode === 'TOP' ? 'NEW' : 'TOP');

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  const renderItem = useCallback(
    ({ item }: { item: Question }) => <QuestionCard q={item} />,
    [],
  );
  const keyExtractor = useCallback((q: Question) => q.id, []);

  const handleEndReached = () => {
    if (!loading && hasMore && !isFetchingMore) loadMore();
  };

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
          <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Text style={s.backArrow}>←</Text>
          </Pressable>
          <Text style={s.title}>FORUM<Text style={{ color: C.primaryBright }}>.</Text></Text>
        </View>

        <View style={s.searchRow}>
          <View style={s.searchInput}>
            <Text style={{ color: C.outline, fontSize: 15 }}>⊕</Text>
            <TextInput
              value={searchInput}
              onChangeText={setSearch}
              placeholder="Search..."
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
          {CHIPS.map(c => {
            const selected = c.l === selectedChipLabel;
            return (
              <Pressable
                key={c.l}
                onPress={() => setCategory(c.cat)}
                style={[
                  s.chip,
                  selected
                    ? { backgroundColor: C.secondaryBright, borderColor: C.secondaryBright }
                    : { backgroundColor: C.surface, borderColor: C.surfaceContainerHigh },
                ]}
              >
                <Text style={[s.chipText, { color: selected ? C.background : C.outline }]}>{c.l}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <FlatList
          data={questions}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={s.questionList}
          contentContainerStyle={
            questions.length === 0
              ? s.emptyContainer
              : { gap: 10, paddingBottom: 20 }
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.secondaryBright}
              colors={[C.secondaryBright]}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews
          ListEmptyComponent={
            loading
              ? <Text style={s.emptyText}>LOADING...</Text>
              : <Text style={s.emptyText}>NO QUESTIONS</Text>
          }
          ListFooterComponent={
            isFetchingMore
              ? <ActivityIndicator style={s.footerSpinner} color={C.secondaryBright} />
              : null
          }
        />

        <Pressable style={s.fab} onPress={() => router.push('/add-question' as never)}>
          <Text style={s.fabIcon}>+</Text>
        </Pressable>
      </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
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
  emptyContainer: {
    flexGrow: 1,
    paddingTop: 40,
  },
  emptyText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    color: C.outline,
    textAlign: 'center',
    paddingTop: 40,
    letterSpacing: 2,
  },
  footerSpinner: {
    paddingVertical: 16,
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
    backgroundColor: C.secondaryBright + '22',
    borderWidth: 1,
    borderColor: C.secondaryBright + '55',
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
    bottom: 60,
    right: 25,
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
