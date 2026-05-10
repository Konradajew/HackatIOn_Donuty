import { supabase } from './supabase';
import { shuffleArray } from './difficulty';

export type ForumQuestionRaw = {
  q_id: number;
  category: string;
  title: string;
  correct_answer: string;
  wrong_answers: string[];
  explanation: string;
  yes_votes: number;
  no_votes: number;
  diff_avg: number | null;
  voted_by_me: boolean;
  author_nickname: string;
  created_at: string;
};

export type GameQuestion = {
  q_id: number;
  title: string;
  category: string;
  difficulty: number;
  correctAnswer: string;
  shuffledAnswers: string[];
  correctIndex: number;
};

export type ListQuestionsParams = {
  limit?:    number;
  offset?:   number;
  category?: string | null;
  search?:   string | null;
  sortMode?: 'NEW' | 'TOP';
};

export async function listQuestions(params: ListQuestionsParams = {}): Promise<ForumQuestionRaw[]> {
  const search = params.search?.trim();
  const { data, error } = await supabase.rpc('list_forum_questions', {
    p_limit:     params.limit    ?? 10,
    p_offset:    params.offset   ?? 0,
    p_category:  params.category ?? null,
    p_search:    search ? search : null,
    p_sort_mode: params.sortMode ?? 'NEW',
  });
  if (error) throw error;
  return (data as ForumQuestionRaw[]) ?? [];
}

export async function addQuestion(payload: {
  category: string;
  title: string;
  correctAnswer: string;
  wrongAnswers: string[];
  explanation: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc('add_forum_question', {
    p_category:    payload.category,
    p_title:       payload.title,
    p_correct:     payload.correctAnswer,
    p_wrong:       payload.wrongAnswers,
    p_explanation: payload.explanation,
  });
  if (error) throw error;
  return data as number;
}

export async function submitVote(
  qId: number,
  verdict: 'up' | 'down',
  diff: number,
): Promise<void> {
  const { error } = await supabase.rpc('submit_forum_vote', {
    p_question_id: qId,
    p_verdict:     verdict,
    p_difficulty:  diff,
  });
  if (error) throw error;
}

export async function getGameQuestion(category?: string): Promise<GameQuestion | null> {
  const { data, error } = await supabase.rpc('get_game_question', {
    p_category: category ?? null,
  });
  if (error || !data) return null;

  const q = data as {
    q_id: number;
    title: string;
    category: string;
    difficulty: number;
    correct_answer: string;
    wrong_answers: string[];
  };

  const shuffled = shuffleArray([q.correct_answer, ...q.wrong_answers]);
  return {
    q_id:            q.q_id,
    title:           q.title,
    category:        q.category,
    difficulty:      q.difficulty,
    correctAnswer:   q.correct_answer,
    shuffledAnswers: shuffled,
    correctIndex:    shuffled.indexOf(q.correct_answer),
  };
}
