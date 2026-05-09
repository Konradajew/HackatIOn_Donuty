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

type MatchCtx = {
  snapshot: Snapshot | null;
  cardTypes: Record<number, CardType>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  play: (cardId: number) => Promise<void>;
  answer: (answerIndex: number) => Promise<void>;
  questionDeadline: number | null;
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
  const answeringRef = useRef(false);

  const applySnapshot = (s: Snapshot) => setSnapshot(s);

  const refresh = async () => {
    try {
      const s = await getMatchSnapshot(matchId);
      applySnapshot(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
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
        if (active) setError(e instanceof Error ? e.message : String(e));
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

  const play = async (cardId: number) => {
    try {
      const s = await playCard(matchId, cardId);
      applySnapshot(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    }
  };

  const answer = async (answerIndex: number) => {
    if (answeringRef.current) return;
    answeringRef.current = true;
    try {
      const s = await answerQuestion(matchId, answerIndex);
      applySnapshot(s);
      // Auto-trigger bot turn if it's a bot match and game is still active
      if (
        s.is_currently_played &&
        s.opponent.id === BOT_UUID &&
        s.whose_turn === BOT_UUID
      ) {
        const bs = await botTakeTurn(matchId);
        applySnapshot(bs);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      answeringRef.current = false;
    }
  };

  const questionDeadline =
    snapshot?.question_started_at != null
      ? new Date(snapshot.question_started_at).getTime() + 15_000
      : null;

  return (
    <Ctx.Provider
      value={{ snapshot, cardTypes, loading, error, refresh, play, answer, questionDeadline }}
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
