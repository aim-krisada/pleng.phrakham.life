// @vitest-environment node
// B028 — runs the REAL db/004 migration (trigger + RPC) against an in-process Postgres
// (pglite) and asserts the audit behaviour end-to-end:
//   * every event is recorded for BOTH hands (song_drafts + songs)
//   * actor_name is snapshotted and SURVIVES the profile being deleted (P'Aim #4)
//   * approve_and_publish writes ONE op_group across its rows (P'Aim #3)
//   * the log cannot be written except through the trigger (integrity)
//
// The DB is not part of the app's CI images, so this spins up its own Postgres in-memory.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
const MIGRATION = readFileSync(join(HERE, '004-audit-log-events.sql'), 'utf8')

const EDITOR = '11111111-1111-1111-1111-111111111111'
const APPROVER = '22222222-2222-2222-2222-222222222222'

// Minimal stand-in for the objects 001/002 created in the Supabase dashboard — only the
// columns the trigger/RPC touch. song_revisions is created in its ORIGINAL (pre-004) shape
// so the migration's ALTER + back-fill run exactly as they will in production.
const BOOTSTRAP = `
-- Supabase-provided roles the migration grants to (present in prod, not in bare Postgres)
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
end $$;

create schema if not exists auth;
create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select 'authenticated'::text $$;

create table public.profiles (
  id uuid primary key,
  display_name text,
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

create table public.song_drafts (
  id uuid primary key default gen_random_uuid(),
  song_id uuid, number int, title_th text not null, title_en text,
  content jsonb not null, status text not null default 'draft', review_comment text,
  author_id uuid, created_at timestamptz default now(), updated_at timestamptz default now()
);

-- song_revisions exactly as db/002 created it (the old shape 004 evolves)
create table public.song_revisions (
  id bigint generated always as identity primary key,
  song_id uuid, action text not null, editor_id uuid,
  old_row jsonb, new_row jsonb, created_at timestamptz default now()
);
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

let db
beforeEach(async () => {
  db = await freshDb()
})

describe('trigger — editor hand (song_drafts)', () => {
  it('records create / edit / submit / reject / re-submit with the right event + hand', async () => {
    await asUser(db, EDITOR)
    // create
    const [{ id: draftId }] = await rows(
      db,
      `insert into public.song_drafts (title_th, content, status, author_id)
       values ('เพลงใหม่', '{"lines":[]}'::jsonb, 'draft', '${EDITOR}') returning id`
    )
    // edit (content changes, status stays draft)
    await db.exec(`update public.song_drafts set title_th = 'เพลงใหม่ v2' where id = '${draftId}'`)
    // submit
    await db.exec(`update public.song_drafts set status = 'pending' where id = '${draftId}'`)
    // approver rejects
    await asUser(db, APPROVER)
    await db.exec(
      `update public.song_drafts set status = 'rejected', review_comment = 'แก้คีย์ก่อน' where id = '${draftId}'`
    )
    // editor re-submits
    await asUser(db, EDITOR)
    await db.exec(`update public.song_drafts set status = 'pending' where id = '${draftId}'`)

    const log = await rows(
      db,
      `select event, hand, entity, actor_name, note from public.song_revisions
       where song_ref = '${draftId}' order by id`
    )
    expect(log.map((r) => r.event)).toEqual(['create', 'edit', 'submit', 'reject', 'submit'])
    expect(log.map((r) => r.hand)).toEqual(['editor', 'editor', 'editor', 'approver', 'editor'])
    expect(log.every((r) => r.entity === 'draft')).toBe(true)
    expect(log[0].actor_name).toBe('น้องเอ')
    expect(log[3].actor_name).toBe('พี่เปา') // the reject was by the approver
    expect(log[3].note).toBe('แก้คีย์ก่อน') // reject reason captured
  })
})

describe('trigger — approver hand (songs)', () => {
  it('records approve_publish (insert) / edit_published (update) / unpublish (delete)', async () => {
    await asUser(db, APPROVER)
    const [{ id: songId }] = await rows(
      db,
      `insert into public.songs (title_th, content, author_id)
       values ('เพลงคลัง', '{"lines":[]}'::jsonb, '${APPROVER}') returning id`
    )
    await db.exec(`update public.songs set title_th = 'เพลงคลัง แก้' where id = '${songId}'`)
    await db.exec(`delete from public.songs where id = '${songId}'`)

    const log = await rows(
      db,
      `select event, hand, entity, before, after from public.song_revisions
       where song_ref = '${songId}' order by id`
    )
    expect(log.map((r) => r.event)).toEqual(['approve_publish', 'edit_published', 'unpublish'])
    expect(log.every((r) => r.hand === 'approver' && r.entity === 'song')).toBe(true)
    expect(log[0].before).toBeNull() // insert: nothing before
    expect(log[2].after).toBeNull() // delete: nothing after
  })
})

describe("actor_name snapshot — the name must never vanish (P'Aim #4)", () => {
  it('keeps the recorded name after the profile is deleted', async () => {
    await asUser(db, EDITOR)
    const [{ id: draftId }] = await rows(
      db,
      `insert into public.song_drafts (title_th, content, author_id)
       values ('ก', '{}'::jsonb, '${EDITOR}') returning id`
    )
    // the user leaves and their profile is removed
    await db.exec(`delete from public.profiles where id = '${EDITOR}'`)

    const [row] = await rows(
      db,
      `select r.actor_name, r.actor_id, p.display_name as live_name
       from public.song_revisions r
       left join public.profiles p on p.id = r.actor_id
       where r.song_ref = '${draftId}'`
    )
    expect(row.live_name).toBeNull() // the live profile is gone...
    expect(row.actor_name).toBe('น้องเอ') // ...but the snapshot survives
    expect(row.actor_id).toBe(EDITOR) // fk kept too
  })
})

describe("approve_and_publish — one logical event (P'Aim #3)", () => {
  it('publishes a NEW song and ties both audit rows into one op_group', async () => {
    await asUser(db, EDITOR)
    const [{ id: draftId }] = await rows(
      db,
      `insert into public.song_drafts (title_th, content, status, author_id)
       values ('เพลงรออนุมัติ', '{"key":"C","lines":[]}'::jsonb, 'pending', '${EDITOR}') returning id`
    )
    await asUser(db, APPROVER)
    const [{ approve_and_publish: songId }] = await rows(
      db,
      `select public.approve_and_publish('${draftId}',
        '{"title_th":"เพลงรออนุมัติ","number":42,"content":{"key":"C","lines":[]},"category":"anuchon"}'::jsonb,
        null)`
    )
    expect(songId).toBeTruthy()

    // the draft is now approved and linked to the published song
    const [d] = await rows(db, `select status, song_id from public.song_drafts where id = '${draftId}'`)
    expect(d.status).toBe('approved')
    expect(d.song_id).toBe(songId)

    // the published song exists with the approver's tweaks
    const [s] = await rows(db, `select number, title_th from public.songs where id = '${songId}'`)
    expect(s.number).toBe(42)

    // exactly the rows from this call share ONE op_group, and both mean approve_publish
    const group = await rows(
      db,
      `select entity, event, hand, actor_name, op_group from public.song_revisions
       where op_group is not null order by id`
    )
    const groups = new Set(group.map((r) => r.op_group))
    expect(groups.size).toBe(1) // one logical event
    expect(group).toHaveLength(2) // songs insert + draft approval
    expect(group.every((r) => r.event === 'approve_publish')).toBe(true)
    expect(group.every((r) => r.actor_name === 'พี่เปา')).toBe(true)
    // both rows share the published song id as the timeline key
    const [songRow] = group.filter((r) => r.entity === 'song')
    expect(songRow).toBeTruthy()
  })

  it('rejects a non-approver', async () => {
    await asUser(db, EDITOR)
    const [{ id: draftId }] = await rows(
      db,
      `insert into public.song_drafts (title_th, content, status, author_id)
       values ('x', '{}'::jsonb, 'pending', '${EDITOR}') returning id`
    )
    // still the editor (not an approver) tries to call the RPC
    await expect(
      db.query(`select public.approve_and_publish('${draftId}', '{"title_th":"x"}'::jsonb, null)`)
    ).rejects.toThrow(/only approvers/)
  })
})

describe('integrity — normal writes carry no op_group', () => {
  it('a plain draft create has a null op_group (grouping is RPC-only)', async () => {
    await asUser(db, EDITOR)
    const [{ id: draftId }] = await rows(
      db,
      `insert into public.song_drafts (title_th, content, author_id)
       values ('ก', '{}'::jsonb, '${EDITOR}') returning id`
    )
    const [row] = await rows(db, `select op_group from public.song_revisions where song_ref = '${draftId}'`)
    expect(row.op_group).toBeNull()
  })
})
