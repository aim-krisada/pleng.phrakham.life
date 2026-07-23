-- 011 ROLLBACK — restore approve_and_publish to the body that is live today.
--
-- This is NOT the repo's db/006. It is the text P'Aim read out of production on 23 Jul 2026
-- with `select pg_get_functiondef('public.approve_and_publish(uuid,jsonb,text)'::regprocedure);`
-- — the db/004 body, insert branch crediting `auth.uid()`. Copied verbatim so that rolling
-- back puts the server back exactly where it was, not where the repo thinks it was.
--
-- Same safety as 011: no row of data is read for writing, none is written, none is deleted.
-- One `create or replace`, in one transaction, with no drop — so no call can ever land on a
-- missing function, and there is no downtime in either direction.
--
-- ⚠️ Rolling back restores the wiping behaviour (ธีม / ชื่อ EN / เลขเพลง disappear when the
--    app cannot resolve them). Tell PM before rolling back — a report is usually the better
--    move. There is no data to restore either way: 011 never changed any.

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
      auth.uid()
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
