-- ============================================================================
-- 011-duplicate-title-guard.sql — stop the SAME song being added to the library twice.
-- Run by P'Aim (approver) in the Supabase SQL Editor. Claude does NOT run this.
-- ⚠️ NOT YET APPROVED — read §0 first; step 1 deliberately fails while the two known
--    duplicates are still in the table.
--
-- WHY a database guard and not only the app: songs enter the library through THREE doors —
-- typing a new song, renaming one onto an existing name, and a bulk import of a book that
-- was converted by AI. The app now guards the first two (src/lib/songTitleKey.js +
-- EditorMode), but the bulk import does NOT go through the app at all: it is SQL/REST run
-- outside the site (see tools/hymnal-samples/s032.sql). A guard that lives only in the Vue
-- app cannot see that traffic. This one sits under every door at once.
--
-- THE RULE IT ENFORCES (P'Aim, 27 ก.ค.): one title per เล่ม (`category`). The same title in
-- a DIFFERENT เล่ม is legitimate and stays allowed. "Similar" titles are a warning only and
-- are NOT enforced here — a database has to be certain, and near-misses are for a human.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- §0. LOOK FIRST — what is already doubled up (read-only, safe to run any time).
--     As of 27 ก.ค. this returns 2 pairs, both in เด็กเล็ก:
--       "พระเยซูทรงรักเด็กๆ"        · "พระดำรัสชิมหวานสักปานใด"
--     Step 2 CANNOT be applied until each pair is resolved (keep one, remove the other) —
--     which is the point: the guard makes the existing mess visible instead of adding to it.
-- ---------------------------------------------------------------------------
-- select public.song_title_key(title_th) as key, coalesce(category,'(ไม่มีเล่ม)') as book,
--        count(*), array_agg(id), array_agg(title_th)
--   from public.songs group by 1,2 having count(*) > 1;

begin;

-- ---------------------------------------------------------------------------
-- §1. The comparison key — the SQL twin of titleKeyExact() in src/lib/songTitleKey.js.
--     Keep the two in step: same normalisation = the app and the database always agree on
--     what "the same name" means. Both KEEP tone marks and vowels (a different tone is a
--     different word) and both ignore spacing, a pasted catalog number, the สระอำ encoding
--     variant, zero-width characters and Latin letter case.
-- ---------------------------------------------------------------------------
create or replace function public.song_title_key(t text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(                                        -- 4. drop ALL whitespace
      regexp_replace(                                      -- 3. drop a leading catalog number
        regexp_replace(                                    -- 2. drop zero-width characters
          replace(normalize(coalesce(t, ''), NFC), 'ํา', 'ำ'),  -- 1. นิคหิต+สระอา -> สระอำ
          '[​-‍﻿­]', '', 'g'),
        '^[[:space:]0-9๐-๙]*[.．·)\]\-–—:]*[[:space:]]*', ''),
      '[[:space:]]', '', 'g')
  );
$$;

-- ---------------------------------------------------------------------------
-- §2. The guard itself — a PARTIAL unique index, checked by the database on every write from
--     every client (app, REST, a bulk-import script), and impossible to forget.
--     Songs with no เล่ม are compared with each other under one bucket, never against a
--     filed song (same rule as the app: we cannot know which เล่ม they were meant for).
--
--     Why partial, and why the extra column: a plain unique index would also kill the
--     approver's "these really are two different songs" escape hatch that P'Aim asked for
--     (G, 27 ก.ค.). `duplicate_ok` is that hatch, and it is deliberately awkward — the row
--     must SAY it is a knowing exception. A bulk import that does not set it (none do) is
--     still refused; the app sets it only after an approver answered a confirm that named
--     the song being duplicated.
--
--     ⚠️ This will FAIL while the §0 duplicates exist. That is intended — resolve them first.
-- ---------------------------------------------------------------------------
alter table public.songs
  add column if not exists duplicate_ok boolean not null default false;

comment on column public.songs.duplicate_ok is
  'B-DUP: an approver knowingly allowed this song to share a title inside its เล่ม. Never set by an import.';

create unique index if not exists songs_one_title_per_book
  on public.songs (coalesce(category, '__none__'), public.song_title_key(title_th))
  where duplicate_ok is false;

comment on index public.songs_one_title_per_book is
  'B-DUP: one song title per เล่ม (category). Same title in another เล่ม is allowed.';

commit;

-- KNOWN GAP, on purpose: `approve_and_publish()` (db/002) writes through an RPC whose
-- signature this migration does not change, so an approver publishing a DRAFT cannot set
-- duplicate_ok and will simply be refused by the index. Publishing the same song from the
-- editor (เผยแพร่) carries the flag and works. Widen the RPC only if P'Aim hits that case.

-- ---------------------------------------------------------------------------
-- §3. Standing report — run any time to see what would clash today.
-- ---------------------------------------------------------------------------
-- select a.id, a.number, a.title_th, a.category, b.id, b.number, b.title_th
--   from public.songs a join public.songs b
--     on a.id < b.id
--    and coalesce(a.category,'__none__') = coalesce(b.category,'__none__')
--    and public.song_title_key(a.title_th) = public.song_title_key(b.title_th)
--  order by a.category, a.number;
