-- 018 — Let the AI import key PUBLISH other-language lyrics itself (ใบ v3/pleng#177).
-- Run once in the Supabase SQL Editor, AFTER 014. Additive only; idempotent.
--
-- HOW TO RUN: paste the WHOLE file into the SQL Editor and press Run. One transaction.
--
-- WHY: พี่เอม 17 พ.ย. 2569 chose to let the AI publish English / 中文 lyrics without pressing
-- approve for every song. พี่เปา does not read English, and พี่เอม checks the translations on the
-- live site and asks for fixes. Everything else (Thai words, notes, a new song) still goes
-- through import_draft() → review.
--
-- WHAT A KEY WITH can_publish_langs CAN DO — import_publish_langs(key, song_id, content, title_en):
--   * change ONLY the other-language words of a live song: arrangement[*].lyrics.en / .zh,
--     plus title_en.
--   * the function strips en/zh from the new content and from the song as it is now and refuses
--     unless the two are IDENTICAL — so Thai syllables, notes, chords, key, structure and the
--     per-language "ตรวจแล้ว" marks (content.langVerified) cannot change, not by one character.
--     A song someone edited in the meantime simply fails the check (nothing is overwritten).
--   * the history (004 audit trigger) records the change under the import account (AI นำเข้า).
--   * at most 300 publishes per key per 24 hours.
-- A key WITHOUT the flag gets the same 'invalid import key' message as a wrong key.
--
-- TURN IT OFF at any time (immediately):
--   update public.import_keys set can_publish_langs = false where name = 'AI นำเข้า';
-- ─────────────────────────────────────────────────────────────────────────────

begin;

do $$
begin
  if to_regclass('public.import_keys') is null or to_regprocedure('public.import_draft(text, jsonb)') is null then
    raise exception 'import_keys / import_draft missing — run db/014 first';
  end if;
end $$;

alter table public.import_keys add column if not exists can_publish_langs boolean not null default false;

-- content with every other-language word removed: what must stay the same
create or replace function public.content_without_alt_langs(c jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when jsonb_typeof(c) = 'object' and jsonb_typeof(c->'arrangement') = 'array' then
      jsonb_set(c, '{arrangement}', coalesce((
        select jsonb_agg(
          case
            when jsonb_typeof(r->'lyrics') = 'object' then
              case when ((r->'lyrics') - 'en' - 'zh') = '{}'::jsonb then r - 'lyrics'
                   else jsonb_set(r, '{lyrics}', (r->'lyrics') - 'en' - 'zh') end
            else r
          end order by o)
        from jsonb_array_elements(c->'arrangement') with ordinality as t(r, o)
      ), '[]'::jsonb))
    else c
  end
$$;

create or replace function public.import_publish_langs(
  p_key      text,
  p_song_id  uuid,
  p_content  jsonb,
  p_title_en text default null
)
returns uuid   -- the song id
language plpgsql
security definer
set search_path = public
as $$
declare
  k        public.import_keys%rowtype;
  s        public.songs%rowtype;
  v_recent int;
begin
  -- (a) The key, with the publish flag — one message for every failure.
  if p_key is null or length(p_key) not between 16 and 256 then
    raise exception 'invalid import key' using errcode = '28000';
  end if;
  select * into k from public.import_keys
   where key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
     and revoked_at is null and can_publish_langs
   for update;
  if not found then
    raise exception 'invalid import key' using errcode = '28000';
  end if;

  -- (b) Shape.
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'content must be a JSON object' using errcode = '22023';
  end if;
  if octet_length(p_content::text) > 300 * 1024 then
    raise exception 'content is larger than 300 kB' using errcode = '22023';
  end if;
  if char_length(coalesce(p_title_en, '')) > 200 then
    raise exception 'title_en must be at most 200 characters' using errcode = '22023';
  end if;

  -- (c) The song must be live, and nothing but en / zh words may differ.
  select * into s from public.songs where id = p_song_id and deleted_at is null for update;
  if not found then
    raise exception 'song_id does not match a song on the site' using errcode = '22023';
  end if;
  if public.content_without_alt_langs(p_content) is distinct from public.content_without_alt_langs(s.content) then
    raise exception 'only English / Chinese words may change — Thai, notes or structure differ' using errcode = '22023';
  end if;

  -- (d) Rate limit per key holder (song edits recorded under the import account).
  select count(*) into v_recent from public.song_revisions
   where actor_id = k.author_id and entity = 'song' and created_at > now() - interval '24 hours';
  if v_recent >= 300 then
    raise exception 'publish limit reached: 300 songs in 24 hours' using errcode = 'P0001';
  end if;

  -- (e) Act as the import account for THIS transaction only, so the history names it.
  perform set_config('request.jwt.claim.sub', k.author_id::text, true);
  perform set_config('request.jwt.claims',
    (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
       || jsonb_build_object('sub', k.author_id::text))::text, true);
  if auth.uid() is distinct from k.author_id then
    raise exception 'import identity could not be applied — nothing was saved';
  end if;

  -- (f) Write.
  update public.songs set
    content  = p_content,
    title_en = coalesce(nullif(btrim(p_title_en), ''), title_en)
  where id = p_song_id;

  update public.import_keys set last_used_at = now() where id = k.id;
  return p_song_id;
end $$;

revoke all on function public.import_publish_langs(text, uuid, jsonb, text) from public;
grant execute on function public.import_publish_langs(text, uuid, jsonb, text) to anon, authenticated;
revoke all on function public.content_without_alt_langs(jsonb) from public;

-- ── Switch it on for the AI key (พี่เอม chose this 17 พ.ย. 2569) ─────────────
update public.import_keys set can_publish_langs = true
 where name = 'AI นำเข้า' and revoked_at is null;

commit;

-- ── Verify (run after): 1 row, can_publish_langs = true ──────────────────────
select name, can_publish_langs, revoked_at from public.import_keys where name = 'AI นำเข้า';
