-- 016 — ล้างถังขยะ: empty the whole trash now, songs and drafts (ใบ v3/pleng#175 under #162).
--
-- WHY: พี่เปา (approver) asked, through P'Aim on 16 พ.ย. 2569, that the trash give two ways out:
-- (1) wait 30 days and it deletes itself — the pg_cron jobs from db/012 + db/015, scheduled 16 พ.ย.;
-- (2) empty the trash now. This file is (2).
--
-- HOW TO RUN: paste into the Supabase SQL Editor and run. It ends with ROLLBACK, so BY DEFAULT it
-- is a DRY RUN — it changes nothing, but any error still surfaces. Then change the final
-- `rollback;` to `commit;` and run once more to apply. Idempotent: re-running is a no-op.
-- Needs db/012 (purge_deleted_songs) and db/015 (purge_deleted_drafts) applied first.
--
-- The web app works before AND after this runs: until it exists, จัดการ ▸ ถังขยะ shows no
-- ล้างถังขยะ button; once it exists, the button shows for an approver when the trash is not empty.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS MIGRATION DOES
--   empty_trash(p_confirm boolean default false) returns jsonb {"songs": n, "drafts": n}
--     • approver only — checked here, not just in the page
--     • p_confirm = false → counts only, deletes nothing (the page uses it to word the question,
--       and to know the function exists)
--     • p_confirm = true  → deletes EVERYTHING in the trash, through the same purge functions the
--       daily job uses with a window of 0 days — so each song is logged into song_purge_log first,
--       exactly as an automatic purge, and live songs / live drafts are never touched.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

do $$
begin
  if to_regprocedure('public.purge_deleted_songs(integer)') is null then
    raise exception 'public.purge_deleted_songs is missing — run db/012 first';
  end if;
  if to_regprocedure('public.purge_deleted_drafts(integer)') is null then
    raise exception 'public.purge_deleted_drafts is missing — run db/015 first';
  end if;
end $$;

create or replace function public.empty_trash(p_confirm boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_songs int; v_drafts int;
begin
  if public.app_role() is distinct from 'approver' then
    raise exception 'only approvers can empty the trash' using errcode = '42501';
  end if;

  if not coalesce(p_confirm, false) then
    select count(*) into v_songs  from public.songs       where deleted_at is not null;
    select count(*) into v_drafts from public.song_drafts where deleted_at is not null;
    return jsonb_build_object('songs', v_songs, 'drafts', v_drafts);
  end if;

  -- window 0 = everything already in the trash (deleted_at < now(), i.e. before this call)
  v_songs  := public.purge_deleted_songs(0);
  v_drafts := public.purge_deleted_drafts(0);
  return jsonb_build_object('songs', v_songs, 'drafts', v_drafts);
end $$;

revoke all on function public.empty_trash(boolean) from public;
grant execute on function public.empty_trash(boolean) to authenticated;

-- ── Verify after COMMIT ──────────────────────────────────────────────────────
--   select proname from pg_proc where proname = 'empty_trash';   -- 1 row

-- ═════════════════════════════════════════════════════════════════════════════
-- DRY RUN by default. Change to `commit;` to apply.
rollback;
-- ═════════════════════════════════════════════════════════════════════════════

-- ── UNDO a committed apply ──
--   drop function if exists public.empty_trash(boolean);
