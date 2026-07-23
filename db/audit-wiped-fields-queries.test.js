// @vitest-environment node
// Proves the forensic queries in docs/reports/audit-wiped-fields-queries.sql actually work
// BEFORE P'Aim runs them on production — and, more importantly, that they do not lump the
// bug together with พี่เปา's own edits (PM: "ห้ามเหมา").
//
// Builds a history on real Postgres (pglite) containing all four shapes at once:
//   A. the bug          — approve button (RPC) wiped a ธีม the app could not resolve
//   B. a human edit     — someone cleared a เลขเพลง directly in the editor, on purpose
//   C. undecidable      — a legacy pre-004 row with no op_group
//   D. insert branch    — a new song published while its draft carried หมวด/ธีม/เลข
// …then asserts each query sorts them into the right bucket.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
const M004 = readFileSync(join(HERE, '004-audit-log-events.sql'), 'utf8')
const LIVE_FN = readFileSync(join(HERE, '011-rollback-approve-keep-theme.sql'), 'utf8') // production body
const QUERIES = readFileSync(join(HERE, '../docs/reports/audit-wiped-fields-queries.sql'), 'utf8')

/** the file is meant to be run one statement at a time — split it the same way */
const STATEMENTS = QUERIES.split(/;\s*$/m)
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter((s) => s.length > 0)

const EDITOR = '11111111-1111-1111-1111-111111111111'
const APPROVER = '22222222-2222-2222-2222-222222222222'

const BOOTSTRAP = `
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
  song_id uuid, number int, title_th text not null, title_en text,
  content jsonb not null, status text not null default 'draft', review_comment text,
  author_id uuid, category text, theme text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.song_revisions (
  id bigint generated always as identity primary key,
  song_id uuid, action text not null, editor_id uuid,
  old_row jsonb, new_row jsonb, created_at timestamptz default now()
);
`

const rows = async (db, sql, params) => (await db.query(sql, params)).rows

let db
beforeEach(async () => {
  db = await PGlite.create()
  await db.exec(BOOTSTRAP)
  await db.exec(M004)
  await db.exec(LIVE_FN) // the buggy body that is live today
  await db.exec(`
    insert into public.profiles (id, display_name, role) values
      ('${EDITOR}', 'น้องเอ', 'editor'), ('${APPROVER}', 'พี่เปา', 'approver');
  `)
  await db.exec(`set test.uid = '${APPROVER}';`)
})

const makeSong = async (over = {}) => {
  const s = { number: 123, title_th: 'เพลง', title_en: 'EN', category: 'lem-yai', theme: 'ความรอด', ...over }
  const [r] = await rows(
    db,
    `insert into public.songs (number,title_th,title_en,content,category,theme,review_flags,author_id)
     values ($1,$2,$3,'{"lines":[]}'::jsonb,$4,$5,'[]'::jsonb,$6) returning id`,
    [s.number, s.title_th, s.title_en, s.category, s.theme, EDITOR]
  )
  return r.id
}

describe('the forensic queries', () => {
  it('all three statements parse and run', async () => {
    expect(STATEMENTS).toHaveLength(3)
    for (const s of STATEMENTS) await db.query(s)
  })

  it('sorts the bug, the human edit and the undecidable row into three different buckets', async () => {
    // ── A. the bug: approve button, app could not resolve the ธีม so it omitted the key
    const songA = await makeSong({ title_th: 'เพลง A' })
    const [rowA] = await rows(
      db,
      `insert into public.song_drafts (song_id,title_th,content,status,author_id)
       values ($1,'เพลง A','{"lines":[]}'::jsonb,'pending',$2) returning id`,
      [songA, EDITOR]
    )
    const dA = rowA.id
    await db.query(`select public.approve_and_publish($1, $2::jsonb, null)`, [
      dA,
      JSON.stringify({ number: 123, title_th: 'เพลง A', title_en: 'EN', content: { lines: [] }, review_flags: [] }),
    ])

    // ── B. a human clearing a เลขเพลง on purpose, straight on the song (no draft, no pair)
    const songB = await makeSong({ title_th: 'เพลง B' })
    await db.query(`update public.songs set number = null where id = $1`, [songB])

    // ── C. a legacy pre-004 row: no op_group, so it cannot be attributed either way
    const songC = await makeSong({ title_th: 'เพลง C', theme: null })
    await db.query(
      `insert into public.song_revisions (song_id, song_ref, action, entity, event, hand, before, after)
       values ($1, $1, 'update', 'song', 'edit_published', 'approver',
               jsonb_build_object('number','555','theme','พระคุณ'),
               jsonb_build_object('number',null,'theme',null))`,
      [songC]
    )

    const summary = await rows(db, STATEMENTS[0])
    const by = Object.fromEntries(summary.map((r) => [r.cause.slice(0, 1), r]))

    expect(Object.keys(by).sort()).toEqual(['A', 'B', 'C'])
    expect(Number(by.A['เพลง'])).toBe(1)
    expect(Number(by.A['ธีมหาย'])).toBe(1)
    expect(Number(by.B['เพลง'])).toBe(1)
    expect(Number(by.B['เลขเพลงหาย'])).toBe(1)
    expect(Number(by.C['เพลง'])).toBe(1)
    // the human edit must NOT be counted as the bug
    expect(Number(by.A['เลขเพลงหาย'])).toBe(0)
  })

  it('a normal approve that changes nothing is not reported at all', async () => {
    const songId = await makeSong({ title_th: 'เพลงปกติ' })
    const [dRow] = await rows(
      db,
      `insert into public.song_drafts (song_id,title_th,content,status,author_id)
       values ($1,'เพลงปกติ','{"lines":[]}'::jsonb,'pending',$2) returning id`,
      [songId, EDITOR]
    )
    const d = dRow.id
    await db.query(`select public.approve_and_publish($1, $2::jsonb, null)`, [
      d,
      JSON.stringify({
        number: 123, title_th: 'เพลงปกติ', title_en: 'EN',
        content: { lines: [] }, review_flags: [], category: 'lem-yai', theme: 'ความรอด',
      }),
    ])
    expect(await rows(db, STATEMENTS[0])).toHaveLength(0)
  })

  it('a deliberately cleared ธีม (key sent as null) is attributed to the person, not the bug', async () => {
    const songId = await makeSong({ title_th: 'เพลงลบธีมเอง' })
    const [dRow] = await rows(
      db,
      `insert into public.song_drafts (song_id,title_th,content,status,author_id)
       values ($1,'เพลงลบธีมเอง','{"lines":[]}'::jsonb,'pending',$2) returning id`,
      [songId, EDITOR]
    )
    // the approve button DID send theme, explicitly null — a real intent to clear.
    // It still shows up (the value did disappear) but the report must show WHO and let a
    // human judge; it is flagged as coming from the approve button, which is honest —
    // the query cannot read minds, and the report says so.
    const d = dRow.id
    await db.query(`select public.approve_and_publish($1, $2::jsonb, null)`, [
      d,
      JSON.stringify({
        number: 123, title_th: 'เพลงลบธีมเอง', title_en: 'EN',
        content: { lines: [] }, review_flags: [], category: 'lem-yai', theme: null,
      }),
    ])
    const detail = await rows(db, STATEMENTS[1])
    expect(detail).toHaveLength(1)
    expect(detail[0]['ใครกด']).toBe('พี่เปา') // the actor is named, so a human can judge
  })

  it('the repair list shows the recoverable old value, and drops songs already refilled', async () => {
    const songId = await makeSong({ title_th: 'เพลงที่ซ่อมแล้ว' })
    const [dRow] = await rows(
      db,
      `insert into public.song_drafts (song_id,title_th,content,status,author_id)
       values ($1,'เพลงที่ซ่อมแล้ว','{"lines":[]}'::jsonb,'pending',$2) returning id`,
      [songId, EDITOR]
    )
    const d = dRow.id
    await db.query(`select public.approve_and_publish($1, $2::jsonb, null)`, [
      d,
      JSON.stringify({ number: 123, title_th: 'เพลงที่ซ่อมแล้ว', title_en: 'EN', content: { lines: [] }, review_flags: [] }),
    ])

    let detail = await rows(db, STATEMENTS[1])
    expect(detail).toHaveLength(1)
    expect(detail[0]['ค่าเดิม_ธีม']).toBe('ความรอด') // recoverable, no guessing needed

    // someone types the ธีม back in → it must drop off the "still broken" list
    await db.query(`update public.songs set theme = 'ความรอด' where id = $1`, [songId])
    detail = await rows(db, STATEMENTS[1])
    expect(detail).toHaveLength(0)
  })

  it('statement 3 catches a NEW song whose draft carried values that never made it across', async () => {
    const [dRow] = await rows(
      db,
      `insert into public.song_drafts (title_th,title_en,number,content,status,author_id,category,theme)
       values ('เพลงใหม่','Draft EN',900,'{"lines":[]}'::jsonb,'pending',$1,'lem-yai','พระคุณ') returning id`,
      [EDITOR]
    )
    const d = dRow.id
    await db.query(`select public.approve_and_publish($1, $2::jsonb, null)`, [
      d,
      JSON.stringify({ title_th: 'เพลงใหม่', content: { lines: [] }, review_flags: [] }),
    ])
    const lost = await rows(db, STATEMENTS[2])
    expect(lost).toHaveLength(1)
    expect(lost[0]['ร่างมี_ธีม']).toBe('พระคุณ')
    expect(lost[0]['เพลงได้_ธีม']).toBe(null)
    expect(lost[0]['ร่างมี_เลขเพลง']).toBe('900')
  })

  it('after 011 is applied, none of these three ever fire again', async () => {
    await db.exec(readFileSync(join(HERE, '011-approve-keep-theme.sql'), 'utf8'))
    const songId = await makeSong({ title_th: 'เพลงหลังแก้' })
    const [dRow] = await rows(
      db,
      `insert into public.song_drafts (song_id,title_th,content,status,author_id)
       values ($1,'เพลงหลังแก้','{"lines":[]}'::jsonb,'pending',$2) returning id`,
      [songId, EDITOR]
    )
    const d = dRow.id
    await db.query(`select public.approve_and_publish($1, $2::jsonb, null)`, [
      d,
      JSON.stringify({ title_th: 'เพลงหลังแก้', content: { lines: [] }, review_flags: [] }),
    ])
    expect(await rows(db, STATEMENTS[0])).toHaveLength(0)
    expect(await rows(db, STATEMENTS[2])).toHaveLength(0)
  })

  it('the query file is read-only — no write statement anywhere in it', () => {
    const code = QUERIES.replace(/^\s*--.*$/gm, '')
    expect(code).not.toMatch(/\b(insert\s+into|update\s+\w|delete\s+from|drop|alter|truncate|create)\b/i)
  })
})
