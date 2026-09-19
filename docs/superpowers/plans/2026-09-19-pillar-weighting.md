# Pillar Weighting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach set a 1-5 importance weight for each of the 5 pillars in Settings, so every "overall score" in the app (Rankings, Home, Session Dashboard, Player Profile, Report page, its "improved since last session" comparison, and the Excel export) reflects that weighting instead of a flat equal-weight average.

**Architecture:** One new nullable `pillar_weights jsonb` column on `teams`. Both exported functions in the already-existing shared module `src/lib/pillar-scoring.ts` gain an optional `weights` parameter (missing pillar or omitted argument = weight 1, so every existing call site keeps compiling and behaving exactly as before). Every one of the 7 screens that currently calls one of those two functions is updated to fetch `pillar_weights` alongside the team data it already fetches, and pass it through. A new Server Action saves weights from a new Settings card built with plain HTML range sliders (this project has no slider UI primitive yet).

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Supabase (Postgres + `@supabase/ssr`), no ORM/generated types (rows are accessed untyped, matching the rest of this codebase), Tailwind for styling, `sonner` for toasts. No automated test runner is configured in this project (`package.json` has no `test` script, no jest/vitest) — verification throughout this plan is `npm run build` (TypeScript + Next.js build, which this project treats as its correctness gate) plus manual checks in the dev server, matching how every other feature this project has shipped was verified.

**Spec:** `docs/superpowers/specs/2026-09-19-pillar-weighting-design.md`

## Global Constraints

- Weight values are always integers 1-5. 1 = "Normal" (today's default), 5 = "Top priority".
- A missing pillar key in a `pillar_weights` object, or `pillar_weights` being `null`/`undefined` entirely, means weight 1 for that pillar — this must hold in the shared functions themselves, not just at call sites.
- No historical snapshotting: every screen already computes "overall" live on every load, and must keep doing so — weights are read fresh, never cached or frozen per-session.
- No requirement that weights sum to 100 — each pillar's weight is independent.
- One set of weights per team, used identically on every screen and by every player/session — no per-player, per-session, or per-age-band overrides.
- Follow this codebase's existing conventions: Server Components fetch their own data with `getCurrentUser()` + `createClient()`; Server Actions live in `src/lib/actions/*.ts` with a leading `"use server"`; client components doing a save wrap the action call in `withTimeout(...)` and use `sonner`'s `toast.error`/`toast.success`; nested/joined Supabase rows are narrowed with an inline `as unknown as { ... }` cast where the codebase already does this (report page's `team` cast), but plain top-level columns (like `club_logo_url` today) are used directly with no cast needed since this project's Supabase client has no generated `Database` type and returns rows untyped.

---

### Task 1: Add the `pillar_weights` column

**Files:**
- Create: `supabase/migrations/0012_pillar_weighting.sql`

**Interfaces:**
- Produces: `public.teams.pillar_weights` — nullable `jsonb` column. `null` = every pillar weight 1 (today's behavior). When set, an object like `{"technical": 3, "physical": 1, "tactical": 2, "psychological": 1, "social": 1}`.

- [ ] **Step 1: Create the migration file**

```sql
-- Pillar weighting: lets a coach make one pillar (technical, physical,
-- tactical, psychological, social) count more than another toward
-- "overall score". Null means "use weight 1 for every pillar" -
-- identical to today's plain average - so every existing team is
-- completely unaffected until a coach opens Settings and changes this.

alter table public.teams
  add column pillar_weights jsonb;
```

- [ ] **Step 2: Run this migration yourself in Supabase**

This is the one manual step only you can do (an AI assistant can't run SQL against your live database):

1. Open your Supabase project dashboard in a browser.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Paste in exactly the SQL from Step 1 above (just the `alter table ...` statement, not the `--` comment lines if you don't want them, though they're harmless to include).
5. Click **Run** (or press Ctrl+Enter).
6. You should see "Success. No rows returned." If you see an error instead, stop and share the exact error message before continuing to Task 2.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0012_pillar_weighting.sql
git commit -m "Add pillar_weights column to teams" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Add optional weighting to the shared scoring functions

**Files:**
- Modify: `src/lib/pillar-scoring.ts`

**Interfaces:**
- Produces: `computeOverallFromRawScores(scoresByPillar: Record<string, number[]>, weights?: Record<string, number> | null): PillarScoreResult`
- Produces: `computeOverallFromPillarAverages(pillarAverages: Record<string, number | null | undefined>, weights?: Record<string, number> | null): number | null`
- Both existing exports keep their exact current names and existing first parameter — this task only appends an optional second parameter, so every call site not yet updated (all of them, before later tasks run) keeps compiling with no changes.

- [ ] **Step 1: Replace the file's full contents**

Current full contents of `src/lib/pillar-scoring.ts` today:

```ts
// The single place "overall score" is calculated, so every screen agrees
// on the same number. Currently always equal-weighted (every pillar with
// at least one score counts the same toward the overall) - this is also
// where future pillar weighting would plug in, as an optional weights
// argument, without touching any of the 6+ places that call this.

export type PillarScoreResult = {
  pillarAverages: Record<string, number | null>;
  overall: number | null;
};

// For callers holding raw, ungrouped scores per pillar (e.g. every
// question's score for a session).
export function computeOverallFromRawScores(
  scoresByPillar: Record<string, number[]>,
): PillarScoreResult {
  const pillarAverages: Record<string, number | null> = {};
  for (const [pillarId, scores] of Object.entries(scoresByPillar)) {
    pillarAverages[pillarId] =
      scores.length > 0 ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;
  }
  return { pillarAverages, overall: computeOverallFromPillarAverages(pillarAverages) };
}

// For callers that already have one average per pillar (not raw scores)
// and just need them combined the same way everywhere else does.
export function computeOverallFromPillarAverages(
  pillarAverages: Record<string, number | null | undefined>,
): number | null {
  const present = Object.values(pillarAverages).filter(
    (v): v is number => v !== null && v !== undefined,
  );
  return present.length > 0
    ? present.reduce((sum, v) => sum + v, 0) / present.length
    : null;
}
```

Replace it with:

```ts
// The single place "overall score" is calculated, so every screen agrees
// on the same number. `weights` is optional everywhere - omitted, null,
// or missing a given pillar's key all mean weight 1 for that pillar, so
// a team that has never set custom weights (pillar_weights = null) gets
// exactly today's plain average.

export type PillarScoreResult = {
  pillarAverages: Record<string, number | null>;
  overall: number | null;
};

// For callers holding raw, ungrouped scores per pillar (e.g. every
// question's score for a session).
export function computeOverallFromRawScores(
  scoresByPillar: Record<string, number[]>,
  weights?: Record<string, number> | null,
): PillarScoreResult {
  const pillarAverages: Record<string, number | null> = {};
  for (const [pillarId, scores] of Object.entries(scoresByPillar)) {
    pillarAverages[pillarId] =
      scores.length > 0 ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;
  }
  return {
    pillarAverages,
    overall: computeOverallFromPillarAverages(pillarAverages, weights),
  };
}

// For callers that already have one average per pillar (not raw scores)
// and just need them combined the same way everywhere else does.
export function computeOverallFromPillarAverages(
  pillarAverages: Record<string, number | null | undefined>,
  weights?: Record<string, number> | null,
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const [pillarId, value] of Object.entries(pillarAverages)) {
    if (value === null || value === undefined) continue;
    const weight = weights?.[pillarId] ?? 1;
    weightedSum += value * weight;
    weightTotal += weight;
  }
  return weightTotal > 0 ? weightedSum / weightTotal : null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no new errors (every existing call site omits the new second parameter, which is allowed).

- [ ] **Step 3: Commit**

```bash
git add src/lib/pillar-scoring.ts
git commit -m "Add optional weights parameter to shared scoring functions" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Thread weights through the Home page

**Files:**
- Modify: `src/app/(dashboard)/home/page.tsx`

**Interfaces:**
- Consumes: `computeOverallFromPillarAverages(pillarAverages, weights?)` from Task 2.

- [ ] **Step 1: Add `pillar_weights` to the existing team query**

In `src/app/(dashboard)/home/page.tsx`, find:

```ts
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, age_band, latest_insight, latest_insight_generated_at")
    .eq("coach_id", user!.id)
    .single();
```

Change the `.select(...)` line to:

```ts
    .select(
      "id, name, age_band, latest_insight, latest_insight_generated_at, pillar_weights",
    )
```

- [ ] **Step 2: Pass the weights into the existing `computeOverallFromPillarAverages` call**

Find:

```ts
    squadAverage = computeOverallFromPillarAverages(
      Object.fromEntries(
        Array.from(totalsByPillar.entries()).map(([pillarId, { sum, count }]) => [
          pillarId,
          sum / count,
        ]),
      ),
    );
```

Change it to:

```ts
    squadAverage = computeOverallFromPillarAverages(
      Object.fromEntries(
        Array.from(totalsByPillar.entries()).map(([pillarId, { sum, count }]) => [
          pillarId,
          sum / count,
        ]),
      ),
      team?.pillar_weights,
    );
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/home/page.tsx"
git commit -m "Thread pillar weights through the Home page" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Thread weights through the Rankings page

**Files:**
- Modify: `src/app/(dashboard)/rankings/page.tsx`

**Interfaces:**
- Consumes: `computeOverallFromPillarAverages(pillarAverages, weights?)` from Task 2.

- [ ] **Step 1: Add `pillar_weights` to the existing team query**

Find:

```ts
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("coach_id", user.id)
    .single();
```

Change the `.select(...)` line to:

```ts
    .select("id, pillar_weights")
```

- [ ] **Step 2: Pass the weights into the existing `computeOverallFromPillarAverages` call**

Find:

```ts
    const overall = computeOverallFromPillarAverages(pillarAverages) ?? 0;
```

Change it to:

```ts
    const overall = computeOverallFromPillarAverages(pillarAverages, team.pillar_weights) ?? 0;
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/rankings/page.tsx"
git commit -m "Thread pillar weights through the Rankings page" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Thread weights through the Session Dashboard page

This is the one page with no existing team query at all, so it needs a brand-new one (unlike every other task in this plan, which just adds a column to a query that's already there).

**Files:**
- Modify: `src/app/(dashboard)/sessions/[id]/dashboard/page.tsx`

**Interfaces:**
- Consumes: `computeOverallFromRawScores(scoresByPillar, weights?)` from Task 2.

- [ ] **Step 1: Add `team_id` to the existing `sessions` query**

Find:

```ts
  const { data: session } = await supabase
    .from("sessions")
    .select("id, date, type, opponent")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();
```

Change the `.select(...)` line to:

```ts
    .select("id, date, type, opponent, team_id")
```

- [ ] **Step 2: Add a new query for the team's weights, right after the `notFound()` check**

Immediately after `if (!session) notFound();`, add:

```ts

  const { data: team } = await supabase
    .from("teams")
    .select("pillar_weights")
    .eq("id", session.team_id)
    .single();
```

- [ ] **Step 3: Pass the weights into the existing `computeOverallFromRawScores` call**

Find:

```ts
    const { pillarAverages, overall } = computeOverallFromRawScores(scoresByPillar);
```

Change it to:

```ts
    const { pillarAverages, overall } = computeOverallFromRawScores(
      scoresByPillar,
      team?.pillar_weights,
    );
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/sessions/[id]/dashboard/page.tsx"
git commit -m "Thread pillar weights through the Session Dashboard page" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Thread weights through the Report page and its "previous session" comparison

**Files:**
- Modify: `src/lib/data/previous-session-score.ts`
- Modify: `src/app/(dashboard)/sessions/[id]/report/[playerId]/page.tsx`

**Interfaces:**
- Consumes: `computeOverallFromRawScores(scoresByPillar, weights?)` from Task 2.
- Produces: `getPreviousSessionOverall(supabase, teamId, playerId, excludeSessionId, weights?): Promise<number | null>` — same name, same first four parameters, one new optional trailing parameter.

- [ ] **Step 1: Add an optional `weights` parameter to `getPreviousSessionOverall`**

In `src/lib/data/previous-session-score.ts`, find:

```ts
export async function getPreviousSessionOverall(
  supabase: SupabaseClient,
  teamId: string,
  playerId: string,
  excludeSessionId: string,
): Promise<number | null> {
```

Change it to:

```ts
export async function getPreviousSessionOverall(
  supabase: SupabaseClient,
  teamId: string,
  playerId: string,
  excludeSessionId: string,
  weights?: Record<string, number> | null,
): Promise<number | null> {
```

- [ ] **Step 2: Pass `weights` into the function's own `computeOverallFromRawScores` call**

Find (the last line of the function):

```ts
  return computeOverallFromRawScores(scoresByPillar).overall;
```

Change it to:

```ts
  return computeOverallFromRawScores(scoresByPillar, weights).overall;
```

- [ ] **Step 3: Add `pillar_weights` to the report page's nested team select**

In `src/app/(dashboard)/sessions/[id]/report/[playerId]/page.tsx`, find:

```ts
  const { data: session } = await supabase
    .from("sessions")
    .select("id, date, type, opponent, team_id, teams(age_band, club_logo_url)")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();
  const team = session.teams as unknown as
    | { age_band: string; club_logo_url: string | null }
    | null;
```

Change it to:

```ts
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, date, type, opponent, team_id, teams(age_band, club_logo_url, pillar_weights)",
    )
    .eq("id", sessionId)
    .single();
  if (!session) notFound();
  const team = session.teams as unknown as
    | {
        age_band: string;
        club_logo_url: string | null;
        pillar_weights: Record<string, number> | null;
      }
    | null;
```

- [ ] **Step 4: Pass the weights into this page's own `computeOverallFromRawScores` call**

Find:

```ts
  const { pillarAverages: rawPillarAverages, overall: sessionOverall } =
    computeOverallFromRawScores(scoresByPillar);
```

Change it to:

```ts
  const { pillarAverages: rawPillarAverages, overall: sessionOverall } =
    computeOverallFromRawScores(scoresByPillar, team?.pillar_weights);
```

- [ ] **Step 5: Pass the weights into the `getPreviousSessionOverall` call**

Find:

```ts
  const previousSessionOverall = await getPreviousSessionOverall(
    supabase,
    session.team_id,
    playerId,
    sessionId,
  );
```

Change it to:

```ts
  const previousSessionOverall = await getPreviousSessionOverall(
    supabase,
    session.team_id,
    playerId,
    sessionId,
    team?.pillar_weights,
  );
```

- [ ] **Step 6: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/data/previous-session-score.ts "src/app/(dashboard)/sessions/[id]/report/[playerId]/page.tsx"
git commit -m "Thread pillar weights through the Report page" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Thread weights through the Player Profile page

Like Task 5, this page has no existing team query, so it needs a new one.

**Files:**
- Modify: `src/app/(dashboard)/squad/player/[id]/profile/page.tsx`

**Interfaces:**
- Consumes: `computeOverallFromPillarAverages(pillarAverages, weights?)` from Task 2.

- [ ] **Step 1: Add a new team query, right after the existing player lookup**

Find:

```ts
  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (!player) notFound();
```

Change it to:

```ts
  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (!player) notFound();

  const { data: team } = await supabase
    .from("teams")
    .select("pillar_weights")
    .eq("id", player.team_id)
    .single();
```

- [ ] **Step 2: Pass the weights into the existing `computeOverallFromPillarAverages` call**

Find:

```ts
  const overall = computeOverallFromPillarAverages(
    Object.fromEntries(pillarAverages.map((p) => [p.pillarId, p.score])),
  );
```

Change it to:

```ts
  const overall = computeOverallFromPillarAverages(
    Object.fromEntries(pillarAverages.map((p) => [p.pillarId, p.score])),
    team?.pillar_weights,
  );
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/squad/player/[id]/profile/page.tsx"
git commit -m "Thread pillar weights through the Player Profile page" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Thread weights through the Export Data action

**Files:**
- Modify: `src/lib/actions/export.ts`

**Interfaces:**
- Consumes: `computeOverallFromRawScores(scoresByPillar, weights?)` and `computeOverallFromPillarAverages(pillarAverages, weights?)` from Task 2.

- [ ] **Step 1: Add `pillar_weights` to the existing team query**

Find:

```ts
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("coach_id", user.id)
    .single();
  if (!team) return { error: "Couldn't find your team." };
```

Change the `.select(...)` line to:

```ts
    .select("id, pillar_weights")
```

- [ ] **Step 2: Pass the weights into the "Session Overall Scores" tab's calculation**

Find:

```ts
    overallScore:
      Math.round(
        (computeOverallFromRawScores(scoresByPillar).overall ?? 0) * 100,
      ) / 100,
```

Change it to:

```ts
    overallScore:
      Math.round(
        (computeOverallFromRawScores(scoresByPillar, team.pillar_weights).overall ?? 0) *
          100,
      ) / 100,
```

- [ ] **Step 3: Pass the weights into the "Squad Rankings" tab's calculation**

Find:

```ts
      const overall =
        Math.round((computeOverallFromPillarAverages(pillarAverages) ?? 0) * 100) / 100;
```

Change it to:

```ts
      const overall =
        Math.round(
          (computeOverallFromPillarAverages(pillarAverages, team.pillar_weights) ?? 0) *
            100,
        ) / 100;
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/export.ts
git commit -m "Thread pillar weights through the Export Data action" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Server Action to save pillar weights

**Files:**
- Create: `src/lib/actions/pillar-weights.ts`

**Interfaces:**
- Produces: `savePillarWeights(weights: Record<string, number>): Promise<{ error: string } | { success: true }>` — a `"use server"` action, following the exact same shape as `saveClubLogoUrl` in `src/lib/actions/club-logo.ts`.

- [ ] **Step 1: Create the action file**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function savePillarWeights(
  weights: Record<string, number>,
): Promise<{ error: string } | { success: true }> {
  const {
    data: { user },
  } = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ pillar_weights: weights })
    .eq("coach_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/pillar-weights.ts
git commit -m "Add savePillarWeights server action" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Pillar weighting Settings card

Replaces the "Coming soon" placeholder Card in Settings with a real card: 5 sliders (1-5, labeled Normal/Higher/High/Very high/Top priority), a Save button, and a "Reset to equal weighting" button. This project has no slider UI primitive yet, so this uses a plain styled `<input type="range">`.

**Files:**
- Create: `src/components/settings/pillar-weighting-card.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`

**Interfaces:**
- Consumes: `savePillarWeights(weights)` from Task 9.
- Produces: `PillarWeightingCard({ initialWeights }: { initialWeights: Record<string, number> | null })` — a client component with no other props (the action itself resolves the current coach's team server-side, same as `ClubLogoCard`'s `removeClubLogo`/`saveClubLogoUrl` calls do).

- [ ] **Step 1: Create the card component**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { savePillarWeights } from "@/lib/actions/pillar-weights";
import { withTimeout } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const PILLAR_ORDER = ["technical", "physical", "tactical", "psychological", "social"];
const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};
const WEIGHT_LABEL: Record<number, string> = {
  1: "Normal",
  2: "Higher",
  3: "High",
  4: "Very high",
  5: "Top priority",
};
const EQUAL_WEIGHTS: Record<string, number> = {
  technical: 1,
  physical: 1,
  tactical: 1,
  psychological: 1,
  social: 1,
};

export function PillarWeightingCard({
  initialWeights,
}: {
  initialWeights: Record<string, number> | null;
}) {
  const [weights, setWeights] = useState<Record<string, number>>({
    ...EQUAL_WEIGHTS,
    ...initialWeights,
  });
  const [busy, setBusy] = useState(false);

  async function handleSave(next: Record<string, number>) {
    setBusy(true);
    try {
      const result = await withTimeout(savePillarWeights(next), 15000);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setWeights(next);
      toast.success("Pillar weighting saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-b-2 border-b-primary">
      <CardHeader>
        <CardTitle>Pillar weighting</CardTitle>
        <CardDescription>
          Give some pillars more influence than others on overall scores
          to match your club or coaching ethos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {PILLAR_ORDER.map((pillarId) => (
          <div key={pillarId} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{PILLAR_NAME[pillarId]}</span>
              <span className="text-muted-foreground">
                {WEIGHT_LABEL[weights[pillarId]]}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={weights[pillarId]}
              disabled={busy}
              onChange={(e) =>
                setWeights((prev) => ({
                  ...prev,
                  [pillarId]: Number(e.target.value),
                }))
              }
              className="w-full accent-primary"
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => handleSave(weights)}>
            {busy ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => handleSave(EQUAL_WEIGHTS)}
          >
            Reset to equal weighting
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Add `pillar_weights` to the Settings page's team query**

In `src/app/(dashboard)/settings/page.tsx`, find:

```ts
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, age_band, club_logo_url")
    .eq("coach_id", user.id)
    .single();
  if (!team) redirect("/onboarding/team");
```

Change the `.select(...)` line to:

```ts
    .select("id, name, age_band, club_logo_url, pillar_weights")
```

- [ ] **Step 3: Import the new component**

Find:

```ts
import { ExportDataCard } from "@/components/settings/export-data-card";
```

Add a new import line directly after it:

```ts
import { PillarWeightingCard } from "@/components/settings/pillar-weighting-card";
```

- [ ] **Step 4: Replace the placeholder Card**

Find:

```tsx
      <Card className="border-b-2 border-b-primary opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Pillar weighting</CardTitle>
            <CardDescription>
              Give some pillars more influence than others on overall
              scores to match your club or coaching ethos.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>
```

Change it to:

```tsx
      <PillarWeightingCard initialWeights={team.pillar_weights} />
```

- [ ] **Step 5: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no new errors.

- [ ] **Step 6: Start the dev server and manually verify**

1. Start the dev server (`npm run dev`) and open Settings on your phone or the Browser tool.
2. Confirm the "Pillar weighting" card shows 5 sliders, all starting at "Normal", with Save and "Reset to equal weighting" buttons — no more "Coming soon" badge.
3. Drag one slider (e.g. Technical) up to "Top priority" and click Save. Confirm a success toast appears.
4. Go to Rankings, Home, a player's Profile, a Session Dashboard, and that player's Report (both the current score and the "improved since last session" line) and confirm the score has shifted on every one of them compared to before — Technical now counts more everywhere, not just on one screen.
5. On Settings, use "Export Data" and open the downloaded file's "Session Overall Scores" and "Squad Rankings" tabs — confirm those numbers reflect the new weighting too.
6. Go back to Settings, click "Reset to equal weighting", confirm all 5 sliders return to "Normal" and a success toast appears.
7. Re-check the same screens from steps 4-5 and confirm every score returned to its original value.
8. Reload the Settings page entirely (not just client-side navigation) and confirm the sliders still show whatever was last saved — proving the value round-trips through the database, not just local state.

- [ ] **Step 7: Commit**

```bash
git add src/components/settings/pillar-weighting-card.tsx "src/app/(dashboard)/settings/page.tsx"
git commit -m "Add pillar weighting Settings card" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
