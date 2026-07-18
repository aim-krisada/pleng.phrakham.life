-- 008 — Notification center (B108). Run once in the Supabase SQL Editor, AFTER 002/004.
-- ⛔ Prepared, not auto-run — P'Aim runs SQL (like 005). No data risk: new table only.
--
-- DESIGN (SA verdict, docs/reports/b108-review-bell-feasibility.md §6): a real notifications
-- table from v1 (not derive-per-role), because the scope P'Aim set is multi-role / multi-event
-- / expandable / broadcast, and broadcast can't be derived. Standard inbox pattern:
--   recipient_id + type + ref_id + payload + read_at, one RLS policy (recipient sees own),
--   writes ONLY via trigger/RPC (like song_revisions — a client can't forge a notification).
--
-- v1 SCOPE (this file): ONE event wired — a draft submitted for review notifies every approver.
--   v2 (later, no migration): approve/reject -> notify the draft's author.
--   v3 (later, no migration): broadcast announcements (fan-out insert).

-- ---------------------------------------------------------------------------
-- 1. Table + RLS
-- ---------------------------------------------------------------------------
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type         text not null,          -- 'draft_submitted' (v1) | 'draft_approved' | 'draft_rejected' | 'announcement'
  ref_id       uuid,                    -- the draft/song this points to (deep-link); null for broadcast
  payload      jsonb not null default '{}',  -- display snapshot (title, actor name) so the bell needs no joins
  created_at   timestamptz not null default now(),
  read_at      timestamptz             -- null = unread
);
alter table public.notifications enable row level security;
-- unread-first lookups per user
create index notifications_recipient_unread_idx on public.notifications (recipient_id, read_at, created_at desc);

-- Recipient sees ONLY their own notifications (P'Aim: ผู้รับเห็นเฉพาะของตัวเอง). anon = none.
create policy "read own notifications" on public.notifications
  for select using (recipient_id = auth.uid());
-- NO client insert/update/delete policy — the trigger (security definer) is the only writer,
-- and read_at is flipped only through the RPC below. A client cannot forge or edit a row.

-- ---------------------------------------------------------------------------
-- 2. Emit: a draft submitted for review notifies every approver (v1 event)
-- ---------------------------------------------------------------------------
-- Separate from db/004's audit trigger (log_song_event) — audit and notifications stay
-- independent. Reuses the SAME transition db/004 already classifies as 'submit'
-- (song_drafts.status -> 'pending'). Fan-out: one row per approver, minus the submitter.
create or replace function public.notify_on_draft_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submitted boolean;
  v_author    text;
begin
  -- fire when a draft ENTERS 'pending' (normal submit UPDATE, or a direct-pending insert)
  v_submitted := new.status = 'pending'
                 and (tg_op = 'INSERT' or old.status is distinct from 'pending');
  if not v_submitted then
    return new;
  end if;

  -- snapshot the submitter's name now (survives later rename/delete — same rule as audit)
  select display_name into v_author from public.profiles where id = new.author_id;

  insert into public.notifications (recipient_id, type, ref_id, payload)
  select
    p.id,
    'draft_submitted',
    new.id,
    jsonb_build_object(
      'title_th',  new.title_th,
      'author',    coalesce(v_author, ''),
      'author_id', new.author_id
    )
  from public.profiles p
  where p.role = 'approver'
    and p.id <> new.author_id;   -- don't notify an approver about their own submission

  return new;
end $$;

drop trigger if exists drafts_notify on public.song_drafts;
create trigger drafts_notify
  after insert or update on public.song_drafts
  for each row execute function public.notify_on_draft_event();

-- ---------------------------------------------------------------------------
-- 3. Mark read (RPC — a client can only flip read_at on its OWN rows)
-- ---------------------------------------------------------------------------
create or replace function public.mark_notification_read(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.notifications
     set read_at = now()
   where id = p_id and recipient_id = auth.uid() and read_at is null;
$$;
revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void language sql security definer set search_path = public as $$
  update public.notifications
     set read_at = now()
   where recipient_id = auth.uid() and read_at is null;
$$;
revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- ---------------------------------------------------------------------------
-- Client usage (for the bell in store.js — SA note, dev wires):
--   unread count : select count(*) from notifications where read_at is null;  (RLS scopes to me)
--   list         : select * from notifications order by created_at desc limit N;
--   mark read    : supabase.rpc('mark_notification_read', { p_id })
--   mark all     : supabase.rpc('mark_all_notifications_read')
-- v2 hook (later): in db/004 approve/reject branch OR a sibling trigger, insert a
--   'draft_approved'/'draft_rejected' notification with recipient_id = the draft's author_id.
