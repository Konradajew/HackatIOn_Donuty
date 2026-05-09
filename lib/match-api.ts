import { supabase } from './supabase';

export type CardType = 'DMG' | 'HEAL' | 'POISON' | 'DMG_BLOCK' | 'HEAL_REMOVE' | 'TIME_BUFF';

export const BOT_UUID = '00000000-0000-0000-0000-000000000b07';
export const QUESTION_TIMEOUT_SENTINEL = -1;

export type AnswerLogEntry = {
  q_id: number;
  q_title: string;
  q_options: string[];
  q_category: string;
  correct_idx: number;
  picked_idx: number;
  was_correct: boolean;
  was_timeout: boolean;
  card_id: number;
  player_id: string;
  ts: string;
};

export type Snapshot = {
  match_id: number;
  is_currently_played: boolean;
  winner_id: string | null;
  finished_at: string | null;
  started_at: string;
  whose_turn: string | null;
  turn_started_at: string;
  question_started_at: string | null;
  pending_card_id: number | null;
  current_question: {
    q_id: number | null;
    title: string | null;
    options: string[] | null;
    category: string | null;
    difficulty: number | null;
    blackout_idx: number | null;
    disabled_idxs: number[] | null;
  };
  you: {
    is_player1: boolean;
    hp: number;
    hand: { id: number; cat: string }[];
    remaining_cards: number[];
    discard_pile: number[];
    status: { ps?: number; ba?: number; rw?: number; et?: number };
  };
  opponent: {
    id: string | null;
    hp: number;
    hand_size: number;
    remaining_cards_count: number;
    discard_pile_count: number;
    status_public: { ps?: number; ba?: number; rw?: number; et?: number };
  };
  answer_log: AnswerLogEntry[];
  last_answer: AnswerLogEntry | null;
};

let _cardTypeCache: Record<number, CardType> | null = null;

export async function getCardTypes(): Promise<Record<number, CardType>> {
  if (_cardTypeCache) return _cardTypeCache;
  const { data, error } = await supabase.from('cards').select('card_id, type');
  if (error) throw error;
  const map: Record<number, CardType> = {};
  for (const row of (data ?? [])) map[row.card_id] = row.type as CardType;
  _cardTypeCache = map;
  return map;
}

export async function getDefaultDeck(userId: string): Promise<number | null> {
  const { data: prof } = await supabase
    .from('profiles')
    .select('selected_deck_id')
    .eq('id', userId)
    .maybeSingle();
  if (prof?.selected_deck_id) return prof.selected_deck_id;
  const { data } = await supabase
    .from('decks')
    .select('id')
    .eq('user_id', userId)
    .order('id')
    .limit(1)
    .single();
  return data?.id ?? null;
}

export type DeckRow = {
  id: number;
  deck_number: number;
  cards: number[];
  is_selected: boolean;
};

export async function listMyDecks(): Promise<DeckRow[]> {
  const { data, error } = await supabase.rpc('list_my_decks');
  if (error) throw error;
  return (data as DeckRow[]) ?? [];
}

export async function upsertDeck(deckNumber: number, cards: number[]): Promise<number> {
  const { data, error } = await supabase.rpc('upsert_deck', {
    p_deck_number: deckNumber,
    p_cards: cards,
  });
  if (error) throw error;
  return data as number;
}

export async function deleteDeck(deckId: number): Promise<void> {
  const { error } = await supabase.rpc('delete_deck', { p_deck_id: deckId });
  if (error) throw error;
}

export async function setActiveDeck(deckId: number): Promise<void> {
  const { error } = await supabase.rpc('set_active_deck', { p_deck_id: deckId });
  if (error) throw error;
}

export async function concedeMatch(matchId: number): Promise<Snapshot> {
  const { data, error } = await supabase.rpc('concede_match', { p_match_id: matchId });
  if (error) throw error;
  return data as Snapshot;
}

export type MatchOrQueueResult =
  { status: 'queued'; queued_at: string } |
  { status: 'match_in_progress' | 'match_started' | 'match_finished' } & Snapshot;

export async function findMatchOrQueue(deckId: number): Promise<MatchOrQueueResult> {
  const { data, error } = await supabase.rpc('find_match_or_queue', { p_deck_id: deckId });
  if (error) throw error;
  return data as MatchOrQueueResult;
}

export async function leaveQueue(): Promise<void> {
  const { error } = await supabase.rpc('leave_queue');
  if (error) throw error;
}

export async function startBotMatch(deckId: number): Promise<Snapshot & { status: 'bot_match_started' }> {
  const { data, error } = await supabase.rpc('start_bot_match', { p_deck_id: deckId });
  if (error) throw error;
  return data as Snapshot & { status: 'bot_match_started' };
}

export async function botTakeTurn(matchId: number): Promise<Snapshot> {
  const { data, error } = await supabase.rpc('bot_take_turn', { p_match_id: matchId });
  if (error) throw error;
  return data as Snapshot;
}

export async function getMatchSnapshot(matchId: number): Promise<Snapshot> {
  const { data, error } = await supabase.rpc('get_match_snapshot', { p_match_id: matchId });
  if (error) throw error;
  return data as Snapshot;
}

export async function playCard(matchId: number, slotIdx: number): Promise<Snapshot> {
  const { data, error } = await supabase.rpc('play_card', { p_match_id: matchId, p_slot_idx: slotIdx });
  if (error) throw error;
  return data as Snapshot;
}

export async function answerQuestion(matchId: number, answerIndex: number): Promise<Snapshot> {
  const { data, error } = await supabase.rpc('answer_question', {
    p_match_id: matchId,
    p_answer_index: answerIndex,
  });
  if (error) throw error;
  return data as Snapshot;
}
