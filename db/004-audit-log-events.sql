-- B028 — audit log "who did what to a song in the library".
-- Run once in the Supabase SQL Editor, after 002 + 003.
--
-- What this migration does (evolves the EXISTING song_revisions table — no new table,
-- old rows are kept and back-filled into the new shape):
--   1. widen song_revisions with meaningful columns (event/hand/entity, actor snapshot,
--      before/after full copies, op_group, song_ref timeline key)
--   2. one trigger that watches BOTH song_drafts (editor side) and songs (approver side)
--      and records a MEANINGFUL event, not a raw insert/update/delete
--   3. snapshot the actor's name + role AT WRITE TIME, so history stays readable even
--      after the user is renamed or deleted (P'Aim, 13 Jul — the name must never vanish)
--   4. RPC approve_and_publish(): "approve + publish" = ONE logical event (op_group), and
--      the log can only be written server-side (security definer) — never by a client
--   5. back-fill the pre-004 rows so the new history view finds them too
--
-- Audit integrity (ISO 27001 A.12.4): there is NO client insert/update/delete policy on
-- song_revisions. The only writer is this trigger (security definer). Even an approver
-- cannot alter or erase a log row. (Unchanged from 002 — restated here on purpose.)

-- ---------------------------------------------------------------------------
-- 1. Widen the audit table (idempotent — safe to re-run)
-- ---------------------------------------------------------------------------
alter table public.song_revisions
  add column if not exists song_ref   uuid,          -- unifies one song's whole timeline (draft -> published)
  add column if not exists entity     text,          -- 'draft' | 'song'
  add column if not exists event      text,          -- create·edit·submit·approve_publish·reject·edit_published·unpublish
  add column if not exists hand       text,          -- 'editor' | 'approver' (which stage)
  add column if not exists actor_id   uuid,          -- fk auth.users (kept for later joins; may be null if user deleted)
  add column if not exists actor_name text,          -- SNAPSHOT of the name at write time (never re-mapped on display)
  add column if not exists actor_role text,          -- SNAPSHOT of the role at write time
  add column if not exists before     jsonb,         -- full copy before the change (null = created)
  add column if not exists after      jsonb,         -- full copy after the change  (null = deleted)
  add column if not exists note       text,          -- e.g. reject reason
  add column if not exists op_group   uuid;          -- ties several rows into one logical event

create index if not exists song_revisions_song_ref_idx on public.song_revisions (song_ref);
create index if not exists song_revisions_op_group_idx  on public.song_revisions (op_group);

-- ---------------------------------------------------------------------------
-- 2 + 3. One trigger for both hands, with actor snapshot
-- ---------------------------------------------------------------------------
-- Event mapping (the SINGLE source of truth for how a raw change becomes a meaningful
-- event — mirrored in src/lib/auditLog.js `classifyChange` and tested there + in
-- db/004-audit-log-events.test.js against this real function):
--
--   song_drafts INSERT                         -> create           (editor)
--   song_drafts UPDATE  status ->'pending'     -> submit           (editor)
--   song_drafts UPDATE  status ->'approved'    -> approve_publish  (approver)
--   song_drafts UPDATE  status ->'rejected'    -> reject + note    (approver)
--   song_drafts UPDATE  (content, same status) -> edit             (editor)
--   song_drafts DELETE  (discard)              -> (not logged — outside the approved event set)
--   songs INSERT                               -> approve_publish  (approver)
--   songs UPDATE                               -> edit_published   (approver)
--   songs DELETE                               -> unpublish        (approver)
create or replace function public.log_song_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := auth.uid();
  v_name   text;
  v_role   text;
  v_entity text;
  v_event  text;
  v_hand   text;
  v_ref    uuid;
  v_legacy_song_id uuid;  -- value for the legacy song_id column (per-table, set in the branch)
  v_note   text;
  v_before jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_after  jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_group  uuid  := nullif(current_setting('app.audit_group', true), '')::uuid;
begin
  -- Snapshot the actor's identity NOW, from profiles. This is the heart of the
  -- requirement: the stored name survives even if the profile is later deleted/renamed.
  select display_name, role into v_name, v_role
  from public.profiles where id = v_actor;

  if tg_table_name = 'song_drafts' then
    v_entity := 'draft';
    -- new song's draft has no song_id yet -> key the timeline by the draft's own id
    v_ref := coalesce(new.song_id, old.song_id, new.id, old.id);
    v_legacy_song_id := coalesce(new.song_id, old.song_id);
    if tg_op = 'INSERT' then
      v_event := 'create'; v_hand := 'editor';
    elsif tg_op = 'UPDATE' then
      if old.status is distinct from new.status then
        if    new.status = 'pending'  then v_event := 'submit';          v_hand := 'editor';
        elsif new.status = 'approved' then v_event := 'approve_publish'; v_hand := 'approver';
        elsif new.status = 'rejected' then v_event := 'reject';          v_hand := 'approver'; v_note := new.review_comment;
        else                               v_event := 'edit';            v_hand := 'editor';
        end if;
      else
        v_event := 'edit'; v_hand := 'editor';
      end if;
    else
      -- draft discard: not part of the approved vocabulary — leave no row
      return old;
    end if;
  else  -- public.songs
    v_entity := 'song';
    v_ref := coalesce(new.id, old.id);
    v_legacy_song_id := coalesce(new.id, old.id);
    if    tg_op = 'INSERT' then v_event := 'approve_publish'; v_hand := 'approver';
    elsif tg_op = 'UPDATE' then v_event := 'edit_published';  v_hand := 'approver';
    else                        v_event := 'unpublish';       v_hand := 'approver';
    end if;
  end if;

  insert into public.song_revisions (
    song_ref, entity, event, hand,
    actor_id, actor_name, actor_role,
    before, after, note, op_group,
    -- legacy columns kept in sync so anything still reading the old shape keeps working
    song_id, action, editor_id, old_row, new_row
  ) values (
    v_ref, v_entity, v_event, v_hand,
    v_actor, v_name, v_role,
    v_before, v_after, v_note, v_group,
    v_legacy_song_id,
    lower(tg_op), v_actor, v_before, v_after
  );

  return coalesce(new, old);
end $$;

-- Replace the old songs-only trigger, and add the drafts trigger (both hands now)
drop trigger if exists songs_audit on public.songs;
create trigger songs_audit
  after insert or update or delete on public.songs
  for each row execute function public.log_song_event();

drop trigger if exists drafts_audit on public.song_drafts;
create trigger drafts_audit
  after insert or update or delete on public.song_drafts
  for each row execute function public.log_song_event();

-- ---------------------------------------------------------------------------
-- 4. approve_and_publish — "approve + publish" as ONE logical event
-- ---------------------------------------------------------------------------
-- Called by the editor UI when an approver approves a draft. It writes the published
-- song AND flips the draft to 'approved' in one transaction, tagging every audit row it
-- causes with the same op_group, so the history shows a single "approved + published"
-- line and it is unmistakable who made the song public (P'Aim #3).
-- p_song carries the fields the approver may have tweaked while reviewing (number,
-- title_th/en, content, category, theme, review_flags).
create or replace function public.approve_and_publish(
  p_draft_id       uuid,
  p_song           jsonb,
  p_review_comment text default null
)
returns uuid   -- the published song id
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

  -- One logical event: tag both audit rows with the same group. is_local = true means
  -- transaction-scoped, so it can never leak to the next request on a pooled connection.
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

-- ---------------------------------------------------------------------------
-- 5. Back-fill pre-004 rows into the new shape (all old rows are songs-side)
-- ---------------------------------------------------------------------------
update public.song_revisions set
  song_ref = coalesce(song_ref, song_id),
  entity   = coalesce(entity, 'song'),
  hand     = coalesce(hand, 'approver'),
  actor_id = coalesce(actor_id, editor_id),
  before   = coalesce(before, old_row),
  after    = coalesce(after, new_row),
  event    = coalesce(event,
              case action
                when 'insert' then 'approve_publish'
                when 'delete' then 'unpublish'
                else 'edit_published'
              end)
where event is null;
-- actor_name stays null for these legacy rows (no snapshot was taken then); the UI
-- falls back to a live profile lookup only for such old rows.
