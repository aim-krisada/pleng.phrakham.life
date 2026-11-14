-- 015 — A trash for drafts too (ใบ v3/pleng#162): a draft that is thrown away can be taken back.
--
-- WHY: พี่เปา (approver) throws away drafts other people sent in when the library already has the
-- song (song 66 sent again). She asked (14 พ.ย. 2569): "ลบแล้วไปเก็บในถังขยะก่อนเผื่อเข้าใจกันผิดกับ
-- คนทำดีกว่ามั้ย" — keep it in the trash first, in case the person who made it disagrees.
-- Until today a draft delete was a hard DELETE with no way back.
--
-- HOW TO RUN: paste into the Supabase SQL Editor and run. It ends with ROLLBACK, so BY DEFAULT it
-- is a DRY RUN — it changes nothing, but any error still surfaces. Then change the final
-- `rollback;` to `commit;` and run once more to apply. Idempotent: re-running is a no-op.
--
-- The web app works before AND after this runs: until it exists, ลบ asks once more and deletes
-- for good, as it always did; once it exists, ลบ moves the draft to จัดการ ▸ ถังขยะ.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS MIGRATION DOES
--   1. song_drafts.deleted_at (nullable timestamptz). Set = in the trash: the app hides it from
--      งานร่าง / รอตรวจ and lists it in ถังขยะ.
--   2. trash_draft(p_draft_id)   → deleted_at = now()  — the draft's author, or an approver
--      restore_draft(p_draft_id) → deleted_at = null   — the draft's author, or an approver
--      Both SECURITY DEFINER, both check the same rule as db/002's "Delete own or as approver".
--   3. purge_deleted_drafts(p_days default 30) — deletes drafts in the trash longer than that.
--      service_role only (a scheduled job), like purge_deleted_songs in db/012.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

alter table public.song_drafts add column if not exists deleted_at timestamptz;

create or replace function public.trash_draft(p_draft_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.song_drafts
     where id = p_draft_id
       and (author_id = auth.uid() or public.app_role() = 'approver')
  ) then
    raise exception 'draft % not found or not yours to delete', p_draft_id using errcode = '42501';
  end if;
  update public.song_drafts
     set deleted_at = now()
   where id = p_draft_id and deleted_at is null;   -- idempotent
end $$;

create or replace function public.restore_draft(p_draft_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.song_drafts
     where id = p_draft_id
       and (author_id = auth.uid() or public.app_role() = 'approver')
  ) then
    raise exception 'draft % not found or not yours to restore', p_draft_id using errcode = '42501';
  end if;
  update public.song_drafts
     set deleted_at = null
   where id = p_draft_id and deleted_at is not null;
end $$;

revoke all on function public.trash_draft(uuid) from public;
revoke all on function public.restore_draft(uuid) from public;
grant execute on function public.trash_draft(uuid)   to authenticated;
grant execute on function public.restore_draft(uuid) to authenticated;

create or replace function public.purge_deleted_drafts(p_days int default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  delete from public.song_drafts
   where deleted_at is not null
     and deleted_at < now() - make_interval(days => p_days);
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.purge_deleted_drafts(int) from public;
grant execute on function public.purge_deleted_drafts(int) to service_role;

-- SCHEDULING (once, after commit, beside db/012's purge-trashed-songs):
--   select cron.schedule('purge-trashed-drafts', '15 3 * * *',
--                        $$ select public.purge_deleted_drafts(30); $$);

-- ── Verify after COMMIT ──────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name = 'song_drafts' and column_name = 'deleted_at';             -- 1 row
--   select proname from pg_proc
--    where proname in ('trash_draft', 'restore_draft', 'purge_deleted_drafts');   -- 3 rows

-- ═════════════════════════════════════════════════════════════════════════════
-- DRY RUN by default. Change to `commit;` to apply.
rollback;
-- ═════════════════════════════════════════════════════════════════════════════

-- ── UNDO a committed apply ──
--   drop function if exists public.trash_draft(uuid);
--   drop function if exists public.restore_draft(uuid);
--   drop function if exists public.purge_deleted_drafts(int);
--   alter table public.song_drafts drop column if exists deleted_at;   -- trashed drafts come back
