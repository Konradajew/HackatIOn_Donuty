-- ============================================================
-- 0009: starter-deck trigger, deck CRUD RPCs, concede_match
-- ============================================================

-- 1. Unique index so upsert_deck ON CONFLICT works
CREATE UNIQUE INDEX IF NOT EXISTS decks_user_deck_number_uidx
  ON public.decks (user_id, deck_number);

-- 2. selected_deck_id on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_deck_id int REFERENCES public.decks(id) ON DELETE SET NULL;

-- 3. Trigger: auto-create starter deck when a profile row is inserted
CREATE OR REPLACE FUNCTION public.create_starter_deck()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.decks (user_id, deck_number, cards)
  VALUES (NEW.id, 1, '{1,2,3,4,5,6,1,2,3,4}'::int2[])
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_create_starter_deck ON public.profiles;
CREATE TRIGGER trg_create_starter_deck
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_starter_deck();

-- 4. Backfill any profiles that still have no deck
INSERT INTO public.decks (user_id, deck_number, cards)
SELECT p.id, 1, '{1,2,3,4,5,6,1,2,3,4}'::int2[]
  FROM public.profiles p
 WHERE NOT EXISTS (SELECT 1 FROM public.decks d WHERE d.user_id = p.id)
    AND p.id <> '00000000-0000-0000-0000-000000000b07'::uuid;

-- 5. list_my_decks() — returns all decks for the calling user
CREATE OR REPLACE FUNCTION public.list_my_decks()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_selected int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT selected_deck_id INTO v_selected FROM public.profiles WHERE id = v_uid;
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id',          d.id,
        'deck_number', d.deck_number,
        'cards',       d.cards,
        'is_selected', d.id = v_selected
      ) ORDER BY d.deck_number
    )
    FROM public.decks d WHERE d.user_id = v_uid
  );
END $$;
GRANT EXECUTE ON FUNCTION public.list_my_decks() TO authenticated;

-- 6. upsert_deck(p_deck_number, p_cards) — create or replace a numbered deck slot
CREATE OR REPLACE FUNCTION public.upsert_deck(p_deck_number int, p_cards int2[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  int;
  v_card int2;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF p_deck_number NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'deck_number_out_of_range' USING ERRCODE = '22003';
  END IF;
  IF array_length(p_cards, 1) IS DISTINCT FROM 10 THEN
    RAISE EXCEPTION 'deck_must_have_10_cards' USING ERRCODE = '22003';
  END IF;
  FOREACH v_card IN ARRAY p_cards LOOP
    IF v_card NOT BETWEEN 1 AND 6 THEN
      RAISE EXCEPTION 'invalid_card_id' USING ERRCODE = '22003';
    END IF;
  END LOOP;

  INSERT INTO public.decks (user_id, deck_number, cards)
  VALUES (v_uid, p_deck_number, p_cards)
  ON CONFLICT (user_id, deck_number) DO UPDATE SET cards = EXCLUDED.cards
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.upsert_deck(int, int2[]) TO authenticated;

-- 7. delete_deck(p_deck_id) — remove a deck the caller owns
CREATE OR REPLACE FUNCTION public.delete_deck(p_deck_id int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.decks WHERE id = p_deck_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'deck_not_found' USING ERRCODE = '42501';
  END IF;
  -- Clear selected_deck_id if it pointed here
  UPDATE public.profiles SET selected_deck_id = NULL
   WHERE id = v_uid AND selected_deck_id = p_deck_id;
  DELETE FROM public.decks WHERE id = p_deck_id AND user_id = v_uid;
END $$;
GRANT EXECUTE ON FUNCTION public.delete_deck(int) TO authenticated;

-- 8. set_active_deck(p_deck_id) — choose which deck is used in matches
CREATE OR REPLACE FUNCTION public.set_active_deck(p_deck_id int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.decks WHERE id = p_deck_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'deck_not_found' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET selected_deck_id = p_deck_id WHERE id = v_uid;
END $$;
GRANT EXECUTE ON FUNCTION public.set_active_deck(int) TO authenticated;

-- 9. concede_match(p_match_id) — forfeit a live match; opponent wins
CREATE OR REPLACE FUNCTION public.concede_match(p_match_id int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  m       public.matches%ROWTYPE;
  v_uid   uuid := auth.uid();
  v_winner uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;

  SELECT * INTO m FROM public.matches WHERE m_id = p_match_id FOR UPDATE;

  -- If match not found or already finished, just return the snapshot (idempotent)
  IF NOT FOUND OR NOT m.is_currently_played THEN
    RETURN public.match_snapshot(p_match_id, v_uid);
  END IF;

  IF v_uid NOT IN (m.player1_id, m.player2_id) THEN
    RAISE EXCEPTION 'not_your_match' USING ERRCODE = '42501';
  END IF;

  v_winner := CASE WHEN v_uid = m.player1_id THEN m.player2_id ELSE m.player1_id END;
  PERFORM public.end_match(p_match_id, v_winner);

  RETURN public.match_snapshot(p_match_id, v_uid);
END $$;
GRANT EXECUTE ON FUNCTION public.concede_match(int) TO authenticated;
