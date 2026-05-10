import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from './supabase';
import {
  BOT_UUID,
  QUESTION_TIMEOUT_SENTINEL,
  answerQuestion,
  botTakeTurn,
  getCardTypes,
  getMatchSnapshot,
  playCard,
  type CardType,
  type Snapshot,
} from './match-api';

function errMsg(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e &&
      typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

type MatchCtx = {
  snapshot: Snapshot | null;
  cardTypes: Record<number, CardType>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  play: (slotIdx: number) => Promise<void>;
  answer: (answerIndex: number) => Promise<void>;
  questionDeadline: number | null;
  lastResult: { correct_idx: number; picked_idx: number; was_correct: boolean } | null;
  busy: boolean;
};

const Ctx = createContext<MatchCtx | null>(null);

export function MatchProvider({
  matchId,
  children,
}: {
  matchId: number;
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [cardTypes, setCardTypes] = useState<Record<number, CardType>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ correct_idx: number; picked_idx: number; was_correct: boolean } | null>(null);
  const answeringRef = useRef(false);
  const playingRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const lastQIdRef = useRef<number | null>(null);
  const freezeUntilRef = useRef<number>(0);
  const [questionStartedClientMs, setQuestionStartedClientMs] = useState<number | null>(null);

  const applySnapshot = (s: Snapshot) => setSnapshot(s);

  const refresh = async () => {
    try {
      const s = await getMatchSnapshot(matchId);
      applySnapshot(s);
    } catch (e: unknown) {
      setError(errMsg(e));
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [snap, types] = await Promise.all([getMatchSnapshot(matchId), getCardTypes()]);
        if (!active) return;
        applySnapshot(snap);
        setCardTypes(types);
      } catch (e: unknown) {
        if (active) setError(errMsg(e));
      } finally {
        if (active) setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `m_id=eq.${matchId}` },
        async () => {
          if (!active) return;
          if (Date.now() < freezeUntilRef.current) return;
          try {
            const s = await getMatchSnapshot(matchId);
            if (active) applySnapshot(s);
          } catch {}
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const play = async (slotIdx: number) => {
    if (playingRef.current || answeringRef.current) return;
    playingRef.current = true;
    setBusy(true);
    try {
      const s = await playCard(matchId, slotIdx);
      applySnapshot(s);
    } catch (e: unknown) {
      const msg = errMsg(e);
      if (msg.includes('question_already_pending')) {
        try { await refresh(); } catch {}
        return;
      }
      setError(msg);
      throw e;
    } finally {
      playingRef.current = false;
      setBusy(false);
    }
  };

  const answer = async (answerIndex: number) => {
    if (answeringRef.current || playingRef.current) return;
    answeringRef.current = true;
    setBusy(true);
    try {
      const s = await answerQuestion(matchId, answerIndex);
      if (s.last_answer) {
        setLastResult({
          correct_idx: s.last_answer.correct_idx,
          picked_idx:  s.last_answer.picked_idx,
          was_correct: s.last_answer.was_correct,
        });
        freezeUntilRef.current = Date.now() + 1200;
        await new Promise<void>(r => setTimeout(r, 1200));
        setLastResult(null);
      }
      applySnapshot(s);
      if (
        s.is_currently_played &&
        s.opponent.id === BOT_UUID &&
        s.whose_turn === BOT_UUID
      ) {
        const botDelayMs = 2800;
        freezeUntilRef.current = Date.now() + botDelayMs;
        await new Promise<void>(r => setTimeout(r, botDelayMs));
        const bs = await botTakeTurn(matchId);
        applySnapshot(bs);
      }
    } catch (e: unknown) {
      setError(errMsg(e));
      throw e;
    } finally {
      answeringRef.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    const qid = snapshot?.current_question.q_id ?? null;
    if (qid !== lastQIdRef.current) {
      lastQIdRef.current = qid;
      setQuestionStartedClientMs(qid != null ? Date.now() : null);
    }
  }, [snapshot?.current_question.q_id]);

  const etBonus = snapshot?.you.status.et ?? 0;
  const questionDeadline =
    questionStartedClientMs != null ? questionStartedClientMs + (15 + etBonus) * 1000 : null;

  return (
    <Ctx.Provider
      value={{ snapshot, cardTypes, loading, error, refresh, play, answer, questionDeadline, lastResult, busy }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMatch(): MatchCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMatch must be used inside MatchProvider');
  return ctx;
}

export { QUESTION_TIMEOUT_SENTINEL };
