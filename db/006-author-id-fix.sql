-- 006 — Fix author_id on approve_and_publish (record the WRITER, not the approver).
-- ⛔ QUEUE: run only AFTER 005 + PM go. Not urgent like the RLS leak, but the longer it
--    waits the more published rows carry the wrong author_id.
--
-- BUG (confirmed in db/004 approve_and_publish): when publishing a NEW song, the insert
-- sets author_id = auth.uid() — that is the APPROVER's id, not the person who wrote the
-- draft. So every song published through the approve flow credits the approver as author.
--
-- FIX: use the draft's author_id (d.author_id) for the new song. Only the insert branch
-- changes; the update branch never touched author_id. Everything else is identical to 004.
-- (Full function is re-declared because Postgres has no partial replace.)

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
      d.author_id          -- FIX (was auth.uid() = approver): credit the draft's writer
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

-- NOTE: existing published rows keep their wrong author_id. A back-fill (recover the true
-- writer from song_revisions.actor_id of the 'create' event) is a SEPARATE, careful task —
-- design it only if PM/P'Aim ask. This migration fixes new publishes going forward.
