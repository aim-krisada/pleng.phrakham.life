-- 005 — Close the verified GATE at the RLS layer (public reads only verified songs).
-- Run once in the Supabase SQL Editor, AFTER 002/003/004.
--
-- WHY: the "public sees only verified songs" gate lived only in client code
-- (src/lib/bookshelf.js visibleSongs). The songs table still had a wide-open SELECT
-- policy (using true), so the anon publishable key could pull every unverified row
-- via the REST API directly (measured 2026-07-17: anon received 126 rows = 32 verified
-- + 94 unverified, and could read an unverified song's full content by id). Client-side
-- filtering is display, not security. RLS is the only real gate.
--
-- ⛔ USER-VISIBLE: enabling this removes all unverified songs from the PUBLIC site
--    immediately (today: 126 -> 32 public). Run ONLY when P'Aim has decided the timing.
--    Re-measure the live counts right before running (see the count query below).
--
-- Design: Postgres OR-combines permissive policies.
--   • anon + everyone   -> verified = true only   (null verified -> hidden)
--   • authenticated team -> all rows              (to review/fix unverified)
-- No src/ change is needed; every caller goes through the same table + anon key.

-- --- Pre-flight: measure what will disappear from the public site (run first, read it) ---
--   select count(*) filter (where verified) as public_after,
--          count(*) filter (where verified is not true) as hidden_from_public,
--          count(*) as total
--   from public.songs;

alter table public.songs enable row level security;  -- idempotent (already on since 002)

-- Drop every existing SELECT policy on songs by whatever name it has (the original
-- permissive read policy predates 002 and its name isn't in the repo) — name-independent.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'songs' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.songs', p.policyname);
  end loop;
end $$;

-- Public (incl. anon): only verified songs are visible.
create policy "Public reads verified songs" on public.songs
  for select using (verified = true);

-- The team (any authenticated user) reads everything, including unverified, so they can
-- open, review and fix songs before verifying them.
create policy "Authenticated reads all songs" on public.songs
  for select using (auth.role() = 'authenticated');

-- Write policies (insert/update/delete = approver-only) are unchanged from 002.

-- --- Verify after running ---
--   set role anon;  -- or query with the publishable key
--   select count(*) from public.songs;      -- must equal the verified count
--   reset role;

-- ===========================================================================
-- ROLLBACK — restore the fully-public read (visibility only; no data touched)
-- ===========================================================================
-- do $$
-- declare p record;
-- begin
--   for p in select policyname from pg_policies
--            where schemaname='public' and tablename='songs' and cmd='SELECT'
--   loop execute format('drop policy %I on public.songs', p.policyname); end loop;
-- end $$;
-- create policy "Public can read songs" on public.songs for select using (true);
