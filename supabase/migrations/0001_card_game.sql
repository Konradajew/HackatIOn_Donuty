-- =============================================================================
-- Donuty card game — schema patches + full function suite
-- Run once in Supabase SQL Editor.
-- Re-runnable: DROP FUNCTION IF EXISTS before every CREATE OR REPLACE ensures
-- we can change return types (42P13 guard) on repeated executions.
-- Execute top-to-bottom; function order respects call-graph dependencies.
-- =============================================================================


-- =============================================================================
-- SECTION A — Schema patches (matches table only, minimal changes)
-- =============================================================================

-- A.1 Status columns must be jsonb OBJECTS, not arrays.
ALTER TABLE public.matches
    ALTER COLUMN player1_status SET DEFAULT '{}'::jsonb,
    ALTER COLUMN player2_status SET DEFAULT '{}'::jsonb;

-- A.2 Backfill any rows that have the wrong '[]' shape.
UPDATE public.matches SET player1_status = '{}'::jsonb
 WHERE jsonb_typeof(player1_status) <> 'object';
UPDATE public.matches SET player2_status = '{}'::jsonb
 WHERE jsonb_typeof(player2_status) <> 'object';

-- A.3 Pending question state (set by play_card, cleared by answer_question / end_turn).
ALTER TABLE public.matches
    ADD COLUMN IF NOT EXISTS pending_card_id           smallint,
    ADD COLUMN IF NOT EXISTS current_question_options  jsonb,
    ADD COLUMN IF NOT EXISTS current_correct_index     smallint;

-- A.4 Match termination.
ALTER TABLE public.matches
    ADD COLUMN IF NOT EXISTS winner_id   uuid REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- A.5 Discard piles — cards go here on play; reshuffled back when draw pile empties.
ALTER TABLE public.matches
    ADD COLUMN IF NOT EXISTS player1_discard_pile smallint[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS player2_discard_pile smallint[] NOT NULL DEFAULT '{}';

-- A.6 Index for fast question-by-category lookup used in play_card.
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions (category);

-- A.7 Supabase Realtime — frontend subscribes to postgres_changes on this table.
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;


-- =============================================================================
-- SECTION B.1 — Helper: shuffle_array
-- =============================================================================

DROP FUNCTION IF EXISTS public.shuffle_array(anyarray);
CREATE OR REPLACE FUNCTION public.shuffle_array(arr anyarray)
RETURNS anyarray
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT array_agg(u ORDER BY random())
      FROM unnest(arr) AS u;
$$;


-- =============================================================================
-- SECTION B.2 — Helper: array_remove_one
-- Removes the FIRST occurrence of p_item from p_array.
-- =============================================================================

DROP FUNCTION IF EXISTS public.array_remove_one(anyarray, anyelement);
CREATE OR REPLACE FUNCTION public.array_remove_one(p_array anyarray, p_item anyelement)
RETURNS anyarray
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pos integer;
BEGIN
    v_pos := array_position(p_array, p_item);
    IF v_pos IS NULL THEN RETURN p_array; END IF;
    RETURN p_array[1:v_pos-1] || p_array[v_pos+1:array_upper(p_array, 1)];
END;
$$;


-- =============================================================================
-- SECTION B.3 — Helper: remove_from_hand_jsonb
-- Removes the FIRST hand entry whose "id" equals p_card_id.
-- =============================================================================

DROP FUNCTION IF EXISTS public.remove_from_hand_jsonb(jsonb, int);
CREATE OR REPLACE FUNCTION public.remove_from_hand_jsonb(p_hand jsonb, p_card_id int)
RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH idx AS (
        SELECT min(ord) AS k
          FROM jsonb_array_elements(p_hand) WITH ORDINALITY AS t(elem, ord)
         WHERE (elem->>'id')::int = p_card_id
    )
    SELECT COALESCE(
        (SELECT jsonb_agg(elem ORDER BY ord)
           FROM jsonb_array_elements(p_hand) WITH ORDINALITY AS t(elem, ord), idx
          WHERE idx.k IS NULL OR ord <> idx.k),
        '[]'::jsonb
    );
$$;


-- =============================================================================
-- SECTION B.4 — match_snapshot (internal STABLE reader)
-- Returns full match state from p_viewer_id's perspective.
-- current_correct_index is NEVER included — anti-cheat boundary.
-- =============================================================================

DROP FUNCTION IF EXISTS public.match_snapshot(int, uuid);
CREATE OR REPLACE FUNCTION public.match_snapshot(p_match_id int, p_viewer_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_build_object(
        'match_id',            m.m_id,
        'is_currently_played', m.is_currently_played,
        'winner_id',           m.winner_id,
        'finished_at',         m.finished_at,
        'whose_turn',          m.whose_turn,
        'turn_started_at',     m.turn_started_at,
        'question_started_at', m.question_started_at,
        'pending_card_id',     m.pending_card_id,
        'current_question',
            CASE WHEN m.pending_card_id IS NULL THEN
                jsonb_build_object('q_id', NULL, 'title', NULL, 'options', NULL, 'category', NULL)
            ELSE
                jsonb_build_object(
                    'q_id',     q.q_id,
                    'title',    q.title,
                    'options',  m.current_question_options,
                    'category', q.category::text)
            END,
        'you',
            CASE WHEN p_viewer_id = m.player1_id THEN
                jsonb_build_object(
                    'is_player1', true,
                    'hp',         m.player1_hp,
                    'hand',       m.player1_hand,
                    'remaining_cards', to_jsonb(m.player1_remaining_cards),
                    'discard_pile',    to_jsonb(m.player1_discard_pile),
                    'status',     m.player1_status)
            ELSE
                jsonb_build_object(
                    'is_player1', false,
                    'hp',         m.player2_hp,
                    'hand',       m.player2_hand,
                    'remaining_cards', to_jsonb(m.player2_remaining_cards),
                    'discard_pile',    to_jsonb(m.player2_discard_pile),
                    'status',     m.player2_status)
            END,
        'opponent',
            CASE WHEN p_viewer_id = m.player1_id THEN
                jsonb_build_object(
                    'id',                    m.player2_id,
                    'hp',                    m.player2_hp,
                    'hand_size',             jsonb_array_length(m.player2_hand),
                    'remaining_cards_count', COALESCE(array_length(m.player2_remaining_cards, 1), 0),
                    'discard_pile_count',    COALESCE(array_length(m.player2_discard_pile,    1), 0),
                    'status_public',         m.player2_status)
            ELSE
                jsonb_build_object(
                    'id',                    m.player1_id,
                    'hp',                    m.player1_hp,
                    'hand_size',             jsonb_array_length(m.player1_hand),
                    'remaining_cards_count', COALESCE(array_length(m.player1_remaining_cards, 1), 0),
                    'discard_pile_count',    COALESCE(array_length(m.player1_discard_pile,    1), 0),
                    'status_public',         m.player1_status)
            END
    )
    FROM public.matches m
    LEFT JOIN public.questions q ON q.q_id = m.current_question_id
    WHERE m.m_id = p_match_id;
$$;

-- Thin public wrapper — uses auth.uid() so frontend never passes viewer_id.
DROP FUNCTION IF EXISTS public.get_match_snapshot(int);
CREATE OR REPLACE FUNCTION public.get_match_snapshot(p_match_id int)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public.match_snapshot(p_match_id, auth.uid());
END;
$$;


-- =============================================================================
-- SECTION B.5 — end_match (internal)
-- Idempotent. Sets winner, timestamps, clears all live state.
-- =============================================================================

DROP FUNCTION IF EXISTS public.end_match(int, uuid);
CREATE OR REPLACE FUNCTION public.end_match(p_match_id int, p_winner_id uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.matches
       SET is_currently_played      = false,
           winner_id                = p_winner_id,
           finished_at              = now(),
           whose_turn               = NULL,
           pending_card_id          = NULL,
           current_question_id      = NULL,
           current_question_options = NULL,
           current_correct_index    = NULL,
           question_started_at      = NULL
     WHERE m_id = p_match_id;
END;
$$;


-- =============================================================================
-- SECTION B.6 — draw_cards (internal)
-- Draws p_count cards for p_player_id.
-- When p_count = 1 (start of turn): applies poison damage tick first.
-- Reshuffles discard pile back into draw pile if remaining_cards empties.
-- Fixes original bugs: cards.card_id (not .id), status read as jsonb object.
-- =============================================================================

DROP FUNCTION IF EXISTS public.draw_cards(int, uuid, int);
CREATE OR REPLACE FUNCTION public.draw_cards(p_match_id int, p_player_id uuid, p_count int)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    m           public.matches%ROWTYPE;
    v_is_p1     boolean;
    v_remaining smallint[];
    v_discard   smallint[];
    v_hand      jsonb;
    v_status    jsonb;
    v_hp        int;
    v_opp_id    uuid;
    v_poison    int;
    v_pick      smallint;
    v_categories text[];
    v_cat       text;
    i           int;
BEGIN
    SELECT * INTO m FROM public.matches WHERE m_id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'match_not_found' USING ERRCODE = 'P0001';
    END IF;
    IF NOT m.is_currently_played THEN RETURN; END IF;

    v_is_p1 := (p_player_id = m.player1_id);

    IF v_is_p1 THEN
        v_remaining := m.player1_remaining_cards;
        v_discard   := m.player1_discard_pile;
        v_hand      := COALESCE(m.player1_hand,   '[]'::jsonb);
        v_status    := COALESCE(m.player1_status, '{}'::jsonb);
        v_hp        := m.player1_hp;
        v_opp_id    := m.player2_id;
    ELSE
        v_remaining := m.player2_remaining_cards;
        v_discard   := m.player2_discard_pile;
        v_hand      := COALESCE(m.player2_hand,   '[]'::jsonb);
        v_status    := COALESCE(m.player2_status, '{}'::jsonb);
        v_hp        := m.player2_hp;
        v_opp_id    := m.player1_id;
    END IF;

    -- Poison damage tick (only on start-of-turn single draw)
    IF p_count = 1 THEN
        v_poison := COALESCE((v_status->>'ps')::int, 0);
        IF v_poison > 0 THEN
            v_hp := GREATEST(v_hp - v_poison * 3, 0);
            IF v_is_p1 THEN
                UPDATE public.matches SET player1_hp = v_hp WHERE m_id = p_match_id;
            ELSE
                UPDATE public.matches SET player2_hp = v_hp WHERE m_id = p_match_id;
            END IF;
            IF v_hp = 0 THEN
                PERFORM public.end_match(p_match_id, v_opp_id);
                RETURN;
            END IF;
        END IF;
    END IF;

    -- Draw loop with automatic reshuffle
    FOR i IN 1 .. p_count LOOP
        IF COALESCE(array_length(v_remaining, 1), 0) = 0 THEN
            IF COALESCE(array_length(v_discard, 1), 0) = 0 THEN
                EXIT; -- nothing left anywhere; stop silently
            END IF;
            v_remaining := public.shuffle_array(v_discard);
            v_discard   := '{}'::smallint[];
        END IF;

        v_pick      := v_remaining[1];
        v_remaining := v_remaining[2:];

        SELECT categories INTO v_categories
          FROM public.cards WHERE card_id = v_pick;

        IF v_categories IS NULL OR array_length(v_categories, 1) = 0 THEN
            RAISE EXCEPTION 'card_has_no_categories:%', v_pick USING ERRCODE = 'P0001';
        END IF;

        v_cat := v_categories[1 + floor(random() * array_length(v_categories, 1))::int];
        v_hand := v_hand || jsonb_build_array(jsonb_build_object('id', v_pick, 'cat', v_cat));
    END LOOP;

    -- Persist
    IF v_is_p1 THEN
        UPDATE public.matches
           SET player1_remaining_cards = v_remaining,
               player1_discard_pile    = v_discard,
               player1_hand            = v_hand
         WHERE m_id = p_match_id;
    ELSE
        UPDATE public.matches
           SET player2_remaining_cards = v_remaining,
               player2_discard_pile    = v_discard,
               player2_hand            = v_hand
         WHERE m_id = p_match_id;
    END IF;
END;
$$;


-- =============================================================================
-- SECTION B.7 — apply_card_effect (internal)
-- Called from answer_question on a correct answer.
-- All counters STACK (ba += 3, rw += 2, et += 5, ps += 1).
--
-- Card types and effects:
--   DMG         → opponent -15 HP
--   HEAL        → caster   +15 HP (cap 100)
--   POISON      → opponent.ps += 1 (ticks 3/stack at start of their turn)
--   DMG_BLOCK   → opponent -5 HP + opponent.ba += 3
--   HEAL_REMOVE → caster   +5 HP  + caster.rw  += 2
--   TIME_BUFF   → opponent -5 HP  + caster +5 HP + caster.et += 5 (stacks, no cap)
-- =============================================================================

DROP FUNCTION IF EXISTS public.apply_card_effect(int, text, boolean);
CREATE OR REPLACE FUNCTION public.apply_card_effect(
    p_match_id    int,
    p_card_type   text,
    p_caster_is_p1 boolean
)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_caster_is_p1 THEN
        -- Caster = player1, opponent = player2
        CASE p_card_type
            WHEN 'DMG' THEN
                UPDATE public.matches
                   SET player2_hp = GREATEST(player2_hp - 15, 0)
                 WHERE m_id = p_match_id;

            WHEN 'HEAL' THEN
                UPDATE public.matches
                   SET player1_hp = LEAST(player1_hp + 15, 100)
                 WHERE m_id = p_match_id;

            WHEN 'POISON' THEN
                UPDATE public.matches
                   SET player2_status = jsonb_set(
                           player2_status, '{ps}',
                           to_jsonb(COALESCE((player2_status->>'ps')::int, 0) + 1),
                           true)
                 WHERE m_id = p_match_id;

            WHEN 'DMG_BLOCK' THEN
                UPDATE public.matches
                   SET player2_hp     = GREATEST(player2_hp - 5, 0),
                       player2_status = jsonb_set(
                           player2_status, '{ba}',
                           to_jsonb(COALESCE((player2_status->>'ba')::int, 0) + 3),
                           true)
                 WHERE m_id = p_match_id;

            WHEN 'HEAL_REMOVE' THEN
                UPDATE public.matches
                   SET player1_hp     = LEAST(player1_hp + 5, 100),
                       player1_status = jsonb_set(
                           player1_status, '{rw}',
                           to_jsonb(COALESCE((player1_status->>'rw')::int, 0) + 2),
                           true)
                 WHERE m_id = p_match_id;

            WHEN 'TIME_BUFF' THEN
                UPDATE public.matches
                   SET player2_hp     = GREATEST(player2_hp - 5, 0),
                       player1_hp     = LEAST(player1_hp + 5, 100),
                       player1_status = jsonb_set(
                           player1_status, '{et}',
                           to_jsonb(COALESCE((player1_status->>'et')::int, 0) + 5),
                           true)
                 WHERE m_id = p_match_id;

            ELSE
                RAISE EXCEPTION 'unknown_card_type:%', p_card_type USING ERRCODE = 'P0001';
        END CASE;
    ELSE
        -- Caster = player2, opponent = player1 (mirror)
        CASE p_card_type
            WHEN 'DMG' THEN
                UPDATE public.matches
                   SET player1_hp = GREATEST(player1_hp - 15, 0)
                 WHERE m_id = p_match_id;

            WHEN 'HEAL' THEN
                UPDATE public.matches
                   SET player2_hp = LEAST(player2_hp + 15, 100)
                 WHERE m_id = p_match_id;

            WHEN 'POISON' THEN
                UPDATE public.matches
                   SET player1_status = jsonb_set(
                           player1_status, '{ps}',
                           to_jsonb(COALESCE((player1_status->>'ps')::int, 0) + 1),
                           true)
                 WHERE m_id = p_match_id;

            WHEN 'DMG_BLOCK' THEN
                UPDATE public.matches
                   SET player1_hp     = GREATEST(player1_hp - 5, 0),
                       player1_status = jsonb_set(
                           player1_status, '{ba}',
                           to_jsonb(COALESCE((player1_status->>'ba')::int, 0) + 3),
                           true)
                 WHERE m_id = p_match_id;

            WHEN 'HEAL_REMOVE' THEN
                UPDATE public.matches
                   SET player2_hp     = LEAST(player2_hp + 5, 100),
                       player2_status = jsonb_set(
                           player2_status, '{rw}',
                           to_jsonb(COALESCE((player2_status->>'rw')::int, 0) + 2),
                           true)
                 WHERE m_id = p_match_id;

            WHEN 'TIME_BUFF' THEN
                UPDATE public.matches
                   SET player1_hp     = GREATEST(player1_hp - 5, 0),
                       player2_hp     = LEAST(player2_hp + 5, 100),
                       player2_status = jsonb_set(
                           player2_status, '{et}',
                           to_jsonb(COALESCE((player2_status->>'et')::int, 0) + 5),
                           true)
                 WHERE m_id = p_match_id;

            ELSE
                RAISE EXCEPTION 'unknown_card_type:%', p_card_type USING ERRCODE = 'P0001';
        END CASE;
    END IF;
END;
$$;


-- =============================================================================
-- SECTION B.8 — end_turn (internal)
-- Clears question state (defensive), switches whose_turn, draws 1 for the
-- new active player (which triggers poison tick and/or deck reshuffle).
-- =============================================================================

DROP FUNCTION IF EXISTS public.end_turn(int);
CREATE OR REPLACE FUNCTION public.end_turn(p_match_id int)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_next_player uuid;
    v_caller      uuid;
BEGIN
    v_caller := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

    -- Defensive clear (answer_question already clears; this is a safety net)
    UPDATE public.matches
       SET pending_card_id          = NULL,
           current_question_id      = NULL,
           current_question_options = NULL,
           current_correct_index    = NULL,
           question_started_at      = NULL
     WHERE m_id = p_match_id AND is_currently_played;

    -- Switch turn
    UPDATE public.matches
       SET whose_turn     = CASE WHEN whose_turn = player1_id THEN player2_id ELSE player1_id END,
           turn_started_at = now()
     WHERE m_id = p_match_id AND is_currently_played
     RETURNING whose_turn INTO v_next_player;

    -- Start-of-turn draw for the new active player
    IF v_next_player IS NOT NULL THEN
        PERFORM public.draw_cards(p_match_id, v_next_player, 1);
    END IF;

    RETURN public.match_snapshot(p_match_id, v_caller);
END;
$$;


-- =============================================================================
-- SECTION B.9 — play_card (PUBLIC RPC)
--
-- Flow:
--   1. Validate turn / no pending question
--   2. Pull card entry from hand (has {id, cat} — cat was fixed at draw time)
--   3. Remove card from hand, add to discard pile
--   4. Load card type from cards table
--   5. Pick a random question from the card's category
--   6. Shuffle [correct_answer, ...wrong_answers] into options array
--   7. If caster has rw > 0: strip 2 wrong answers from options
--      Else if caster has ba > 0: strip 1 wrong answer
--      (Counters decrement in answer_question when the answer is submitted)
--   8. Store pending state + question options (correct_index never sent to client)
--   9. Return match snapshot
-- =============================================================================

DROP FUNCTION IF EXISTS public.play_card(int, int);
CREATE OR REPLACE FUNCTION public.play_card(p_match_id int, p_card_id int)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid          uuid := auth.uid();
    m              public.matches%ROWTYPE;
    v_is_p1        boolean;
    v_hand         jsonb;
    v_status       jsonb;
    v_discard      smallint[];
    v_hand_entry   jsonb;
    v_cat          text;
    v_card_type    text;
    v_q            RECORD;
    v_pool         text[];
    v_correct_text text;
    v_rw           int;
    v_ba           int;
    v_drop_n       int;
    v_correct_idx  int;
    v_wrong_idxs   int[];
    k              int;
    m_idx          int;
    v_options_json jsonb;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO m FROM public.matches WHERE m_id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'match_not_found' USING ERRCODE = 'P0001';
    END IF;
    IF NOT m.is_currently_played OR m.winner_id IS NOT NULL THEN
        RAISE EXCEPTION 'match_finished' USING ERRCODE = 'P0001';
    END IF;
    IF m.whose_turn <> v_uid THEN
        RAISE EXCEPTION 'not_your_turn' USING ERRCODE = '42501';
    END IF;
    IF m.pending_card_id IS NOT NULL THEN
        RAISE EXCEPTION 'question_already_pending' USING ERRCODE = 'P0001';
    END IF;

    v_is_p1  := (m.player1_id = v_uid);
    v_hand   := CASE WHEN v_is_p1 THEN m.player1_hand   ELSE m.player2_hand   END;
    v_status := CASE WHEN v_is_p1 THEN m.player1_status ELSE m.player2_status END;
    v_discard := CASE WHEN v_is_p1 THEN m.player1_discard_pile ELSE m.player2_discard_pile END;

    -- Pull the hand entry (contains the pre-rolled category)
    SELECT elem INTO v_hand_entry
      FROM jsonb_array_elements(v_hand) AS elem
     WHERE (elem->>'id')::int = p_card_id
     LIMIT 1;

    IF v_hand_entry IS NULL THEN
        RAISE EXCEPTION 'card_not_in_hand' USING ERRCODE = 'P0001';
    END IF;
    v_cat := v_hand_entry->>'cat';

    -- Load card type
    SELECT type INTO v_card_type FROM public.cards WHERE card_id = p_card_id;
    IF v_card_type IS NULL THEN
        RAISE EXCEPTION 'card_not_found' USING ERRCODE = 'P0001';
    END IF;

    -- Pick a random question for this category
    SELECT q_id, title, correct_answer, wrong_answers, category
      INTO v_q
      FROM public.questions
     WHERE category::text = v_cat
     ORDER BY random()
     LIMIT 1;

    IF v_q.q_id IS NULL THEN
        RAISE EXCEPTION 'no_question_for_category:%', v_cat USING ERRCODE = 'P0001';
    END IF;

    -- Build shuffled options pool
    v_correct_text := v_q.correct_answer;
    v_pool := public.shuffle_array(ARRAY[v_correct_text] || v_q.wrong_answers::text[]);

    -- Apply buff/debuff option reduction (rw takes precedence over ba)
    v_rw     := COALESCE((v_status->>'rw')::int, 0);
    v_ba     := COALESCE((v_status->>'ba')::int, 0);
    v_drop_n := CASE WHEN v_rw > 0 THEN 2 WHEN v_ba > 0 THEN 1 ELSE 0 END;

    IF v_drop_n > 0 THEN
        v_correct_idx := array_position(v_pool, v_correct_text);

        -- Collect wrong-answer indices in random order
        SELECT array_agg(i ORDER BY random())
          INTO v_wrong_idxs
          FROM generate_series(1, array_length(v_pool, 1)) AS i
         WHERE i <> v_correct_idx;

        FOR k IN 1 .. LEAST(v_drop_n, COALESCE(array_length(v_wrong_idxs, 1), 0)) LOOP
            v_pool := v_pool[1 : v_wrong_idxs[k]-1] || v_pool[v_wrong_idxs[k]+1 :];
            -- Shift subsequent indices that moved down
            FOR m_idx IN k+1 .. array_length(v_wrong_idxs, 1) LOOP
                IF v_wrong_idxs[m_idx] > v_wrong_idxs[k] THEN
                    v_wrong_idxs[m_idx] := v_wrong_idxs[m_idx] - 1;
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    -- Recompute correct position after any removals
    v_correct_idx  := array_position(v_pool, v_correct_text);
    v_options_json := to_jsonb(v_pool);

    -- Persist: hand → discard, set pending question state
    IF v_is_p1 THEN
        UPDATE public.matches
           SET player1_hand          = public.remove_from_hand_jsonb(player1_hand, p_card_id),
               player1_discard_pile  = player1_discard_pile || ARRAY[p_card_id::smallint],
               pending_card_id          = p_card_id::smallint,
               current_question_id      = v_q.q_id,
               current_question_options = v_options_json,
               current_correct_index    = (v_correct_idx - 1)::smallint,
               question_started_at      = now()
         WHERE m_id = p_match_id;
    ELSE
        UPDATE public.matches
           SET player2_hand          = public.remove_from_hand_jsonb(player2_hand, p_card_id),
               player2_discard_pile  = player2_discard_pile || ARRAY[p_card_id::smallint],
               pending_card_id          = p_card_id::smallint,
               current_question_id      = v_q.q_id,
               current_question_options = v_options_json,
               current_correct_index    = (v_correct_idx - 1)::smallint,
               question_started_at      = now()
         WHERE m_id = p_match_id;
    END IF;

    RETURN public.match_snapshot(p_match_id, v_uid);
END;
$$;


-- =============================================================================
-- SECTION B.10 — answer_question (PUBLIC RPC)
--
-- Flow:
--   1. Validate turn / pending question / answer index range
--   2. Decrement the status counter that modified THIS question's options
--      (rw if rw > 0, else ba if ba > 0 — same precedence as play_card)
--   3. If correct  → apply_card_effect for the pending card type
--      If wrong    → caster -10 HP
--   4. Check HPs → end_match if anyone at 0
--   5. Otherwise clear question state + end_turn
--   6. Return snapshot
-- =============================================================================

DROP FUNCTION IF EXISTS public.answer_question(int, int);
CREATE OR REPLACE FUNCTION public.answer_question(p_match_id int, p_answer_index int)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid         uuid := auth.uid();
    m             public.matches%ROWTYPE;
    v_is_p1       boolean;
    v_status      jsonb;
    v_card_type   text;
    v_correct     boolean;
    v_rw          int;
    v_ba          int;
    v_p1_hp       int;
    v_p2_hp       int;
    v_winner      uuid;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO m FROM public.matches WHERE m_id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'match_not_found' USING ERRCODE = 'P0001';
    END IF;
    IF NOT m.is_currently_played OR m.winner_id IS NOT NULL THEN
        RAISE EXCEPTION 'match_finished' USING ERRCODE = 'P0001';
    END IF;
    IF m.whose_turn <> v_uid THEN
        RAISE EXCEPTION 'not_your_turn' USING ERRCODE = '42501';
    END IF;
    IF m.pending_card_id IS NULL OR m.current_question_options IS NULL THEN
        RAISE EXCEPTION 'no_pending_question' USING ERRCODE = 'P0001';
    END IF;
    IF p_answer_index < 0 OR p_answer_index >= jsonb_array_length(m.current_question_options) THEN
        RAISE EXCEPTION 'answer_index_out_of_range' USING ERRCODE = 'P0001';
    END IF;

    v_is_p1 := (m.player1_id = v_uid);
    v_status := CASE WHEN v_is_p1 THEN m.player1_status ELSE m.player2_status END;
    v_correct := (p_answer_index = m.current_correct_index);

    -- Resolve card type
    SELECT type INTO v_card_type FROM public.cards WHERE card_id = m.pending_card_id;
    IF v_card_type IS NULL THEN
        RAISE EXCEPTION 'pending_card_invalid' USING ERRCODE = 'P0001';
    END IF;

    -- Decrement whichever counter affected this question's options
    v_rw := COALESCE((v_status->>'rw')::int, 0);
    v_ba := COALESCE((v_status->>'ba')::int, 0);
    IF v_rw > 0 THEN
        v_status := jsonb_set(v_status, '{rw}', to_jsonb(v_rw - 1), true);
    ELSIF v_ba > 0 THEN
        v_status := jsonb_set(v_status, '{ba}', to_jsonb(v_ba - 1), true);
    END IF;
    IF v_is_p1 THEN
        UPDATE public.matches SET player1_status = v_status WHERE m_id = p_match_id;
    ELSE
        UPDATE public.matches SET player2_status = v_status WHERE m_id = p_match_id;
    END IF;

    -- Effect or penalty
    IF v_correct THEN
        PERFORM public.apply_card_effect(p_match_id, v_card_type, v_is_p1);
    ELSE
        IF v_is_p1 THEN
            UPDATE public.matches SET player1_hp = GREATEST(player1_hp - 10, 0) WHERE m_id = p_match_id;
        ELSE
            UPDATE public.matches SET player2_hp = GREATEST(player2_hp - 10, 0) WHERE m_id = p_match_id;
        END IF;
    END IF;

    -- Win check
    SELECT player1_hp, player2_hp INTO v_p1_hp, v_p2_hp
      FROM public.matches WHERE m_id = p_match_id;

    IF v_p1_hp <= 0 AND v_p2_hp <= 0 THEN
        -- Edge case: both at 0 → caster loses
        v_winner := CASE WHEN v_is_p1 THEN m.player2_id ELSE m.player1_id END;
        PERFORM public.end_match(p_match_id, v_winner);
    ELSIF v_p1_hp <= 0 THEN
        PERFORM public.end_match(p_match_id, m.player2_id);
    ELSIF v_p2_hp <= 0 THEN
        PERFORM public.end_match(p_match_id, m.player1_id);
    ELSE
        -- Game continues: clear question state, then end_turn
        UPDATE public.matches
           SET pending_card_id          = NULL,
               current_question_id      = NULL,
               current_question_options = NULL,
               current_correct_index    = NULL,
               question_started_at      = NULL
         WHERE m_id = p_match_id;

        PERFORM public.end_turn(p_match_id);
    END IF;

    RETURN public.match_snapshot(p_match_id, v_uid);
END;
$$;


-- =============================================================================
-- SECTION B.11 — find_match_or_queue (PUBLIC RPC)
--
-- Flow:
--   1. Reconnect short-circuit: if caller already has an active match → return it
--   2. Verify deck ownership
--   3. Try to claim oldest waiting opponent (FIFO, FOR UPDATE SKIP LOCKED)
--   4a. No opponent → insert/update self in queue → return {"status":"queued"}
--   4b. Opponent found →
--       - Shuffle both decks into remaining_cards
--       - Pick random starting player
--       - INSERT match row with whose_turn set (fixes original NULL bug)
--       - Draw 3 cards each, then 1 extra for the starter
--       - Return {"status":"match_started"} + full snapshot
-- =============================================================================

DROP FUNCTION IF EXISTS public.find_match_or_queue(int);
CREATE OR REPLACE FUNCTION public.find_match_or_queue(p_deck_id int)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid          uuid := auth.uid();
    v_existing     int;
    v_opp_id       uuid;
    v_opp_deck     int;
    v_p1_remaining smallint[];
    v_p2_remaining smallint[];
    v_starter      uuid;
    v_match_id     int;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;

    -- Reconnect: already in a live match?
    SELECT m_id INTO v_existing
      FROM public.matches
     WHERE is_currently_played
       AND (player1_id = v_uid OR player2_id = v_uid)
     ORDER BY m_id DESC
     LIMIT 1;

    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'match_in_progress')
            || public.match_snapshot(v_existing, v_uid);
    END IF;

    -- Verify deck ownership
    IF NOT EXISTS (SELECT 1 FROM public.decks WHERE id = p_deck_id AND user_id = v_uid) THEN
        RAISE EXCEPTION 'deck_not_owned_or_missing' USING ERRCODE = '42501';
    END IF;

    -- Try to claim an opponent (FIFO, race-safe)
    SELECT user_id, deck_id INTO v_opp_id, v_opp_deck
      FROM public.matchmaking_queue
     WHERE user_id <> v_uid
     ORDER BY created_at
     LIMIT 1
     FOR UPDATE SKIP LOCKED;

    IF v_opp_id IS NOT NULL THEN
        DELETE FROM public.matchmaking_queue WHERE user_id = v_opp_id;
    END IF;

    IF v_opp_id IS NULL THEN
        -- No opponent yet → join/refresh queue
        INSERT INTO public.matchmaking_queue (user_id, deck_id)
          VALUES (v_uid, p_deck_id)
          ON CONFLICT (user_id) DO UPDATE
              SET deck_id    = EXCLUDED.deck_id,
                  created_at = timezone('utc'::text, now());

        RETURN jsonb_build_object('status', 'queued', 'queued_at', now()::text);
    END IF;

    -- Opponent found — start the match
    SELECT public.shuffle_array(cards) INTO v_p1_remaining
      FROM public.decks WHERE id = p_deck_id;

    SELECT public.shuffle_array(cards) INTO v_p2_remaining
      FROM public.decks WHERE id = v_opp_deck;

    IF v_p1_remaining IS NULL OR v_p2_remaining IS NULL THEN
        RAISE EXCEPTION 'deck_missing_cards' USING ERRCODE = 'P0001';
    END IF;

    -- v_uid = player1, v_opp_id = player2 (convention: initiator is p1)
    v_starter := CASE WHEN random() < 0.5 THEN v_uid ELSE v_opp_id END;

    INSERT INTO public.matches (
        is_currently_played,
        player1_id,          player2_id,
        whose_turn,
        player1_hp,          player2_hp,
        player1_active_deck_id, player2_active_deck_id,
        player1_status,      player2_status,
        player1_remaining_cards, player2_remaining_cards,
        player1_hand,        player2_hand,
        player1_discard_pile, player2_discard_pile,
        turn_started_at
    ) VALUES (
        true,
        v_uid,               v_opp_id,
        v_starter,
        100,                 100,
        p_deck_id,           v_opp_deck,
        '{}'::jsonb,         '{}'::jsonb,
        v_p1_remaining,      v_p2_remaining,
        '[]'::jsonb,         '[]'::jsonb,
        '{}'::smallint[],    '{}'::smallint[],
        now()
    )
    RETURNING m_id INTO v_match_id;

    -- Initial deal: 3 cards each
    PERFORM public.draw_cards(v_match_id, v_uid,    3);
    PERFORM public.draw_cards(v_match_id, v_opp_id, 3);

    -- Starter draws their 4th card (poison tick is a no-op at ps=0)
    PERFORM public.draw_cards(v_match_id, v_starter, 1);

    RETURN jsonb_build_object('status', 'match_started')
        || public.match_snapshot(v_match_id, v_uid);
END;
$$;


-- =============================================================================
-- SECTION C — Grants
-- Only the four public RPCs are callable by authenticated users.
-- Internal helpers are revoked from PUBLIC.
-- Grants are placed AFTER all CREATEs because DROP removes existing grants.
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.find_match_or_queue(int)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.play_card(int, int)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_question(int, int)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_snapshot(int)        TO authenticated;

REVOKE EXECUTE ON FUNCTION public.draw_cards(int, uuid, int)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_card_effect(int, text, boolean)   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.end_turn(int)                            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.end_match(int, uuid)                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_snapshot(int, uuid)                FROM PUBLIC;
