-- ============================================================================
-- reset-verified-false.sql
-- Set verified = false for EVERY song in public.songs (all books / categories).
--
-- WHY (P'Aim · quality reset 11 ก.ค.): display + editor still have bugs, so the
-- team re-reviews every song one at a time (starting เล่มอนุชน). Public will show
-- only verified songs (dev is adding the verified filter to SongList).
--
-- ⚠️ AFTER YOU RUN THIS: the live/public catalog goes EMPTY until each song is
--    re-verified by a human — this is INTENDED, not a bug.
--
-- Run by P'Aim (approver) in the Supabase SQL Editor. Claude/DA does NOT run this.
-- Confirm project = vlpuvaofbzdawgjjpgfu before running.
--
-- SAFE:
--   * Touches ONLY the `verified` column. Never deletes rows, never changes
--     content / title / category / review_flags / any other column.
--   * IDEMPOTENT — re-running is a no-op (every row is already false).
--   * SELF-CHECKING — counts verified rows before/after; if any row is still
--     verified=true afterward it RAISES and the whole change ROLLS BACK.
-- ============================================================================

begin;

do $$
declare
  before_true int;
  total_rows  int;
  after_true  int;
  changed     int;
begin
  select count(*) filter (where verified is true), count(*)
    into before_true, total_rows
    from public.songs;

  raise notice 'BEFORE: % of % songs had verified=true', before_true, total_rows;

  -- Only rows not already false (true OR null) → idempotent on re-run.
  update public.songs
     set verified = false
   where verified is distinct from false;
  get diagnostics changed = row_count;
  raise notice 'UPDATED: % rows set to verified=false', changed;

  select count(*) filter (where verified is true) into after_true from public.songs;
  raise notice 'AFTER: % songs verified=true (expect 0)', after_true;

  if after_true <> 0 then
    raise exception 'reset FAILED — % rows still verified=true, rolling back', after_true;
  end if;
end $$;

commit;

-- Verify (optional):
-- select verified, count(*) from public.songs group by verified order by verified;
