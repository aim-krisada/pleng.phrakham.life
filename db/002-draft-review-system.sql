-- Draft/review workflow + audit log. Run once in the Supabase SQL Editor.
-- Roles: 'editor' saves drafts only; 'approver' publishes to songs and reviews drafts.

-- 1. Profiles: one row per user, holds the role. Manage roles in Table Editor.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'editor' check (role in ('editor', 'approver'))
);
alter table public.profiles enable row level security;
create policy "Authenticated can read profiles" on public.profiles
  for select using (auth.role() = 'authenticated');
-- No client write policies: roles are changed only from the dashboard.

-- Auto-create a profile for every new user (default role: editor)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, split_part(new.email, '@', 1), 'editor')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing users as approvers (current users are the admins)
insert into public.profiles (id, display_name, role)
select id, split_part(email, '@', 1), 'approver' from auth.users
on conflict (id) do nothing;

-- Helper: role of the calling user ("current_role" is reserved in SQL)
create or replace function public.app_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

-- 2. Drafts: work-in-progress songs, invisible to the public site
create table public.song_drafts (
  id uuid default gen_random_uuid() primary key,
  song_id uuid references public.songs(id) on delete set null, -- null = new song
  number integer,
  title_th text not null,
  title_en text,
  content jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  review_comment text,
  author_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.song_drafts enable row level security;
create trigger drafts_updated_at
  before update on public.song_drafts
  for each row execute function public.set_updated_at();

create policy "Read own drafts or all as approver" on public.song_drafts
  for select using (author_id = auth.uid() or public.app_role() = 'approver');
create policy "Insert own drafts" on public.song_drafts
  for insert with check (author_id = auth.uid());
create policy "Update own or as approver" on public.song_drafts
  for update using (author_id = auth.uid() or public.app_role() = 'approver');
create policy "Delete own or as approver" on public.song_drafts
  for delete using (author_id = auth.uid() or public.app_role() = 'approver');

-- 3. Tighten songs: only approvers write to the published table
drop policy "Authenticated users can insert songs" on public.songs;
drop policy "Authenticated users can update songs" on public.songs;
drop policy "Authenticated users can delete songs" on public.songs;
create policy "Approvers can insert songs" on public.songs
  for insert with check (public.app_role() = 'approver');
create policy "Approvers can update songs" on public.songs
  for update using (public.app_role() = 'approver');
create policy "Approvers can delete songs" on public.songs
  for delete using (public.app_role() = 'approver');

-- 4. Audit log: every change to songs is recorded by a DB trigger (cannot be bypassed)
create table public.song_revisions (
  id bigint generated always as identity primary key,
  song_id uuid,
  action text not null, -- insert | update | delete
  editor_id uuid,
  old_row jsonb,
  new_row jsonb,
  created_at timestamptz default now()
);
alter table public.song_revisions enable row level security;
create policy "Authenticated can read revisions" on public.song_revisions
  for select using (auth.role() = 'authenticated');
-- No client write policies: only the trigger below writes.

create or replace function public.log_song_change()
returns trigger language plpgsql security definer as $$
begin
  insert into public.song_revisions (song_id, action, editor_id, old_row, new_row)
  values (
    coalesce(new.id, old.id),
    lower(tg_op),
    auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;
create trigger songs_audit
  after insert or update or delete on public.songs
  for each row execute function public.log_song_change();
