-- Let each user rename themselves without the dashboard. Run once in the Supabase SQL Editor.
-- Email changes go through supabase.auth.updateUser({email}) (verified by email link) — no SQL needed.
-- Roles stay dashboard-only: this function touches display_name only, so no privilege escalation.

create or replace function public.update_my_display_name(new_name text)
returns void language sql security definer set search_path = public as $$
  update public.profiles
     set display_name = nullif(btrim(new_name), '')
   where id = auth.uid();
$$;

revoke all on function public.update_my_display_name(text) from public;
grant execute on function public.update_my_display_name(text) to authenticated;
