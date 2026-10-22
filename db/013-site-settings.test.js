// @vitest-environment node
// 013 — runs the REAL db/013 migration against an in-process Postgres (pglite) and proves the
// site-settings permission model of ใบ v3/pleng#135: everyone reads the site's default volume,
// only an approver writes it, and every write is stamped with who and when.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
// shipped as a dry run (begin; … rollback;) — strip the wrapper, as switching to commit would in prod
const MIGRATION = readFileSync(join(HERE, '013-site-settings.sql'), 'utf8')
  .replace(/^begin;\s*$/m, '')
  .replace(/^rollback;\s*$/m, '')

const EDITOR = '11111111-1111-1111-1111-111111111111'
const APPROVER = '22222222-2222-2222-2222-222222222222'

// the minimum of what 001/002 created, as in db/012's test
const BOOTSTRAP = `
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table public.profiles (id uuid primary key, display_name text, role text not null default 'editor');
create or replace function public.app_role() returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid() $$;
grant execute on function public.app_role() to anon, authenticated;
`
const VOL = `'{"melody":150,"chord":120,"linked":true}'::jsonb`

let db
beforeEach(async () => {
  db = await PGlite.create()
  await db.exec(BOOTSTRAP)
  await db.exec(MIGRATION)
  await db.exec(`insert into public.profiles (id, role) values ('${EDITOR}', 'editor'), ('${APPROVER}', 'approver');`)
})
// act as a user through the API role, the way PostgREST runs a request
const as = (uid, role = 'authenticated') => db.exec(`reset role; set test.uid = '${uid}'; set role ${role};`)
const read = async () => (await db.query(`select key, value, updated_by from public.site_settings`)).rows

describe('ใบ#135 — db/013 site_settings', () => {
  it('an approver saves the site default, and the write is stamped with who did it', async () => {
    await as(APPROVER)
    await db.exec(`insert into public.site_settings (key, value) values ('playback_volume', ${VOL})`)
    const [row] = await read()
    expect(row.value).toEqual({ melody: 150, chord: 120, linked: true })
    expect(row.updated_by).toBe(APPROVER)
  })
  it('an approver changes it again (the upsert the page sends)', async () => {
    await as(APPROVER)
    await db.exec(`insert into public.site_settings (key, value) values ('playback_volume', ${VOL})`)
    await db.exec(`insert into public.site_settings (key, value) values ('playback_volume', '{"melody":100,"chord":100}'::jsonb)
      on conflict (key) do update set value = excluded.value`)
    expect((await read())[0].value).toEqual({ melody: 100, chord: 100 })
  })
  it('anyone, logged in or not, reads it', async () => {
    await as(APPROVER)
    await db.exec(`insert into public.site_settings (key, value) values ('playback_volume', ${VOL})`)
    await as('', 'anon')
    expect((await read()).length).toBe(1)
    await as(EDITOR)
    expect((await read()).length).toBe(1)
  })
  it('an editor cannot write it', async () => {
    await as(EDITOR)
    await expect(db.exec(`insert into public.site_settings (key, value) values ('playback_volume', ${VOL})`)).rejects.toThrow(/row-level security/i)
  })
  it('an editor cannot change what an approver saved', async () => {
    await as(APPROVER)
    await db.exec(`insert into public.site_settings (key, value) values ('playback_volume', ${VOL})`)
    await as(EDITOR)
    await db.exec(`update public.site_settings set value = '{"melody":0,"chord":0}'::jsonb`) // RLS: matches no row
    expect((await read())[0].value).toEqual({ melody: 150, chord: 120, linked: true })
  })
  it('a visitor who is not logged in cannot write it', async () => {
    await as('', 'anon')
    await expect(db.exec(`insert into public.site_settings (key, value) values ('playback_volume', ${VOL})`)).rejects.toThrow()
  })
  it('the client cannot forge who wrote it', async () => {
    await as(APPROVER)
    await db.exec(`insert into public.site_settings (key, value, updated_by) values ('playback_volume', ${VOL}, '${EDITOR}')`)
    expect((await read())[0].updated_by).toBe(APPROVER)
  })
})
