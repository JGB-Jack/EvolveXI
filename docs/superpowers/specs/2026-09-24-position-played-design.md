# Position played per session

## Context

Youth players change position often. Today a player has one fixed
`primary_position` on the `players` table, and every assessment uses it
to decide which position-specific questions appear. A coach who plays a
defender in goal for one match currently has to either assess them with
defender questions or edit their permanent position (which then affects
every other screen).

This feature lets the coach choose the position each player plays **in a
given session**, defaulting to their usual position, and makes that
per-session position drive the assessment.

## Goals

- When creating a session, the coach can set the position each selected
  player is playing, defaulting to their usual position.
- That position decides which position-specific questions the player gets
  in that session (Technical/Tactical variants for every positional age
  band, plus the goalkeeper Physical set).
- Everything session-specific (completeness check, AI report, report
  page/PDF, export session tabs) reflects the position played, not the
  usual position.
- Existing sessions keep working exactly as they do today.

## Non-goals

- No changing a player's position after the session has been created.
  Position-specific questions differ, so switching after answering would
  strand scores on questions that no longer appear. The position is fixed
  at session setup.
- No change to scoring, weighting, rankings or the season trend. Scores
  stay 1-5 averaged per pillar. Known, accepted limitation: a player's
  Technical score as a goalkeeper and as a defender come from different
  questions, so they share a scale but are not strictly like-for-like.
- No change to a player's usual (`primary_position`) position, the squad
  page, player profile, Rankings, or the export's Players tab. Rankings
  blends several sessions, so the usual position remains the sensible
  label there.
- No secondary-position suggestions in the picker.

## Data model

New column `session_players.position_played` (`text`, `not null`,
check constraint limiting it to `defence`, `midfield`, `attack`,
`goalkeeper` - the same four values `players.primary_position` uses).
Migration `supabase/migrations/0013_position_played.sql`:

1. Add the column as nullable.
2. Backfill every existing row from the linked player's current
   `primary_position`.
3. Set it `not null` and add the check constraint.

After this, every reader can use `position_played` directly with no
fallback logic. Existing sessions look identical to today because the
backfill copies the value they were already using.

Deployment note: the migration must be run in Supabase before the code
that reads the column is deployed, otherwise session pages would error.

## Setting the position (session setup)

- `SessionWizardState` gains `playerPositions: Record<string, string>`
  (player id to position). It holds only overrides the coach has chosen.
- `PlayerSelectionForm` shows a position dropdown on each ticked player's
  row, defaulting to their usual position, for teams in a positional age
  band (everything from U10-U11 up). The row's click-to-toggle behaviour
  must not fire when using the dropdown.
- For U6-U7 and U8-U9 the dropdown is hidden: those bands give every
  player the shared outfield questions regardless of position, so the
  picker would change nothing. The session records the player's usual
  position.
- `sessions/new/players/page.tsx` also fetches the team's `age_band` and
  passes it to the form.
- `createSession` receives the positions and inserts `position_played`
  for every `session_players` row. Server-side it falls back to the
  player's usual position for any player without a chosen position and for
  non-positional age bands, and rejects values outside the four allowed.

## Where the position played is used

Each of these already selects the session's player rows, so they add
`position_played` to the existing select:

- `sessions/[id]/assess/[playerId]/page.tsx`: question variant selection
  uses `position_played`, and the header shows it.
- `lib/data/session-questions.ts` callers (`lib/actions/reports.ts`
  `generateReport`, and the report page): the "every question answered"
  check uses `position_played`.
- `lib/actions/reports.ts`: the position passed to the AI report (coach
  and parent versions) is `position_played`.
- Report page and `report-view.tsx` (title line and PDF position label):
  display `position_played`. (The session dashboard does not display a
  position anywhere today, so it needs no change.)
- Export (`lib/actions/export.ts` and `export-data-card.tsx`): the
  Sessions & Ratings and Session Overall Scores tabs gain a "Position
  played" column. The Players tab keeps the usual position.

Unchanged: squad list, player profile, Rankings, `latest-form.ts`,
player add/edit form.

## Error handling

- An invalid position value is rejected by both the server action and the
  database check constraint.
- A `position_played` that somehow does not match a known position falls
  through to the same variant selection as today's non-goalkeeper branch
  (shared + outfield + the value), so nothing crashes.

## Testing / verification

No automated test suite exists; verification is `npm run build` plus manual
checks:

- U10-U11+ team: create a session, set an outfield player to goalkeeper.
  Their assessment shows the goalkeeper Physical questions and no
  outfield-only ones; the report's answered-all check and AI report use
  goalkeeper.
- Set a goalkeeper to midfield: they get midfield Technical/Tactical and
  outfield Physical questions.
- U6-U7 / U8-U9 team: no position dropdown appears.
- An existing (pre-feature) session opens, assesses, reports and shows on
  the dashboard exactly as before.
- Export: the session tabs show the "Position played" column; the Players
  tab is unchanged.
- Rankings, squad and player profile are unchanged.
