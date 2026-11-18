// @vitest-environment node
// 016 — runs the REAL db/012 + db/015 + db/016 migrations against an in-process Postgres (pglite)
// and proves ล้างถังขยะ (ใบ v3/pleng#175):
//   * approver only — an editor or anon caller is refused, even calling the function directly
//   * p_confirm = false only counts; nothing is deleted
//   * p_confirm = true deletes every trashed song and draft (however recently trashed), logs each
//     song into song_purge_log, and never touches a live song or a live draft
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
// each migration ships as a dry run (begin; … rollback;) — strip the wrapper, as `commit;` would
const load = (f) =>
  readFileSync(join(HERE, f), 'utf8').replace(/^begin;\s*$/m, '').replace(/^rollback;\s*$/m, '')

const EDITOR = '11111111-1111-1111-1111-111111111111'
const APPROVER = '22222222-2222-2222-2222-222222222222'

const BOOTSTRAP = `
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('test.role', true), ''), 'authenticated')::text $$;
create table public.profiles (id uuid primary key, display_name text, role text not null default 'editor');
create or replace function public.app_role() returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid() $$;
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  number int, title_th text, title_en text, content jsonb,
  category text, theme text, review_flags jsonb, verified boolean default false,
  author_id uuid, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.song_drafts (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references public.songs(id) on delete set null,
  number int, title_th text not null, content jsonb not null default '{}'::jsonb,
  status text not null default 'draft', author_id uuid not null
);
`

let db
const rows = async (sql) => (await db.query(sql)).rows
const asUser = (uid) => db.exec(`set test.uid = '${uid}';`)
async function newSong(title) {
  const [{ id }] = await rows(`insert into public.songs (title_th, content) values ('${title}', '{}') returning id`)
  return id
}
async function newDraft(title) {
  const [{ id }] = await rows(
    `insert into public.song_drafts (title_th, author_id, status) values ('${title}', '${EDITOR}', 'pending') returning id`
  )
  return id
}
const call = async (confirm) => (await rows(`select public.empty_trash(${confirm}) as r`))[0].r

beforeEach(async () => {
  db = await PGlite.create()
  await db.exec(BOOTSTRAP)
  for (const f of ['012-soft-delete-songs.sql', '015-trash-drafts.sql', '016-empty-trash.sql']) await db.exec(load(f))
  await db.exec(`insert into public.profiles values ('${EDITOR}', 'น้องเอ', 'editor'), ('${APPROVER}', 'พี่เปา', 'approver');`)
})

async function fillTrash() {
  const live = await newSong('เพลงที่ยังอยู่')
  const gone = await newSong('เพลง 66 ที่ส่งซ้ำ')
  const liveDraft = await newDraft('งานที่รอตรวจ')
  const goneDraft = await newDraft('งานที่ลบแล้ว')
  await asUser(APPROVER)
  await db.exec(`select public.soft_delete_song('${gone}')`)
  await db.exec(`select public.trash_draft('${goneDraft}')`)
  // trashed a moment ago — not 30 days — so only ล้างถังขยะ, never the daily job, takes them now.
  // The purge takes what was trashed BEFORE the call (deleted_at < now()). On a fast machine the draft
  // was trashed in the same clock tick as the call and was left behind (CI 18 พ.ย. 2569) — a person
  // can never press ล้างถังขยะ that fast, so wait a moment like they would.
  await new Promise((r) => setTimeout(r, 20))
  return { live, gone, liveDraft, goneDraft }
}

describe('empty_trash — who may', () => {
  it('an editor is refused and nothing is deleted', async () => {
    const t = await fillTrash()
    await asUser(EDITOR)
    await expect(call(true)).rejects.toThrow(/only approvers/i)
    expect((await rows(`select id from public.songs where id = '${t.gone}'`))).toHaveLength(1)
  })

  it('an anon caller (no uid) is refused', async () => {
    await fillTrash()
    await db.exec(`set test.uid = '';`)
    await expect(call(false)).rejects.toThrow(/only approvers/i)
  })
})

describe('empty_trash — what it does', () => {
  it('without confirm it only counts what is in the trash', async () => {
    const t = await fillTrash()
    expect(await call(false)).toEqual({ songs: 1, drafts: 1 })
    expect(await rows(`select id from public.songs where id = '${t.gone}'`)).toHaveLength(1)
    expect(await rows(`select id from public.song_drafts where id = '${t.goneDraft}'`)).toHaveLength(1)
  })

  it('with confirm it deletes every trashed song and draft, and only those', async () => {
    const t = await fillTrash()
    expect(await call(true)).toEqual({ songs: 1, drafts: 1 })
    const songs = (await rows(`select id from public.songs`)).map((r) => r.id)
    const drafts = (await rows(`select id from public.song_drafts`)).map((r) => r.id)
    expect(songs).toEqual([t.live])
    expect(drafts).toEqual([t.liveDraft])
    expect(await call(false)).toEqual({ songs: 0, drafts: 0 })
  })

  it('logs each song it deletes, like the daily job', async () => {
    const t = await fillTrash()
    await call(true)
    const log = await rows(`select song_id, title_th, snapshot from public.song_purge_log`)
    expect(log).toHaveLength(1)
    expect(log[0].song_id).toBe(t.gone)
    expect(log[0].title_th).toBe('เพลง 66 ที่ส่งซ้ำ')
    expect(log[0].snapshot).toBeTruthy()
  })

  it('an empty trash is fine', async () => {
    await asUser(APPROVER)
    expect(await call(true)).toEqual({ songs: 0, drafts: 0 })
  })
})
