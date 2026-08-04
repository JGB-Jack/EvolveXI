-- Phase 5: assessment form (ratings, pillar notes, standout moment).
--
-- The PRD's schema sketch puts "pillar_notes" directly on the assessments
-- (per-question) table, but a pillar note is really one value per
-- (session, player, pillar) - not per question - so it lives in its own
-- table here to avoid duplicating the same text across every question row
-- in that pillar. Standout moment is one value per (session, player), so
-- it's added directly to session_players rather than a new table.

alter table public.session_players
  add column standout_moment text,
  add column completed_at timestamptz;

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  question_id uuid not null references public.team_questions (id) on delete cascade,
  score int not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, player_id, question_id)
);

create table public.assessment_pillar_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  pillar_id text not null references public.pillars (id),
  notes text,
  updated_at timestamptz not null default now(),
  unique (session_id, player_id, pillar_id)
);

alter table public.assessments enable row level security;
alter table public.assessment_pillar_notes enable row level security;

create policy "Coaches manage their own assessments"
  on public.assessments for all
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

create policy "Coaches manage their own assessment pillar notes"
  on public.assessment_pillar_notes for all
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
