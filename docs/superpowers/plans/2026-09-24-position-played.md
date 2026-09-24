# Position Played Per Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach choose the position each player plays in a given session (defaulting to their usual position), and make that per-session position drive the assessment questions, completeness check, AI report, report page/PDF, and export session tabs.

**Architecture:** One new `session_players.position_played` column (backfilled from each player's usual position, then `not null`). The session-setup screen collects a position per ticked player (positional age bands only) and `createSession` stores it. Each reader that today uses `players.primary_position` for session-specific behaviour switches to the session's `position_played`. Squad, player profile, Rankings and the export's Players tab keep the usual position.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Supabase (Postgres, untyped client), Tailwind, the project's `@base-ui/react`-based `Select` component. No automated test runner exists (`package.json` has no test script) - verification is `npm run build` plus manual checks.

**Spec:** `docs/superpowers/specs/2026-09-24-position-played-design.md`

## Global Constraints

- Allowed positions are exactly `defence`, `midfield`, `attack`, `goalkeeper` (the same four values `players.primary_position` uses).
- The position is fixed at session setup - no UI to change it afterwards.
- Age bands `U6-U7` and `U8-U9` are non-positional: no position dropdown, and the session records each player's usual position.
- Scoring, weighting, rankings and the season trend are unchanged.
- Squad list, player profile, Rankings, `latest-form.ts`, the player add/edit form, and the export's Players tab keep using `players.primary_position`.
- The session dashboard and the parent report do not display or use a position today - they need no change.
- Deployment order: the migration must be run in Supabase BEFORE the code is pushed. Between running the SQL and the new code going live (roughly a minute or two), creating a NEW session in production will fail with an error, because the old code does not supply the new required column. This is expected and brief.
- All commits are local only (`git commit`, never `git push`) - the user pushes by explicitly asking in chat.

---

### Task 1: Add the `position_played` column

**Files:**
- Create: `supabase/migrations/0013_position_played.sql`

**Interfaces:**
- Produces: `public.session_players.position_played` - `text not null`, constrained to `defence | midfield | attack | goalkeeper`, backfilled for every existing row.

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Run this migration yourself in Supabase (only you can do this)**

Do this immediately before the code is pushed:

1. Open your Supabase project dashboard in a browser.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Paste in the SQL from Step 1 (the `--` comment lines are optional).
5. Click **Run** (or press Ctrl+Enter).
6. You should see "Success. No rows returned." If you see an error, stop and share the exact message.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0013_position_played.sql
git commit -m "Add position_played column to session_players" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `createSession` stores the position played

**Files:**
- Modify: `src/lib/actions/sessions.ts`

**Interfaces:**
- Produces: `CreateSessionInput` gains `playerPositions: Record<string, string>` (player id to chosen position; may be empty or partial). `createSession(teamId, input)` keeps its signature and return type. Server-side: for a player with no chosen position, or on a non-positional age band, the player's usual `primary_position` is stored.

- [ ] **Step 1: Add the new input field and the valid-positions constant**

Find:

```ts
export type CreateSessionInput = {
  date: string;
  type: string;
  opponent: string;
  notes: string;
  pillarIds: string[];
  playerIds: string[];
};
```

Change it to:

```ts
export type CreateSessionInput = {
  date: string;
  type: string;
  opponent: string;
  notes: string;
  pillarIds: string[];
  playerIds: string[];
  playerPositions: Record<string, string>;
};

const VALID_POSITIONS = ["defence", "midfield", "attack", "goalkeeper"];
const NON_POSITIONAL_AGE_BANDS = ["U6-U7", "U8-U9"];
```

- [ ] **Step 2: Work out and validate each player's position BEFORE the session row is created**

Find:

```ts
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
```

Change it to:

```ts
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("age_band")
    .eq("id", teamId)
    .single();
  const isPositionalBand = !NON_POSITIONAL_AGE_BANDS.includes(
    team?.age_band ?? "",
  );

  const { data: playerRows } = await supabase
    .from("players")
    .select("id, primary_position")
    .eq("team_id", teamId)
    .in("id", input.playerIds);
  const usualPosition = new Map(
    (playerRows ?? []).map((p) => [p.id as string, p.primary_position as string]),
  );

  const positionByPlayer = new Map<string, string>();
  for (const playerId of input.playerIds) {
    const chosen = input.playerPositions?.[playerId];
    const position =
      isPositionalBand && chosen ? chosen : usualPosition.get(playerId);
    if (!position || !VALID_POSITIONS.includes(position)) {
      return { error: "One of the selected players has an invalid position." };
    }
    positionByPlayer.set(playerId, position);
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
```

- [ ] **Step 3: Insert `position_played` with each session player**

Find:

```ts
    .insert(
      input.playerIds.map((playerId) => ({
        session_id: session.id,
        player_id: playerId,
      })),
    );
```

Change it to:

```ts
    .insert(
      input.playerIds.map((playerId) => ({
        session_id: session.id,
        player_id: playerId,
        position_played: positionByPlayer.get(playerId),
      })),
    );
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run build`
Expected: this will fail with a type error in `src/components/sessions/player-selection-form.tsx` (its `createSession` call is missing the new required `playerPositions` field). That is expected and is fixed in Task 3. Confirm the ONLY error is that one, then continue to Task 3 before committing.

---

### Task 3: Session setup screen with a position dropdown

**Files:**
- Modify: `src/components/sessions/session-wizard-context.tsx`
- Modify: `src/app/(dashboard)/sessions/new/players/page.tsx`
- Modify: `src/components/sessions/player-selection-form.tsx`

**Interfaces:**
- Consumes: `CreateSessionInput.playerPositions` from Task 2.
- Produces: `SessionWizardState.playerPositions: Record<string, string>`; `PlayerSelectionForm` props gain `ageBand: string`.

- [ ] **Step 1: Add `playerPositions` to the wizard state**

In `src/components/sessions/session-wizard-context.tsx`, find:

```ts
  pillarIds: string[];
  playerIds: string[];
};

const DEFAULT_STATE: SessionWizardState = {
```

Change it to:

```ts
  pillarIds: string[];
  playerIds: string[];
  playerPositions: Record<string, string>;
};

const DEFAULT_STATE: SessionWizardState = {
```

Then find:

```ts
  pillarIds: [],
  playerIds: [],
};

type SessionWizardContextValue = {
```

Change it to:

```ts
  pillarIds: [],
  playerIds: [],
  playerPositions: {},
};

type SessionWizardContextValue = {
```

- [ ] **Step 2: Pass the team's age band into the form**

In `src/app/(dashboard)/sessions/new/players/page.tsx`, find:

```ts
    .select("id")
    .eq("coach_id", user.id)
    .single();
```

Change the select to:

```ts
    .select("id, age_band")
    .eq("coach_id", user.id)
    .single();
```

Then find:

```tsx
      <PlayerSelectionForm teamId={team.id} players={players ?? []} />
```

Change it to:

```tsx
      <PlayerSelectionForm
        teamId={team.id}
        ageBand={team.age_band}
        players={players ?? []}
      />
```

- [ ] **Step 3: Update the selection form (imports, props, constants)**

In `src/components/sessions/player-selection-form.tsx`, find:

```ts
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/player-avatar";
```

Change it to:

```ts
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerAvatar } from "@/components/player-avatar";

const NON_POSITIONAL_AGE_BANDS = ["U6-U7", "U8-U9"];
```

Then find:

```ts
export function PlayerSelectionForm({
  teamId,
  players,
}: {
  teamId: string;
  players: SquadPlayer[];
}) {
```

Change it to:

```ts
export function PlayerSelectionForm({
  teamId,
  ageBand,
  players,
}: {
  teamId: string;
  ageBand: string;
  players: SquadPlayer[];
}) {
```

Then find:

```ts
  const [saving, setSaving] = useState(false);

  function selectAll() {
```

Change it to:

```ts
  const [saving, setSaving] = useState(false);
  const showPositionPicker = !NON_POSITIONAL_AGE_BANDS.includes(ageBand);

  function setPosition(playerId: string, position: string) {
    update({
      playerPositions: { ...state.playerPositions, [playerId]: position },
    });
  }

  function selectAll() {
```

- [ ] **Step 4: Send the chosen positions when the session is created**

Find:

```ts
          pillarIds: state.pillarIds,
          playerIds: state.playerIds,
        }),
```

Change it to:

```ts
          pillarIds: state.pillarIds,
          playerIds: state.playerIds,
          playerPositions: state.playerPositions,
        }),
```

- [ ] **Step 5: Show the dropdown on ticked players' rows**

Find:

```tsx
              <span className="flex-1">
                {player.first_name} {player.last_name}
              </span>
              <span className="text-sm text-muted-foreground">
                {POSITION_LABEL[player.primary_position]}
              </span>
            </div>
```

Change it to:

```tsx
              <span className="flex-1">
                {player.first_name} {player.last_name}
              </span>
              {checked && showPositionPicker ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={
                      state.playerPositions[player.id] ?? player.primary_position
                    }
                    onValueChange={(v) =>
                      setPosition(player.id, v ?? player.primary_position)
                    }
                  >
                    <SelectTrigger size="sm" className="w-32">
                      <SelectValue>
                        {
                          POSITION_LABEL[
                            state.playerPositions[player.id] ??
                              player.primary_position
                          ]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(POSITION_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {POSITION_LABEL[player.primary_position]}
                </span>
              )}
            </div>
```

- [ ] **Step 6: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no errors (this also clears the Task 2 error).

- [ ] **Step 7: Commit Tasks 2 and 3 together**

```bash
git add src/lib/actions/sessions.ts src/components/sessions/session-wizard-context.tsx "src/app/(dashboard)/sessions/new/players/page.tsx" src/components/sessions/player-selection-form.tsx
git commit -m "Let coaches choose each player's position when creating a session" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Assessment screen uses the position played

**Files:**
- Modify: `src/app/(dashboard)/sessions/[id]/assess/[playerId]/page.tsx`
- Modify: `src/components/sessions/assessment-form.tsx`

**Interfaces:**
- Produces: the assessment form's `Player` type replaces `primary_position` with `position_played: string`; the page builds each player object with the session's `position_played`.

- [ ] **Step 1: Select and carry `position_played` in the assess page**

In `src/app/(dashboard)/sessions/[id]/assess/[playerId]/page.tsx`, find:

```ts
    .select("player_id, standout_moment, players(id, first_name, last_name, primary_position, squad_number)")
```

Change it to:

```ts
    .select("player_id, standout_moment, position_played, players(id, first_name, last_name, squad_number)")
```

Find:

```ts
    last_name: string;
    primary_position: string;
    squad_number: number | null;
  };

  const ordered = (sessionPlayers ?? [])
```

Change it to:

```ts
    last_name: string;
    squad_number: number | null;
  };

  const ordered = (sessionPlayers ?? [])
```

Find:

```ts
        primary_position: p.primary_position,
        squad_number: p.squad_number,
```

Change it to:

```ts
        position_played: sp.position_played as string,
        squad_number: p.squad_number,
```

- [ ] **Step 2: Use it for question variants**

Find:

```ts
    : player.primary_position === "goalkeeper"
      ? ["all", "goalkeeper"]
      : ["all", "outfield", player.primary_position];
```

Change it to:

```ts
    : player.position_played === "goalkeeper"
      ? ["all", "goalkeeper"]
      : ["all", "outfield", player.position_played];
```

- [ ] **Step 3: Update the form's player type and header**

In `src/components/sessions/assessment-form.tsx`, find:

```ts
  last_name: string;
  primary_position: string;
  squad_number: number | null;
  standout_moment: string | null;
};
```

Change it to:

```ts
  last_name: string;
  position_played: string;
  squad_number: number | null;
  standout_moment: string | null;
};
```

Find:

```tsx
              {POSITION_LABEL[player.primary_position]} &middot; {sessionLabel}{" "}
```

Change it to:

```tsx
              {POSITION_LABEL[player.position_played]} &middot; {sessionLabel}{" "}
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/sessions/[id]/assess/[playerId]/page.tsx" src/components/sessions/assessment-form.tsx
git commit -m "Assess players using the position they played in the session" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Reports use the position played

**Files:**
- Modify: `src/lib/actions/reports.ts`
- Modify: `src/app/(dashboard)/sessions/[id]/report/[playerId]/page.tsx`
- Modify: `src/components/sessions/report-view.tsx`

**Interfaces:**
- Produces: the report view's `Player` type replaces `primary_position` with `position_played: string`. `generateReport` uses the session's `position_played` for both the "every question answered" check and the AI report.

- [ ] **Step 1: `generateReport` - stop reading the usual position**

In `src/lib/actions/reports.ts`, find:

```ts
    .select("first_name, last_name, primary_position, gender")
```

Change it to:

```ts
    .select("first_name, last_name, gender")
```

- [ ] **Step 2: Fetch the session's position before the completeness check**

Find:

```ts
  const expectedQuestionCount = await getExpectedQuestionCount(supabase, {
    teamId: session.team_id,
    ageBand: team?.age_band ?? "",
    position: player.primary_position,
    pillarIds,
  });
```

Change it to:

```ts
  const { data: sessionPlayer } = await supabase
    .from("session_players")
    .select("standout_moment, position_played")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .single();
  if (!sessionPlayer) throw new Error("Player isn't part of this session.");

  const expectedQuestionCount = await getExpectedQuestionCount(supabase, {
    teamId: session.team_id,
    ageBand: team?.age_band ?? "",
    position: sessionPlayer.position_played,
    pillarIds,
  });
```

- [ ] **Step 3: Remove the old, now-duplicate `sessionPlayer` query**

Find and delete this block (it is further down the same function):

```ts
  const { data: sessionPlayer } = await supabase
    .from("session_players")
    .select("standout_moment")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .single();

```

- [ ] **Step 4: Send the position played to the AI report**

Find:

```ts
    position: player.primary_position,
    gender: player.gender,
```

Change it to:

```ts
    position: sessionPlayer.position_played,
    gender: player.gender,
```

Then find:

```ts
    standoutMoment: sessionPlayer?.standout_moment ?? "",
```

Change it to:

```ts
    standoutMoment: sessionPlayer.standout_moment ?? "",
```

- [ ] **Step 5: Report page - select and carry `position_played`**

In `src/app/(dashboard)/sessions/[id]/report/[playerId]/page.tsx`, find:

```ts
    .select("player_id, players(id, first_name, last_name, primary_position, squad_number)")
```

Change it to:

```ts
    .select("player_id, position_played, players(id, first_name, last_name, squad_number)")
```

Find:

```ts
    last_name: string;
    primary_position: string;
    squad_number: number | null;
  };

  const ordered = (sessionPlayers ?? [])
    .map((sp) => sp.players as unknown as PlayerRow)
    .sort((a, b) => a.last_name.localeCompare(b.last_name));
```

Change it to:

```ts
    last_name: string;
    squad_number: number | null;
  };

  const ordered = (sessionPlayers ?? [])
    .map((sp) => ({
      ...(sp.players as unknown as PlayerRow),
      position_played: sp.position_played as string,
    }))
    .sort((a, b) => a.last_name.localeCompare(b.last_name));
```

Find:

```ts
    position: player.primary_position,
```

Change it to:

```ts
    position: player.position_played,
```

- [ ] **Step 6: Report view - type and the two displays**

In `src/components/sessions/report-view.tsx`, find:

```ts
  last_name: string;
  primary_position: string;
  squad_number: number | null;
};
```

Change it to:

```ts
  last_name: string;
  position_played: string;
  squad_number: number | null;
};
```

Find:

```tsx
          position={POSITION_LABEL[player.primary_position]}
```

Change it to:

```tsx
          position={POSITION_LABEL[player.position_played]}
```

Find:

```tsx
              {POSITION_LABEL[player.primary_position]} &middot; Report
```

Change it to:

```tsx
              {POSITION_LABEL[player.position_played]} &middot; Report
```

- [ ] **Step 7: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/actions/reports.ts "src/app/(dashboard)/sessions/[id]/report/[playerId]/page.tsx" src/components/sessions/report-view.tsx
git commit -m "Use the position played for reports and the completeness check" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Export session tabs show the position played

**Files:**
- Modify: `src/lib/actions/export.ts`
- Modify: `src/components/settings/export-data-card.tsx`

**Interfaces:**
- Produces: `SessionRatingExportRow` and `SessionOverallExportRow` each gain `positionPlayed: string`. The Players tab is unchanged.

- [ ] **Step 1: Add the field to both export row types**

In `src/lib/actions/export.ts`, find:

```ts
export type SessionRatingExportRow = {
  sessionDate: string;
  sessionType: string;
  opponent: string | null;
  playerFirstName: string;
  playerLastName: string;
  pillar: string;
```

Change it to:

```ts
export type SessionRatingExportRow = {
  sessionDate: string;
  sessionType: string;
  opponent: string | null;
  playerFirstName: string;
  playerLastName: string;
  positionPlayed: string;
  pillar: string;
```

Find:

```ts
export type SessionOverallExportRow = {
  sessionDate: string;
  sessionType: string;
  opponent: string | null;
  playerFirstName: string;
  playerLastName: string;
  overallScore: number;
};
```

Change it to:

```ts
export type SessionOverallExportRow = {
  sessionDate: string;
  sessionType: string;
  opponent: string | null;
  playerFirstName: string;
  playerLastName: string;
  positionPlayed: string;
  overallScore: number;
};
```

- [ ] **Step 2: Look up each (session, player)'s position once**

Find:

```ts
  const rows = (assessmentRows ?? []) as unknown as AssessmentRow[];

  const ratings: SessionRatingExportRow[] = rows.map((a) => ({
```

Change it to:

```ts
  const rows = (assessmentRows ?? []) as unknown as AssessmentRow[];

  const { data: positionRows, error: positionsError } = await supabase
    .from("session_players")
    .select("session_id, player_id, position_played, sessions!inner(team_id)")
    .eq("sessions.team_id", team.id);
  if (positionsError) return { error: positionsError.message };
  const positionPlayed = new Map(
    (positionRows ?? []).map((r) => [
      `${r.session_id}:${r.player_id}`,
      r.position_played as string,
    ]),
  );

  const ratings: SessionRatingExportRow[] = rows.map((a) => ({
```

- [ ] **Step 3: Fill it into the Sessions & Ratings rows**

Find:

```ts
    playerLastName: a.players.last_name,
    pillar: PILLAR_NAME[a.team_questions.pillar_id] ?? a.team_questions.pillar_id,
```

Change it to:

```ts
    playerLastName: a.players.last_name,
    positionPlayed: positionPlayed.get(`${a.session_id}:${a.player_id}`) ?? "",
    pillar: PILLAR_NAME[a.team_questions.pillar_id] ?? a.team_questions.pillar_id,
```

- [ ] **Step 4: Fill it into the Session Overall Scores rows**

Find:

```ts
    playerLastName: row.players.last_name,
    overallScore:
```

Change it to:

```ts
    playerLastName: row.players.last_name,
    positionPlayed: positionPlayed.get(`${row.session_id}:${row.player_id}`) ?? "",
    overallScore:
```

- [ ] **Step 5: Add the column to both tabs**

In `src/components/settings/export-data-card.tsx`, find (in the "Sessions & Ratings" tab):

```ts
            { header: "Player last name", key: "playerLastName" },
            { header: "Pillar", key: "pillar" },
```

Change it to:

```ts
            { header: "Player last name", key: "playerLastName" },
            { header: "Position played", key: "positionPlayed" },
            { header: "Pillar", key: "pillar" },
```

Find (in the "Session Overall Scores" tab):

```ts
            { header: "Player last name", key: "playerLastName" },
            { header: "Overall score", key: "overallScore", width: 14 },
```

Change it to:

```ts
            { header: "Player last name", key: "playerLastName" },
            { header: "Position played", key: "positionPlayed" },
            { header: "Overall score", key: "overallScore", width: 14 },
```

- [ ] **Step 6: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/actions/export.ts src/components/settings/export-data-card.tsx
git commit -m "Add Position played column to export session tabs" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Manual verification (after the Task 1 SQL has been run)

1. On a U10-U11+ team, start a new session, tick a few players. Each ticked row shows a position dropdown defaulting to the usual position; tapping the dropdown does NOT untick the player. Set an outfield player to Goalkeeper and begin.
2. That player's assessment header says Goalkeeper and shows the goalkeeper Physical questions (no outfield-only ones). Set a goalkeeper to Midfield in another session: they get midfield Technical/Tactical and outfield Physical questions.
3. Finish that player's ratings and open their report: the header shows the position played, generating the report works (the "every question answered" check passes), and the PDF shows the position played.
4. On a U6-U7 or U8-U9 team, the setup screen shows no position dropdown.
5. Open a session created BEFORE this feature: assess, report and dashboard work exactly as before.
6. Export Data: the "Sessions & Ratings" and "Session Overall Scores" tabs have a "Position played" column; the Players tab is unchanged.
7. Squad, a player's profile and Rankings still show the usual position.
