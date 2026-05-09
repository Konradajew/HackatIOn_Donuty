-- =============================================================================
-- 0007 — Game rules revamp
-- * matches.started_at column (for 15-min hard timer)
-- * apply_card_effect: HEAL +12, HEAL_REMOVE +4, TIME_BUFF caster +4
-- * answer_question: -5 HP penalty, timeout sentinel -1, 15-s server enforce
-- * check_match_timeout: new internal helper, called by all public RPCs
-- * play_card / get_match_snapshot / find_match_or_queue: call timeout helper
-- * match_snapshot: expose started_at for client-side duration display
-- =============================================================================

-- 1. Add started_at (defaults to now() for all future rows; no backfill needed)
ALTER TABLE public.matches
    ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now();


-- 2. match_snapshot — expose started_at (internal STABLE reader)
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


-- 3. check_match_timeout (new internal helper)
-- Returns true and calls end_match if the 15-min hard timer has expired.
-- v_winner = NULL means draw (equal HP).
CREATE OR REPLACE FUNCTION public.check_match_timeout(p_match_id int)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    m        public.matches%ROWTYPE;
    v_winner uuid;
BEGIN
    SELECT * INTO m FROM public.matches WHERE m_id = p_match_id;
    IF NOT FOUND OR NOT m.is_currently_played THEN RETURN false; END IF;
    IF now() - m.started_at <= interval '15 minutes'  THEN RETURN false; END IF;

    IF    m.player1_hp > m.player2_hp THEN v_winner := m.player1_id;
    ELSIF m.player2_hp > m.player1_hp THEN v_winner := m.player2_id;
    ELSE                                    v_winner := NULL;   -- draw
    END IF;

    PERFORM public.end_match(p_match_id, v_winner);
    RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_match_timeout(int) FROM PUBLIC;


-- 4. apply_card_effect — nerfed heal values
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
        CASE p_card_type
            WHEN 'DMG' THEN
                UPDATE public.matches
                   SET player2_hp = GREATEST(player2_hp - 15, 0)
                 WHERE m_id = p_match_id;

            WHEN 'HEAL' THEN
                UPDATE public.matches
                   SET player1_hp = LEAST(player1_hp + 12, 100)
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
                   SET player1_hp     = LEAST(player1_hp + 4, 100),
                       player1_status = jsonb_set(
                           player1_status, '{rw}',
                           to_jsonb(COALESCE((player1_status->>'rw')::int, 0) + 2),
                           true)
                 WHERE m_id = p_match_id;

            WHEN 'TIME_BUFF' THEN
                UPDATE public.matches
                   SET player2_hp     = GREATEST(player2_hp - 5, 0),
                       player1_hp     = LEAST(player1_hp + 4, 100),
                       player1_status = jsonb_set(
                           player1_status, '{et}',
                           to_jsonb(COALESCE((player1_status->>'et')::int, 0) + 5),
                           true)
                 WHERE m_id = p_match_id;

            ELSE
                RAISE EXCEPTION 'unknown_card_type:%', p_card_type USING ERRCODE = 'P0001';
        END CASE;
    ELSE
        CASE p_card_type
            WHEN 'DMG' THEN
                UPDATE public.matches
                   SET player1_hp = GREATEST(player1_hp - 15, 0)
                 WHERE m_id = p_match_id;

            WHEN 'HEAL' THEN
                UPDATE public.matches
                   SET player2_hp = LEAST(player2_hp + 12, 100)
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
                   SET player2_hp     = LEAST(player2_hp + 4, 100),
                       player2_status = jsonb_set(
                           player2_status, '{rw}',
                           to_jsonb(COALESCE((player2_status->>'rw')::int, 0) + 2),
                           true)
                 WHERE m_id = p_match_id;

            WHEN 'TIME_BUFF' THEN
                UPDATE public.matches
                   SET player1_hp     = GREATEST(player1_hp - 5, 0),
                       player2_hp     = LEAST(player2_hp + 4, 100),
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

REVOKE EXECUTE ON FUNCTION public.apply_card_effect(int, text, boolean) FROM PUBLIC;


-- 5. answer_question — -5 HP penalty, timeout sentinel (-1), 15-s server check
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
    v_is_timeout  boolean;
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
    -- Allow -1 as the timeout sentinel; reject all other out-of-range values
    IF p_answer_index <> -1 AND (p_answer_index < 0 OR p_answer_index >= jsonb_array_length(m.current_question_options)) THEN
        RAISE EXCEPTION 'answer_index_out_of_range' USING ERRCODE = 'P0001';
    END IF;

    v_is_p1 := (m.player1_id = v_uid);
    v_status := CASE WHEN v_is_p1 THEN m.player1_status ELSE m.player2_status END;

    -- Timeout: explicit sentinel OR server-side 15-second check
    v_is_timeout := (p_answer_index = -1)
                 OR (m.question_started_at IS NOT NULL
                     AND now() - m.question_started_at > interval '15 seconds');

    v_correct := (NOT v_is_timeout) AND (p_answer_index = m.current_correct_index);

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

    -- Effect or penalty (-5 HP for wrong/timeout)
    IF v_correct THEN
        PERFORM public.apply_card_effect(p_match_id, v_card_type, v_is_p1);
    ELSE
        IF v_is_p1 THEN
            UPDATE public.matches SET player1_hp = GREATEST(player1_hp - 5, 0) WHERE m_id = p_match_id;
        ELSE
            UPDATE public.matches SET player2_hp = GREATEST(player2_hp - 5, 0) WHERE m_id = p_match_id;
        END IF;
    END IF;

    -- Win check
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

GRANT  EXECUTE ON FUNCTION public.answer_question(int, int) TO authenticated;


-- 6. play_card — check timeout before processing
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

    -- Hard timer check before any processing
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
    v_discard := CASE WHEN v_is_p1 THEN m.player1_discard_pile ELSE m.player2_discard_pile END;

    SELECT elem INTO v_hand_entry
      FROM jsonb_array_elements(v_hand) AS elem
     WHERE (elem->>'id')::int = p_card_id
     LIMIT 1;

    IF v_hand_entry IS NULL THEN
        RAISE EXCEPTION 'card_not_in_hand' USING ERRCODE = 'P0001';
    END IF;
    v_cat := v_hand_entry->>'cat';

    SELECT type INTO v_card_type FROM public.cards WHERE card_id = p_card_id;
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

    v_correct_text := v_q.correct_answer;
    v_pool := public.shuffle_array(ARRAY[v_correct_text] || v_q.wrong_answers::text[]);

    v_rw     := COALESCE((v_status->>'rw')::int, 0);
    v_ba     := COALESCE((v_status->>'ba')::int, 0);
    v_drop_n := CASE WHEN v_rw > 0 THEN 2 WHEN v_ba > 0 THEN 1 ELSE 0 END;

    IF v_drop_n > 0 THEN
        v_correct_idx := array_position(v_pool, v_correct_text);
        SELECT array_agg(i ORDER BY random())
          INTO v_wrong_idxs
          FROM generate_series(1, array_length(v_pool, 1)) AS i
         WHERE i <> v_correct_idx;

        FOR k IN 1 .. LEAST(v_drop_n, COALESCE(array_length(v_wrong_idxs, 1), 0)) LOOP
            v_pool := v_pool[1 : v_wrong_idxs[k]-1] || v_pool[v_wrong_idxs[k]+1 :];
            FOR m_idx IN k+1 .. array_length(v_wrong_idxs, 1) LOOP
                IF v_wrong_idxs[m_idx] > v_wrong_idxs[k] THEN
                    v_wrong_idxs[m_idx] := v_wrong_idxs[m_idx] - 1;
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    v_correct_idx  := array_position(v_pool, v_correct_text);
    v_options_json := to_jsonb(v_pool);

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

GRANT  EXECUTE ON FUNCTION public.play_card(int, int) TO authenticated;


-- 7. get_match_snapshot — VOLATILE now (calls volatile check_match_timeout)
DROP FUNCTION IF EXISTS public.get_match_snapshot(int);
CREATE OR REPLACE FUNCTION public.get_match_snapshot(p_match_id int)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.check_match_timeout(p_match_id);
    RETURN public.match_snapshot(p_match_id, auth.uid());
END;
$$;

GRANT  EXECUTE ON FUNCTION public.get_match_snapshot(int) TO authenticated;


-- 8. find_match_or_queue — check timeout on reconnect
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
        -- Check hard timer before returning in_progress
        IF public.check_match_timeout(v_existing) THEN
            RETURN jsonb_build_object('status', 'match_finished')
                || public.match_snapshot(v_existing, v_uid);
        END IF;
        RETURN jsonb_build_object('status', 'match_in_progress')
            || public.match_snapshot(v_existing, v_uid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.decks WHERE id = p_deck_id AND user_id = v_uid) THEN
        RAISE EXCEPTION 'deck_not_owned_or_missing' USING ERRCODE = '42501';
    END IF;

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
        INSERT INTO public.matchmaking_queue (user_id, deck_id)
          VALUES (v_uid, p_deck_id)
          ON CONFLICT (user_id) DO UPDATE
              SET deck_id    = EXCLUDED.deck_id,
                  created_at = timezone('utc'::text, now());

        RETURN jsonb_build_object('status', 'queued', 'queued_at', now()::text);
    END IF;

    SELECT public.shuffle_array(cards) INTO v_p1_remaining
      FROM public.decks WHERE id = p_deck_id;

    SELECT public.shuffle_array(cards) INTO v_p2_remaining
      FROM public.decks WHERE id = v_opp_deck;

    IF v_p1_remaining IS NULL OR v_p2_remaining IS NULL THEN
        RAISE EXCEPTION 'deck_missing_cards' USING ERRCODE = 'P0001';
    END IF;

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

    PERFORM public.draw_cards(v_match_id, v_uid,    3);
    PERFORM public.draw_cards(v_match_id, v_opp_id, 3);
    PERFORM public.draw_cards(v_match_id, v_starter, 1);

    RETURN jsonb_build_object('status', 'match_started')
        || public.match_snapshot(v_match_id, v_uid);
END;
$$;

GRANT  EXECUTE ON FUNCTION public.find_match_or_queue(int) TO authenticated;
