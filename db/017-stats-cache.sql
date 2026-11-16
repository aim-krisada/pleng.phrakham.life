-- 017 — Cache for หน้าสถิติ's Google numbers (ใบ v3/pleng#163, the ga-stats Edge Function).
--
-- WHY: the stats page must not ask Google every time someone opens it (slow, and the GA property is
-- shared with the main site's quota). supabase/functions/ga-stats keeps one answer per range here and
-- asks Google again only when it is older than a few hours.
--
-- WHO CAN READ: nobody from the web page. RLS is on with NO policies, so only the service role — which
-- only the Edge Function holds — reads or writes. The page always goes through the function, which
-- checks the login first (ISO 27001 A 8.3).
--
-- HOW TO RUN: paste into the Supabase SQL Editor and run. It ends with ROLLBACK, so BY DEFAULT it is a
-- DRY RUN. Then change the final `rollback;` to `commit;` and run once more. Idempotent.

begin;

create table if not exists public.stats_cache (
  days       integer primary key check (days in (7, 28, 90)),
  data       jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.stats_cache enable row level security;
revoke all on public.stats_cache from anon, authenticated;

-- ── Verify after COMMIT ──
--   select relrowsecurity from pg_class where relname = 'stats_cache';   -- true

-- ═══════════════════════════════════════════════════════════
-- DRY RUN by default. Change to `commit;` to apply.
rollback;
-- ═══════════════════════════════════════════════════════════

-- ── UNDO a committed apply ──
--   drop table if exists public.stats_cache;
