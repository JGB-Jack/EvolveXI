alter table public.players
  add column gender text check (gender in ('male', 'female'));
