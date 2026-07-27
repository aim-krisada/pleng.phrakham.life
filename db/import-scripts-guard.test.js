// @vitest-environment node
// Every hand-run SQL file in tools/ that writes public.songs must be add-only, or must
// refuse to run at all. This runs each real file against an in-process Postgres (pglite)
// and proves it cannot quietly overwrite a song someone edited.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
const read = f => readFileSync(join(HERE, '..', 'tools', f), 'utf8')

const BOOTSTRAP = `
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  number int, title_th text, title_en text, content jsonb,
  category text, theme text, scripture text, book_refs jsonb,
  verified boolean default false, review_flags jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
`

let db
beforeEach(async () => {
  db = await PGlite.create()
  await db.exec(BOOTSTRAP)
})

async function run (sql) {
  try { await db.exec(sql); return null } catch (e) { try { await db.exec('rollback') } catch {} ; return e }
}
const contentOf = async n =>
  (await db.query(`select content, title_th from public.songs where number = ${n}`)).rows[0]

describe.each([
  { file: 'hymnal-samples/s032.sql', number: 32, category: 'lem-yai' },
  { file: 'insert-amazing-grace.sql', number: 900, category: 'anuchon' },
])('$file — add-only', ({ file, number, category }) => {
  it('inserts into a free slot, and a re-run is a no-op', async () => {
    expect(await run(read(file))).toBeNull()
    expect(await run(read(file))).toBeNull()
    expect((await db.query(`select count(*)::int c from public.songs`)).rows[0].c).toBe(1)
  })

  it('REFUSES when the song is there but its content was edited (the old title-only guard let this through)', async () => {
    expect(await run(read(file))).toBeNull()
    // พี่เปา fixes the melody — same title, different content
    await db.exec(`update public.songs set content = content || '{"edited_by_paw": true}'::jsonb
                    where number = ${number}`)
    const before = await contentOf(number)

    const err = await run(read(file))
    expect(err?.message).toMatch(/ไม่ได้เขียนทับอะไรเลย/)
    expect(await contentOf(number)).toEqual(before)   // the edit survived
  })

  it('REFUSES when a different song holds the slot', async () => {
    await db.exec(`insert into public.songs (category, number, title_th, content)
                   values ('${category}', ${number}, 'เพลงอื่น', '{"x":1}'::jsonb)`)
    const err = await run(read(file))
    expect(err?.message).toMatch(/ไม่ได้เขียนทับอะไรเลย/)
    expect((await contentOf(number)).title_th).toBe('เพลงอื่น')
  })
})

describe('import-ties.sql — a bulk overwrite, armed off', () => {
  const seed = () => db.exec(`insert into public.songs (category, number, title_th, content)
                              values ('anuchon', 1, 'เพลงที่ทีมแก้แล้ว', '{"mine":true}'::jsonb)`)

  it('refuses to run at all unless deliberately armed — and changes nothing', async () => {
    await seed()
    const err = await run(read('import-ties.sql'))
    expect(err?.message).toMatch(/ไม่ได้เขียนอะไรเลย/)
    expect((await contentOf(1)).content).toEqual({ mine: true })
  })

  it('still works when armed on purpose (so it is a safety catch, not a dead end)', async () => {
    await seed()
    const armed = "set local pleng.confirm_overwrite = 'ties-overwrite-48-songs';\n" + read('import-ties.sql')
    // `set local` needs the transaction the file opens, so arm it inside that transaction
    const sql = read('import-ties.sql').replace(
      'begin;', "begin;\nset local pleng.confirm_overwrite = 'ties-overwrite-48-songs';")
    expect(armed).toContain('pleng.confirm_overwrite')
    expect(await run(sql)).toBeNull()
    expect((await contentOf(1)).content).not.toEqual({ mine: true })   // it did overwrite, as asked
  })
})
