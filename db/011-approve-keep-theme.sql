-- 011 — approve_and_publish must never wipe a field it was not told about (B108 "ประตูที่สอง").
-- Run once in the Supabase SQL Editor. Independent of 007/008/009. Requires 006 to be live.
--
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- BUG
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- The UPDATE branch of approve_and_publish (db/004, unchanged by db/006) assigns four columns
-- OUTRIGHT from the payload:
--
--     number   = nullif(p_song->>'number','')::int
--     title_en = p_song->>'title_en'
--     theme    = p_song->>'theme'          <-- the one that is biting us
--
-- `p_song->>'x'` is NULL both when the caller sent null AND when the caller never mentioned
-- the field at all. So a payload that omits `theme` does not mean "leave it alone" — it means
-- "set it to null". Every approve of a draft whose ธีม could not be resolved wiped the song's
-- ธีม, and the same shape would wipe title_en / number.
--
-- Impact measured on live data (read-only, 23 Jul 2026): 162 published songs · 80 carry a ธีม ·
-- 80 live outside เล่มอนุชน (เล่มใหญ่ 54 · เด็กเล็ก 26). Every one of those was one approve away
-- from losing it.
--
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- FIX — PATCH semantics: "key present = write it · key absent = keep what is stored"
-- ─────────────────────────────────────────────────────────────────────────────────────────
--     theme = case when p_song ? 'theme' then nullif(p_song->>'theme','') else theme end
--
-- `p_song ? 'theme'` asks whether the JSON object HAS the key, which is exactly the signal
-- the client already sends: EditorMode.approve() attaches `category`/`theme` only when that
-- field is genuine (B108 client fix, live on `main` and on the base branch alike).
--   * key absent  → unknown → the stored value is kept. Nothing can be lost.
--   * key present, real value → written, as before.
--   * key present, null/'' → the user deliberately cleared it → cleared, as before.
-- So clearing a ธีม on purpose still works; only the "we never knew" case changed, and it
-- changed from destroying data to leaving it alone.
--
-- Same treatment for `number` and `title_en` (identical shape, identical risk). `category`
-- keeps its coalesce and additionally ignores an empty string, so a blank can never blank a
-- book. `title_th` / `content` / `review_flags` already coalesced and are untouched.
--
-- The INSERT branch is byte-for-byte db/006 (including the author_id fix): a brand-new song
-- has no stored value to protect.
--
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- SAFETY
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- * No data is read, written, moved or deleted. This migration only redefines one function.
-- * No downtime: `create or replace function` swaps the body inside one transaction. Calls in
--   flight finish on the old body, the next call uses the new one. Nothing is dropped, so the
--   grant, the signature and the oid all survive — nothing can hit a "function not found".
-- * The live v1 app on `main` keeps working unchanged: it always sends number, title_th,
--   title_en, content, review_flags, and sends category/theme only when known — the exact
--   contract this fix implements. No client change is required, in either direction.
-- * Strictly safer than today in every case: an argument we understand behaves as before, an
--   argument we do NOT understand now leaves the stored value alone instead of nulling it.
-- * Idempotent: re-running detects its own fix and exits with a notice.
-- * GUARDED: it refuses to run unless what is live is really the db/006 version. If someone
--   hand-edited the function on the server, this aborts and prints the live definition
--   instead of overwriting the edit. (Written because nobody could confirm from outside that
--   the server matched the repo — the publishable API key cannot read pg_proc.)
-- * Rollback: db/011-rollback-approve-keep-theme.sql restores db/006 exactly.
--
-- ⚠️ ORDER: SQL FIRST, code after (there is no code change in this fix, but if one follows).
--    The new behaviour is a superset of the old one, so old code + new SQL is a valid state.

do $mig$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'approve_and_publish'
    and pg_get_function_identity_arguments(p.oid) = 'p_draft_id uuid, p_song jsonb, p_review_comment text';

  if v_def is null then
    raise exception
      'STOP: public.approve_and_publish(uuid, jsonb, text) does not exist on this database. '
      'Do not continue — report to PM.';
  end if;

  -- already fixed? (idempotent re-run)
  if v_def ~ 'p_song\s*\?\s*''theme''' then
    raise notice '011 already applied — approve_and_publish already keeps an unmentioned theme. Nothing to do.';
    return;
  end if;

  -- must be the db/006 version: the author_id fix has to be in place, otherwise this database
  -- is behind the repo and replacing the body would silently apply 006 as a side effect.
  if v_def !~ 'd\.author_id' then
    raise exception
      'STOP: the live function is not the db/006 version (the d.author_id fix is missing). '
      'Run db/006 first, or report to PM. Live definition follows:%', chr(10) || v_def;
  end if;

  -- must be the shape 011 expects — every assignment we are about to rewrite, and no column
  -- outside the set db/006 knows about (someone may have extended it by hand).
  if v_def !~ 'theme\s*=\s*p_song->>''theme'''
     or v_def !~ 'number\s*=\s*nullif\(p_song->>''number'''
     or v_def !~ 'title_en\s*=\s*p_song->>''title_en'''
     or v_def !~ 'category\s*=\s*coalesce\(p_song->>''category'''
     or v_def ~ 'book_refs|scripture|verified|slug' then
    raise exception
      'STOP: the live approve_and_publish differs from db/006 — it was changed outside the repo. '
      'Nothing has been modified. Send the definition below to PM before running anything.%',
      chr(10) || v_def;
  end if;

  raise notice 'Live function matches db/006. Replacing with the 011 version…';

  execute $ddl$
create or replace function public.approve_and_publish(
  p_draft_id       uuid,
  p_song           jsonb,
  p_review_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  d         public.song_drafts%rowtype;
  v_song_id uuid;
  v_group   uuid := gen_random_uuid();
begin
  if public.app_role() is distinct from 'approver' then
    raise exception 'only approvers can approve and publish';
  end if;

  select * into d from public.song_drafts where id = p_draft_id;
  if not found then
    raise exception 'draft % not found', p_draft_id;
  end if;

  perform set_config('app.audit_group', v_group::text, true);

  if d.song_id is null then
    -- NEW song: nothing stored yet, so there is nothing to protect. Identical to db/006.
    insert into public.songs (number, title_th, title_en, content, category, theme, review_flags, author_id)
    values (
      nullif(p_song->>'number', '')::int,
      coalesce(p_song->>'title_th', d.title_th),
      p_song->>'title_en',
      coalesce(p_song->'content', d.content),
      coalesce(p_song->>'category', 'anuchon'),
      p_song->>'theme',
      coalesce(p_song->'review_flags', '[]'::jsonb),
      d.author_id          -- db/006: credit the draft's writer, not the approver
    )
    returning id into v_song_id;
  else
    v_song_id := d.song_id;
    -- EXISTING song: PATCH semantics — a key the caller did not send is a key we keep.
    update public.songs set
      number       = case when p_song ? 'number'   then nullif(p_song->>'number', '')::int else number   end,
      title_th     = coalesce(p_song->>'title_th', title_th),
      title_en     = case when p_song ? 'title_en' then nullif(p_song->>'title_en', '')    else title_en end,
      content      = coalesce(p_song->'content', content),
      category     = coalesce(nullif(p_song->>'category', ''), category),
      theme        = case when p_song ? 'theme'    then nullif(p_song->>'theme', '')       else theme    end,
      review_flags = coalesce(p_song->'review_flags', review_flags)
    where id = v_song_id;
  end if;

  update public.song_drafts set
    status         = 'approved',
    song_id        = v_song_id,
    review_comment = coalesce(p_review_comment, review_comment)
  where id = p_draft_id;

  return v_song_id;
end $fn$;
  $ddl$;

  execute 'grant execute on function public.approve_and_publish(uuid, jsonb, text) to authenticated';

  raise notice '011 applied.';
end
$mig$;

-- --- Verify (read-only, run after) ---
--   select pg_get_functiondef(p.oid)
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname = 'approve_and_publish';
--   -- the UPDATE branch must read:  theme = case when p_song ? 'theme' then ... else theme end
