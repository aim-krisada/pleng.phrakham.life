-- 009 — Security hardening (SA audit 2026-07-18). Run once in the Supabase SQL Editor.
-- ⛔ Prepared, not auto-run — P'Aim runs SQL. Not urgent (team is invite-only/trusted), but
-- closes an audit-integrity gap + two hardening gaps. See docs/reports/security-audit-sa.md.
-- All three changes are compatible with the current app flow (no behaviour change for users).

-- ---------------------------------------------------------------------------
-- F1 (MEDIUM) — stop an editor self-approving their own draft.
-- The UPDATE policy had no WITH CHECK, so USING doubled as the new-row check. USING only
-- pins author_id (good) but leaves `status` free -> an editor could UPDATE their own draft to
-- status='approved', which the audit trigger records as a forged 'approve_publish by approver'
-- event (ISO 27001 A.12.4). It does NOT publish the song (songs stays approver-only), but the
-- review model + audit integrity break. Fix: constrain a non-approver to draft/pending only
-- (exactly what the app does — editors saveDraft draft/pending; approval goes via the RPC).
drop policy "Update own or as approver" on public.song_drafts;
create policy "Update own or as approver" on public.song_drafts
  for update
  using (author_id = auth.uid() or public.app_role() = 'approver')
  with check (
    public.app_role() = 'approver'
    or (author_id = auth.uid() and status in ('draft', 'pending'))
  );

-- ---------------------------------------------------------------------------
-- F2 (LOW-MED) — pin search_path on the db/002 security-definer functions.
-- Without a pinned search_path a SECURITY DEFINER function runs with the caller's search_path
-- (search_path-hijack surface). Refs here are already schema-qualified so exploitability is low,
-- but this matches the hardening db/003/004/008 already apply. `= ''` is the strict form (safe
-- because every reference below is fully qualified; pg_catalog built-ins like split_part stay
-- available regardless).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, split_part(new.email, '@', 1), 'editor')
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.app_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- F3 (LOW) — drop the dead function. db/004 replaced the songs_audit trigger with
-- log_song_event(); log_song_change() has no trigger pointing at it anymore.
drop function if exists public.log_song_change();

-- Verify after:
--   select proname, prosecdef, proconfig from pg_proc
--   where pronamespace = 'public'::regnamespace and prosecdef;   -- every definer fn shows search_path
--   -- editor self-approve now blocked: as an editor, update own draft set status='approved' => error/no-op
