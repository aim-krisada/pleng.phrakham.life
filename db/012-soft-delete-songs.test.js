// @vitest-environment node
// 012 — runs the REAL db/012 migration against an in-process Postgres (pglite) and proves
// the locked soft-delete model end-to-end:
//   * permission: approver may soft-delete/restore; a non-approver (editor/anon) may not
//   * N's safety point: deleted_at can ONLY move through the RPCs — a content UPDATE that
//     tries to flip deleted_at is REJECTED by the guard trigger; a plain content edit that
//     leaves deleted_at alone still works
//   * read filter: the anon/public role cannot SELECT a trashed row; the team can (so trash
//     + restore work)
//   * auto-purge: only rows past the retention window are hard-deleted, and each is logged
//
// The DB is not part of the app's CI images, so this spins up its own Postgres in-memory.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
// The migration ships as a dry run (begin; … rollback;). Strip the transaction wrapper so
// pglite applies it, exactly as changing the final `rollback;` to `commit;` would in prod.
const MIGRATION = readFileSync(join(HERE, '012-soft-delete-songs.sql'), 'utf8')
  .replace(/^begin;\s*$/m, '')
  .replace(/^rollback;\s*$/m, '')

const EDITOR = '11111111-1111-1111-1111-111111111111'
const APPROVER = '22222222-2222-2222-2222-222222222222'

// Minimal stand-in for what 001/002 created in the Supabase dashboard — only what db/012
// touches. auth.uid()/auth.role() are config-driven so a test can act as any user or role.
const BOOTSTRAP = `
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;

create schema if not exists auth;
create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('test.role', true), ''), 'authenticated')::text $$;

create table public.profiles (
  id uuid primary key, display_name text,
  role text not null default 'editor'
);
create or replace function public.app_role() returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid() $$;

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  number int, title_th text, title_en text, content jsonb,
  category text, theme text, review_flags jsonb, verified boolean default false,
  author_id uuid, created_at timestamptz default now(), updated_at timestamptz default now()
);

-- The wide-open public read that exists on the v1 line (db/005's verified gate is NOT on
-- this branch). db/012 adds a RESTRICTIVE policy on TOP of this, so the test mirrors prod.
alter table public.songs enable row level security;
create policy "public_reads_songs" on public.songs for select using (true);
grant select on public.songs to anon, authenticated;
`

async function freshDb() {
  const db = await PGlite.create()
  await db.exec(BOOTSTRAP)
  await db.exec(MIGRATION)
  await db.exec(`
    insert into public.profiles (id, display_name, role) values
      ('${EDITOR}', 'น้องเอ', 'editor'),
      ('${APPROVER}', 'พี่เปา', 'approver');
  `)
  return db
}
const asUser = (db, uid) => db.exec(`set test.uid = '${uid}';`)
const rows = async (db, sql) => (await db.query(sql)).rows
async function newSong(db, title = 'เพลงคลัง') {
  const [{ id }] = await rows(
    db,
    `insert into public.songs (title_th, content, author_id)
     values ('${title}', '{"lines":[]}'::jsonb, '${APPROVER}') returning id`
  )
  return id
}

let db
beforeEach(async () => {
  db = await freshDb()
})

describe('permission — who may delete / restore', () => {
  it('approver can soft-delete and restore a published song', async () => {
    const id = await newSong(db)
    await asUser(db, APPROVER)
    await db.exec(`select public.soft_delete_song('${id}')`)
    let [s] = await rows(db, `select deleted_at from public.songs where id = '${id}'`)
    expect(s.deleted_at).not.toBeNull() // in the trash

    await db.exec(`select public.restore_song('${id}')`)
    ;[s] = await rows(db, `select deleted_at from public.songs where id = '${id}'`)
    expect(s.deleted_at).toBeNull() // back
  })

  it('an editor (non-approver) is refused — song stays live', async () => {
    const id = await newSong(db)
    await asUser(db, EDITOR)
    await expect(db.exec(`select public.soft_delete_song('${id}')`)).rejects.toThrow(/approver/i)
    const [s] = await rows(db, `select deleted_at from public.songs where id = '${id}'`)
    expect(s.deleted_at).toBeNull()
  })

  it('an anon caller (no uid) is refused', async () => {
    const id = await newSong(db)
    await db.exec(`set test.uid = '';`)
    await expect(db.exec(`select public.soft_delete_song('${id}')`)).rejects.toThrow(/approver/i)
  })

  it('restore is approver-only too', async () => {
    const id = await newSong(db)
    await asUser(db, APPROVER)
    await db.exec(`select public.soft_delete_song('${id}')`)
    await asUser(db, EDITOR)
    await expect(db.exec(`select public.restore_song('${id}')`)).rejects.toThrow(/approver/i)
  })

  it('deleting a missing song raises, not silently succeeds', async () => {
    await asUser(db, APPROVER)
    await expect(
      db.exec(`select public.soft_delete_song('99999999-9999-9999-9999-999999999999')`)
    ).rejects.toThrow(/not found/i)
  })
})

describe('N safety — deleted_at is separated from content', () => {
  it('a content UPDATE that also flips deleted_at is REJECTED by the guard', async () => {
    const id = await newSong(db)
    await asUser(db, APPROVER)
    // The exact abuse N warned about: hide a row inside an ordinary content write.
    await expect(
      db.exec(`update public.songs set title_th = 'อำพราง', deleted_at = now() where id = '${id}'`)
    ).rejects.toThrow(/deleted_at may only change/i)
    const [s] = await rows(db, `select title_th, deleted_at from public.songs where id = '${id}'`)
    expect(s.deleted_at).toBeNull() // the whole statement rolled back — nothing hidden
  })

  it('a direct UPDATE of deleted_at alone is also rejected (only the RPC may)', async () => {
    const id = await newSong(db)
    await asUser(db, APPROVER)
    await expect(
      db.exec(`update public.songs set deleted_at = now() where id = '${id}'`)
    ).rejects.toThrow(/deleted_at may only change/i)
  })

  it('an ordinary content edit that leaves deleted_at alone still works', async () => {
    const id = await newSong(db)
    await asUser(db, APPROVER)
    await db.exec(`update public.songs set title_th = 'แก้ชื่อปกติ' where id = '${id}'`)
    const [s] = await rows(db, `select title_th from public.songs where id = '${id}'`)
    expect(s.title_th).toBe('แก้ชื่อปกติ')
  })
})

describe('read filter — public never sees the trash', () => {
  it('anon cannot SELECT a trashed row; the team can', async () => {
    const live = await newSong(db, 'เพลงที่ยังอยู่')
    const gone = await newSong(db, 'เพลงที่ลบ')
    await asUser(db, APPROVER)
    await db.exec(`select public.soft_delete_song('${gone}')`)

    // as anon (public/publishable key)
    await db.exec(`set role anon; set test.role = 'anon';`)
    const anonRows = await rows(db, `select id from public.songs`)
    const anonIds = anonRows.map((r) => r.id)
    expect(anonIds).toContain(live)
    expect(anonIds).not.toContain(gone) // trash hidden from the public
    await db.exec(`reset role; set test.role = 'authenticated';`)

    // as the team (authenticated) — trash IS visible, so restore is possible
    await db.exec(`set role authenticated;`)
    const teamIds = (await rows(db, `select id from public.songs`)).map((r) => r.id)
    expect(teamIds).toContain(live)
    expect(teamIds).toContain(gone)
    await db.exec(`reset role;`)
  })
})

describe('auto-purge — retention window + logging', () => {
  it('purges only rows past the window and logs each one', async () => {
    const old = await newSong(db, 'ลบนานแล้ว')
    const recent = await newSong(db, 'เพิ่งลบ')
    await asUser(db, APPROVER)
    await db.exec(`select public.soft_delete_song('${old}')`)
    await db.exec(`select public.soft_delete_song('${recent}')`)
    // backdate the old one past the 30-day window (bypass the guard via a direct owner write
    // — the guard is app-facing; this is the test simulating time passing)
    await db.exec(`set app.soft_delete_pass = 'on';
      update public.songs set deleted_at = now() - interval '40 days' where id = '${old}';
      set app.soft_delete_pass = 'off';`)

    const [{ purge_deleted_songs: n }] = await rows(db, `select public.purge_deleted_songs(30)`)
    expect(Number(n)).toBe(1) // only the 40-day-old one

    const remaining = (await rows(db, `select id from public.songs`)).map((r) => r.id)
    expect(remaining).not.toContain(old) // hard-deleted
    expect(remaining).toContain(recent) // still in the trash, within window

    const log = await rows(db, `select song_id, title_th, snapshot from public.song_purge_log`)
    expect(log).toHaveLength(1)
    expect(log[0].song_id).toBe(old)
    expect(log[0].title_th).toBe('ลบนานแล้ว')
    expect(log[0].snapshot).toBeTruthy() // full row kept — a purge is never a silent vanish
  })
})
