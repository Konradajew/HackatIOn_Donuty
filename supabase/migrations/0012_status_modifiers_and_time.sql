-- =============================================================================
-- 0012 — Status modifiers visible to client, time buff, blackout/50-50 as UI hints
-- * matches: add current_question_modifier, current_blackout_idx, current_disabled_idxs
-- * match_snapshot: expose blackout_idx + disabled_idxs in current_question
-- * play_card: keep full 4-option array; compute blackout/disabled indices instead of filtering
-- * answer_question: use modifier column for decrement; consume et on use; extend server timer
-- =============================================================================


-- 1. Add modifier columns to matches
ALTER TABLE public.matches
    ADD COLUMN IF NOT EXISTS current_question_modifier text,   -- 'ba' | 'rw' | null
    ADD COLUMN IF NOT EXISTS current_blackout_idx      int,    -- 0-based index of blacked-out answer
    ADD COLUMN IF NOT EXISTS current_disabled_idxs     int[];  -- 0-based indices of disabled answers (50/50)


-- 2. match_snapshot — expose blackout_idx + disabled_idxs
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
        'started_at',          m.started_at,
        'whose_turn',          m.whose_turn,
        'turn_started_at',     m.turn_started_at,
        'question_started_at', m.question_started_at,
        'pending_card_id',     m.pending_card_id,
        'current_question',
            CASE WHEN m.pending_card_id IS NULL THEN
                jsonb_build_object(
                    'q_id',          NULL,
                    'title',         NULL,
                    'options',       NULL,
                    'category',      NULL,
                    'blackout_idx',  NULL,
                    'disabled_idxs', NULL)
            ELSE
                jsonb_build_object(
                    'q_id',          q.q_id,
                    'title',         q.title,
                    'options',       m.current_question_options,
                    'category',      q.category::text,
                    'blackout_idx',  m.current_blackout_idx,
                    'disabled_idxs', to_jsonb(m.current_disabled_idxs))
            END,
        'answer_log',  COALESCE(m.answer_log, '[]'::jsonb),
        'last_answer', CASE
            WHEN jsonb_array_length(COALESCE(m.answer_log, '[]'::jsonb)) > 0
            THEN m.answer_log -> (jsonb_array_length(m.answer_log) - 1)
            ELSE NULL
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


-- 3. play_card — keep full 4-option array; mark blackout/disabled indices instead of filtering
DROP FUNCTION IF EXISTS public.play_card(int, int);
CREATE FUNCTION public.play_card(p_match_id int, p_slot_idx int)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid                uuid := auth.uid();
    m                    public.matches%ROWTYPE;
    v_is_p1              boolean;
    v_hand               jsonb;
    v_status             jsonb;
    v_hand_entry         jsonb;
    v_card_id            int;
    v_cat                text;
    v_card_type          text;
    v_q                  RECORD;
    v_pool               text[];
    v_correct_text       text;
    v_correct_idx        int;   -- 1-based position in v_pool
    v_rw                 int;
    v_ba                 int;
    v_modifier           text;
    v_blackout_idx_out   int;
    v_disabled_idxs_out  int[];
    v_options_json       jsonb;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;

    IF public.check_match_timeout(p_match_id) THEN
        RETURN public.match_snapshot(p_match_id, v_uid);
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

    -- Pick card by 0-based slot index
    v_hand_entry := v_hand -> p_slot_idx;
    IF v_hand_entry IS NULL THEN
        RAISE EXCEPTION 'card_not_in_hand' USING ERRCODE = 'P0001';
    END IF;
    v_card_id := (v_hand_entry->>'id')::int;
    v_cat     := v_hand_entry->>'cat';

    SELECT type INTO v_card_type FROM public.cards WHERE card_id = v_card_id;
    IF v_card_type IS NULL THEN
        RAISE EXCEPTION 'card_not_found' USING ERRCODE = 'P0001';
    END IF;

    SELECT q_id, title, correct_answer, wrong_answers, category
      INTO v_q
      FROM public.questions
     WHERE category::text = v_cat
     ORDER BY random()
     LIMIT 1;

    IF v_q.q_id IS NULL THEN
        RAISE EXCEPTION 'no_question_for_category:%', v_cat USING ERRCODE = 'P0001';
    END IF;

    -- Always keep all 4 options (no filtering)
    v_correct_text := v_q.correct_answer;
    v_pool := public.shuffle_array(ARRAY[v_correct_text] || v_q.wrong_answers::text[]);
    v_correct_idx  := array_position(v_pool, v_correct_text);  -- 1-based

    -- Compute modifier indices from full pool (convert to 0-based for client)
    v_rw := COALESCE((v_status->>'rw')::int, 0);
    v_ba := COALESCE((v_status->>'ba')::int, 0);

    IF v_rw > 0 THEN
        -- 50/50: pick 2 wrong answer indices (0-based)
        SELECT ARRAY(
            SELECT i - 1
            FROM generate_series(1, array_length(v_pool, 1)) AS i
            WHERE i <> v_correct_idx
            ORDER BY random()
            LIMIT 2
        ) INTO v_disabled_idxs_out;
        v_blackout_idx_out := NULL;
        v_modifier := 'rw';
    ELSIF v_ba > 0 THEN
        -- Blackout: pick 1 wrong answer index (0-based)
        SELECT i - 1 INTO v_blackout_idx_out
        FROM generate_series(1, array_length(v_pool, 1)) AS i
        WHERE i <> v_correct_idx
        ORDER BY random()
        LIMIT 1;
        v_disabled_idxs_out := NULL;
        v_modifier := 'ba';
    ELSE
        v_blackout_idx_out  := NULL;
        v_disabled_idxs_out := NULL;
        v_modifier          := NULL;
    END IF;

    v_options_json := to_jsonb(v_pool);

    -- Remove the card at slot p_slot_idx and store question state
    IF v_is_p1 THEN
        UPDATE public.matches
           SET player1_hand = (
                   SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
                   FROM jsonb_array_elements(v_hand) WITH ORDINALITY arr(elem, ord)
                   WHERE ord <> p_slot_idx + 1
               ),
               player1_discard_pile          = player1_discard_pile || ARRAY[v_card_id::smallint],
               pending_card_id               = v_card_id::smallint,
               current_question_id           = v_q.q_id,
               current_question_options      = v_options_json,
               current_correct_index         = (v_correct_idx - 1)::smallint,
               question_started_at           = now(),
               current_question_modifier     = v_modifier,
               current_blackout_idx          = v_blackout_idx_out,
               current_disabled_idxs         = v_disabled_idxs_out
         WHERE m_id = p_match_id;
    ELSE
        UPDATE public.matches
           SET player2_hand = (
                   SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
                   FROM jsonb_array_elements(v_hand) WITH ORDINALITY arr(elem, ord)
                   WHERE ord <> p_slot_idx + 1
               ),
               player2_discard_pile          = player2_discard_pile || ARRAY[v_card_id::smallint],
               pending_card_id               = v_card_id::smallint,
               current_question_id           = v_q.q_id,
               current_question_options      = v_options_json,
               current_correct_index         = (v_correct_idx - 1)::smallint,
               question_started_at           = now(),
               current_question_modifier     = v_modifier,
               current_blackout_idx          = v_blackout_idx_out,
               current_disabled_idxs         = v_disabled_idxs_out
         WHERE m_id = p_match_id;
    END IF;

    RETURN public.match_snapshot(p_match_id, v_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.play_card(int, int) TO authenticated;


-- 4. answer_question — decrement via modifier column, consume et on use, extend timer
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
    v_is_timeout  boolean;
    v_correct     boolean;
    v_rw          int;
    v_ba          int;
    v_et          int;
    v_p1_hp       int;
    v_p2_hp       int;
    v_winner      uuid;
    v_q_title     text;
    v_q_cat       text;
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
    IF p_answer_index <> -1 AND (p_answer_index < 0 OR p_answer_index >= jsonb_array_length(m.current_question_options)) THEN
        RAISE EXCEPTION 'answer_index_out_of_range' USING ERRCODE = 'P0001';
    END IF;

    v_is_p1  := (m.player1_id = v_uid);
    v_status := CASE WHEN v_is_p1 THEN m.player1_status ELSE m.player2_status END;
    v_et     := COALESCE((v_status->>'et')::int, 0);

    -- Timeout: explicit sentinel OR server-side check (15 + et seconds)
    v_is_timeout := (p_answer_index = -1)
                 OR (m.question_started_at IS NOT NULL
                     AND now() - m.question_started_at > make_interval(secs => 15 + v_et));

    v_correct := (NOT v_is_timeout) AND (p_answer_index = m.current_correct_index);

    SELECT type INTO v_card_type FROM public.cards WHERE card_id = m.pending_card_id;
    IF v_card_type IS NULL THEN
        RAISE EXCEPTION 'pending_card_invalid' USING ERRCODE = 'P0001';
    END IF;

    -- Fetch question text for log
    SELECT title, category::text INTO v_q_title, v_q_cat
      FROM public.questions WHERE q_id = m.current_question_id;

    -- Decrement modifier counter based on what was active for this question
    IF m.current_question_modifier = 'rw' THEN
        v_rw := COALESCE((v_status->>'rw')::int, 0);
        v_status := jsonb_set(v_status, '{rw}', to_jsonb(GREATEST(0, v_rw - 1)), true);
    ELSIF m.current_question_modifier = 'ba' THEN
        v_ba := COALESCE((v_status->>'ba')::int, 0);
        v_status := jsonb_set(v_status, '{ba}', to_jsonb(GREATEST(0, v_ba - 1)), true);
    END IF;

    -- Consume et stack used for this question's extended timer
    IF v_et > 0 THEN
        v_status := jsonb_set(v_status, '{et}', to_jsonb(GREATEST(0, v_et - 5)), true);
    END IF;

    IF v_is_p1 THEN
        UPDATE public.matches SET player1_status = v_status WHERE m_id = p_match_id;
    ELSE
        UPDATE public.matches SET player2_status = v_status WHERE m_id = p_match_id;
    END IF;

    -- Apply card effect on correct answer, or -5 HP penalty on wrong/timeout
    IF v_correct THEN
        PERFORM public.apply_card_effect(p_match_id, v_card_type, v_is_p1);
    ELSE
        IF v_is_p1 THEN
            UPDATE public.matches SET player1_hp = GREATEST(player1_hp - 5, 0) WHERE m_id = p_match_id;
        ELSE
            UPDATE public.matches SET player2_hp = GREATEST(player2_hp - 5, 0) WHERE m_id = p_match_id;
        END IF;
    END IF;

    -- Append answer to log
    UPDATE public.matches
       SET answer_log = answer_log || jsonb_build_object(
           'q_id',        m.current_question_id,
           'q_title',     v_q_title,
           'q_options',   m.current_question_options,
           'q_category',  v_q_cat,
           'correct_idx', m.current_correct_index,
           'picked_idx',  p_answer_index,
           'was_correct', v_correct,
           'was_timeout', v_is_timeout,
           'card_id',     m.pending_card_id,
           'player_id',   v_uid,
           'ts',          now()
       )
     WHERE m_id = p_match_id;

    SELECT player1_hp, player2_hp INTO v_p1_hp, v_p2_hp
      FROM public.matches WHERE m_id = p_match_id;

    IF v_p1_hp <= 0 AND v_p2_hp <= 0 THEN
        v_winner := CASE WHEN v_is_p1 THEN m.player2_id ELSE m.player1_id END;
        PERFORM public.end_match(p_match_id, v_winner);
    ELSIF v_p1_hp <= 0 THEN
        PERFORM public.end_match(p_match_id, m.player2_id);
    ELSIF v_p2_hp <= 0 THEN
        PERFORM public.end_match(p_match_id, m.player1_id);
    ELSE
        UPDATE public.matches
           SET pending_card_id               = NULL,
               current_question_id           = NULL,
               current_question_options      = NULL,
               current_correct_index         = NULL,
               question_started_at           = NULL,
               current_question_modifier     = NULL,
               current_blackout_idx          = NULL,
               current_disabled_idxs         = NULL
         WHERE m_id = p_match_id;

        PERFORM public.end_turn(p_match_id);
    END IF;

    RETURN public.match_snapshot(p_match_id, v_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.answer_question(int, int) TO authenticated;
