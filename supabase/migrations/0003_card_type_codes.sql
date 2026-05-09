UPDATE public.cards SET type = CASE type
  WHEN 'damage'   THEN 'DMG'
  WHEN 'heal'     THEN 'HEAL'
  WHEN 'poison'   THEN 'POISON'
  WHEN 'sabotage' THEN 'DMG_BLOCK'
  WHEN '50/50'    THEN 'HEAL_REMOVE'
  WHEN 'time'     THEN 'TIME_BUFF'
  ELSE type
END;

ALTER TABLE public.cards
  ADD CONSTRAINT cards_type_check
  CHECK (type IN ('DMG','HEAL','POISON','DMG_BLOCK','HEAL_REMOVE','TIME_BUFF'));
