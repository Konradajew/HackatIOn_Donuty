-- =============================================================================
-- 0013 — Difficulty-based card effect scaling + difficulty exposed in snapshot
-- * effect_tier: maps 1-2★→1, 3-4★→2, 5★→3
-- * apply_card_effect: scaled per tier (DMG 12/15/20, HEAL 10/12/15, etc.)
-- * answer_question: looks up difficulty, uses tier-based et consumption
-- * match_snapshot: exposes difficulty in current_question
-- =============================================================================


-- 1. Tier helper
CREATE OR REPLACE FUNCTION public.effect_tier(p_difficulty int)
RETURNS int LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_difficulty, 1) <= 2 THEN 1   -- 1-2★
    WHEN COALESCE(p_difficulty, 1) <= 4 THEN 2   -- 3-4★
    ELSE                                   3     -- 5★
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.effect_tier(int) FROM PUBLIC;


-- 2. apply_card_effect — difficulty-scaled (signature change requires DROP first)
DROP FUNCTION IF EXISTS public.apply_card_effect(int, text, boolean);
DROP FUNCTION IF EXISTS public.apply_card_effect(int, text, boolean, int);
CREATE FUNCTION public.apply_card_effect(
    p_match_id     int,
    p_card_type    text,
    p_caster_is_p1 boolean,
    p_difficulty   int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tier int := public.effect_tier(p_difficulty);
    v_dmg  int := CASE v_tier WHEN 1 THEN 12 WHEN 2 THEN 15 ELSE 20 END;
    v_heal int := CASE v_tier WHEN 1 THEN 10 WHEN 2 THEN 12 ELSE 15 END;
    v_ps   int := CASE v_tier WHEN 1 THEN  1 WHEN 2 THEN  1 ELSE  2 END;
    v_ba   int := CASE v_tier WHEN 1 THEN  2 WHEN 2 THEN  3 ELSE  4 END;
    v_rw   int := CASE v_tier WHEN 1 THEN  1 WHEN 2 THEN  2 ELSE  3 END;
    v_et   int := CASE v_tier WHEN 1 THEN  3 WHEN 2 THEN  5 ELSE  7 END;
BEGIN
    IF p_caster_is_p1 THEN
        CASE p_card_type
            WHEN 'DMG' THEN
                UPDATE public.matches
                   SET player2_hp = GREATEST(player2_hp - v_dmg, 0)
                 WHERE m_id = p_match_id;

            WHEN 'HEAL' THEN
                UPDATE public.matches
                   SET player1_hp = LEAST(player1_hp + v_heal, 100)
                 WHERE m_id = p_match_id;

            WHEN 'POISON' THEN
                UPDATE public.matches
                   SET player2_status = jsonb_set(player2_status, '{ps}',
                       to_jsonb(COALESCE((player2_status->>'ps')::int, 0) + v_ps), true)
                 WHERE m_id = p_match_id;

            WHEN 'DMG_BLOCK' THEN
                UPDATE public.matches
                   SET player2_hp     = GREATEST(player2_hp - 5, 0),
                       player2_status = jsonb_set(player2_status, '{ba}',
                           to_jsonb(COALESCE((player2_status->>'ba')::int, 0) + v_ba), true)
                 WHERE m_id = p_match_id;

            WHEN 'HEAL_REMOVE' THEN
                UPDATE public.matches
                   SET player1_hp     = LEAST(player1_hp + 5, 100),
                       player1_status = jsonb_set(player1_status, '{rw}',
                           to_jsonb(COALESCE((player1_status->>'rw')::int, 0) + v_rw), true)
                 WHERE m_id = p_match_id;

            WHEN 'TIME_BUFF' THEN
                UPDATE public.matches
                   SET player2_hp     = GREATEST(player2_hp - 5, 0),
                       player1_hp     = LEAST(player1_hp + 5, 100),
                       player1_status = jsonb_set(player1_status, '{et}',
                           to_jsonb(COALESCE((player1_status->>'et')::int, 0) + v_et), true)
                 WHERE m_id = p_match_id;

            ELSE
                RAISE EXCEPTION 'unknown_card_type:%', p_card_type USING ERRCODE = 'P0001';
        END CASE;
    ELSE
        CASE p_card_type
            WHEN 'DMG' THEN
                UPDATE public.matches
                   SET player1_hp = GREATEST(player1_hp - v_dmg, 0)
                 WHERE m_id = p_match_id;

            WHEN 'HEAL' THEN
                UPDATE public.matches
                   SET player2_hp = LEAST(player2_hp + v_heal, 100)
                 WHERE m_id = p_match_id;

            WHEN 'POISON' THEN
                UPDATE public.matches
                   SET player1_status = jsonb_set(player1_status, '{ps}',
                       to_jsonb(COALESCE((player1_status->>'ps')::int, 0) + v_ps), true)
                 WHERE m_id = p_match_id;

            WHEN 'DMG_BLOCK' THEN
                UPDATE public.matches
                   SET player1_hp     = GREATEST(player1_hp - 5, 0),
                       player1_status = jsonb_set(player1_status, '{ba}',
                           to_jsonb(COALESCE((player1_status->>'ba')::int, 0) + v_ba), true)
                 WHERE m_id = p_match_id;

            WHEN 'HEAL_REMOVE' THEN
                UPDATE public.matches
                   SET player2_hp     = LEAST(player2_hp + 5, 100),
                       player2_status = jsonb_set(player2_status, '{rw}',
                           to_jsonb(COALESCE((player2_status->>'rw')::int, 0) + v_rw), true)
                 WHERE m_id = p_match_id;

            WHEN 'TIME_BUFF' THEN
                UPDATE public.matches
                   SET player1_hp     = GREATEST(player1_hp - 5, 0),
                       player2_hp     = LEAST(player2_hp + 5, 100),
                       player2_status = jsonb_set(player2_status, '{et}',
                           to_jsonb(COALESCE((player2_status->>'et')::int, 0) + v_et), true)
                 WHERE m_id = p_match_id;

            ELSE
                RAISE EXCEPTION 'unknown_card_type:%', p_card_type USING ERRCODE = 'P0001';
        END CASE;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_card_effect(int, text, boolean, int) FROM PUBLIC;


-- 3. answer_question — pass difficulty to apply_card_effect, tier-based et consumption
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
    v_et_consumed int;
    v_difficulty  int;
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

    -- Fetch question difficulty (1-5 star average, default 1 when unvoted)
    SELECT GREATEST(1, LEAST(5, ROUND(diff_sum::numeric / NULLIF(diff_count, 0))::int))
      INTO v_difficulty
      FROM public.questions
     WHERE q_id = m.current_question_id;
    v_difficulty := COALESCE(v_difficulty, 1);

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

    -- Consume et stack — tier-scaled to match what was granted
    v_et_consumed := CASE public.effect_tier(v_difficulty) WHEN 1 THEN 3 WHEN 2 THEN 5 ELSE 7 END;
    IF v_et > 0 THEN
        v_status := jsonb_set(v_status, '{et}', to_jsonb(GREATEST(0, v_et - v_et_consumed)), true);
    END IF;

    IF v_is_p1 THEN
        UPDATE public.matches SET player1_status = v_status WHERE m_id = p_match_id;
    ELSE
        UPDATE public.matches SET player2_status = v_status WHERE m_id = p_match_id;
    END IF;

    -- Apply card effect on correct answer, or -5 HP penalty on wrong/timeout
    IF v_correct THEN
        PERFORM public.apply_card_effect(p_match_id, v_card_type, v_is_p1, v_difficulty);
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


-- 4. match_snapshot — add difficulty field to current_question
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
                    'difficulty',    NULL,
                    'blackout_idx',  NULL,
                    'disabled_idxs', NULL)
            ELSE
                jsonb_build_object(
                    'q_id',          q.q_id,
                    'title',         q.title,
                    'options',       m.current_question_options,
                    'category',      q.category::text,
                    'difficulty',    GREATEST(1, LEAST(5, ROUND(q.diff_sum::numeric / NULLIF(q.diff_count, 0))::int)),
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
