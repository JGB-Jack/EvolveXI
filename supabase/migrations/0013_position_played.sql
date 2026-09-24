-- Position played: the position a player is playing in one specific
-- session, so a coach can assess a defender who played in goal with the
-- goalkeeper questions without changing their permanent position.
-- Existing rows are backfilled from the player's current usual position,
-- which is exactly what those sessions were already using.

alter table public.session_players
  add column position_played text;

update public.session_players sp
set position_played = p.primary_position
from public.players p
where sp.player_id = p.id;

alter table public.session_players
  alter column position_played set not null,
  add constraint session_players_position_played_check
    check (position_played in ('defence', 'midfield', 'attack', 'goalkeeper'));
