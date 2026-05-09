-- =============================================================================
-- 0010 — Forum voting infrastructure (replaces missing 0002)
-- Additive only: no game-flow RPCs are touched.
-- Safe to re-run (IF NOT EXISTS / DROP IF EXISTS / CREATE OR REPLACE).
-- =============================================================================


-- =============================================================================
-- SECTION A — Schema patches on public.questions
-- =============================================================================

ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS author_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS yes_votes   integer     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS no_votes    integer     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS diff_sum    integer     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS diff_count  integer     NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS idx_questions_created_at;
CREATE INDEX idx_questions_created_at
    ON public.questions (created_at DESC);


-- =============================================================================
-- SECTION B — question_votes table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.question_votes (
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

DROP POLICY IF EXISTS questions_read      ON public.questions;
CREATE POLICY questions_read      ON public.questions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS votes_read          ON public.question_votes;
CREATE POLICY votes_read          ON public.question_votes
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS votes_self_insert   ON public.question_votes;
CREATE POLICY votes_self_insert   ON public.question_votes
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- =============================================================================
-- SECTION D — Trigger: maintain denormalised counters on public.questions
-- =============================================================================

DROP TRIGGER   IF EXISTS trg_question_votes_after_insert ON public.question_votes;
DROP FUNCTION  IF EXISTS public.question_votes_after_insert();

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
-- SECTION E.2 — RPC: add_forum_question
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
-- SECTION E.3 — RPC: submit_forum_vote
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
-- SECTION E.4 — RPC: list_forum_questions
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
-- SECTION K — Grants
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.add_forum_question(text, text, text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_forum_vote(integer, text, smallint)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_forum_questions(int, int, integer)             TO authenticated;

REVOKE ALL ON FUNCTION public.question_votes_after_insert() FROM PUBLIC;
