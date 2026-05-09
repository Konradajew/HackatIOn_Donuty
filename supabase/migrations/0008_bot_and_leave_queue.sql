-- =============================================================================
-- 0008 — Bot matches + leave_queue
-- * leave_queue() — remove self from matchmaking_queue
-- * start_bot_match(p_deck_id) — instant 1v1 vs synthetic bot (player2)
-- * bot_take_turn(p_match_id) — atomic bot play+answer, called by human after answering
-- =============================================================================

-- 1. leave_queue
CREATE OR REPLACE FUNCTION public.leave_queue()
RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ DELETE FROM public.matchmaking_queue WHERE user_id = auth.uid(); $$;

REVOKE EXECUTE ON FUNCTION public.leave_queue()     FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.leave_queue()     TO authenticated;


-- 2. bot_take_turn (declared before start_bot_match which may call it)
CREATE OR REPLACE FUNCTION public.bot_take_turn(p_match_id int)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid          uuid := auth.uid();
    v_bot_uuid     uuid := '00000000-0000-0000-0000-000000000b07'::uuid;
    m              public.matches%ROWTYPE;
    v_hand         jsonb;
    v_status       jsonb;
    v_hand_entry   jsonb;
    v_card_id      int;
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
    v_is_correct   boolean;
    v_p1_hp        int;
    v_p2_hp        int;
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
        RETURN public.match_snapshot(p_match_id, v_uid);
    END IF;
    IF m.player2_id <> v_bot_uuid THEN
        RAISE EXCEPTION 'not_a_bot_match' USING ERRCODE = 'P0001';
    END IF;
    IF m.player1_id <> v_uid THEN
        RAISE EXCEPTION 'not_your_match' USING ERRCODE = '42501';
    END IF;
    IF m.whose_turn <> v_bot_uuid THEN
        -- Not bot's turn yet (human still needs to play)
        RETURN public.match_snapshot(p_match_id, v_uid);
    END IF;

    v_hand   := COALESCE(m.player2_hand, '[]'::jsonb);
    v_status := COALESCE(m.player2_status, '{}'::jsonb);

    -- Pick a random card from bot's hand
    SELECT elem INTO v_hand_entry
      FROM jsonb_array_elements(v_hand) AS elem
     ORDER BY random()
     LIMIT 1;

    IF v_hand_entry IS NULL THEN
        -- No cards in hand; just skip turn
        PERFORM public.end_turn(p_match_id);
        RETURN public.match_snapshot(p_match_id, v_uid);
    END IF;

    v_card_id := (v_hand_entry->>'id')::int;
    v_cat     := v_hand_entry->>'cat';

    SELECT type INTO v_card_type FROM public.cards WHERE card_id = v_card_id;
    IF v_card_type IS NULL THEN
        RAISE EXCEPTION 'bot_card_not_found' USING ERRCODE = 'P0001';
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

    -- Apply ba/rw option reduction (same as play_card)
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

    -- 0-based correct index after any removals
    v_correct_idx  := array_position(v_pool, v_correct_text) - 1;
    v_options_json := to_jsonb(v_pool);

    -- Decrement ba/rw for this question
    IF v_rw > 0 THEN
        v_status := jsonb_set(v_status, '{rw}', to_jsonb(v_rw - 1), true);
    ELSIF v_ba > 0 THEN
        v_status := jsonb_set(v_status, '{ba}', to_jsonb(v_ba - 1), true);
    END IF;

    -- Move card hand → discard, record question state
    UPDATE public.matches
       SET player2_hand          = public.remove_from_hand_jsonb(player2_hand, v_card_id),
           player2_discard_pile  = player2_discard_pile || ARRAY[v_card_id::smallint],
           player2_status        = v_status,
           pending_card_id          = v_card_id::smallint,
           current_question_id      = v_q.q_id,
           current_question_options = v_options_json,
           current_correct_index    = v_correct_idx::smallint,
           question_started_at      = now()
     WHERE m_id = p_match_id;

    -- Bot decision: 60% correct
    v_is_correct := (random() < 0.6);

    IF v_is_correct THEN
        PERFORM public.apply_card_effect(p_match_id, v_card_type, false); -- bot = player2
    ELSE
        UPDATE public.matches
           SET player2_hp = GREATEST(player2_hp - 5, 0)
         WHERE m_id = p_match_id;
    END IF;

    -- Clear question state
    UPDATE public.matches
       SET pending_card_id          = NULL,
           current_question_id      = NULL,
           current_question_options = NULL,
           current_correct_index    = NULL,
           question_started_at      = NULL
     WHERE m_id = p_match_id;

    -- Win check
    SELECT player1_hp, player2_hp INTO v_p1_hp, v_p2_hp
      FROM public.matches WHERE m_id = p_match_id;

    IF v_p1_hp <= 0 AND v_p2_hp <= 0 THEN
        PERFORM public.end_match(p_match_id, m.player1_id); -- caster (bot) loses on draw
    ELSIF v_p1_hp <= 0 THEN
        PERFORM public.end_match(p_match_id, v_bot_uuid);
    ELSIF v_p2_hp <= 0 THEN
        PERFORM public.end_match(p_match_id, m.player1_id);
    ELSE
        PERFORM public.end_turn(p_match_id);
    END IF;

    RETURN public.match_snapshot(p_match_id, v_uid);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bot_take_turn(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bot_take_turn(int) TO authenticated;


-- 3. start_bot_match
CREATE OR REPLACE FUNCTION public.start_bot_match(p_deck_id int)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid          uuid := auth.uid();
    v_bot_uuid     uuid := '00000000-0000-0000-0000-000000000b07'::uuid;
    v_bot_deck_id  int;
    v_p1_remaining smallint[];
    v_p2_remaining smallint[];
    v_starter      uuid;
    v_match_id     int;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.decks WHERE id = p_deck_id AND user_id = v_uid) THEN
        RAISE EXCEPTION 'deck_not_owned_or_missing' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.matches
        WHERE is_currently_played
          AND (player1_id = v_uid OR player2_id = v_uid)
    ) THEN
        RAISE EXCEPTION 'already_in_match' USING ERRCODE = 'P0001';
    END IF;

    SELECT id INTO v_bot_deck_id
      FROM public.decks WHERE user_id = v_bot_uuid ORDER BY id LIMIT 1;
    IF v_bot_deck_id IS NULL THEN
        RAISE EXCEPTION 'bot_deck_missing' USING ERRCODE = 'P0001';
    END IF;

    SELECT public.shuffle_array(cards) INTO v_p1_remaining FROM public.decks WHERE id = p_deck_id;
    SELECT public.shuffle_array(cards) INTO v_p2_remaining FROM public.decks WHERE id = v_bot_deck_id;

    v_starter := CASE WHEN random() < 0.5 THEN v_uid ELSE v_bot_uuid END;

    INSERT INTO public.matches (
        is_currently_played,
        player1_id,    player2_id,
        whose_turn,
        player1_hp,    player2_hp,
        player1_active_deck_id, player2_active_deck_id,
        player1_status, player2_status,
        player1_remaining_cards, player2_remaining_cards,
        player1_hand,  player2_hand,
        player1_discard_pile, player2_discard_pile,
        turn_started_at
    ) VALUES (
        true,
        v_uid,         v_bot_uuid,
        v_starter,
        100,           100,
        p_deck_id,     v_bot_deck_id,
        '{}'::jsonb,   '{}'::jsonb,
        v_p1_remaining, v_p2_remaining,
        '[]'::jsonb,   '[]'::jsonb,
        '{}'::smallint[], '{}'::smallint[],
        now()
    )
    RETURNING m_id INTO v_match_id;

    PERFORM public.draw_cards(v_match_id, v_uid,      3);
    PERFORM public.draw_cards(v_match_id, v_bot_uuid, 3);
    PERFORM public.draw_cards(v_match_id, v_starter,  1);

    -- If bot starts first, play its opening turn immediately
    IF v_starter = v_bot_uuid THEN
        PERFORM public.bot_take_turn(v_match_id);
    END IF;

    RETURN jsonb_build_object('status', 'bot_match_started')
        || public.match_snapshot(v_match_id, v_uid);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_bot_match(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.start_bot_match(int) TO authenticated;
