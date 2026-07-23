-- 011 ROLLBACK — put approve_and_publish back to exactly the db/006 version.
--
-- Use only if 011 turns out to cause a problem. Note what "rolling back" means here: you are
-- restoring the version that WIPES a theme it was not told about (that is the bug 011 fixed).
-- Prefer reporting the problem over rolling back blindly.
--
-- Safe in the same way 011 is: it touches no data, only redefines the function, in one
-- transaction, with no drop — so no call can ever land on a missing function.
--
-- The body below is db/006-author-id-fix.sql verbatim (author_id fix kept). db/011 refuses to
-- run unless the live function matched db/006, so this restores what was actually there.

create or replace function public.approve_and_publish(
  p_draft_id       uuid,
  p_song           jsonb,
  p_review_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
    insert into public.songs (number, title_th, title_en, content, category, theme, review_flags, author_id)
    values (
      nullif(p_song->>'number', '')::int,
      coalesce(p_song->>'title_th', d.title_th),
      p_song->>'title_en',
      coalesce(p_song->'content', d.content),
      coalesce(p_song->>'category', 'anuchon'),
      p_song->>'theme',
      coalesce(p_song->'review_flags', '[]'::jsonb),
      d.author_id
    )
    returning id into v_song_id;
  else
    v_song_id := d.song_id;
    update public.songs set
      number       = nullif(p_song->>'number', '')::int,
      title_th     = coalesce(p_song->>'title_th', title_th),
      title_en     = p_song->>'title_en',
      content      = coalesce(p_song->'content', content),
      category     = coalesce(p_song->>'category', category),
      theme        = p_song->>'theme',
      review_flags = coalesce(p_song->'review_flags', review_flags)
    where id = v_song_id;
  end if;

  update public.song_drafts set
    status         = 'approved',
    song_id        = v_song_id,
    review_comment = coalesce(p_review_comment, review_comment)
  where id = p_draft_id;

  return v_song_id;
end $$;

grant execute on function public.approve_and_publish(uuid, jsonb, text) to authenticated;
