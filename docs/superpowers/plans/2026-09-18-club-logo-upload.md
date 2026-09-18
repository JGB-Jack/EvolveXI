# Club Logo Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach upload their club's badge/logo from Settings, storing it in Supabase Storage, and have it appear top-right on all four PDF types (Drill, Session, Coach report, Parent report) alongside EvolveXI's own top-left logo.

**Architecture:** A new nullable `teams.club_logo_url` column holds the current logo's public URL. The image itself lives in a new public Supabase Storage bucket (`club-logos`), one object per team at a fixed path, uploaded directly from the browser using the same authenticated Supabase client already used throughout the app - no new backend endpoint. A shared two-logo PDF header component replaces the current single-logo one, and `club_logo_url` is threaded through each of the four existing PDF-generation flows the same way `sessionDate` was threaded through the report PDF earlier in this project.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Supabase (Postgres + Storage), `@react-pdf/renderer`, existing `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server).

**Spec:** `docs/superpowers/specs/2026-09-18-club-logo-upload-design.md`

## Global Constraints

- Storage bucket name: exactly `club-logos`, public.
- Object path: exactly `club-logos/{team_id}/logo` (no file extension in the path; `contentType` carries the real MIME type).
- Upload validation: PNG or JPG only, 5MB max, enforced client-side before any upload attempt.
- No app-code migration tooling in this project - SQL is applied by the user pasting it into the Supabase SQL Editor, matching every other migration so far (see `supabase/migrations/*.sql`).
- PDF logo size stays 64x64 (`pdfStyles.logo`) for both logos, unless a task below says otherwise.

---

### Task 1: Database column + Storage bucket + RLS policies

**Files:**
- Create: `supabase/migrations/0011_club_logo.sql`

**Interfaces:**
- Produces: `public.teams.club_logo_url` (nullable `text` column); a `club-logos` Storage bucket with INSERT/UPDATE/DELETE restricted to a team's own coach and public SELECT.

- [ ] **Step 1: Create the Storage bucket (dashboard action)**

In the Supabase dashboard, go to **Storage** in the left sidebar, click **New bucket**, name it exactly `club-logos`, and toggle **Public bucket** on. Click **Create bucket**.

- [ ] **Step 2: Write the migration file**

```sql
-- Club logo: one optional badge/logo image per team, shown alongside
-- EvolveXI's own logo on generated PDFs. The image itself lives in the
-- "club-logos" Storage bucket (created manually via the dashboard,
-- since bucket creation isn't available through plain SQL) - this
-- column just holds that bucket's public URL for the team's logo.

alter table public.teams
  add column club_logo_url text;

-- One object per team at a fixed path (club-logos/{team_id}/logo, no
-- extension - contentType carries the real MIME type), so a re-upload
-- always replaces the same object rather than accumulating orphans.

create policy "Coaches can upload their own team's club logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'club-logos'
    and (storage.foldername(name))[1] in (
      select id::text from public.teams where coach_id = auth.uid()
    )
  );

create policy "Coaches can replace their own team's club logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'club-logos'
    and (storage.foldername(name))[1] in (
      select id::text from public.teams where coach_id = auth.uid()
    )
  );

create policy "Coaches can delete their own team's club logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'club-logos'
    and (storage.foldername(name))[1] in (
      select id::text from public.teams where coach_id = auth.uid()
    )
  );

create policy "Anyone can view club logos"
  on storage.objects for select
  to public
  using (bucket_id = 'club-logos');
```

- [ ] **Step 3: Run it against the production database**

Open the Supabase dashboard's **SQL Editor → New query**, paste the contents of `supabase/migrations/0011_club_logo.sql`, and click **Run**. Expected: completes with no red error output.

- [ ] **Step 4: Verify the column exists**

Run in the same SQL Editor:

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'teams' and column_name = 'club_logo_url';
```

Expected: returns one row, `club_logo_url`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0011_club_logo.sql
git commit -m "Add teams.club_logo_url column and club-logos Storage bucket policies"
```

---

### Task 2: Server Action to save/clear the logo URL

**Files:**
- Create: `src/lib/actions/club-logo.ts`

**Interfaces:**
- Consumes: `getCurrentUser()` and `createClient()` from `@/lib/supabase/server` (existing).
- Produces: `saveClubLogoUrl(url: string): Promise<{ error: string } | { success: true }>`, `removeClubLogo(): Promise<{ error: string } | { success: true }>` - both used by Task 3's UI component.

- [ ] **Step 1: Write the action file**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function saveClubLogoUrl(
  url: string,
): Promise<{ error: string } | { success: true }> {
  const {
    data: { user },
  } = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ club_logo_url: url })
    .eq("coach_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function removeClubLogo(): Promise<
  { error: string } | { success: true }
> {
  const {
    data: { user },
  } = await getCurrentUser();
  if (!user) return { error: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ club_logo_url: null })
    .eq("coach_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: compiles with no TypeScript errors (this file has no UI to click-test yet - Task 3 wires it up).

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/club-logo.ts
git commit -m "Add save/remove Server Actions for the club logo URL"
```

---

### Task 3: Settings upload/remove UI

**Files:**
- Create: `src/components/settings/club-logo-card.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx` (team query needs `id` and `club_logo_url`; replace the "Club set up" placeholder Card with the real component)

**Interfaces:**
- Consumes: `saveClubLogoUrl`, `removeClubLogo` from Task 2; `createClient` from `@/lib/supabase/client` (browser, existing); `withTimeout` from `@/lib/utils` (existing).
- Produces: a working upload/remove flow, verified by hand (no automated PDF check yet - Tasks 4-5 add the PDF side).

- [ ] **Step 1: Update the Settings page's team query**

In `src/app/(dashboard)/settings/page.tsx`, change:

```ts
  const { data: team } = await supabase
    .from("teams")
    .select("name, age_band")
    .eq("coach_id", user.id)
    .single();
```

to:

```ts
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, age_band, club_logo_url")
    .eq("coach_id", user.id)
    .single();
```

- [ ] **Step 2: Replace the placeholder Card**

Still in `src/app/(dashboard)/settings/page.tsx`, add the import:

```ts
import { ClubLogoCard } from "@/components/settings/club-logo-card";
```

Replace this block:

```tsx
      <Card className="border-b-2 border-b-primary opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Club set up</CardTitle>
            <CardDescription>
              Add your club motif to appear on reports.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>
```

with:

```tsx
      <ClubLogoCard teamId={team.id} initialLogoUrl={team.club_logo_url} />
```

- [ ] **Step 3: Write the card component**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { saveClubLogoUrl, removeClubLogo } from "@/lib/actions/club-logo";
import { withTimeout } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg"];

export function ClubLogoCard({
  teamId,
  initialLogoUrl,
}: {
  teamId: string;
  initialLogoUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [busy, setBusy] = useState(false);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG or JPG image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("That image is too large - please choose one under 5MB.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(`${teamId}/logo`, file, {
          upsert: true,
          contentType: file.type,
        });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("club-logos")
        .getPublicUrl(`${teamId}/logo`);
      // Cache-bust so the new image shows immediately - the path never
      // changes on re-upload, so browsers/react-pdf would otherwise keep
      // showing a cached copy of the old logo.
      const bustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const result = await withTimeout(saveClubLogoUrl(bustedUrl), 15000);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setLogoUrl(bustedUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.storage.from("club-logos").remove([`${teamId}/logo`]);

      const result = await withTimeout(removeClubLogo(), 15000);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setLogoUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove logo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-b-2 border-b-primary">
      <CardHeader>
        <CardTitle>Club set up</CardTitle>
        <CardDescription>
          Add your club badge to appear alongside the EvolveXI logo on
          generated PDFs.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        {logoUrl ? (
          <>
            <Image
              src={logoUrl}
              alt="Club logo"
              width={64}
              height={64}
              className="rounded-md border object-contain"
              unoptimized
            />
            <Button variant="outline" onClick={handleRemove} disabled={busy}>
              {busy ? "Removing..." : "Remove"}
            </Button>
          </>
        ) : (
          <label>
            <Button
              variant="outline"
              disabled={busy}
              render={<span />}
            >
              {busy ? "Uploading..." : "Upload logo"}
            </Button>
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFileSelected}
              disabled={busy}
            />
          </label>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: compiles with no TypeScript errors.

- [ ] **Step 5: Manual verification**

Start the dev server, log in, go to Settings, upload a small PNG (under 5MB). Expected: the card shows the uploaded image and a Remove button; refreshing the page still shows it (confirms `club_logo_url` persisted). Click Remove. Expected: reverts to the Upload button; refreshing confirms it stays removed. Try uploading a `.gif` or an oversized file. Expected: a toast error, no upload attempted.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/settings/page.tsx" src/components/settings/club-logo-card.tsx
git commit -m "Add club logo upload/remove UI to Settings"
```

---

### Task 4: Shared two-logo PDF header component

**Files:**
- Modify: `src/lib/pdf/pdf-logo.tsx`
- Modify: `src/lib/pdf/styles.ts`

**Interfaces:**
- Produces: `PdfLogo({ clubLogoUrl }: { clubLogoUrl?: string | null })` - a drop-in replacement for the current no-props `PdfLogo`, consumed by Task 5's four document files.

- [ ] **Step 1: Add a row-layout style**

In `src/lib/pdf/styles.ts`, add a new entry to the `pdfStyles` object (alongside the existing `logo` entry):

```ts
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
```

- [ ] **Step 2: Rewrite the component**

Replace the full contents of `src/lib/pdf/pdf-logo.tsx`:

```tsx
import { Image, View } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";

export function PdfLogo({ clubLogoUrl }: { clubLogoUrl?: string | null }) {
  if (!clubLogoUrl) {
    return (
      <View style={{ alignItems: "center" }}>
        <Image src="/evolvexi-logo.png" style={pdfStyles.logo} />
      </View>
    );
  }

  return (
    <View style={pdfStyles.logoRow}>
      <Image src="/evolvexi-logo.png" style={pdfStyles.logo} />
      <Image src={clubLogoUrl} style={pdfStyles.logo} />
    </View>
  );
}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: compiles cleanly. This will show a type error at every current `<PdfLogo />` call site once `clubLogoUrl` is required - it isn't (it's optional, `?:`), so this should pass with zero call-site changes yet.

- [ ] **Step 4: Isolated visual verification**

Using the same temporary-test-page pattern used for every other PDF feature this session (add a throwaway route under `src/app/`, temporarily list it in `PUBLIC_ROUTES` in `src/lib/supabase/middleware.ts`, use the Browser tool to preview, then delete the route and revert `PUBLIC_ROUTES` before committing): render `<PdfLogo clubLogoUrl="https://placehold.co/64x64.png" />` inside a bare react-pdf `Document`/`Page`, generate the PDF, and confirm visually that EvolveXI's logo sits top-left and the placeholder image sits top-right, both the same size. Also render `<PdfLogo />` with no prop and confirm it still shows the single centered EvolveXI logo exactly as before.

- [ ] **Step 4b: Verify a broken image URL doesn't break the whole PDF**

In the same test harness, render `<PdfLogo clubLogoUrl="https://example.com/does-not-exist.png" />` (a URL that 404s) and generate the PDF. Expected: generation still succeeds - per the design doc, this shouldn't hard-fail. If it does throw/reject instead, wrap the club logo `<Image>` in `src/lib/pdf/pdf-logo.tsx` so a failed fetch degrades to just the EvolveXI logo rather than breaking the whole document (react-pdf's `Image` component accepts a `src` function returning a Promise as an alternative to a plain string - catch the fetch there and fall back to omitting the image). Re-test after any such fix.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/pdf-logo.tsx src/lib/pdf/styles.ts
git commit -m "Support an optional second logo in the shared PDF header"
```

---

### Task 5: Thread the real club logo through all four PDF flows

**Files:**
- Modify: `src/lib/pdf/drill-document.tsx`
- Modify: `src/lib/pdf/session-document.tsx`
- Modify: `src/lib/pdf/report-document.tsx`
- Modify: `src/app/(dashboard)/ideas/page.tsx`
- Modify: `src/components/ideas/drill-generator-card.tsx`
- Modify: `src/components/ideas/session-builder-card.tsx`
- Modify: `src/app/(dashboard)/sessions/[id]/report/[playerId]/page.tsx`
- Modify: `src/components/sessions/report-view.tsx`

**Interfaces:**
- Consumes: `PdfLogo`'s new `clubLogoUrl` prop from Task 4.
- Produces: a fully working feature - no further tasks depend on this one.

- [ ] **Step 1: Drill and Session PDF documents accept the prop**

In `src/lib/pdf/drill-document.tsx`, change the component signature and its `<PdfLogo />` call:

```tsx
export function DrillDocument({
  drill,
  clubLogoUrl,
}: {
  drill: DrillOutput;
  clubLogoUrl?: string | null;
}) {
  return (
    <Document title={drill.name}>
      <Page size="A4" style={pdfStyles.page}>
        <PdfLogo clubLogoUrl={clubLogoUrl} />
```

Apply the same pattern to `src/lib/pdf/session-document.tsx` (add `clubLogoUrl?: string | null` next to `plan: SessionPlan`, pass it to `<PdfLogo clubLogoUrl={clubLogoUrl} />`).

- [ ] **Step 2: Report PDF document accepts the prop**

In `src/lib/pdf/report-document.tsx`, add `clubLogoUrl?: string | null;` to the destructured props and the inline type (alongside the existing `sessionDate: string;`), and change `<PdfLogo />` to `<PdfLogo clubLogoUrl={clubLogoUrl} />`.

- [ ] **Step 3: `/ideas` page fetches and passes the club logo**

Rewrite `src/app/(dashboard)/ideas/page.tsx`:

```tsx
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { DrillGeneratorCard } from "@/components/ideas/drill-generator-card";
import { SessionBuilderCard } from "@/components/ideas/session-builder-card";

// Without this, Vercel's default serverless function timeout (10s on the
// free/Hobby plan) can kill the drill/session Server Actions before Sonnet
// 5 finishes generating - the client then just sees a hung request until
// its own withTimeout fires. 60s is the Hobby plan's max.
export const maxDuration = 60;

export default async function IdeasPage() {
  const {
    data: { user },
  } = await getCurrentUser();
  const supabase = await createClient();
  const { data: team } = user
    ? await supabase
        .from("teams")
        .select("club_logo_url")
        .eq("coach_id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inspiration</h1>
        <p className="text-muted-foreground">
          AI tools to help you plan and coach on the day.
        </p>
      </div>
      <div className="space-y-4">
        <DrillGeneratorCard clubLogoUrl={team?.club_logo_url ?? null} />
        <SessionBuilderCard clubLogoUrl={team?.club_logo_url ?? null} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Drill and Session cards accept and pass the prop through**

In `src/components/ideas/drill-generator-card.tsx`, change the export signature and the download call:

```tsx
export function DrillGeneratorCard({
  clubLogoUrl,
}: {
  clubLogoUrl?: string | null;
}) {
```

and:

```tsx
      await generateAndOpenPdf(
        <DrillDocument drill={drill} clubLogoUrl={clubLogoUrl} />,
      );
```

Apply the same pattern to `src/components/ideas/session-builder-card.tsx` (`SessionBuilderCard({ clubLogoUrl }: { clubLogoUrl?: string | null })`, and `<SessionDocument plan={plan} clubLogoUrl={clubLogoUrl} />`).

- [ ] **Step 5: Report page fetches the club logo alongside age band**

In `src/app/(dashboard)/sessions/[id]/report/[playerId]/page.tsx`, change:

```ts
  const { data: session } = await supabase
    .from("sessions")
    .select("id, date, type, opponent, team_id, teams(age_band)")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();
  const teamAgeBand = (
    session.teams as unknown as { age_band: string } | null
  )?.age_band ?? "";
```

to:

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
  const teamAgeBand = team?.age_band ?? "";
```

Then add `clubLogoUrl={team?.club_logo_url ?? null}` to the `<ReportView>` call at the bottom of the file (alongside the existing `sessionDate={session.date}`).

- [ ] **Step 6: ReportView accepts and passes the prop through**

In `src/components/sessions/report-view.tsx`, add `clubLogoUrl` to the destructured props and its inline type (alongside `sessionDate`):

```tsx
export function ReportView({
  sessionId,
  sessionDate,
  clubLogoUrl,
  player,
  ...
}: {
  sessionId: string;
  sessionDate: string;
  clubLogoUrl: string | null;
  player: Player;
  ...
```

Then add `clubLogoUrl={clubLogoUrl}` to the `<ReportDocument>` call inside `handleDownload`.

- [ ] **Step 7: Build check**

Run: `npm run build`
Expected: compiles with no TypeScript errors across all eight modified files.

- [ ] **Step 8: End-to-end manual verification**

With a club logo already uploaded (from Task 3's verification), on the real (authenticated) app: generate a drill and download its PDF - expected: club logo appears top-right. Generate a session and download its PDF - same. Generate a Coach report and download - same. Switch to Parent view and download - same. Then remove the club logo in Settings and repeat all four downloads - expected: every PDF reverts to the single centered EvolveXI logo, exactly as before this feature existed.

- [ ] **Step 9: Commit**

```bash
git add src/lib/pdf/drill-document.tsx src/lib/pdf/session-document.tsx src/lib/pdf/report-document.tsx "src/app/(dashboard)/ideas/page.tsx" src/components/ideas/drill-generator-card.tsx src/components/ideas/session-builder-card.tsx "src/app/(dashboard)/sessions/[id]/report/[playerId]/page.tsx" src/components/sessions/report-view.tsx
git commit -m "Thread club logo through all four PDF generation flows"
```
