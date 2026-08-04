-- Phase 4: session creation (details, pillar selection, player selection).

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  date date not null,
  type text not null check (type in ('Match', 'Training', 'Monthly Review')),
  opponent text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.session_pillars (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  pillar_id text not null references public.pillars (id),
  unique (session_id, pillar_id)
);

create table public.session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  unique (session_id, player_id)
);

alter table public.sessions enable row level security;
alter table public.session_pillars enable row level security;
alter table public.session_players enable row level security;

create policy "Coaches manage their own sessions"
  on public.sessions for all
  using (team_id in (select id from public.teams where coach_id = auth.uid()))
  with check (team_id in (select id from public.teams where coach_id = auth.uid()));

create policy "Coaches manage their own session pillars"
  on public.session_pillars for all
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

create policy "Coaches manage their own session players"
  on public.session_players for all
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
