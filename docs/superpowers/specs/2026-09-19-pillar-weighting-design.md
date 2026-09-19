# Pillar weighting

## Context

The Settings page has a "Pillar weighting" placeholder card: "Give some
pillars more influence than others on overall scores to match your club
or coaching ethos," marked "Coming soon." This turns it into a real
feature.

This is only safe to build now because of a prior piece of work: every
"overall score" calculation in the app (7 places - Rankings, Home,
Session Dashboard, Player Profile, Report page, the "improved since
last session" comparison, and the Excel export) was just consolidated
into one shared module, `src/lib/pillar-scoring.ts`, which currently
hardcodes equal weighting. This feature adds real weights to that one
place, and every consumer inherits it automatically.

## Goals

- A coach can set how much each of the 5 pillars (Technical, Physical,
  Tactical, Psychological, Social) counts toward "overall score."
- A team that never touches this looks and behaves exactly as today
  (equal weighting) - zero risk to existing users who don't opt in.
- Every screen that shows an "overall" score reflects the current
  weights immediately and consistently - no screen lags behind another.

## Non-goals

- No historical snapshotting. "Overall score" has never been stored
  anywhere - every screen already computes it live from raw ratings
  each time it loads, and that stays true here. If a coach changes
  weights, past sessions' displayed numbers can shift too, exactly as
  they always have when the underlying calculation changes (verified
  during the recent consolidation: this happened with zero visible
  effect on real data, since the two prior methods already agreed).
  The written report text (summary, strengths, priorities) never
  changes regardless of weighting - only the numeric score display can.
- No requirement that weights sum to 100. Confirmed mathematically
  equivalent to a "must sum to 100%" scheme (dividing by the sum of
  raw weights *is* normalizing to 100% - see "Weighting model" below) -
  skipping the sum constraint only changes the interaction, not the
  result, and avoids sliders that fight each other to stay balanced.
- No per-pillar weighting per age band, per player, or per session -
  one set of weights per team, used everywhere.

## Weighting model

Each pillar gets an integer weight from 1 ("Normal") to 5 ("Top
priority"), defaulting to 1 for every pillar. Overall score is a
weighted average across whichever pillars actually have data for that
player/session:

```
overall = (w1×p1 + w2×p2 + ... ) / (w1 + w2 + ...)
```

summed only over pillars present in the input (missing pillars are
skipped entirely, same as today). All weights equal to 1 reduces
exactly to today's plain average - existing behavior is a special case
of this formula, not a separate code path.

## Data model

One new nullable column, `pillar_weights jsonb`, added to `public.teams`
via a new migration (`supabase/migrations/0012_pillar_weighting.sql`).
`null` (every existing team's current value) means "use weight 1 for
every pillar" - identical to today. When set, it holds an object like
`{"technical": 3, "physical": 1, "tactical": 2, "psychological": 1,
"social": 1}`; any pillar missing from the object defaults to 1.

## Shared function changes

Both exports of `src/lib/pillar-scoring.ts` gain an optional second
parameter:

- `computeOverallFromRawScores(scoresByPillar, weights?)`
- `computeOverallFromPillarAverages(pillarAverages, weights?)`

`weights` is `Record<string, number> | null | undefined`. Omitted, or a
missing key for a given pillar, means weight 1 for that pillar -
existing call sites that don't pass `weights` keep compiling and
behaving exactly as before, so introducing the parameter itself is a
non-breaking change to the two functions.

## Threading

The same pattern already used for `sessionDate` and `clubLogoUrl`: each
of the 7 call sites already fetches its team row for other reasons
(age band, name, club logo). Each adds `pillar_weights` to that
existing query and passes it into its `computeOverallFrom*` call - one
extra column selected, one extra argument passed, no new queries.

## Settings UI

The placeholder Card becomes a real component
(`src/components/settings/pillar-weighting-card.tsx`): five sliders (1-5
each, labeled Normal/Higher/High/Very high/Top priority), a Save
button, and a "Reset to equal weighting" button that sets all five back
to 1. Loading/error states follow the established pattern (disabled
button with "Saving..." text, `toast.error` on failure) used by the
Export Data and Club Logo cards.

## Error handling

- Save fails (network, validation): `toast.error`, weights stay
  unchanged in the UI (no optimistic update - this isn't a
  frequently-repeated action like a rating, so a plain await-then-toast
  is appropriate, matching the Export Data card's pattern rather than
  the assessment form's retry-queue pattern).
- A `pillar_weights` value missing a pillar key, or with an
  out-of-range number: the shared functions treat a missing key as 1
  (already specified above); an out-of-range value is prevented at the
  UI layer (the slider itself can't produce anything outside 1-5) and
  isn't defensively re-validated server-side, consistent with how this
  project already trusts its own generated inputs elsewhere.

## Testing / verification

- Set custom weights, confirm all 7 consuming screens (Rankings, Home,
  Session Dashboard, Player Profile, Report page - both the current
  score and the "improved since last session" comparison, Squad
  Rankings export tab, Session Overall Scores export tab) shift
  consistently and by the expected amount for at least one real player.
- Reset to equal weighting, confirm all 7 screens return to their
  pre-change numbers.
- Confirm a team that never opens this Settings card (fresh
  `pillar_weights = null`) sees no change anywhere before or after this
  feature ships.
