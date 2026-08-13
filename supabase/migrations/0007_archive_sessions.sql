-- Soft-delete for sessions, matching the player archive pattern: hide from
-- the list rather than a hard cascading delete (sessions cascade-delete
-- ratings, notes, and AI reports for every player in them).
alter table public.sessions
  add column archived_at timestamptz;
