import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import {
  findMatchOrQueue,
  getDefaultDeck,
  leaveQueue,
  startBotMatch,
} from './match-api';
import { useAuth } from './auth-context';

type MatchmakingState = 'idle' | 'requesting' | 'queued' | 'matched' | 'bot_starting';

export function useMatchmaking() {
  const { session } = useAuth();
  const [state, setState] = useState<MatchmakingState>('idle');
  const [matchId, setMatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const uid = session?.user.id;

  useEffect(() => {
    if (state !== 'queued' || !uid) return;

    // Listen for a match INSERT where we are player2 (someone matched us from queue)
    const ch = supabase
      .channel(`queue-watch:${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `player2_id=eq.${uid}`,
        },
        (payload) => {
          const newMatchId: number = payload.new?.m_id;
          if (newMatchId) {
            setMatchId(newMatchId);
            setState('matched');
          }
        },
      )
      .subscribe();

    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [state, uid]);

  const quickMatch = async () => {
    if (!uid) return;
    setError(null);
    setState('requesting');
    try {
      const deckId = await getDefaultDeck(uid);
      if (!deckId) throw new Error('Brak talii');

      const result = await findMatchOrQueue(deckId);

      if (result.status === 'queued') {
        setState('queued');
      } else if (
        result.status === 'match_started' ||
        result.status === 'match_in_progress'
      ) {
        setMatchId(result.match_id!);
        setState('matched');
      } else if (result.status === 'match_finished') {
        // Was reconnecting to a finished match — back to idle
        setState('idle');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setState('idle');
    }
  };

  const practiceVsBot = async () => {
    if (!uid) return;
    setError(null);
    setState('bot_starting');
    try {
      const deckId = await getDefaultDeck(uid);
      if (!deckId) throw new Error('Brak talii');

      const result = await startBotMatch(deckId);
      setMatchId(result.match_id);
      setState('matched');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setState('idle');
    }
  };

  const cancel = async () => {
    try {
      await leaveQueue();
    } catch {}
    setState('idle');
    setMatchId(null);
  };

  return { state, matchId, error, quickMatch, practiceVsBot, cancel };
}
