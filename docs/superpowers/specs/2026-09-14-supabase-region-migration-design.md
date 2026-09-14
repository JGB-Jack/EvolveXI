# Supabase region migration: EU West → North America

## Context

Production navigation (tapping bottom-nav buttons) consistently takes 1-2
seconds to show new content, uniformly across every destination page
regardless of how much data that page fetches. This was root-caused to a
region mismatch: Vercel's serverless functions run in North America, while
the Supabase project (database + auth) runs in EU West. Every navigation
makes at least one server-side call to Supabase (the middleware's auth
check, at minimum), and each of those calls pays a transatlantic round trip.

An earlier fix (deduplicating redundant `auth.getUser()` calls across
middleware/layout/page via `React.cache()`) reduced the *number* of calls
per navigation but did not fix the underlying per-call latency, and made no
noticeable difference - confirming the region gap itself, not call count, is
the dominant cost.

Two ways to close the gap: move Vercel's functions to EU West (requires
Vercel Pro, ~$20/month, to select a non-default region), or move Supabase to
North America (stays on free tier, requires migrating the database). The
user chose the database migration to stay on free tiers, given this is
still a small beta (a few real coaches using it so far, not the full
24-coach cohort).

## Goals

- Move the app's database + auth to a Supabase project in a North
  America region, matching Vercel's function region.
- Preserve all existing data: teams, players, sessions, assessments,
  reports, and coach login accounts (auth users).
- Cut over with a short, controlled downtime window (acceptable now,
  per the user - only a few real coaches are using the app currently).
- Keep a safe rollback path in case anything goes wrong post-cutover.

## Non-goals

- No schema changes as part of this migration - the new project ends up
  with exactly the schema the 11 existing migration files describe.
- No changes to app code, RLS policies, or business logic.
- Not attempting a zero-downtime migration - a brief window where the
  app is unusable during cutover is accepted.

## Approach

Postgres-level dump and restore, run locally by the user via `npx
supabase` (no permanent install needed - downloads on demand, using the
Node.js already installed for the dev server). This is Supabase's own
documented approach for moving a project between regions, and is the
only approach that correctly carries over `auth.users` (coach login
credentials) - it operates below Supabase's Auth API, directly on the
underlying Postgres data, so password hashes remain valid without any
user needing to reset their password.

This is intentionally not scripted from the assistant's own sandboxed
environment - it doesn't have `psql`/`pg_dump` available, and even if it
did, running commands there would mean putting the database password
into the conversation. Running it locally keeps the password on the
user's own machine, typed directly into the command, never shared.

### Steps

1. **User** creates a new Supabase project via the dashboard, selecting
   **"East US (North Virginia)"** as the region - Supabase's closest
   offered region to Vercel's default Hobby-plan function region
   (Washington, D.C.).
2. **Assistant** applies the schema to the new project by running the 11
   existing migration files (`supabase/migrations/*.sql`) against it in
   order, via the new project's SQL Editor - reconstructing the schema
   from source rather than relying on a schema dump, since the
   migrations are already the versioned source of truth.
3. **User** runs a `pg_dump` (data-only, `public` + `auth` schemas) from
   the old project piped into `psql` against the new project, using a
   command the assistant provides with connection strings left as
   placeholders for the user to fill in locally.
4. **User** updates `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel's project settings and in
   local `.env.local`, then redeploys.
5. **Both** verify: log in with an existing coach account, confirm a
   team's players/sessions/reports are present and correct, generate a
   report to confirm the app is fully functional end to end.
6. **Safety net**: the old EU West project is left running, untouched,
   for a few days after cutover. Rolling back is just reverting the two
   env vars and redeploying - no data operation needed, since nothing
   was deleted from the old project.

## Data flow (before / after)

**Before:** Vercel (North America) ↔ Supabase (EU West) - every
navigation's middleware/layout/page auth and data calls cross the
Atlantic.

**After:** Vercel (North America) ↔ Supabase (North America) - same
calls, same code, all within one region.

## Risks and mitigations

- **Risk:** a coach uses the app mid-migration and their new data isn't
  in the old project's dump. *Mitigation:* the dump happens as close to
  the env var swap as practical; accepted brief downtime window reduces
  this window further.
- **Risk:** `pg_dump`/`psql` command has a typo or connection issue.
  *Mitigation:* schema is applied first and independently verified
  before the data step runs, so a failed data step doesn't leave the new
  project in an inconsistent state - it can simply be re-run.
- **Risk:** something is subtly broken post-cutover and isn't caught
  during verification. *Mitigation:* old project kept alive as an
  instant rollback for several days.

## Testing / verification

- After schema step: confirm the new project's table list matches the
  old project's (via each dashboard's Table Editor).
- After data step: spot-check row counts for a few tables (teams,
  players, sessions) match between old and new projects.
- After env var swap: log in as an existing coach, view a squad, view a
  report, generate a new report - confirms auth, reads, and the AI
  pipeline all work against the new project.
