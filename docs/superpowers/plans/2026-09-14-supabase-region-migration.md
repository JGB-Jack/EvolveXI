# Supabase Region Migration (EU West → North America) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move EvolveXI's Supabase project from EU West to a North America region so it's co-located with Vercel's function region, eliminating the transatlantic round-trip that causes a consistent 1-2s delay on every navigation, while preserving all existing data (teams, players, sessions, assessments, reports, and coach login accounts).

**Architecture:** A new Supabase project is created in a North America region. Its schema is rebuilt from the repo's own versioned migration files (not a schema dump), then its data is populated via a raw Postgres `pg_dump`/`psql` data-only transfer of the `public` and `auth` schemas from the old project - this works below Supabase's Auth API layer, so coach login credentials remain valid without password resets. The app is then repointed at the new project via two environment variables, in both Vercel and local `.env.local`. The old project is kept running, untouched, as an instant rollback path.

**Tech Stack:** Supabase (Postgres + Auth), Vercel (env vars/redeploy), native `pg_dump`/`psql` (PostgreSQL command-line client tools), Next.js `.env.local`.

**Spec:** `docs/superpowers/specs/2026-09-14-supabase-region-migration-design.md`

## Global Constraints

- New Supabase project region: **East US (North Virginia)** — closest Supabase-offered region to Vercel's default Hobby-plan function region (Washington, D.C.).
- No schema changes — the new project's schema must exactly match what `supabase/migrations/*.sql` describes, in the order the files were historically added.
- No app code changes — this is an infrastructure-only migration.
- Old (EU West) project is never deleted or modified as part of this plan — it stays as a rollback path.
- Every step where the user runs a command must use their own real connection strings/credentials, typed only on their own machine — no database password is ever pasted into this conversation.

---

### Task 1: Create the new Supabase project

**Files:** None (dashboard action only).

**Interfaces:**
- Produces: a new Supabase project's **Project URL**, **anon public API key**, and **Direct connection string** (Postgres URI, not the pooled/transaction connection string) — all three are needed by later tasks.

- [ ] **Step 1: Create the project**

In the Supabase dashboard (supabase.com/dashboard), click **New project**. Name it something like `evolvexi-app-us` (so it's clearly distinguishable from the old one in project lists). Choose organization, set a strong database password (write it down somewhere safe — it's shown only once), and for **Region** select **East US (North Virginia)**. Click **Create new project** and wait for it to finish provisioning (a few minutes).

- [ ] **Step 2: Record the three connection values**

Once the project is ready:
- Go to **Settings → API**. Copy the **Project URL** (looks like `https://xxxxxxxx.supabase.co`) and the **anon public** key (a long JWT string starting `eyJ...`).
- Go to **Settings → Database**. Under **Connection string**, select the **URI** tab, and toggle to the **Direct connection** (not "Transaction pooler" or "Session pooler" — those don't support the operations Task 4 needs). Copy it (it looks like `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres`); replace `[YOUR-PASSWORD]` with the database password you set in Step 1.

Save all three values in a temporary local note — they're needed in Tasks 2, 4, and 5, and can be deleted once the migration is verified in Task 6.

- [ ] **Step 3: Verify project is reachable**

In the new project's dashboard, click **SQL Editor → New query**, type `select 1;`, and run it. Expected: returns a single row with value `1`, confirming the project accepts queries before moving on.

---

### Task 2: Rebuild the schema from the repo's migrations

**Files:**
- Create: `supabase/migrations_combined_2026-09-14.sql` (temporary, generated artifact — not itself a new migration, deleted at the end of this task)
- Read: `supabase/migrations/0001_phase2_schema.sql` through `supabase/migrations/0010_parent_report.sql` (11 files, in this exact order)

**Interfaces:**
- Consumes: the new project's SQL Editor (from Task 1).
- Produces: the new project's schema, ready for Task 4's data restore.

- [ ] **Step 1: Concatenate the 11 migrations in their historical order**

Run this from the repo root (this is the exact, verified order the files were added to the project over time — note two files share the `0006` prefix, and `goalkeeper_physical_split` was added before `phase6_reports`, so this list is NOT plain alphabetical for those two):

```bash
cat supabase/migrations/0001_phase2_schema.sql \
    supabase/migrations/0002_phase3_players.sql \
    supabase/migrations/0003_phase4_sessions.sql \
    supabase/migrations/0004_phase5_assessments.sql \
    supabase/migrations/0005_fix_physical_wording.sql \
    supabase/migrations/0006_goalkeeper_physical_split.sql \
    supabase/migrations/0006_phase6_reports.sql \
    supabase/migrations/0007_archive_sessions.sql \
    supabase/migrations/0008_squad_insight.sql \
    supabase/migrations/0009_player_gender.sql \
    supabase/migrations/0010_parent_report.sql \
    > supabase/migrations_combined_2026-09-14.sql
```

- [ ] **Step 2: Verify the combined file looks right**

Run: `wc -l supabase/migrations_combined_2026-09-14.sql`
Expected: `846` (the sum of all 11 files' line counts) — confirms nothing was dropped or duplicated.

- [ ] **Step 3: Apply it to the new project**

Open the new project's **SQL Editor → New query**. Open `supabase/migrations_combined_2026-09-14.sql` in a text editor, copy its entire contents, paste into the SQL Editor, and click **Run**. Expected: it completes with a success message and no red error output. (If a specific statement errors, stop and report the exact error before continuing — do not proceed to Task 3 with a partially-applied schema.)

- [ ] **Step 4: Verify the schema matches**

In the new project's **Table Editor**, note the list of tables in the `public` schema. Compare against the old (EU West) project's **Table Editor** table list. Expected: identical table names in both.

- [ ] **Step 5: Delete the temporary combined file**

```bash
rm supabase/migrations_combined_2026-09-14.sql
```

This was a one-time deployment artifact, not a new migration — it must not be committed to the repo.

---

### Task 3: Install PostgreSQL client tools locally

**Files:** None (local software install).

**Interfaces:**
- Produces: working `pg_dump` and `psql` commands available in PowerShell, needed by Task 4.

- [ ] **Step 1: Download the installer**

Go to `https://www.postgresql.org/download/windows/`, click **Download the installer**, and download the latest version for Windows x86-64.

- [ ] **Step 2: Run the installer**

Run the downloaded `.exe`. Click through with default options for every screen **except**: when asked which components to install, you only need **Command Line Tools** checked (you can uncheck "PostgreSQL Server", "pgAdmin 4", and "Stack Builder" if you don't want a full local Postgres server installed — only the command-line client tools are needed for this migration). Finish the install.

- [ ] **Step 3: Verify the tools are on PATH**

Open a **new** PowerShell window (so it picks up the updated PATH) and run:

```powershell
pg_dump --version
psql --version
```

Expected: both print a version number (e.g. `pg_dump (PostgreSQL) 17.x`). If instead you see `pg_dump is not recognized...`, the installer's bin folder (typically `C:\Program Files\PostgreSQL\17\bin`) wasn't added to PATH — add it manually via Windows' "Edit environment variables" settings, then open a new PowerShell window and retry.

---

### Task 4: Migrate the data (public + auth schemas)

**Files:** None (local command execution; temporary local file created and deleted within this task).

**Interfaces:**
- Consumes: old project's Direct connection string (from the old project's own **Settings → Database**, same steps as Task 1 Step 2), new project's Direct connection string (from Task 1 Step 2), `pg_dump`/`psql` (from Task 3).
- Produces: the new project's `public` and `auth` schemas populated with real data, ready for Task 5's cutover.

- [ ] **Step 1: Get the OLD project's direct connection string**

In the **old (EU West)** project's dashboard: **Settings → Database → Connection string → URI tab → Direct connection**. Copy it and fill in its database password (this is the old project's own password, which may differ from the new project's).

- [ ] **Step 2: Dump the data**

In PowerShell, run (replace `<OLD_CONNECTION_STRING>` with the value from Step 1 — keep the quotes):

```powershell
pg_dump --data-only --schema=public --schema=auth --no-owner --no-privileges --disable-triggers --exclude-table=public.pillars --exclude-table=public.master_questions -f data_dump_2026-09-14.sql "<OLD_CONNECTION_STRING>"
```

`--disable-triggers` is required here: Supabase's `auth` schema has its own internal triggers that fire on row insert, which would otherwise conflict with data already implicitly created by the schema in Task 2. This flag wraps the restore so those triggers stay off only while the dumped data is being loaded back in.

`--exclude-table=public.pillars --exclude-table=public.master_questions` is required too: both tables are seeded with fixed reference rows directly inside the migration files (`0001_phase2_schema.sql` and `0006_goalkeeper_physical_split.sql`), so Task 2 already populated them identically in the new project. Without excluding them here, this dump would try to insert the same rows again and fail on primary-key conflicts (`pillars.id`, `master_questions.id`).

Expected: the command finishes with no error, and `data_dump_2026-09-14.sql` now exists in the current folder. Run `Get-Item data_dump_2026-09-14.sql` to confirm it exists and has a non-zero size.

- [ ] **Step 3: Restore the data into the new project**

Replace `<NEW_CONNECTION_STRING>` with the new project's Direct connection string from Task 1 Step 2:

```powershell
psql "<NEW_CONNECTION_STRING>" -f data_dump_2026-09-14.sql
```

Expected: a long stream of `INSERT 0 N` / `COPY N` style output ending without a fatal error. Some `NOTICE` or `already exists` lines for internal Supabase-managed rows are expected and safe to ignore — only stop and report back if you see a line starting with `ERROR:` that mentions one of the app's own tables (`teams`, `players`, `sessions`, `assessments`, `reports`, etc.).

- [ ] **Step 4: Spot-check row counts**

Open the **old** project's SQL Editor and run:

```sql
select
  (select count(*) from public.teams) as teams,
  (select count(*) from public.players) as players,
  (select count(*) from public.sessions) as sessions,
  (select count(*) from auth.users) as auth_users;
```

Run the exact same query in the **new** project's SQL Editor. Expected: all four numbers match between old and new.

- [ ] **Step 5: Delete the local dump file**

```powershell
Remove-Item data_dump_2026-09-14.sql
```

It contains real user data (including auth records) and shouldn't be left sitting on disk once the migration is verified.

---

### Task 5: Cut over the app to the new project

**Files:**
- Modify: `.env.local` (local, not committed — confirm it's still gitignored before editing)

**Interfaces:**
- Consumes: new project's **Project URL** and **anon public** key (from Task 1 Step 2).
- Produces: the running app (both locally and on Vercel) pointed at the new North America project.

- [ ] **Step 1: Confirm `.env.local` is gitignored**

```bash
git check-ignore .env.local
```

Expected: prints `.env.local`, confirming it won't be committed. (If this prints nothing, stop — report back before editing, since that would mean the file is tracked.)

- [ ] **Step 2: Update local `.env.local`**

Open `.env.local` in the repo root and replace the values of `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the new project's values from Task 1 Step 2. Leave `ANTHROPIC_API_KEY` untouched.

- [ ] **Step 3: Update Vercel's environment variables**

In the Vercel dashboard, open the EvolveXI project → **Settings → Environment Variables**. Find `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, edit each to the new project's values from Task 1 Step 2, and save.

- [ ] **Step 4: Redeploy on Vercel**

In Vercel's **Deployments** tab, open the most recent production deployment and choose **Redeploy** (environment variable changes don't take effect on an already-built deployment until a new build runs). Wait for it to finish.

- [ ] **Step 5: Restart the local dev server**

If `npm run dev` is currently running, stop it (Ctrl+C) and start it again so it picks up the updated `.env.local`:

```bash
npm run dev
```

---

### Task 6: Verify and establish the rollback window

**Files:** None (manual verification).

**Interfaces:**
- Consumes: the redeployed production app (from Task 5).
- Produces: confidence to proceed, or a documented rollback trigger.

- [ ] **Step 1: Log in with a real existing coach account on production**

Go to the production URL, log in with an account that existed before the migration. Expected: login succeeds (proves `auth.users` data transferred correctly) and lands on the Home screen with that coach's real team name showing.

- [ ] **Step 2: Check existing data renders correctly**

Open Squad, Sessions, Rankings, and Reports for that account. Expected: all previously-existing players, sessions, and reports are present and show the same data as before the migration.

- [ ] **Step 3: Generate a new report end-to-end**

From an existing session, generate a fresh AI report. Expected: it generates and saves successfully — confirms writes to the new database work, not just reads.

- [ ] **Step 4: Time a navigation**

Tap between two bottom-nav screens (e.g. Squad → Rankings) a few times. Expected: content now appears close to instantly, not with the earlier 1-2s lag — this is the actual fix being verified.

- [ ] **Step 5: Decide on rollback window**

If Steps 1-4 all pass: leave the old (EU West) project running, untouched, for a few days as a safety net, then it can be paused or deleted once confident nothing was missed. If anything in Steps 1-4 fails: revert `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in both Vercel and `.env.local` back to the old project's values (redeploy again) — this is a complete, instant rollback since the old project was never modified.
