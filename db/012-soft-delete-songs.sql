-- 012 — Soft-delete for songs (Phase B: a delete you can take back).
--
-- HOW TO RUN: paste into the Supabase SQL Editor and run. It is wrapped in a transaction
-- that ends with ROLLBACK, so BY DEFAULT it is a DRY RUN — it changes nothing, but any
-- error (a missing table, a typo) still surfaces. Read the pre-flight NOTICE it prints,
-- then change the final `rollback;` to `commit;` and run once more to apply. Idempotent:
-- re-running the committed version is a no-op.
--
-- NUMBERING: 008 (notifications) and 009 (security-hardening) live on other unmerged
-- branches; 011 (duplicate-title-guard) is on main. 012 is the next number that collides
-- with none of them.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS MIGRATION DOES
--   1. songs.deleted_at (nullable timestamptz) — the ONLY delete state. A row with
--      deleted_at set is "in the trash": hidden from the public site, still recoverable
--      by the team. No separate backup table (P'Aim's locked model).
--
--   2. Two SECURITY DEFINER RPCs — the ONLY way deleted_at ever changes:
--        soft_delete_song(p_song_id uuid)  → deleted_at = now()   (moves to trash)
--        restore_song(p_song_id uuid)      → deleted_at = null     (brings it back)
--      Each enforces the locked permission model IN the function and touches ONLY
--      deleted_at — never content.
--
--   3. A BEFORE UPDATE guard trigger (guard_songs_deleted_at) that REJECTS any statement
--      changing deleted_at unless it arrives through one of those two RPCs (they set a
--      transaction-local flag). This is N's safety requirement:
--        • a role that can edit content can NEVER flip delete/restore via a content UPDATE
--        • an approver can NEVER edit content AND hide a row in one write to cover tracks
--      Delete-state and content are separated at the database layer, not just in the UI.
--
--   4. A RESTRICTIVE SELECT policy (hide_trashed_songs_from_public) so the anon/publishable
--      key can never read a trashed row over the REST API. Client-side filtering is display,
--      not security (the db/005 lesson). The team (any authenticated user) still reads
--      trashed rows, so the trash view + restore work.
--
--   5. purge_deleted_songs(p_days int default 30) — hard-deletes rows trashed longer than
--      the retention window and LOGS each one into song_purge_log first. Self-contained:
--      it does not depend on the 004 audit trigger being present on this line. Meant for a
--      scheduled job (pg_cron) running as service_role.
--
-- LOCKED PERMISSION MODEL (do not reinterpret):
--   • approver         → may soft-delete / restore ANY song (all songs rows are published)
--   • published song   → approver only  ← every row in `songs` is a published song
--   • owner-own-draft  → OUT OF SCOPE here: a draft is a row in `song_drafts`, not `songs`,
--                        and already has its own DELETE policy (db/002). See the report for
--                        the phase-B.2 recommendation (restrict to unapproved + soft-delete
--                        drafts too). This migration is the songs (published) side only.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── Guard: the objects this migration builds on must already exist (from 001/002). ──
do $$
begin
  if to_regclass('public.songs') is null then
    raise exception 'public.songs is missing — run the base schema first';
  end if;
  if to_regprocedure('public.app_role()') is null then
    raise exception 'public.app_role() is missing — run db/002 first';
  end if;
end $$;

-- ── 1. The delete state ──────────────────────────────────────────────────────
alter table public.songs
  add column if not exists deleted_at timestamptz;   -- null = live, set = in the trash
comment on column public.songs.deleted_at is
  'Soft-delete timestamp. Null = live. Set = in the trash (hidden from public, recoverable). '
  'Only ever changed through soft_delete_song()/restore_song(). See db/012.';

-- Partial index: the public/team lists all filter deleted_at IS NULL, so index the live rows.
create index if not exists songs_live_idx on public.songs (id) where deleted_at is null;

-- Pre-flight (prints during the dry run so P'Aim sees the current trash state).
do $$
declare v_trashed int; v_total int;
begin
  select count(*) filter (where deleted_at is not null), count(*)
    into v_trashed, v_total from public.songs;
  raise notice 'Pre-flight: % of % songs are currently in the trash', v_trashed, v_total;
end $$;

-- ── 2 + 3. The delete-state guard, then the two RPCs that are allowed past it ──
-- The guard rejects EVERY change to deleted_at that does not carry the transaction-local
-- pass that the RPCs set. INSERTs are untouched (new rows default deleted_at = null).
create or replace function public.guard_songs_deleted_at()
returns trigger language plpgsql as $$
begin
  if new.deleted_at is distinct from old.deleted_at
     and coalesce(current_setting('app.soft_delete_pass', true), '') <> 'on' then
    raise exception
      'songs.deleted_at may only change through soft_delete_song()/restore_song()';
  end if;
  return new;
end $$;

drop trigger if exists guard_songs_deleted_at on public.songs;
create trigger guard_songs_deleted_at
  before update on public.songs
  for each row execute function public.guard_songs_deleted_at();

-- soft_delete_song — move a published song to the trash. Approver only.
create or replace function public.soft_delete_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_exists boolean;
begin
  if public.app_role() is distinct from 'approver' then
    raise exception 'only approvers can delete a published song';
  end if;

  select true into v_exists from public.songs where id = p_song_id;
  if not found then
    raise exception 'song % not found', p_song_id;
  end if;

  -- Open the guard for THIS statement only (transaction-local; never leaks on a pooled conn).
  perform set_config('app.soft_delete_pass', 'on', true);
  update public.songs
     set deleted_at = now()
   where id = p_song_id and deleted_at is null;   -- idempotent: already-trashed stays put
  perform set_config('app.soft_delete_pass', 'off', true);
end $$;

-- restore_song — bring a song back from the trash. Approver only.
create or replace function public.restore_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() is distinct from 'approver' then
    raise exception 'only approvers can restore a song';
  end if;

  if not exists (select 1 from public.songs where id = p_song_id) then
    raise exception 'song % not found', p_song_id;
  end if;

  perform set_config('app.soft_delete_pass', 'on', true);
  update public.songs
     set deleted_at = null
   where id = p_song_id and deleted_at is not null;
  perform set_config('app.soft_delete_pass', 'off', true);
end $$;

grant execute on function public.soft_delete_song(uuid) to authenticated;
grant execute on function public.restore_song(uuid)     to authenticated;

-- ── 4. Public may never read a trashed row (defense in depth over the client filter) ──
-- RESTRICTIVE policies are AND-ed onto whatever permissive SELECT policy already exists
-- (the wide-open read on this line, or db/005's verified gate elsewhere) — so this hides
-- trashed rows from anon WITHOUT re-deciding the verified-gate question (that stays db/005).
drop policy if exists "hide_trashed_songs_from_public" on public.songs;
create policy "hide_trashed_songs_from_public" on public.songs
  as restrictive for select
  using (deleted_at is null or auth.role() = 'authenticated');

-- ── 5. Auto-purge after the retention window, with its own log ────────────────
-- Self-contained purge log (does not rely on the 004 audit trigger being installed here).
create table if not exists public.song_purge_log (
  id         bigint generated always as identity primary key,
  song_id    uuid,
  title_th   text,
  number     integer,
  deleted_at timestamptz,   -- when it went to the trash
  purged_at  timestamptz default now(),
  snapshot   jsonb          -- the whole row, so a purge is never a silent vanish
);
alter table public.song_purge_log enable row level security;
drop policy if exists "authenticated_reads_purge_log" on public.song_purge_log;
create policy "authenticated_reads_purge_log" on public.song_purge_log
  for select using (auth.role() = 'authenticated');
-- No client write policy: only purge_deleted_songs() (security definer) writes here.

create or replace function public.purge_deleted_songs(p_days int default 30)
returns integer   -- how many songs were purged
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  with doomed as (
    select * from public.songs
     where deleted_at is not null
       and deleted_at < now() - make_interval(days => p_days)
  ),
  logged as (
    insert into public.song_purge_log (song_id, title_th, number, deleted_at, snapshot)
    select id, title_th, number, deleted_at, to_jsonb(doomed) from doomed
    returning song_id
  )
  select count(*) into v_count from logged;

  -- The guard trigger is BEFORE UPDATE only; DELETE passes through untouched.
  delete from public.songs
   where deleted_at is not null
     and deleted_at < now() - make_interval(days => p_days);

  return v_count;
end $$;

-- Purge is destructive maintenance for a scheduled job (pg_cron), NOT an app user. Grant
-- to service_role only; do NOT grant to authenticated.
revoke all on function public.purge_deleted_songs(int) from public;
grant execute on function public.purge_deleted_songs(int) to service_role;

-- SCHEDULING (P'Aim, after commit — one time, in the SQL editor):
--   select cron.schedule('purge-trashed-songs', '0 3 * * *',
--                        $$ select public.purge_deleted_songs(30); $$);
-- (needs the pg_cron extension enabled once: create extension if not exists pg_cron;)

-- ── Verify after COMMIT ──────────────────────────────────────────────────────
--   select column_name from information_schema.columns
--    where table_name='songs' and column_name='deleted_at';           -- exists
--   select proname from pg_proc
--    where proname in ('soft_delete_song','restore_song','purge_deleted_songs');  -- 3 rows
--   -- as anon (publishable key): a trashed song must return 0 rows.

-- ═════════════════════════════════════════════════════════════════════════════
-- DRY RUN by default. Change to `commit;` to apply.
rollback;
-- ═════════════════════════════════════════════════════════════════════════════

-- ── ROLLBACK (undo a COMMITTED apply — visibility/logic only; data is untouched) ──
-- begin;
--   drop trigger if exists guard_songs_deleted_at on public.songs;
--   drop function if exists public.guard_songs_deleted_at();
--   drop function if exists public.soft_delete_song(uuid);
--   drop function if exists public.restore_song(uuid);
--   drop function if exists public.purge_deleted_songs(int);
--   drop policy if exists "hide_trashed_songs_from_public" on public.songs;
--   drop index if exists public.songs_live_idx;
--   -- songs.deleted_at + song_purge_log are LEFT IN PLACE on purpose (dropping deleted_at
--   -- would lose the trash state). Remove them by hand only if you are certain.
-- commit;
