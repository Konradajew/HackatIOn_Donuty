-- =============================================================================
-- 0015 — Forum list filters: server-side category / search / sort + smaller default page
-- =============================================================================
-- Adds p_category, p_search, p_sort_mode parameters to list_forum_questions.
-- p_limit default stays at 100 so existing unparameterized callers (older
-- clients still on main) keep their previous behaviour until they upgrade.
--
-- Why: with ~7500 rows in `questions`, client-side filtering on a single 100-row
-- batch missed most of the corpus (a category filter could yield 0 hits while
-- hundreds existed in DB). All filtering and sorting now happens in SQL.
-- Existing indexes idx_questions_category and idx_questions_created_at cover
-- the common access paths; ILIKE search runs seq-scan but is fine at this scale.
-- =============================================================================

DROP FUNCTION IF EXISTS public.list_forum_questions(int, int, integer);
DROP FUNCTION IF EXISTS public.list_forum_questions(int, int, integer, text, text);
DROP FUNCTION IF EXISTS public.list_forum_questions(int, int, integer, text, text, text);

CREATE FUNCTION public.list_forum_questions(
    p_limit     int     DEFAULT 100,
    p_offset    int     DEFAULT 0,
    p_q_id      integer DEFAULT NULL,
    p_category  text    DEFAULT NULL,
    p_search    text    DEFAULT NULL,
    p_sort_mode text    DEFAULT 'NEW'
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
    WHERE (p_q_id     IS NULL OR q.q_id = p_q_id)
      AND (p_category IS NULL OR q.category::text = p_category)
      AND (p_search   IS NULL OR q.title ILIKE '%' || p_search || '%'
                              OR COALESCE(p.nickname, '') ILIKE '%' || p_search || '%')
    ORDER BY
        CASE WHEN p_sort_mode = 'TOP' THEN (q.yes_votes - q.no_votes) END DESC NULLS LAST,
        q.created_at DESC
    LIMIT  p_limit
    OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION
    public.list_forum_questions(int, int, integer, text, text, text)
    TO authenticated;
