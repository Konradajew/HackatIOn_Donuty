-- =============================================================================
-- Donuty forum + voting — schema additions, RPCs, difficulty-scaled card effects
-- Run in Supabase SQL Editor (top-to-bottom).
-- Re-runnable via DROP-then-CREATE: every object is explicitly dropped first.
-- WARNING: re-running wipes all forum questions and votes (clean-slate design).
-- =============================================================================


-- =============================================================================
-- SECTION A — Schema patches on public.questions (forum metadata + vote counters)
-- Drop columns individually (CASCADE drops dependent indexes and the view).
-- =============================================================================

ALTER TABLE public.questions DROP COLUMN IF EXISTS author_id   CASCADE;
ALTER TABLE public.questions DROP COLUMN IF EXISTS explanation CASCADE;
ALTER TABLE public.questions DROP COLUMN IF EXISTS created_at  CASCADE;
ALTER TABLE public.questions DROP COLUMN IF EXISTS yes_votes   CASCADE;
ALTER TABLE public.questions DROP COLUMN IF EXISTS no_votes    CASCADE;
ALTER TABLE public.questions DROP COLUMN IF EXISTS diff_sum    CASCADE;
ALTER TABLE public.questions DROP COLUMN IF EXISTS diff_count  CASCADE;

ALTER TABLE public.questions
    ADD COLUMN author_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN explanation text        NOT NULL DEFAULT '',
    ADD COLUMN created_at  timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN yes_votes   integer     NOT NULL DEFAULT 0,
    ADD COLUMN no_votes    integer     NOT NULL DEFAULT 0,
    ADD COLUMN diff_sum    integer     NOT NULL DEFAULT 0,
    ADD COLUMN diff_count  integer     NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS idx_questions_eligible;
CREATE INDEX idx_questions_eligible
    ON public.questions (category) WHERE (yes_votes - no_votes) >= 50;

DROP INDEX IF EXISTS idx_questions_created_at;
CREATE INDEX idx_questions_created_at
    ON public.questions (created_at DESC);


-- =============================================================================
-- SECTION B — question_votes table (one row per user/question, atomic submit)
-- =============================================================================

DROP TABLE IF EXISTS public.question_votes CASCADE;
CREATE TABLE public.question_votes (
    question_id integer     NOT NULL REFERENCES public.questions(q_id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
    verdict     text        NOT NULL CHECK (verdict IN ('up', 'down')),
    difficulty  smallint    NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (question_id, user_id)
);

DROP INDEX IF EXISTS idx_question_votes_user;
CREATE INDEX idx_question_votes_user ON public.question_votes (user_id);


-- =============================================================================
-- SECTION C — Row Level Security
-- =============================================================================

ALTER TABLE public.questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS questions_read ON public.questions;
CREATE POLICY questions_read ON public.questions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS votes_read ON public.question_votes;
CREATE POLICY votes_read ON public.question_votes
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS votes_self_insert ON public.question_votes;
CREATE POLICY votes_self_insert ON public.question_votes
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- =============================================================================
-- SECTION D — Trigger: maintain denormalised counters on public.questions
-- =============================================================================

DROP TRIGGER IF EXISTS trg_question_votes_after_insert ON public.question_votes;
DROP FUNCTION IF EXISTS public.question_votes_after_insert();

CREATE FUNCTION public.question_votes_after_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.questions
       SET yes_votes  = yes_votes  + CASE WHEN NEW.verdict = 'up'   THEN 1 ELSE 0 END,
           no_votes   = no_votes   + CASE WHEN NEW.verdict = 'down' THEN 1 ELSE 0 END,
           diff_sum   = diff_sum   + NEW.difficulty,
           diff_count = diff_count + 1
     WHERE q_id = NEW.question_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_question_votes_after_insert
    AFTER INSERT ON public.question_votes
    FOR EACH ROW EXECUTE FUNCTION public.question_votes_after_insert();


-- =============================================================================
-- SECTION E.1 — Helper: card_effect_multiplier
-- =============================================================================

DROP FUNCTION IF EXISTS public.card_effect_multiplier(text, int);
CREATE FUNCTION public.card_effect_multiplier(p_card_type text, p_difficulty int)
RETURNS numeric
LANGUAGE sql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT CASE GREATEST(1, LEAST(5, p_difficulty))
        WHEN 1 THEN CASE p_card_type
            WHEN 'DMG'         THEN 1.00
            WHEN 'POISON'      THEN 1.00
            WHEN 'HEAL'        THEN 1.00
            WHEN 'DMG_BLOCK'   THEN 1.00
            WHEN 'HEAL_REMOVE' THEN 1.00
            WHEN 'TIME_BUFF'   THEN 1.00
            ELSE 1.00 END
        WHEN 2 THEN CASE p_card_type
            WHEN 'DMG'         THEN 1.25
            WHEN 'POISON'      THEN 1.20
            WHEN 'HEAL'        THEN 1.10
            WHEN 'DMG_BLOCK'   THEN 1.00
            WHEN 'HEAL_REMOVE' THEN 1.00
            WHEN 'TIME_BUFF'   THEN 1.00
            ELSE 1.00 END
        WHEN 3 THEN CASE p_card_type
            WHEN 'DMG'         THEN 1.50
            WHEN 'POISON'      THEN 1.40
            WHEN 'HEAL'        THEN 1.25
            WHEN 'DMG_BLOCK'   THEN 1.20
            WHEN 'HEAL_REMOVE' THEN 1.25
            WHEN 'TIME_BUFF'   THEN 1.00
            ELSE 1.00 END
        WHEN 4 THEN CASE p_card_type
            WHEN 'DMG'         THEN 1.75
            WHEN 'POISON'      THEN 1.60
            WHEN 'HEAL'        THEN 1.40
            WHEN 'DMG_BLOCK'   THEN 1.40
            WHEN 'HEAL_REMOVE' THEN 1.50
            WHEN 'TIME_BUFF'   THEN 1.25
            ELSE 1.00 END
        WHEN 5 THEN CASE p_card_type
            WHEN 'DMG'         THEN 2.00
            WHEN 'POISON'      THEN 1.80
            WHEN 'HEAL'        THEN 1.60
            WHEN 'DMG_BLOCK'   THEN 1.50
            WHEN 'HEAL_REMOVE' THEN 1.50
            WHEN 'TIME_BUFF'   THEN 1.50
            ELSE 1.00 END
        ELSE 1.00
    END;
$$;


-- =============================================================================
-- SECTION F — View: eligible_questions
-- A question becomes eligible when its net vote score (yes - no) >= 50.
-- Must be created before the RPCs that SELECT from it.
-- =============================================================================

DROP VIEW IF EXISTS public.eligible_questions;
CREATE VIEW public.eligible_questions AS
    SELECT
        q.q_id,
        q.category,
        q.title,
        q.correct_answer,
        q.wrong_answers,
        q.explanation,
        q.yes_votes,
        q.no_votes,
        CASE WHEN q.diff_count = 0 THEN 1
             ELSE GREATEST(1, LEAST(5, ROUND(q.diff_sum::numeric / q.diff_count)::int))
        END AS difficulty
    FROM public.questions q
    WHERE (q.yes_votes - q.no_votes) >= 50;


-- =============================================================================
-- SECTION E.2 — Public RPC: add_forum_question
-- =============================================================================

DROP FUNCTION IF EXISTS public.add_forum_question(text, text, text, text[], text);
CREATE FUNCTION public.add_forum_question(
    p_category    text,
    p_title       text,
    p_correct     text,
    p_wrong       text[],
    p_explanation text
)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid    uuid := auth.uid();
    v_new_id integer;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;
    IF length(trim(p_title)) < 5 OR length(trim(p_title)) > 100 THEN
        RAISE EXCEPTION 'title_length_invalid' USING ERRCODE = 'P0001';
    END IF;
    IF array_length(p_wrong, 1) IS DISTINCT FROM 3 THEN
        RAISE EXCEPTION 'wrong_answers_must_be_3' USING ERRCODE = 'P0001';
    END IF;
    IF length(p_explanation) > 1000 THEN
        RAISE EXCEPTION 'explanation_too_long' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.questions (category, title, correct_answer, wrong_answers, explanation, author_id, created_at)
    VALUES (p_category, trim(p_title), p_correct, p_wrong, trim(p_explanation), v_uid, now())
    RETURNING q_id INTO v_new_id;

    RETURN v_new_id;
END;
$$;


-- =============================================================================
-- SECTION E.3 — Public RPC: submit_forum_vote
-- PK (question_id, user_id) prevents double-voting at the DB level.
-- =============================================================================

DROP FUNCTION IF EXISTS public.submit_forum_vote(integer, text, smallint);
CREATE FUNCTION public.submit_forum_vote(
    p_question_id integer,
    p_verdict     text,
    p_difficulty  smallint
)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid uuid := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_verdict NOT IN ('up', 'down') THEN
        RAISE EXCEPTION 'invalid_verdict' USING ERRCODE = 'P0001';
    END IF;
    IF p_difficulty < 1 OR p_difficulty > 5 THEN
        RAISE EXCEPTION 'difficulty_out_of_range' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.question_votes (question_id, user_id, verdict, difficulty)
    VALUES (p_question_id, v_uid, p_verdict, p_difficulty);
END;
$$;


-- =============================================================================
-- SECTION E.4 — Public RPC: list_forum_questions
-- Returns SETOF jsonb with forum metadata, float diff_avg, voted_by_me flag.
-- =============================================================================

DROP FUNCTION IF EXISTS public.list_forum_questions(int, int, integer);
CREATE FUNCTION public.list_forum_questions(
    p_limit  int     DEFAULT 100,
    p_offset int     DEFAULT 0,
    p_q_id   integer DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_build_object(
        'q_id',            q.q_id,
        'category',        q.category,
        'title',           q.title,
        'correct_answer',  q.correct_answer,
        'wrong_answers',   to_jsonb(q.wrong_answers),
        'explanation',     q.explanation,
        'yes_votes',       q.yes_votes,
        'no_votes',        q.no_votes,
        'diff_avg',        CASE WHEN q.diff_count = 0 THEN NULL::numeric
                                ELSE ROUND(q.diff_sum::numeric / q.diff_count, 1)
                           END,
        'voted_by_me',     EXISTS (
                               SELECT 1 FROM public.question_votes v
                                WHERE v.question_id = q.q_id AND v.user_id = auth.uid()
                           ),
        'author_nickname', COALESCE(p.nickname, 'unknown'),
        'created_at',      q.created_at
    )
    FROM  public.questions q
    LEFT JOIN public.profiles p ON p.id = q.author_id
    WHERE (p_q_id IS NULL OR q.q_id = p_q_id)
    ORDER BY q.created_at DESC
    LIMIT  p_limit
    OFFSET p_offset;
$$;


-- =============================================================================
-- SECTION E.5 — Public RPC: get_game_question
-- Returns one random eligible question for the solo game demo.
-- Client shuffles answers client-side (no anti-cheat needed for solo).
-- Returns NULL if no eligible question exists for the requested category.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_game_question(text);
CREATE FUNCTION public.get_game_question(p_category text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT jsonb_build_object(
        'q_id',           q.q_id,
        'title',          q.title,
        'category',       q.category,
        'difficulty',     q.difficulty,
        'correct_answer', q.correct_answer,
        'wrong_answers',  to_jsonb(q.wrong_answers)
    )
    FROM public.eligible_questions q
    WHERE (p_category IS NULL OR q.category = p_category)
    ORDER BY random()
    LIMIT 1;
$$;


-- =============================================================================
-- SECTION G — Patch apply_card_effect: add p_difficulty, scale effects
-- Drops old 3-arg overload (int, text, boolean) and replaces with 4-arg version.
-- =============================================================================

DROP FUNCTION IF EXISTS public.apply_card_effect(int, text, boolean, int);
DROP FUNCTION IF EXISTS public.apply_card_effect(int, text, boolean);
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
    v_mult numeric;
    v_dmg  int;
    v_heal int;
    v_stk  int;
BEGIN
    v_mult := public.card_effect_multiplier(p_card_type, p_difficulty);

    IF p_caster_is_p1 THEN
        CASE p_card_type
            WHEN 'DMG' THEN
                v_dmg := CEIL(15.0 * v_mult);
                UPDATE public.matches SET player2_hp = GREATEST(player2_hp - v_dmg, 0)
                 WHERE m_id = p_match_id;
            WHEN 'HEAL' THEN
                v_heal := FLOOR(15.0 * v_mult);
                UPDATE public.matches SET player1_hp = LEAST(player1_hp + v_heal, 100)
                 WHERE m_id = p_match_id;
            WHEN 'POISON' THEN
                v_stk := CEIL(1.0 * v_mult);
                UPDATE public.matches
                   SET player2_status = jsonb_set(player2_status, '{ps}',
                           to_jsonb(COALESCE((player2_status->>'ps')::int, 0) + v_stk), true)
                 WHERE m_id = p_match_id;
            WHEN 'DMG_BLOCK' THEN
                v_dmg := CEIL(5.0 * v_mult);
                v_stk := CEIL(3.0 * v_mult);
                UPDATE public.matches
                   SET player2_hp     = GREATEST(player2_hp - v_dmg, 0),
                       player2_status = jsonb_set(player2_status, '{ba}',
                           to_jsonb(COALESCE((player2_status->>'ba')::int, 0) + v_stk), true)
                 WHERE m_id = p_match_id;
            WHEN 'HEAL_REMOVE' THEN
                v_heal := FLOOR(5.0 * v_mult);
                v_stk  := CEIL(2.0 * v_mult);
                UPDATE public.matches
                   SET player1_hp     = LEAST(player1_hp + v_heal, 100),
                       player1_status = jsonb_set(player1_status, '{rw}',
                           to_jsonb(COALESCE((player1_status->>'rw')::int, 0) + v_stk), true)
                 WHERE m_id = p_match_id;
            WHEN 'TIME_BUFF' THEN
                v_dmg  := CEIL(5.0 * v_mult);
                v_heal := FLOOR(5.0 * v_mult);
                v_stk  := CEIL(5.0 * v_mult);
                UPDATE public.matches
                   SET player2_hp     = GREATEST(player2_hp - v_dmg, 0),
                       player1_hp     = LEAST(player1_hp + v_heal, 100),
                       player1_status = jsonb_set(player1_status, '{et}',
                           to_jsonb(COALESCE((player1_status->>'et')::int, 0) + v_stk), true)
                 WHERE m_id = p_match_id;
            ELSE
                RAISE EXCEPTION 'unknown_card_type:%', p_card_type USING ERRCODE = 'P0001';
        END CASE;
    ELSE
        CASE p_card_type
            WHEN 'DMG' THEN
                v_dmg := CEIL(15.0 * v_mult);
                UPDATE public.matches SET player1_hp = GREATEST(player1_hp - v_dmg, 0)
                 WHERE m_id = p_match_id;
            WHEN 'HEAL' THEN
                v_heal := FLOOR(15.0 * v_mult);
                UPDATE public.matches SET player2_hp = LEAST(player2_hp + v_heal, 100)
                 WHERE m_id = p_match_id;
            WHEN 'POISON' THEN
                v_stk := CEIL(1.0 * v_mult);
                UPDATE public.matches
                   SET player1_status = jsonb_set(player1_status, '{ps}',
                           to_jsonb(COALESCE((player1_status->>'ps')::int, 0) + v_stk), true)
                 WHERE m_id = p_match_id;
            WHEN 'DMG_BLOCK' THEN
                v_dmg := CEIL(5.0 * v_mult);
                v_stk := CEIL(3.0 * v_mult);
                UPDATE public.matches
                   SET player1_hp     = GREATEST(player1_hp - v_dmg, 0),
                       player1_status = jsonb_set(player1_status, '{ba}',
                           to_jsonb(COALESCE((player1_status->>'ba')::int, 0) + v_stk), true)
                 WHERE m_id = p_match_id;
            WHEN 'HEAL_REMOVE' THEN
                v_heal := FLOOR(5.0 * v_mult);
                v_stk  := CEIL(2.0 * v_mult);
                UPDATE public.matches
                   SET player2_hp     = LEAST(player2_hp + v_heal, 100),
                       player2_status = jsonb_set(player2_status, '{rw}',
                           to_jsonb(COALESCE((player2_status->>'rw')::int, 0) + v_stk), true)
                 WHERE m_id = p_match_id;
            WHEN 'TIME_BUFF' THEN
                v_dmg  := CEIL(5.0 * v_mult);
                v_heal := FLOOR(5.0 * v_mult);
                v_stk  := CEIL(5.0 * v_mult);
                UPDATE public.matches
                   SET player1_hp     = GREATEST(player1_hp - v_dmg, 0),
                       player2_hp     = LEAST(player2_hp + v_heal, 100),
                       player2_status = jsonb_set(player2_status, '{et}',
                           to_jsonb(COALESCE((player2_status->>'et')::int, 0) + v_stk), true)
                 WHERE m_id = p_match_id;
            ELSE
                RAISE EXCEPTION 'unknown_card_type:%', p_card_type USING ERRCODE = 'P0001';
        END CASE;
    END IF;
END;
$$;


-- =============================================================================
-- SECTION H — Patch answer_question: look up difficulty, pass to apply_card_effect
-- =============================================================================

DROP FUNCTION IF EXISTS public.answer_question(int, int);
CREATE FUNCTION public.answer_question(p_match_id int, p_answer_index int)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid        uuid := auth.uid();
    m            public.matches%ROWTYPE;
    v_is_p1      boolean;
    v_status     jsonb;
    v_card_type  text;
    v_correct    boolean;
    v_rw         int;
    v_ba         int;
    v_p1_hp      int;
    v_p2_hp      int;
    v_winner     uuid;
    v_difficulty int;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO m FROM public.matches WHERE m_id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'match_not_found' USING ERRCODE = 'P0001'; END IF;
    IF NOT m.is_currently_played OR m.winner_id IS NOT NULL THEN
        RAISE EXCEPTION 'match_finished' USING ERRCODE = 'P0001';
    END IF;
    IF m.whose_turn <> v_uid THEN RAISE EXCEPTION 'not_your_turn' USING ERRCODE = '42501'; END IF;
    IF m.pending_card_id IS NULL OR m.current_question_options IS NULL THEN
        RAISE EXCEPTION 'no_pending_question' USING ERRCODE = 'P0001';
    END IF;
    IF p_answer_index < 0 OR p_answer_index >= jsonb_array_length(m.current_question_options) THEN
        RAISE EXCEPTION 'answer_index_out_of_range' USING ERRCODE = 'P0001';
    END IF;

    v_is_p1 := (m.player1_id = v_uid);
    v_status := CASE WHEN v_is_p1 THEN m.player1_status ELSE m.player2_status END;
    v_correct := (p_answer_index = m.current_correct_index);

    SELECT type INTO v_card_type FROM public.cards WHERE card_id = m.pending_card_id;
    IF v_card_type IS NULL THEN RAISE EXCEPTION 'pending_card_invalid' USING ERRCODE = 'P0001'; END IF;

    SELECT difficulty INTO v_difficulty
      FROM public.eligible_questions
     WHERE q_id = m.current_question_id;
    v_difficulty := COALESCE(v_difficulty, 1);

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

    IF v_correct THEN
        PERFORM public.apply_card_effect(p_match_id, v_card_type, v_is_p1, v_difficulty);
    ELSE
        IF v_is_p1 THEN
            UPDATE public.matches SET player1_hp = GREATEST(player1_hp - 10, 0) WHERE m_id = p_match_id;
        ELSE
            UPDATE public.matches SET player2_hp = GREATEST(player2_hp - 10, 0) WHERE m_id = p_match_id;
        END IF;
    END IF;

    SELECT player1_hp, player2_hp INTO v_p1_hp, v_p2_hp FROM public.matches WHERE m_id = p_match_id;

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


-- =============================================================================
-- SECTION I — Patch play_card: query eligible_questions instead of questions
-- =============================================================================

DROP FUNCTION IF EXISTS public.play_card(int, int);
CREATE FUNCTION public.play_card(p_match_id int, p_card_id int)
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
    IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;

    SELECT * INTO m FROM public.matches WHERE m_id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'match_not_found' USING ERRCODE = 'P0001'; END IF;
    IF NOT m.is_currently_played OR m.winner_id IS NOT NULL THEN
        RAISE EXCEPTION 'match_finished' USING ERRCODE = 'P0001';
    END IF;
    IF m.whose_turn <> v_uid THEN RAISE EXCEPTION 'not_your_turn' USING ERRCODE = '42501'; END IF;
    IF m.pending_card_id IS NOT NULL THEN
        RAISE EXCEPTION 'question_already_pending' USING ERRCODE = 'P0001';
    END IF;

    v_is_p1  := (m.player1_id = v_uid);
    v_hand   := CASE WHEN v_is_p1 THEN m.player1_hand   ELSE m.player2_hand   END;
    v_status := CASE WHEN v_is_p1 THEN m.player1_status ELSE m.player2_status END;
    v_discard := CASE WHEN v_is_p1 THEN m.player1_discard_pile ELSE m.player2_discard_pile END;

    SELECT elem INTO v_hand_entry
      FROM jsonb_array_elements(v_hand) AS elem
     WHERE (elem->>'id')::int = p_card_id LIMIT 1;
    IF v_hand_entry IS NULL THEN RAISE EXCEPTION 'card_not_in_hand' USING ERRCODE = 'P0001'; END IF;
    v_cat := v_hand_entry->>'cat';

    SELECT type INTO v_card_type FROM public.cards WHERE card_id = p_card_id;
    IF v_card_type IS NULL THEN RAISE EXCEPTION 'card_not_found' USING ERRCODE = 'P0001'; END IF;

    -- Eligible = net score (yes_votes - no_votes) >= 50; try category first, then any.
    SELECT q_id, title, correct_answer, wrong_answers, category
      INTO v_q FROM public.eligible_questions WHERE category = v_cat ORDER BY random() LIMIT 1;

    IF v_q.q_id IS NULL THEN
        SELECT q_id, title, correct_answer, wrong_answers, category
          INTO v_q FROM public.eligible_questions ORDER BY random() LIMIT 1;
    END IF;

    IF v_q.q_id IS NULL THEN
        RAISE EXCEPTION 'no_eligible_questions' USING ERRCODE = 'P0001';
    END IF;

    v_correct_text := v_q.correct_answer;
    v_pool := public.shuffle_array(ARRAY[v_correct_text] || v_q.wrong_answers::text[]);

    v_rw     := COALESCE((v_status->>'rw')::int, 0);
    v_ba     := COALESCE((v_status->>'ba')::int, 0);
    v_drop_n := CASE WHEN v_rw > 0 THEN 2 WHEN v_ba > 0 THEN 1 ELSE 0 END;

    IF v_drop_n > 0 THEN
        v_correct_idx := array_position(v_pool, v_correct_text);
        SELECT array_agg(i ORDER BY random()) INTO v_wrong_idxs
          FROM generate_series(1, array_length(v_pool, 1)) AS i WHERE i <> v_correct_idx;

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


-- =============================================================================
-- SECTION J — Seed: demo questions with default counters (no fake vote counts)
-- Forum/game eligibility is earned by real user votes, not seeded data.
-- =============================================================================

INSERT INTO public.questions (category, title, correct_answer, wrong_answers, explanation)
VALUES
    ('MATH', 'What is the smallest prime number greater than 100?',
     '101', ARRAY['103','107','109'],
     '101 is prime — divisible only by 1 and itself. 102 = 2·51, so 101 is the next prime after 97.'),

    ('SPCE', 'Which planet has the highest surface temperature?',
     'Venus', ARRAY['Mercury','Mars','Jupiter'],
     'Venus reaches ~465°C due to a runaway greenhouse effect — hotter than Mercury despite being farther from the Sun.'),

    ('MED', 'What is the largest organ in the human body?',
     'Skin', ARRAY['Liver','Brain','Lungs'],
     'Skin covers ~1.5–2 m² and weighs ~3.5 kg in adults — larger than any internal organ.'),

    ('MOV', 'Who directed the 2010 film "Inception"?',
     'Christopher Nolan', ARRAY['Steven Spielberg','Denis Villeneuve','James Cameron'],
     'Christopher Nolan wrote and directed Inception (2010), starring Leonardo DiCaprio.');


-- =============================================================================
-- SECTION K — Grants / revocations (mirror 0001 pattern)
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.add_forum_question(text, text, text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_forum_vote(integer, text, smallint)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_forum_questions(int, int, integer)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_question(text)                             TO authenticated;

REVOKE ALL ON FUNCTION public.card_effect_multiplier(text, int)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.question_votes_after_insert()              FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_card_effect(int, text, boolean, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.apply_card_effect(int, text, boolean, int) TO service_role;


-- =============================================================================
-- SECTION L — Realtime
-- =============================================================================

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.question_votes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
