-- Phase 6: AI report generation.
--
-- generated_text/edited_text hold the report content as JSON (summary,
-- per-pillar narratives, strengths, priorities, training focus) rather
-- than plain prose, so the coach can edit individual sections rather
-- than one big block of text.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  generated_text text not null,
  edited_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, player_id)
);

alter table public.reports enable row level security;

create policy "Coaches manage their own reports"
  on public.reports for all
  using (
    session_id in (
      select id from public.sessions
      where team_id in (select id from public.teams where coach_id = auth.uid())
    )
  )
  with check (
    session_id in (
      select id from public.sessions
      where team_id in (select id from public.teams where coach_id = auth.uid())
    )
  );
