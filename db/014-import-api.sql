-- 014 — A safe door for AI to send in song drafts (ใบ v1#158).
-- Run once in the Supabase SQL Editor, AFTER 002/004/010/012. Additive only; idempotent.
--
-- HOW TO RUN: paste the WHOLE file into the SQL Editor and press Run. It is one transaction
-- (begin … commit), so either everything is installed or nothing is. Re-running is a no-op.
-- Then do the one-time setup at the very bottom (create the import account + its key).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS MIGRATION DOES
--   1. public.import_keys — the list of import keys. Only the SHA-256 HASH of each key is
--      stored, never the key itself, and each key belongs to one import account
--      (author_id). A key can be switched off at any time (revoked_at).
--
--   2. public.import_draft(p_key, p_draft) — the ONLY thing the import key can do: create
--      ONE song draft that lands in the approver's normal review queue (status 'pending').
--      It is callable with the site's publishable key + the secret import key, so no one
--      has to share a password with the AI.
--
-- WHY: the owner wants AI to send songs in (English lyrics for existing songs first, whole
-- new songs later). Until now only a logged-in person could create a draft. An import key
-- is narrower than a login: it cannot read anything, cannot touch other drafts, and can
-- never publish.
--
-- SAFETY (what the import key can and cannot do):
--   • CAN:    insert one song_drafts row per call, always status 'pending', always owned
--             by the key's import account. That is all.
--   • CANNOT: publish, approve, reject, edit or delete a song; read or change any other
--             draft; read import_keys; pick its own author or status. The function writes
--             only song_drafts (one new row) and import_keys.last_used_at.
--   • Every key failure (missing, wrong, revoked) gives the SAME message 'invalid import
--     key', and the key is checked BEFORE the draft, so a caller without a key learns
--     nothing. The lookup is by hash on a unique index (no per-character comparison).
--   • Draft checks: only known fields; title_th required (≤ 200 chars); content must be an
--     object; whole draft ≤ 300 kB; song_id, if given, must be a live (not trashed) song;
--     category must be one of the three books.
--   • Rate limit: at most 200 drafts per import account in any 24 hours. The key row is
--     locked for the call, so parallel calls cannot slip past the count.
--   • The approver (พี่เปา) reviews and approves it exactly like a human editor's draft —
--     publishing still goes only through approve_and_publish() (004), approver only.
--
-- A DRAFT OF AN EXISTING SONG (song_id given): any of number / title_en / category / theme
-- that the import leaves out (or sends as null/empty) is copied from the published song, like a person's draft of
-- that song starts as a copy. Otherwise approving it would blank those fields on the song
-- (approve_and_publish writes them straight across).
--
-- PERMISSIONS: import_keys has row level security ON and NO policies, and anon/authenticated
-- get no table rights — no client can read or write it; only the owner (SQL Editor) and
-- import_draft() (security definer) can. import_draft is executable by anon + authenticated
-- (the key inside the call is the real check); everyone else's default right is revoked.
--
-- AUDIT: the 004 trigger (log_song_event) records the actor as auth.uid(). Before writing,
-- import_draft sets the request's user to the import account (transaction-local, so it can
-- never leak to another request), and refuses to continue if auth.uid() does not come back
-- as that account. So the history shows "สร้าง" then "ส่งตรวจ" by the import account's
-- display name (e.g. "AI นำเข้า"), exactly as a person who saves and then presses ส่งตรวจ.
--
-- HASH: uses Postgres's built-in sha256() (PG 11+), so no extension is needed — on Supabase
-- pgcrypto lives in the `extensions` schema, which this function's search_path does not see.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── Guard: the objects this builds on must already exist ─────────────────────
do $$
begin
  if to_regclass('public.song_drafts') is null or to_regclass('public.profiles') is null then
    raise exception 'song_drafts / profiles missing — run db/002 first';
  end if;
  if to_regprocedure('public.log_song_event()') is null then
    raise exception 'log_song_event() missing — run db/004 first';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'song_drafts' and column_name = 'category') then
    raise exception 'song_drafts.category missing — run db/010 first';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'songs' and column_name = 'deleted_at') then
    raise exception 'songs.deleted_at missing — run db/012 first';
  end if;
end $$;

-- ── 1. The keys (hash only) ──────────────────────────────────────────────────
create table if not exists public.import_keys (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  key_hash     text not null unique,            -- lowercase hex SHA-256 of the key
  author_id    uuid not null references auth.users(id),
  created_at   timestamptz default now(),
  revoked_at   timestamptz,                      -- set = the key no longer works
  last_used_at timestamptz
);
comment on table public.import_keys is
  'Import keys for import_draft() (db/014). Stores only the SHA-256 hash. No client access.';

alter table public.import_keys enable row level security;
-- No policies on purpose: no client can read or write this table.
revoke all on table public.import_keys from anon, authenticated;

-- ── 2. The one thing a key can do ────────────────────────────────────────────
create or replace function public.import_draft(p_key text, p_draft jsonb)
returns uuid   -- the new draft's id
language plpgsql
security definer
set search_path = public
as $$
declare
  k          public.import_keys%rowtype;
  s          public.songs%rowtype;
  v_allowed  constant text[] := array['song_id','number','title_th','title_en','content','category','theme','note'];
  v_unknown  text;
  v_song_id  uuid;
  v_number   int;
  v_title_th text;
  v_title_en text;
  v_category text;
  v_theme    text;
  v_note     text;
  v_recent   int;
  v_id       uuid;
begin
  -- (a) The key — checked first, one message for every failure.
  if p_key is null or length(p_key) not between 16 and 256 then
    raise exception 'invalid import key' using errcode = '28000';
  end if;
  select * into k from public.import_keys
   where key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
     and revoked_at is null
   for update;                       -- serialises calls per key (rate limit cannot be raced)
  if not found then
    raise exception 'invalid import key' using errcode = '28000';
  end if;

  -- (b) The draft's shape.
  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then
    raise exception 'draft must be a JSON object' using errcode = '22023';
  end if;
  if octet_length(p_draft::text) > 300 * 1024 then
    raise exception 'draft is larger than 300 kB' using errcode = '22023';
  end if;
  select string_agg(f, ', ' order by f) into v_unknown
    from jsonb_object_keys(p_draft) f where f <> all (v_allowed);
  if v_unknown is not null then
    raise exception 'unknown field(s): %', v_unknown using errcode = '22023';
  end if;

  if jsonb_typeof(p_draft->'title_th') is distinct from 'string'
     or btrim(p_draft->>'title_th') = '' then
    raise exception 'title_th is required' using errcode = '22023';
  end if;
  v_title_th := btrim(p_draft->>'title_th');
  if char_length(v_title_th) > 200 then
    raise exception 'title_th is longer than 200 characters' using errcode = '22023';
  end if;

  if jsonb_typeof(p_draft->'content') is distinct from 'object' then
    raise exception 'content must be a JSON object' using errcode = '22023';
  end if;

  if coalesce(jsonb_typeof(p_draft->'title_en'), 'null') not in ('null', 'string')
     or char_length(coalesce(p_draft->>'title_en', '')) > 200 then
    raise exception 'title_en must be text of at most 200 characters' using errcode = '22023';
  end if;

  if coalesce(jsonb_typeof(p_draft->'number'), 'null') <> 'null' then
    if jsonb_typeof(p_draft->'number') <> 'number' or (p_draft->>'number') !~ '^[1-9][0-9]{0,4}$' then
      raise exception 'number must be a whole number from 1 to 99999' using errcode = '22023';
    end if;
  end if;

  if coalesce(jsonb_typeof(p_draft->'category'), 'null') not in ('null', 'string')
     or (p_draft->>'category') not in ('lem-yai', 'anuchon', 'dek-lek') then
    raise exception 'category must be lem-yai, anuchon or dek-lek' using errcode = '22023';
  end if;

  if coalesce(jsonb_typeof(p_draft->'theme'), 'null') not in ('null', 'string')
     or char_length(coalesce(p_draft->>'theme', '')) > 100 then
    raise exception 'theme must be text of at most 100 characters' using errcode = '22023';
  end if;

  if coalesce(jsonb_typeof(p_draft->'note'), 'null') not in ('null', 'string')
     or char_length(coalesce(p_draft->>'note', '')) > 1000 then
    raise exception 'note must be text of at most 1000 characters' using errcode = '22023';
  end if;

  if coalesce(jsonb_typeof(p_draft->'song_id'), 'null') not in ('null', 'string')
     or (p_draft->>'song_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'song_id must be a song id' using errcode = '22023';
  end if;
  v_song_id := (p_draft->>'song_id')::uuid;

  v_number   := (p_draft->>'number')::int;
  v_title_en := nullif(btrim(p_draft->>'title_en'), '');
  v_category := p_draft->>'category';
  v_theme    := nullif(btrim(p_draft->>'theme'), '');
  v_note     := nullif(btrim(p_draft->>'note'), '');

  -- (c) A draft of an existing song: the song must be live; fill what the import left out.
  if v_song_id is not null then
    select * into s from public.songs where id = v_song_id and deleted_at is null;
    if not found then
      raise exception 'song_id does not match a song on the site' using errcode = '22023';
    end if;
    v_number   := coalesce(v_number,   s.number);
    v_title_en := coalesce(v_title_en, s.title_en);
    v_category := coalesce(v_category, s.category);
    v_theme    := coalesce(v_theme,    s.theme);
  end if;

  -- (d) Rate limit per import account.
  select count(*) into v_recent from public.song_drafts
   where author_id = k.author_id and created_at > now() - interval '24 hours';
  if v_recent >= 200 then
    raise exception 'import limit reached: 200 drafts in 24 hours' using errcode = 'P0001';
  end if;

  -- (e) Act as the import account for the rest of THIS transaction only (is_local = true),
  --     so the 004 audit trigger snapshots its name. Supabase's auth.uid() reads
  --     request.jwt.claim.sub first, then request.jwt.claims->>'sub'; set both.
  perform set_config('request.jwt.claim.sub', k.author_id::text, true);
  perform set_config('request.jwt.claims',
    (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
       || jsonb_build_object('sub', k.author_id::text))::text, true);
  if auth.uid() is distinct from k.author_id then
    raise exception 'import identity could not be applied — nothing was saved';
  end if;

  -- (f) Write: save, then send for review — the same two steps (สร้าง → ส่งตรวจ) a person
  --     takes, so the history reads the same as a human editor's draft.
  insert into public.song_drafts
    (song_id, number, title_th, title_en, content, category, theme, status, author_id, review_comment)
  values
    (v_song_id, v_number, v_title_th, v_title_en, p_draft->'content', v_category, v_theme,
     'draft', k.author_id, 'นำเข้าอัตโนมัติ' || coalesce(': ' || v_note, ''))
  returning id into v_id;

  update public.song_drafts set status = 'pending' where id = v_id;

  update public.import_keys set last_used_at = now() where id = k.id;

  return v_id;
end $$;

revoke all on function public.import_draft(text, jsonb) from public;
grant execute on function public.import_draft(text, jsonb) to anon, authenticated;

commit;

-- ── Verify (run after) ───────────────────────────────────────────────────────
--   select proname, prosecdef from pg_proc where proname = 'import_draft';   -- 1 row, true
--   select relrowsecurity from pg_class where oid = 'public.import_keys'::regclass;  -- true

-- ═════════════════════════════════════════════════════════════════════════════
-- ONE-TIME SETUP (after the run above) — owner only
-- ═════════════════════════════════════════════════════════════════════════════
-- Step 1. Dashboard → Authentication → Users → Add user → Create new user
--         Email: import-ai@phrakham.life · Password: any long random text (nobody needs it)
--         · tick "Auto Confirm User" → Create user.
--         (The 002 trigger gives it a profile with role 'editor' automatically.)
--
-- Step 2. On your own computer, in the project folder:  node tools/make-import-key.mjs
--         Line 1 = the KEY  → keep it private (give it to the AI's machine only).
--         Line 2 = the HASH → paste it below in place of <sha256 hex>.
--
-- Step 3. Paste this into the SQL Editor (only the hash goes in — never the key) and Run:
--
--   update public.profiles
--      set display_name = 'AI นำเข้า', role = 'editor'
--    where id = (select id from auth.users where email = 'import-ai@phrakham.life');
--
--   insert into public.import_keys (name, key_hash, author_id)
--   select 'AI นำเข้า', '<sha256 hex>', id
--     from auth.users where email = 'import-ai@phrakham.life';
--
-- (If you prefer the user's id: insert into public.import_keys (name, key_hash, author_id)
--  values ('AI นำเข้า', '<sha256 hex>', '<user uuid>');)
--
-- TO SWITCH A KEY OFF (takes effect immediately):
--   update public.import_keys set revoked_at = now() where name = 'AI นำเข้า' and revoked_at is null;
-- To issue a new key afterwards, repeat steps 2 + 3 (insert only) with the new hash.
--
-- SEE WHAT CAME IN:
--   select id, title_th, status, created_at from public.song_drafts
--    where author_id = (select id from auth.users where email = 'import-ai@phrakham.life')
--    order by created_at desc;
