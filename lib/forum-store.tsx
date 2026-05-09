import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

// Backward-compat helper — returns int 0-5 (same as old Math.round behaviour)
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

type Ctx = {
  questions: Question[];
  loading: boolean;
  addQuestion: (q: AddQuestionInput) => Promise<void>;
  submitVote: (id: string, params: { diff: number; verdict: 'up' | 'down' }) => Promise<void>;
  hasVotedYesNo: (id: string) => boolean;
  hasVotedDifficulty: (id: string) => boolean;
  refresh: () => Promise<void>;
};

const QuestionsContext = createContext<Ctx | null>(null);

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading]     = useState(true);
  const [votedYesNo, setVotedYesNo]           = useState<Set<string>>(new Set());
  const [votedDifficulty, setVotedDifficulty] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      const rows = await api.listQuestions();
      setQuestions(rows.map(rowToQuestion));
      // Seed voted Sets from server-side voted_by_me flag
      const voted = new Set(rows.filter(r => r.voted_by_me).map(r => String(r.q_id)));
      setVotedYesNo(voted);
      setVotedDifficulty(new Set(voted));
    } catch (e) {
      console.warn('forum-store load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const refresh = () => load();

  const addQuestion = async (q: AddQuestionInput) => {
    const correctText  = q.answers[q.correct];
    const wrongAnswers = (['A', 'B', 'C', 'D'] as AnswerKey[])
      .filter(k => k !== q.correct)
      .map(k => q.answers[k]);

    const qId = await api.addQuestion({
      category:    q.cat,
      title:       q.t,
      correctAnswer: correctText,
      wrongAnswers,
      explanation: q.explanation,
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
  };

  const submitVote = async (id: string, { diff, verdict }: { diff: number; verdict: 'up' | 'down' }) => {
    if (votedYesNo.has(id)) return;

    const q = questions.find(x => x.id === id);
    if (!q) return;

    // Optimistic update
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
  };

  const hasVotedYesNo      = (id: string) => votedYesNo.has(id);
  const hasVotedDifficulty = (id: string) => votedDifficulty.has(id);

  return (
    <QuestionsContext.Provider value={{ questions, loading, addQuestion, submitVote, hasVotedYesNo, hasVotedDifficulty, refresh }}>
      {children}
    </QuestionsContext.Provider>
  );
}

export function useQuestions(): Ctx {
  const ctx = useContext(QuestionsContext);
  if (!ctx) throw new Error('useQuestions must be used within QuestionsProvider');
  return ctx;
}
