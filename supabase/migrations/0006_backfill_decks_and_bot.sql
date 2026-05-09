-- Drop FK so we can insert a synthetic bot profile not tied to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Bot profile (synthetic UUID, no auth.users entry)
INSERT INTO public.profiles (id, nickname)
VALUES ('00000000-0000-0000-0000-000000000b07'::uuid, 'BOT')
ON CONFLICT (id) DO NOTHING;

-- Deck for bot
INSERT INTO public.decks (user_id, deck_number, cards)
SELECT '00000000-0000-0000-0000-000000000b07'::uuid, 1, '{1,2,3,4,5,6,1,2,3,4}'::int2[]
WHERE NOT EXISTS (
  SELECT 1 FROM public.decks d WHERE d.user_id = '00000000-0000-0000-0000-000000000b07'::uuid
);

-- Backfill existing profiles that have no deck
INSERT INTO public.decks (user_id, deck_number, cards)
SELECT p.id, 1, '{1,2,3,4,5,6,1,2,3,4}'::int2[]
  FROM public.profiles p
 WHERE NOT EXISTS (SELECT 1 FROM public.decks d WHERE d.user_id = p.id);
