-- Phase 3: squad management.

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  dob date,
  primary_position text not null check (
    primary_position in ('defence', 'midfield', 'attack', 'goalkeeper')
  ),
  secondary_position text check (
    secondary_position in ('defence', 'midfield', 'attack', 'goalkeeper')
  ),
  squad_number int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "Coaches manage their own players"
  on public.players for all
  using (team_id in (select id from public.teams where coach_id = auth.uid()))
  with check (team_id in (select id from public.teams where coach_id = auth.uid()));
