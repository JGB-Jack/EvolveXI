-- Pillar weighting: lets a coach make one pillar (technical, physical,
-- tactical, psychological, social) count more than another toward
-- "overall score". Null means "use weight 1 for every pillar" -
-- identical to today's plain average - so every existing team is
-- completely unaffected until a coach opens Settings and changes this.

alter table public.teams
  add column pillar_weights jsonb;
