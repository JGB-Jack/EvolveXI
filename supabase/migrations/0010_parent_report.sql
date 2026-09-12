-- Parent-friendly report: shares the coach report's summary, pillar
-- narratives, and strengths, but pairs each development priority with a
-- self-practice suggestion (something the player can do alone, away from
-- training) instead of a coach drill, and has no "training focus" note -
-- that's coach planning, not something a parent needs. Cleared whenever
-- the main report is regenerated, so it can never reference stale
-- priorities from before a score correction.
alter table public.reports
  add column parent_generated_text text,
  add column parent_edited_text text;
