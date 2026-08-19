-- One AI-generated squad-wide coaching tip per team, regenerated each time
-- a session is completed (see completeSession) rather than on every Home
-- page view, so it stays cheap and doesn't add AI latency to page loads.
alter table public.teams
  add column latest_insight text,
  add column latest_insight_generated_at timestamptz;
