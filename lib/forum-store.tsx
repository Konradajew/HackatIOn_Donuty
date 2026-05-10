import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import * as api from './forum-api';
import type { ForumQuestionRaw } from './forum-api';

export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export type Question = {
  id: string;
  q_id: number;
  cat: string;
  t: string;
  user: string;
  answers: Record<AnswerKey, string>;
  correct: AnswerKey;
  explanation: string;
  up: number;
  down: number;
  diffAvg: number | null;
};

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

function rowToQuestion(r: ForumQuestionRaw): Question {
  return {
    id:          String(r.q_id),
    q_id:        r.q_id,
    cat:         r.category,
    t:           r.title,
    user:        r.author_nickname,
    answers:     {
      A: r.correct_answer,
      B: r.wrong_answers[0] ?? '',
      C: r.wrong_answers[1] ?? '',
      D: r.wrong_answers[2] ?? '',
    },
    correct:     'A',
    explanation: r.explanation,
    up:          r.yes_votes,
    down:        r.no_votes,
    diffAvg:     r.diff_avg,
  };
}

export const avgDifficulty = (q: Question): number =>
  q.diffAvg === null ? 0 : Math.round(q.diffAvg);

type AddQuestionInput = {
  cat: string;
  t: string;
  user: string;
  answers: Record<AnswerKey, string>;
  correct: AnswerKey;
  explanation: string;
};

export type SortMode = 'NEW' | 'TOP';

type Ctx = {
  questions: Question[];
  loading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;

  category: string | null;
  searchInput: string;
  sortMode: SortMode;

  setCategory: (cat: string | null) => void;
  setSearch: (term: string) => void;
  setSortMode: (mode: SortMode) => void;

  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  addQuestion: (q: AddQuestionInput) => Promise<void>;
  submitVote: (id: string, params: { diff: number; verdict: 'up' | 'down' }) => Promise<void>;
  hasVotedYesNo: (id: string) => boolean;
  hasVotedDifficulty: (id: string) => boolean;
};

const QuestionsContext = createContext<Ctx | null>(null);

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions]             = useState<Question[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [isFetchingMore, setIsFetchingMore]   = useState(false);
  const [hasMore, setHasMore]                 = useState(true);

  const [category, setCategory]               = useState<string | null>(null);
  const [searchInput, setSearchInput]         = useState<string>('');
  const [searchApplied, setSearchApplied]     = useState<string>('');
  const [sortMode, setSortMode]               = useState<SortMode>('NEW');

  const [votedYesNo, setVotedYesNo]           = useState<Set<string>>(new Set());
  const [votedDifficulty, setVotedDifficulty] = useState<Set<string>>(new Set());

  // Bumped before every fetch; results from a stale seq are dropped on arrival.
  const requestSeqRef = useRef(0);

  // Debounce search input → applied search term used in fetches.
  useEffect(() => {
    if (searchInput === searchApplied) return;
    const t = setTimeout(() => setSearchApplied(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, searchApplied]);

  const filtersKey = `${category ?? ''}|${searchApplied}|${sortMode}`;

  const mergeVoted = (rows: ForumQuestionRaw[]) => {
    const incoming = rows.filter(r => r.voted_by_me).map(r => String(r.q_id));
    if (incoming.length === 0) return;
    setVotedYesNo(prev => {
      const next = new Set(prev);
      incoming.forEach(id => next.add(id));
      return next;
    });
    setVotedDifficulty(prev => {
      const next = new Set(prev);
      incoming.forEach(id => next.add(id));
      return next;
    });
  };

  // Reset + initial load whenever filters change.
  useEffect(() => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setHasMore(true);
    setIsFetchingMore(false);

    (async () => {
      try {
        const rows = await api.listQuestions({
          limit:    PAGE_SIZE,
          offset:   0,
          category,
          search:   searchApplied || null,
          sortMode,
        });
        if (seq !== requestSeqRef.current) return;

        setQuestions(rows.map(rowToQuestion));
        setHasMore(rows.length === PAGE_SIZE);

        const voted = new Set(rows.filter(r => r.voted_by_me).map(r => String(r.q_id)));
        setVotedYesNo(voted);
        setVotedDifficulty(new Set(voted));
      } catch (e) {
        if (seq === requestSeqRef.current) console.warn('forum-store load failed:', e);
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    })();
  }, [filtersKey]);

  const loadMore = useCallback(async () => {
    if (loading || isFetchingMore || !hasMore) return;

    const seq = ++requestSeqRef.current;
    const filtersAtStart = filtersKey;
    const offset = questions.length;
    setIsFetchingMore(true);

    try {
      const rows = await api.listQuestions({
        limit:    PAGE_SIZE,
        offset,
        category,
        search:   searchApplied || null,
        sortMode,
      });
      if (seq !== requestSeqRef.current || filtersAtStart !== filtersKey) return;

      const mapped = rows.map(rowToQuestion);
      setQuestions(prev => {
        const existing = new Set(prev.map(q => q.id));
        const fresh = mapped.filter(q => !existing.has(q.id));
        return [...prev, ...fresh];
      });
      setHasMore(rows.length === PAGE_SIZE);
      mergeVoted(rows);
    } catch (e) {
      if (seq === requestSeqRef.current) console.warn('forum-store loadMore failed:', e);
    } finally {
      if (seq === requestSeqRef.current) setIsFetchingMore(false);
    }
  }, [loading, isFetchingMore, hasMore, questions.length, category, searchApplied, sortMode, filtersKey]);

  const refresh = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setHasMore(true);
    setIsFetchingMore(false);
    try {
      const rows = await api.listQuestions({
        limit:    PAGE_SIZE,
        offset:   0,
        category,
        search:   searchApplied || null,
        sortMode,
      });
      if (seq !== requestSeqRef.current) return;
      setQuestions(rows.map(rowToQuestion));
      setHasMore(rows.length === PAGE_SIZE);
      const voted = new Set(rows.filter(r => r.voted_by_me).map(r => String(r.q_id)));
      setVotedYesNo(voted);
      setVotedDifficulty(new Set(voted));
    } catch (e) {
      if (seq === requestSeqRef.current) console.warn('forum-store refresh failed:', e);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [category, searchApplied, sortMode]);

  const addQuestion = useCallback(async (q: AddQuestionInput) => {
    const correctText  = q.answers[q.correct];
    const wrongAnswers = (['A', 'B', 'C', 'D'] as AnswerKey[])
      .filter(k => k !== q.correct)
      .map(k => q.answers[k]);

    const qId = await api.addQuestion({
      category:      q.cat,
      title:         q.t,
      correctAnswer: correctText,
      wrongAnswers,
      explanation:   q.explanation,
    });

    const optimistic: Question = {
      id:          String(qId),
      q_id:        qId,
      cat:         q.cat,
      t:           q.t,
      user:        q.user,
      answers:     { A: correctText, B: wrongAnswers[0], C: wrongAnswers[1], D: wrongAnswers[2] },
      correct:     'A',
      explanation: q.explanation,
      up:          0,
      down:        0,
      diffAvg:     null,
    };
    setQuestions(prev => [optimistic, ...prev]);
  }, []);

  const submitVote = useCallback(async (id: string, { diff, verdict }: { diff: number; verdict: 'up' | 'down' }) => {
    if (votedYesNo.has(id)) return;

    const q = questions.find(x => x.id === id);
    if (!q) return;

    setQuestions(prev => prev.map(x => x.id !== id ? x : {
      ...x,
      up:      verdict === 'up'   ? x.up + 1   : x.up,
      down:    verdict === 'down' ? x.down + 1 : x.down,
      diffAvg: x.diffAvg === null
        ? diff
        : Math.round(((x.diffAvg * (x.up + x.down)) + diff) / (x.up + x.down + 1) * 10) / 10,
    }));
    setVotedYesNo(prev => new Set(prev).add(id));
    setVotedDifficulty(prev => new Set(prev).add(id));

    await api.submitVote(q.q_id, verdict, diff);
  }, [votedYesNo, questions]);

  const setSearch          = useCallback((term: string) => setSearchInput(term), []);
  const hasVotedYesNo      = useCallback((id: string) => votedYesNo.has(id),      [votedYesNo]);
  const hasVotedDifficulty = useCallback((id: string) => votedDifficulty.has(id), [votedDifficulty]);

  return (
    <QuestionsContext.Provider value={{
      questions, loading, isFetchingMore, hasMore,
      category, searchInput, sortMode,
      setCategory, setSearch, setSortMode,
      loadMore, refresh,
      addQuestion, submitVote, hasVotedYesNo, hasVotedDifficulty,
    }}>
      {children}
    </QuestionsContext.Provider>
  );
}

export function useQuestions(): Ctx {
  const ctx = useContext(QuestionsContext);
  if (!ctx) throw new Error('useQuestions must be used within QuestionsProvider');
  return ctx;
}
