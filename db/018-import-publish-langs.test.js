// @vitest-environment node
// 018 — runs the REAL db/004 + 014 + 018 against an in-process Postgres (pglite) and proves the
// AI key can publish ONLY English / Chinese words (ใบ v3/pleng#177):
//   * en / zh words + title_en change and go live; the history names the import account
//   * any change to Thai syllables, notes, structure or langVerified is refused — song untouched
//   * a key without can_publish_langs, a revoked or wrong key, or a trashed song is refused
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
const strip = (s) => s.replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, '')
const M004 = readFileSync(join(HERE, '004-audit-log-events.sql'), 'utf8')
const M014 = strip(readFileSync(join(HERE, '014-import-api.sql'), 'utf8'))
const M018 = strip(readFileSync(join(HERE, '018-import-publish-langs.sql'), 'utf8'))

const IMPORTER = '33333333-3333-3333-3333-333333333333'
const SONG = '44444444-4444-4444-4444-444444444444'
const TRASHED = '55555555-5555-5555-5555-555555555555'
const KEY = 'a'.repeat(64)
const DRAFT_ONLY_KEY = 'd'.repeat(64)
const OLD_KEY = 'c'.repeat(64)
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex')

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

const CONTENT = {
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3' }]] }],
  arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['พระ', 'เจ้า', 'รัก'] }],
}
const clone = (o) => JSON.parse(JSON.stringify(o))
const withLyrics = (lyrics, base = CONTENT) => {
  const c = clone(base)
  c.arrangement[0].lyrics = lyrics
  return c
}

let db
beforeEach(async () => {
  db = await PGlite.create()
  await db.exec(BOOTSTRAP)
  await db.exec(M004)
  await db.exec(M014)
  await db.query(
    `insert into auth.users (id, email) values ($1, 'import-ai@phrakham.life')`, [IMPORTER])
  await db.query(`insert into public.profiles (id, display_name, role) values ($1, 'AI นำเข้า', 'editor')`, [IMPORTER])
  for (const [name, key] of [['AI นำเข้า', KEY], ['ร่างอย่างเดียว', DRAFT_ONLY_KEY], ['old', OLD_KEY]]) {
    await db.query(`insert into public.import_keys (name, key_hash, author_id) values ($1, $2, $3)`, [name, sha(key), IMPORTER])
  }
  await db.query(`insert into public.songs (id, number, title_th, content, category) values ($1, 2, 'ของขวัญ', $2::jsonb, 'anuchon')`, [SONG, JSON.stringify(CONTENT)])
  await db.query(`insert into public.songs (id, number, title_th, content, category, deleted_at) values ($1, 3, 'ถังขยะ', $2::jsonb, 'anuchon', now())`, [TRASHED, JSON.stringify(CONTENT)])
  await db.exec(M018)
  // 018 switches on 'AI นำเข้า' only; an old key that is revoked must stay dead even with the flag
  await db.exec(`update public.import_keys set revoked_at = now(), can_publish_langs = true where name = 'old';`)
}, 60_000)

const asAnon = () => db.exec(`reset role; set request.jwt.claims = '{"role":"anon"}'; set role anon;`)
const asOwner = () => db.exec(`reset role; reset request.jwt.claims;`)
const publish = (key, content, titleEn = null, id = SONG) =>
  db.query(`select public.import_publish_langs($1, $2::uuid, $3::jsonb, $4) as id`, [key, id, JSON.stringify(content), titleEn])
const song = async (id = SONG) => (await db.query(`select title_en, content from public.songs where id = $1`, [id])).rows[0]

describe('ใบ v3/pleng#177 — db/018 import_publish_langs', { timeout: 60_000 }, () => {
  it('turns the flag on for the AI key only', async () => {
    const rows = (await db.query(`select name, can_publish_langs from public.import_keys`)).rows
    expect(rows.find((r) => r.name === 'AI นำเข้า').can_publish_langs).toBe(true)
    expect(rows.find((r) => r.name === 'ร่างอย่างเดียว').can_publish_langs).toBe(false)
  })

  it('English + Chinese words and title_en go live; the history names the import account', async () => {
    const next = withLyrics({ en: ['God', 'is', 'love'], zh: ['神', '是', '爱'] })
    await asAnon()
    const [{ id }] = (await publish(KEY, next, 'A Gift')).rows
    expect(id).toBe(SONG)
    await asOwner()
    const s = await song()
    expect(s.content).toEqual(next)
    expect(s.title_en).toBe('A Gift')
    const [rev] = (await db.query(`select actor_id, actor_name, event from public.song_revisions where song_ref = $1 order by id desc limit 1`, [SONG])).rows
    expect(rev).toEqual({ actor_id: IMPORTER, actor_name: 'AI นำเข้า', event: 'edit_published' })
    expect((await db.query(`select auth.uid() as u`)).rows[0].u).toBeNull() // identity does not leak
  })

  it('an empty title_en keeps the title the song has', async () => {
    await asOwner()
    await db.query(`update public.songs set title_en = 'Old' where id = $1`, [SONG])
    await asAnon()
    await publish(KEY, withLyrics({ en: ['God', 'is', 'love'] }), '')
    await asOwner()
    expect((await song()).title_en).toBe('Old')
  })

  it('taking English out again is allowed (the words were wrong)', async () => {
    await asAnon()
    await publish(KEY, withLyrics({ en: ['God', 'is', 'love'] }))
    await publish(KEY, clone(CONTENT))
    await asOwner()
    expect((await song()).content).toEqual(CONTENT)
  })

  const refused = [
    ['a Thai syllable', (c) => { c.arrangement[0].syllables[2] = 'รัก!' }],
    ['a note', (c) => { c.stanzas[0].lines[0][0].note = '1 2 4' }],
    ['the key', (c) => { c.key = 'D' }],
    ['a new row', (c) => { c.arrangement.push(clone(c.arrangement[0])) }],
    ['the ตรวจแล้ว mark of a language', (c) => { c.langVerified = { en: true } }],
    ['a third language', (c) => { c.arrangement[0].lyrics.ja = ['a', 'b', 'c'] }],
  ]
  for (const [what, change] of refused) {
    it(`refuses a change to ${what} — the song stays as it was`, async () => {
      const c = withLyrics({ en: ['God', 'is', 'love'] })
      change(c)
      await asAnon()
      await expect(publish(KEY, c)).rejects.toThrow(/only English \/ Chinese words may change/)
      await asOwner()
      expect((await song()).content).toEqual(CONTENT)
    })
  }

  it('a key without the flag, a revoked key or a wrong key gets the same refusal', async () => {
    await asAnon()
    for (const key of [DRAFT_ONLY_KEY, OLD_KEY, 'x'.repeat(64), '', null]) {
      await expect(publish(key, withLyrics({ en: ['a', 'b', 'c'] }))).rejects.toThrow(/^invalid import key$/)
    }
    await asOwner()
    expect((await song()).content).toEqual(CONTENT)
  })

  it('a song in the trash cannot be published to', async () => {
    await asAnon()
    await expect(publish(KEY, withLyrics({ en: ['a', 'b', 'c'] }), null, TRASHED)).rejects.toThrow(/does not match a song/)
  })

  it('switching the flag off stops it at once', async () => {
    await asOwner()
    await db.exec(`update public.import_keys set can_publish_langs = false where name = 'AI นำเข้า'`)
    await asAnon()
    await expect(publish(KEY, withLyrics({ en: ['a', 'b', 'c'] }))).rejects.toThrow(/^invalid import key$/)
  })

  it('anon cannot read import_keys', async () => {
    await asAnon()
    await expect(db.query(`select can_publish_langs from public.import_keys`)).rejects.toThrow()
  })
})
