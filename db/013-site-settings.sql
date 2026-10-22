-- 013 — Site-wide settings, first used for the default playback volume (ใบ v3/pleng#135).
--
-- HOW TO RUN: paste into the Supabase SQL Editor and run. It is wrapped in a transaction
-- that ends with ROLLBACK, so BY DEFAULT it is a DRY RUN — it changes nothing, but any
-- error still surfaces. Then change the final `rollback;` to `commit;` and run once more to
-- apply. Idempotent: re-running the committed version is a no-op.
--
-- ORDER: run this BEFORE or AFTER the code goes live — either is safe. Until the table exists
-- the site reads nothing and plays today's sound (store.js loadSiteVolume), and an approver who
-- tries to save is told the table is not installed yet.
--
-- NUMBERING: 001–012 are taken on main or on other branches; 013 collides with none of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS MIGRATION DOES
--   1. public.site_settings (key text primary key, value jsonb) — ONE row per setting, so later
--      site-wide settings need no new table. The volume lives under key 'playback_volume' as
--      {"melody": 100, "chord": 100, "linked": true} — percents of today's sound (lib/volume.js).
--
--   2. RLS (พี่เอม 22 ต.ค. 2569: the approver sets it, everyone reads it):
--        • anyone — anon included — may READ every row: every visitor's player needs the default
--        • only an approver (public.app_role() = 'approver', db/002) may INSERT or UPDATE
--        • nobody deletes through the API (no delete policy); "คืนค่าเริ่มต้น" saves 100/100 instead
--
--   3. updated_at / updated_by are stamped by a trigger on every write, so who last changed the
--      site's sound and when can always be answered — the client cannot forge either.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.site_settings enable row level security;

drop policy if exists "anyone_reads_site_settings" on public.site_settings;
create policy "anyone_reads_site_settings" on public.site_settings
  for select using (true);

drop policy if exists "approver_inserts_site_settings" on public.site_settings;
create policy "approver_inserts_site_settings" on public.site_settings
  for insert with check (public.app_role() = 'approver');

drop policy if exists "approver_updates_site_settings" on public.site_settings;
create policy "approver_updates_site_settings" on public.site_settings
  for update using (public.app_role() = 'approver') with check (public.app_role() = 'approver');

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

create or replace function public.stamp_site_settings() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists stamp_site_settings on public.site_settings;
create trigger stamp_site_settings before insert or update on public.site_settings
  for each row execute function public.stamp_site_settings();

rollback;
