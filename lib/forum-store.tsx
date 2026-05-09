import { createContext, useContext, useState, ReactNode } from 'react';

export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export type Question = {
  id: string;
  cat: string;
  diffVotes: number[];
  up: number;
  down: number;
  t: string;
  user: string;
  answers: Record<AnswerKey, string>;
  correct: AnswerKey;
  explanation: string;
};

export const avgDifficulty = (q: Question): number =>
  q.diffVotes.length === 0 ? 0 : Math.round(q.diffVotes.reduce((a, b) => a + b, 0) / q.diffVotes.length);

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
  addQuestion: (q: AddQuestionInput) => void;
  submitVote: (id: string, params: { diff: number; verdict: 'up' | 'down' }) => void;
  hasVotedYesNo: (id: string) => boolean;
  hasVotedDifficulty: (id: string) => boolean;
};

const QuestionsContext = createContext<Ctx | null>(null);

const INITIAL: Question[] = [
  {
    id: 'q1', cat: 'MATH', diffVotes: [4,4,4,5,3], up: 312, down: 12,
    t: 'What is the smallest prime number greater than 100?',
    user: 'mathlord',
    answers: { A: '101', B: '103', C: '107', D: '109' },
    correct: 'A',
    explanation: '101 is prime — divisible only by 1 and itself. 102 = 2·51, so 101 is the next prime after 97.',
  },
  {
    id: 'q2', cat: 'SPCE', diffVotes: [5,5,5,4], up: 198, down: 47,
    t: 'Which planet has the highest surface temperature?',
    user: 'astro_kid',
    answers: { A: 'Mercury', B: 'Venus', C: 'Mars', D: 'Jupiter' },
    correct: 'B',
    explanation: 'Venus reaches ~465°C due to runaway greenhouse effect from its dense CO₂ atmosphere — hotter than Mercury despite being farther from the Sun.',
  },
  {
    id: 'q3', cat: 'MED', diffVotes: [2,2,3,1], up: 89, down: 4,
    t: 'What is the largest organ in the human body?',
    user: 'dr.donut',
    answers: { A: 'Liver', B: 'Brain', C: 'Skin', D: 'Lungs' },
    correct: 'C',
    explanation: 'Skin covers ~1.5–2 m² and weighs ~3.5 kg in adults — larger than any internal organ.',
  },
  {
    id: 'q4', cat: 'MOV', diffVotes: [3,3,4,2], up: 156, down: 23,
    t: 'Who directed the 2010 film "Inception"?',
    user: 'cinephile',
    answers: { A: 'Steven Spielberg', B: 'Christopher Nolan', C: 'Denis Villeneuve', D: 'James Cameron' },
    correct: 'B',
    explanation: 'Christopher Nolan wrote and directed Inception (2010), starring Leonardo DiCaprio.',
  },
];

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>(INITIAL);
  const [votedYesNo, setVotedYesNo] = useState<Set<string>>(new Set());
  const [votedDifficulty, setVotedDifficulty] = useState<Set<string>>(new Set());

  const addQuestion = (q: AddQuestionInput) =>
    setQuestions(prev => [{ ...q, id: Date.now().toString(), diffVotes: [], up: 0, down: 0 }, ...prev]);

  const submitVote = (id: string, { diff, verdict }: { diff: number; verdict: 'up' | 'down' }) => {
    if (votedYesNo.has(id)) return;
    setQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;
      return {
        ...q,
        up: verdict === 'up' ? q.up + 1 : q.up,
        down: verdict === 'down' ? q.down + 1 : q.down,
        diffVotes: votedDifficulty.has(id) ? q.diffVotes : [...q.diffVotes, diff],
      };
    }));
    setVotedYesNo(prev => new Set(prev).add(id));
    setVotedDifficulty(prev => new Set(prev).add(id));
  };

  const hasVotedYesNo = (id: string) => votedYesNo.has(id);
  const hasVotedDifficulty = (id: string) => votedDifficulty.has(id);

  return (
    <QuestionsContext.Provider value={{ questions, addQuestion, submitVote, hasVotedYesNo, hasVotedDifficulty }}>
      {children}
    </QuestionsContext.Provider>
  );
}

export function useQuestions(): Ctx {
  const ctx = useContext(QuestionsContext);
  if (!ctx) throw new Error('useQuestions must be used within QuestionsProvider');
  return ctx;
}
