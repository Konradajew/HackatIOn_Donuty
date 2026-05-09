DROP TRIGGER  IF EXISTS tr_randomize_match_turn ON public.matches;
DROP FUNCTION IF EXISTS public.randomize_match_turn();
DROP FUNCTION IF EXISTS public.join_game(int);
DROP FUNCTION IF EXISTS public.submit_answer(int,int);
DROP FUNCTION IF EXISTS public.jsonb_remove_card(jsonb,int);
DROP FUNCTION IF EXISTS public.array_remove_one(smallint[], smallint);
