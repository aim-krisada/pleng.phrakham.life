-- 011 — approve_and_publish must never wipe a field it was not told about (B108 "ประตูที่สอง").
-- Run once in the Supabase SQL Editor. Requires db/010 (already live).
--
-- ⚠️ WRITTEN AGAINST THE LIVE FUNCTION, NOT AGAINST THE REPO. P'Aim ran
--    `select pg_get_functiondef('public.approve_and_publish(uuid,jsonb,text)'::regprocedure);`
--    on 23 Jul 2026 and what is deployed is the **db/004** body: the insert branch still
--    credits `auth.uid()`. **db/006 (the author_id fix) was never deployed.** Everything below
--    keeps `auth.uid()` exactly as it is — applying 006 as a side effect of this migration
--    would be a second, unrequested behaviour change. 006 stays a separate decision for PM.
--
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- BUG — "we don't know" is written to the database as "delete it"
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- `p_song->>'x'` returns NULL both when the caller sent null AND when the caller never
-- mentioned the field at all. Three assignments have nothing guarding them, on BOTH branches:
--
--     number   = nullif(p_song->>'number','')::int     -- key absent → เลขเพลง cleared
--     title_en = p_song->>'title_en'                   -- key absent → ชื่อ EN cleared
--     theme    = p_song->>'theme'                      -- key absent → ธีม cleared
--
-- Safe already (they coalesce onto the stored value) and therefore NOT touched here:
--     title_th · content · category · review_flags.
--
-- The B108 client fix stops sending `theme` when it cannot resolve it, with the comment "an
-- omitted key lets the RPC keep the stored one". That is true of `category` (coalesced) and
-- FALSE of `theme` — omitting it is exactly what wipes it. The hole is still open today.
--
-- Live impact, measured read-only 23 Jul 2026: 162 published songs · 80 carry a ธีม ·
-- 80 live outside เล่มอนุชน (เล่มใหญ่ 54 · เด็กเล็ก 26) · every published song has a เลขเพลง.
--
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- FIX — ask "was the key sent?", never "is the value empty?"
-- ─────────────────────────────────────────────────────────────────────────────────────────
--     theme = case when p_song ? 'theme' then p_song->>'theme' else theme end
--
-- `?` tests key PRESENCE, so "no value" stays distinguishable from "the value is empty" —
-- collapsing those two is the root of B108, and `coalesce` would collapse them again (it
-- would also make it impossible to ever clear a ธีม on purpose).
--
-- Note the branch that runs when the key IS present is the **original expression, unchanged**.
-- That is deliberate: for every payload that mentions a field, this function computes exactly
-- what it computes today, bit for bit. Only the never-mentioned case changed, and it changed
-- from destroying the stored value to leaving it alone.
--
-- INSERT branch (a brand-new song): same three fields, falling back to the DRAFT's own columns
-- instead of NULL, and `category` now tries the draft before the 'anuchon' default — that
-- default is the root of B108. `song_drafts.category`/`theme` exist since db/010 (live).
--
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- SAFETY — the three things PM asked to be proven, and where each is proven
-- ─────────────────────────────────────────────────────────────────────────────────────────
-- (ก) NO ROW OF DATA IS TOUCHED. This migration contains no insert/update/delete/alter/drop
--     of any kind — one `create or replace function` and one `grant`, both metadata-only.
--     Proven in db/011-approve-keep-theme.test.js: every row of songs / song_drafts /
--     song_revisions is compared before and after, INCLUDING each row's xmin (the version
--     stamp Postgres bumps on any write) — all identical.
-- (ข) THE CHANGE ONLY EVER POINTS SAFER. Key sent → identical expression to today.
--     Key not sent → keep what is stored, instead of nulling it. There is no third case.
-- (ค) THE LIVE v1 APP KEEPS WORKING, IDENTICALLY. Verified against the DEPLOYED bundle
--     (https://pleng.phrakham.life/assets/index-CSAfPjE3.js), not against the repo: it builds
--         {number, title_th, title_en, content, review_flags}
--     with all five keys ALWAYS present, then attaches `category`/`theme` only when that field
--     is known. So for those five, `p_song ? 'key'` is always true and the function computes
--     what it computes today, unchanged. For category/theme, key present → unchanged;
--     key absent → the only case that changes, and it changes from wiping to keeping.
--     Proven in the test file by replaying that exact payload through the OLD and the NEW
--     function and diffing every column.
--
-- Also: no downtime (`create or replace` swaps the body in one transaction; nothing is
-- dropped, so no call can land on a missing function and the grant/signature/oid survive);
-- idempotent (a re-run detects itself and stops); and GUARDED — it reads the live definition
-- first and refuses, changing nothing, if the server is not what P'Aim showed us.
--
-- ⚠️ ORDER: this is SQL-only — there is NO code change to deploy with it, in either order.
--    New SQL + today's code = the fix working. Old SQL + today's code = today's bug.
-- Rollback: db/011-rollback-approve-keep-theme.sql restores the live text verbatim.

do $mig$
declare
  v_def text;   -- the live definition, verbatim (printed back on any mismatch)
  v_bare text;  -- …with SQL comments stripped, so a comment can never satisfy a check
  v_missing text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'approve_and_publish'
    and pg_get_function_identity_arguments(p.oid) = 'p_draft_id uuid, p_song jsonb, p_review_comment text';

  if v_def is null then
    raise exception
      'STOP: public.approve_and_publish(uuid, jsonb, text) does not exist here. Report to PM.';
  end if;

  v_bare := regexp_replace(v_def, '--[^' || chr(10) || ']*', '', 'g');

  -- already applied? (idempotent re-run)
  if v_bare ~ 'p_song\s*\?\s*''theme''' then
    raise notice '011 already applied — approve_and_publish already keeps an unmentioned field. Nothing to do.';
    return;
  end if;

  -- db/010 must be live: the new insert branch reads d.category / d.theme.
  select string_agg(c, ', ') into v_missing
  from unnest(array['category', 'theme']) c
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'song_drafts' and column_name = c
  );
  if v_missing is not null then
    raise exception 'STOP: song_drafts is missing %. Run db/010-draft-category.sql first.', v_missing;
  end if;

  -- The live body P'Aim read out on 23 Jul: the db/004 text, insert branch crediting auth.uid().
  -- (Checked on v_bare — db/006 mentions auth.uid() in a COMMENT while doing the opposite.)
  if v_bare ~ 'd\.author_id' or v_bare !~ 'auth\.uid\(\)' then
    raise exception
      'STOP: the live function no longer credits auth.uid() — it changed since 23 Jul (db/006 '
      'may have been run). Nothing was modified. Send the definition below to PM.%',
      chr(10) || v_def;
  end if;

  -- …and the exact shape 011 rewrites: the three unguarded assignments, the four safe ones,
  -- and no column outside what we were shown (someone may have extended it by hand).
  if v_bare !~ 'theme\s*=\s*p_song->>''theme'''
     or v_bare !~ 'title_en\s*=\s*p_song->>''title_en'''
     or v_bare !~ 'number\s*=\s*nullif\(p_song->>''number'''
     or v_bare !~ 'category\s*=\s*coalesce\(p_song->>''category'''
     or v_bare !~ 'title_th\s*=\s*coalesce\(p_song->>''title_th'''
     or v_bare !~ 'content\s*=\s*coalesce\(p_song->''content'''
     or v_bare !~ 'review_flags\s*=\s*coalesce\(p_song->''review_flags'''
     or v_bare !~ 'v_song_id\s*:=\s*d\.song_id'
     or v_bare ~ 'book_refs|scripture|verified|slug' then
    raise exception
      'STOP: the live approve_and_publish is not the body we were shown on 23 Jul — it was '
      'changed outside the repo. NOTHING has been modified. Send the definition below to PM.%',
      chr(10) || v_def;
  end if;

  raise notice 'Live function matches what P''Aim read out on 23 Jul. Applying 011…';

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
    -- NEW song. A field the payload never mentioned falls back to the draft's own value
    -- (db/010 gave song_drafts category/theme) instead of being written as NULL.
    insert into public.songs (number, title_th, title_en, content, category, theme, review_flags, author_id)
    values (
      case when p_song ? 'number'   then nullif(p_song->>'number', '')::int else d.number   end,
      coalesce(p_song->>'title_th', d.title_th),
      case when p_song ? 'title_en' then p_song->>'title_en'                else d.title_en end,
      coalesce(p_song->'content', d.content),
      coalesce(p_song->>'category', d.category, 'anuchon'),
      case when p_song ? 'theme'    then p_song->>'theme'                   else d.theme    end,
      coalesce(p_song->'review_flags', '[]'::jsonb),
      auth.uid()   -- UNCHANGED from the live db/004 body. db/006 is a separate decision.
    )
    returning id into v_song_id;
  else
    v_song_id := d.song_id;
    -- EXISTING song. A field the payload never mentioned keeps what is stored.
    update public.songs set
      number       = case when p_song ? 'number'   then nullif(p_song->>'number', '')::int else number   end,
      title_th     = coalesce(p_song->>'title_th', title_th),
      title_en     = case when p_song ? 'title_en' then p_song->>'title_en'                else title_en end,
      content      = coalesce(p_song->'content', content),
      category     = coalesce(p_song->>'category', category),
      theme        = case when p_song ? 'theme'    then p_song->>'theme'                   else theme    end,
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
--   select pg_get_functiondef('public.approve_and_publish(uuid,jsonb,text)'::regprocedure);
--   -- the ธีม line must read:  theme = case when p_song ? 'theme' then ... else theme end
