# Club logo upload

## Context

The Settings page has a "Club set up" placeholder card: "Add your club
motif to appear on reports," marked "Coming soon." This turns it into a
real feature: a coach uploads their club's badge/logo, and it appears
on every generated PDF (Coach report, Parent report, Drill, Session)
alongside EvolveXI's own logo.

File uploads/storage don't exist anywhere in this codebase yet - this
is a new capability, not a tweak to an existing flow.

## Goals

- A coach can upload a club badge/logo image from the Settings page.
- Once set, that logo appears on all four PDF types, alongside (not
  replacing) EvolveXI's own logo.
- A coach can remove their logo, reverting PDFs to EvolveXI-only.
- Storage stays within Supabase's free tier (confirmed: a handful of
  small logo images is a trivial fraction of the 1GB free allowance).

## Non-goals

- No image editing/cropping in-app - uploaded as-is, laid out at a
  fixed size in the PDF header regardless of the source image's
  dimensions.
- No support for multiple logos per team, or per-report-type logos -
  one logo per team, used everywhere.
- No changes to the in-app UI (nav bar, report page) - PDFs only, per
  the user's explicit scope choice.

## Data model

One new nullable column, `club_logo_url text`, added to `public.teams`
via a new migration file (`supabase/migrations/0011_club_logo.sql`),
holding the current logo's public Storage URL - null when no logo is
set.

## Storage

A new Supabase Storage bucket, `club-logos`, created manually by the
user via the Supabase dashboard (Storage → New bucket), set to
**public** - PDF generation happens client-side and needs to fetch the
image by URL without an auth token, the same way EvolveXI's own
`/evolvexi-logo.png` is fetched today. A club badge isn't sensitive
data, so public read is an acceptable tradeoff for that simplicity.

Files are stored at a fixed path per team, `club-logos/{team_id}/logo`
(no file extension in the path itself - the upload sets the object's
`contentType` to the source file's real MIME type, which is what
browsers and react-pdf actually use to interpret it, not the URL). One
object per team at a stable path means a re-upload - even one that
switches from PNG to JPG - always replaces the same object (via
Storage's `upsert: true`) rather than leaving the old file orphaned
under a different extension. Storage policies (applied via SQL, in the
same migration file) restrict INSERT/UPDATE/DELETE on this bucket to
the object's own team's coach: the first path segment (`{team_id}`)
must belong to a team where `coach_id = auth.uid()`. SELECT stays open
to anyone (required for the public-read PDF-fetch use case).

## Upload flow

1. Coach picks a PNG/JPG file (capped at 5MB) in the Settings card.
2. Client-side validation: reject anything over 5MB or not
   PNG/JPG before attempting upload, with a clear error message.
3. Browser uploads directly to Supabase Storage at
   `club-logos/{team_id}/logo` (with `upsert: true` and `contentType`
   set to the file's real MIME type), using the authenticated Supabase
   client already used throughout the app - no new backend endpoint
   needed, Storage's own RLS policies gate the write.
4. On successful upload, a Server Action saves the resulting public URL
   into `teams.club_logo_url`.
5. Removing the logo: a Server Action clears `teams.club_logo_url` to
   null and deletes the Storage object at that team's path.

## Settings UI

The placeholder Card becomes a real component
(`src/components/settings/club-logo-card.tsx`): shows the current logo
as a small preview with a "Remove" button when one's set, or a file
picker with an "Upload" button when not. Loading/error states follow
the same pattern already used for the Export Data card (a disabled
button with "Uploading..." text, `toast.error` on failure).

## PDF integration

The existing `PdfLogo` component (`src/lib/pdf/pdf-logo.tsx`) - a
single centered EvolveXI badge - is replaced by a new shared header
component that takes an optional `clubLogoUrl` prop:

- No club logo: renders exactly as today (EvolveXI badge, centered).
- Club logo present: EvolveXI badge top-left, club logo top-right, both
  at a matching fixed size.

All four PDF documents (`drill-document.tsx`, `session-document.tsx`,
`report-document.tsx` for both Coach and Parent views) switch to this
new component and start passing the team's `club_logo_url` down
through their existing prop chains (the same way `sessionDate` was
threaded through for the report PDFs earlier). Each PDF-generating
page already fetches the team row for other purposes (age band, name),
so this is one additional selected column, not a new query.

## Error handling

- Upload fails (network, file too large, wrong type): `toast.error`
  with a specific message, logo stays unchanged.
- A team with a broken/unreachable `club_logo_url` (e.g. manually
  deleted from Storage outside the app): PDF generation shouldn't hard
  -fail - the club logo `<Image>` element in the PDF is given the same
  treatment as a normal broken image, and generation continues with
  just the EvolveXI logo showing. This is a react-pdf `Image` behavior
  to verify during implementation, not a special code path to build.

## Testing / verification

- Upload a logo, confirm it appears correctly positioned on all four
  PDF types (isolated test harness, same pattern used for every PDF
  feature this session).
- Remove a logo, confirm all four PDF types revert to EvolveXI-only,
  centered.
- Confirm a second coach's team is unaffected by the first coach's
  upload (Storage policy correctness).
- Confirm the 5MB / PNG-JPG-only validation rejects an oversized or
  wrong-type file with a clear message before any upload attempt.
