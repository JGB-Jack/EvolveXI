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
