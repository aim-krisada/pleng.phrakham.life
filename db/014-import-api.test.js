// @vitest-environment node
// 014 — runs the REAL db/004 + db/014 migrations against an in-process Postgres (pglite) and
// proves the import door of ใบ v1#158 does only what it says:
//   * a valid key creates ONE 'pending' draft owned by the import account
//   * a wrong / revoked / missing key is refused with the same message, before anything else
//   * it can never publish: the songs table is untouched
//   * song_id must be a live song; unknown fields, a too-big draft and bad values are refused
//   * at most 200 drafts per import account per 24 h
//   * the audit log names the import account (not anon, not the caller) — and the identity
//     does not leak past the call
//   * no client can read import_keys
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
const M004 = readFileSync(join(HERE, '004-audit-log-events.sql'), 'utf8')
// one transaction (begin … commit) — strip the wrapper so pglite runs it statement by statement
const M014 = readFileSync(join(HERE, '014-import-api.sql'), 'utf8')
  .replace(/^begin;\s*$/m, '')
  .replace(/^commit;\s*$/m, '')

const IMPORTER = '33333333-3333-3333-3333-333333333333'
const EDITOR = '11111111-1111-1111-1111-111111111111'
const KEY = 'a'.repeat(32) + 'b'.repeat(32) // 64 hex chars, like make-import-key.mjs prints
const OLD_KEY = 'c'.repeat(64)
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex')

// Minimal stand-in for what 001/002/010/012 created. auth.uid() is Supabase's REAL definition
// (request.jwt.claim.sub first, then request.jwt.claims->>'sub'), so the test proves the
// import identity reaches the audit trigger the same way it will in production.
const BOOTSTRAP = `
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'nobody') then create role nobody; end if;
end $$;

create schema if not exists auth;
create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid $$;
grant usage on schema auth to anon, authenticated, nobody;
grant execute on function auth.uid() to anon, authenticated, nobody;

create table public.profiles (id uuid primary key, display_name text, role text not null default 'editor');
create or replace function public.app_role() returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid() $$;

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  number int, title_th text, title_en text, content jsonb,
  category text, theme text, review_flags jsonb, verified boolean default false,
  author_id uuid, created_at timestamptz default now(), updated_at timestamptz default now(),
  deleted_at timestamptz
);
create table public.song_drafts (
  id uuid primary key default gen_random_uuid(),
  song_id uuid, number int, title_th text not null, title_en text,
  content jsonb not null, status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'rejected')),
  review_comment text, author_id uuid not null, category text, theme text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.song_revisions (
  id bigint generated always as identity primary key,
  song_id uuid, action text not null, editor_id uuid,
  old_row jsonb, new_row jsonb, created_at timestamptz default now()
);
`

const LIVE_SONG = '44444444-4444-4444-4444-444444444444'
const TRASHED_SONG = '55555555-5555-5555-5555-555555555555'

let db
beforeEach(async () => {
  db = await PGlite.create()
  await db.exec(BOOTSTRAP)
  await db.exec(M004)
  await db.exec(M014)
  await db.exec(`
    insert into auth.users (id, email) values ('${IMPORTER}', 'import-ai@phrakham.life'), ('${EDITOR}', 'a@b.c');
    insert into public.profiles (id, display_name, role) values
      ('${IMPORTER}', 'AI นำเข้า', 'editor'), ('${EDITOR}', 'น้องเอ', 'editor');
    insert into public.import_keys (name, key_hash, author_id) values
      ('AI นำเข้า', '${sha(KEY)}', '${IMPORTER}'),
      ('old', '${sha(OLD_KEY)}', '${IMPORTER}');
    update public.import_keys set revoked_at = now() where name = 'old';
    insert into public.songs (id, number, title_th, title_en, content, category, theme) values
      ('${LIVE_SONG}', 12, 'พระเจ้าทรงเป็นความรัก', null, '{"lines":[]}', 'lem-yai', 'พระเจ้า');
    insert into public.songs (id, number, title_th, content, category, deleted_at) values
      ('${TRASHED_SONG}', 13, 'ถังขยะ', '{"lines":[]}', 'anuchon', now());
  `)
}, 60_000) // a fresh in-memory Postgres per test is slow on this PC — give it room under a full run

// call the RPC the way PostgREST does for a request made with the publishable key only
const asAnon = () => db.exec(`reset role; set request.jwt.claims = '{"role":"anon"}'; set role anon;`)
const call = (key, draft) =>
  db.query(`select public.import_draft($1, $2::jsonb) as id`, [key, JSON.stringify(draft)])
const rows = async (sql) => (await db.query(sql)).rows
const asOwner = () => db.exec(`reset role;`)
const DRAFT = { title_th: 'เพลงใหม่', content: { key: 'C', lines: [] } }

describe('ใบ v1#158 — db/014 import_draft', { timeout: 60_000 }, () => {
  it('a valid key creates ONE pending draft owned by the import account', async () => {
    await asAnon()
    const [{ id }] = (await call(KEY, { ...DRAFT, note: 'จากหนังสือหน้า 5' })).rows
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    await asOwner()
    const all = await rows(`select * from public.song_drafts`)
    expect(all).toHaveLength(1)
    const [d] = all
    expect(d.id).toBe(id)
    expect(d.status).toBe('pending')
    expect(d.author_id).toBe(IMPORTER)
    expect(d.title_th).toBe('เพลงใหม่')
    expect(d.content).toEqual({ key: 'C', lines: [] })
    expect(d.review_comment).toBe('นำเข้าอัตโนมัติ: จากหนังสือหน้า 5')
    const [k] = await rows(`select last_used_at from public.import_keys where name = 'AI นำเข้า'`)
    expect(k.last_used_at).not.toBeNull()
  })

  it('marks the draft as imported even without a note', async () => {
    await asAnon()
    await call(KEY, DRAFT)
    await asOwner()
    expect((await rows(`select review_comment from public.song_drafts`))[0].review_comment).toBe('นำเข้าอัตโนมัติ')
  })

  it('a wrong, revoked, empty or missing key is refused with the same message', async () => {
    await asAnon()
    for (const key of ['x'.repeat(64), OLD_KEY, '', null, KEY.toUpperCase()]) {
      await expect(call(key, DRAFT)).rejects.toThrow(/^invalid import key$/)
    }
    // the key is checked before the draft: a bad draft with a bad key still says "invalid import key"
    await expect(call('x'.repeat(64), { bogus: 1 })).rejects.toThrow(/^invalid import key$/)
    await asOwner()
    expect(await rows(`select id from public.song_drafts`)).toHaveLength(0)
  })

  it('can never publish: the songs table is untouched, and the draft only waits for review', async () => {
    await asOwner()
    const before = await rows(`select * from public.songs order by id`)
    await asAnon()
    await call(KEY, { ...DRAFT, song_id: LIVE_SONG })
    await asOwner()
    expect(await rows(`select * from public.songs order by id`)).toEqual(before)
    // status is always pending — a draft cannot ask for anything else
    await asAnon()
    await expect(call(KEY, { ...DRAFT, status: 'approved' })).rejects.toThrow(/unknown field\(s\): status/)
    await expect(call(KEY, { ...DRAFT, author_id: EDITOR })).rejects.toThrow(/unknown field\(s\): author_id/)
  })

  it('song_id must be a live song; a draft of it copies the fields the import left out', async () => {
    await asAnon()
    await expect(call(KEY, { ...DRAFT, song_id: '66666666-6666-6666-6666-666666666666' })).rejects.toThrow(/does not match a song/)
    await expect(call(KEY, { ...DRAFT, song_id: TRASHED_SONG })).rejects.toThrow(/does not match a song/)
    await expect(call(KEY, { ...DRAFT, song_id: 'not-a-uuid' })).rejects.toThrow(/song_id must be a song id/)
    const [{ id }] = (await call(KEY, { title_th: 'พระเจ้าทรงเป็นความรัก', title_en: 'God is love', content: { lines: [] }, song_id: LIVE_SONG })).rows
    await asOwner()
    const [d] = await rows(`select * from public.song_drafts where id = '${id}'`)
    expect(d.song_id).toBe(LIVE_SONG)
    expect(d.title_en).toBe('God is love') // what the import sent
    expect(d.number).toBe(12) // copied from the song, so approving cannot blank it
    expect(d.category).toBe('lem-yai')
    expect(d.theme).toBe('พระเจ้า')
  })

  it('refuses unknown fields, a draft over 300 kB, and bad values', async () => {
    await asAnon()
    await expect(call(KEY, { ...DRAFT, extra: 1 })).rejects.toThrow(/unknown field\(s\): extra/)
    const big = { ...DRAFT, content: { lines: [], pad: 'ก'.repeat(110_000) } } // 3 bytes each ≈ 330 kB
    await expect(call(KEY, big)).rejects.toThrow(/larger than 300 kB/)
    await expect(call(KEY, { content: {} })).rejects.toThrow(/title_th is required/)
    await expect(call(KEY, { ...DRAFT, title_th: '   ' })).rejects.toThrow(/title_th is required/)
    await expect(call(KEY, { ...DRAFT, title_th: 'ก'.repeat(201) })).rejects.toThrow(/longer than 200/)
    await expect(call(KEY, { title_th: 'x', content: [] })).rejects.toThrow(/content must be a JSON object/)
    await expect(call(KEY, { title_th: 'x' })).rejects.toThrow(/content must be a JSON object/)
    await expect(call(KEY, { ...DRAFT, number: 1.5 })).rejects.toThrow(/whole number/)
    await expect(call(KEY, { ...DRAFT, number: '12' })).rejects.toThrow(/whole number/)
    await expect(call(KEY, { ...DRAFT, number: 0 })).rejects.toThrow(/whole number/)
    await expect(call(KEY, { ...DRAFT, category: 'other' })).rejects.toThrow(/category must be/)
    await expect(call(KEY, { ...DRAFT, title_en: 5 })).rejects.toThrow(/title_en must be text/)
    await expect(call(KEY, { ...DRAFT, theme: 'x'.repeat(101) })).rejects.toThrow(/theme must be text/)
    await expect(db.query(`select public.import_draft($1, '[1]'::jsonb)`, [KEY])).rejects.toThrow(/JSON object/)
    // every optional field, filled correctly, is accepted
    const ok = { ...DRAFT, number: 99, title_en: 'New', category: 'dek-lek', theme: 'กิตติคุณ', note: 'n' }
    const [{ id }] = (await call(KEY, ok)).rows
    await asOwner()
    const [d] = await rows(`select number, title_en, category, theme from public.song_drafts where id = '${id}'`)
    expect(d).toEqual({ number: 99, title_en: 'New', category: 'dek-lek', theme: 'กิตติคุณ' })
    expect(await rows(`select id from public.song_drafts`)).toHaveLength(1) // all the refusals saved nothing
  })

  it('allows at most 200 drafts per import account in 24 hours', async () => {
    await asOwner()
    await db.exec(`insert into public.song_drafts (title_th, content, status, author_id)
      select 'x' || g, '{}'::jsonb, 'pending', '${IMPORTER}' from generate_series(1, 199) g`)
    await asAnon()
    await call(KEY, DRAFT) // the 200th
    await expect(call(KEY, DRAFT)).rejects.toThrow(/import limit reached/)
    // drafts older than 24 hours no longer count
    await asOwner()
    await db.exec(`update public.song_drafts set created_at = now() - interval '25 hours' where title_th like 'x%'`)
    await asAnon()
    await expect(call(KEY, DRAFT)).resolves.toBeTruthy()
  })

  it('the audit log names the import account, and the identity does not leak past the call', async () => {
    await asAnon()
    const [{ id }] = (await call(KEY, DRAFT)).rows
    await asOwner()
    const log = await rows(`select event, hand, actor_id, actor_name, actor_role from public.song_revisions
      where song_ref = '${id}' order by id`)
    expect(log.map((r) => r.event)).toEqual(['create', 'submit']) // same two steps a person takes
    expect(log.every((r) => r.actor_id === IMPORTER && r.actor_name === 'AI นำเข้า' && r.hand === 'editor')).toBe(true)
    expect(log[0].actor_role).toBe('editor')
    // the next statement in the same session is anon again
    await asAnon()
    expect((await rows(`select auth.uid() as uid`))[0].uid).toBeNull()
  })

  it('a logged-in caller cannot borrow their own identity for an import', async () => {
    await db.exec(`reset role; set request.jwt.claims = '{"role":"authenticated","sub":"${EDITOR}"}'; set role authenticated;`)
    const [{ id }] = (await call(KEY, DRAFT)).rows
    await asOwner()
    const [d] = await rows(`select author_id from public.song_drafts where id = '${id}'`)
    expect(d.author_id).toBe(IMPORTER)
    const log = await rows(`select actor_name from public.song_revisions where song_ref = '${id}'`)
    expect(log.every((r) => r.actor_name === 'AI นำเข้า')).toBe(true)
  })

  it('no client can read or write import_keys, and only anon/authenticated may call the door', async () => {
    await asAnon()
    await expect(db.query(`select * from public.import_keys`)).rejects.toThrow(/permission denied/)
    await expect(db.query(`insert into public.import_keys (name, key_hash, author_id) values ('x','y','${IMPORTER}')`)).rejects.toThrow(/permission denied/)
    await db.exec(`reset role; set role authenticated;`)
    await expect(db.query(`select * from public.import_keys`)).rejects.toThrow(/permission denied/)
    await db.exec(`reset role; set role nobody;`)
    await expect(call(KEY, DRAFT)).rejects.toThrow(/permission denied/)
    await asOwner()
    const [r] = await rows(`select relrowsecurity from pg_class where oid = 'public.import_keys'::regclass`)
    expect(r.relrowsecurity).toBe(true)
    expect(await rows(`select * from pg_policies where tablename = 'import_keys'`)).toHaveLength(0)
  })

  it('is safe to run twice', async () => {
    await expect(db.exec(M014)).resolves.toBeTruthy()
    await asAnon()
    await expect(call(KEY, DRAFT)).resolves.toBeTruthy()
  })
})
