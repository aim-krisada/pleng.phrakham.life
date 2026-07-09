-- ============================================================================
-- BACKUP existing songs BEFORE importing the 120-song batch.
-- The import upserts by `number` (on conflict do update) → it OVERWRITES any song
-- that already has that number. Run THIS FILE FIRST in the Supabase SQL Editor.
-- (Only P'Aim can run it — the app's publishable key is read-only.)
-- ============================================================================

-- 1) Full in-database snapshot (fast, restorable). Safe to re-run (IF NOT EXISTS).
create table if not exists public.songs_backup_20260709 as
  select * from public.songs;

-- 2) Verify the snapshot captured everything:
select
  (select count(*) from public.songs)                    as live_now,
  (select count(*) from public.songs_backup_20260709)    as backed_up;

-- 3) OPTIONAL off-database copy: run this, then SAVE the JSON result to a file on disk
--    (belt-and-suspenders in case the whole table is lost).
-- select json_agg(t) from (
--   select number, title_th, title_en, content from public.songs order by number
-- ) t;

-- ----------------------------------------------------------------------------
-- RESTORE (only if an import goes wrong) — puts the pre-import rows back:
--   insert into public.songs (id, number, title_th, title_en, content)
--   select id, number, title_th, title_en, content from public.songs_backup_20260709
--   on conflict (number) do update set
--     title_th = excluded.title_th, title_en = excluded.title_en, content = excluded.content;
-- ----------------------------------------------------------------------------
