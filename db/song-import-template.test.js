// @vitest-environment node
// Proves the SHIPPED import template (tools/song-import-template.sql) is safe by default:
//   * a free slot  → the song goes in
//   * an occupied slot → NOTHING is written and the run ends in a loud error
//   * re-running the identical import → no-op, no error (idempotent)
//   * the deliberate overwrite (step 3) refuses once the row changed under you
//
// It runs the real file with the placeholders filled in, so the file itself is under test —
// not a re-typed copy of it. Lives in db/ so it runs under `npm run test:db`.
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = readFileSync(join(HERE, '..', 'tools', 'song-import-template.sql'), 'utf8')
const OVERWRITE = readFileSync(join(HERE, '..', 'tools', 'song-overwrite-template.sql'), 'utf8')

// Minimal stand-in for the real public.songs (only the columns the template touches).
const BOOTSTRAP = `
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  number int, title_th text, title_en text, content jsonb,
  category text, verified boolean default false, review_flags jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
`

// Pull one numbered STEP out of the template file, so each test exercises the real text.
function step (n) {
  const marks = [...TEMPLATE.matchAll(/^-- STEP (\d) ·/gm)]
  const i = marks.findIndex(m => m[1] === String(n))
  const from = marks[i].index
  const to = i + 1 < marks.length ? marks[i + 1].index : TEMPLATE.length
  return TEMPLATE.slice(from, to)
}

const CONTENT = '{"version":1,"key":"C","lines":[]}'

function fill (sql, { category = 'anuchon', number = 31, titleTh = 'เพลงใหม่', content = CONTENT } = {}) {
  return sql
    .replaceAll('<CATEGORY>', category)
    .replaceAll('<NUMBER>', String(number))
    .replaceAll('<TITLE_TH>', titleTh)
    .replaceAll('<TITLE_EN>', 'null')
    .replaceAll('$json$<CONTENT JSON on one line>$json$', `$json$${content}$json$`)
}

function fillOverwrite ({ titleTh, content, oldTitle, oldFingerprint }) {
  return fill(OVERWRITE, { titleTh, content })
    .replaceAll('<OLD_TITLE>', oldTitle)
    .replaceAll('<OLD_FINGERPRINT>', oldFingerprint)
}

let db
beforeEach(async () => {
  db = await PGlite.create()
  await db.exec(BOOTSTRAP)
})

const rows = async () => (await db.query('select category, number, title_th, content from public.songs order by number')).rows

// Run a template file and return the error the SQL Editor would SHOW the human — the
// first one raised. pglite surfaces the trailing `commit;`'s "transaction is aborted"
// instead, so the alarm block is also run alone to read its message; then the failed
// transaction is cleared so the assertions afterwards can query.
async function runAndCatch (sql) {
  let first = null
  try { await db.exec(sql) } catch (e) { first = e }
  if (first) {
    const alarm = sql.slice(sql.indexOf('do $$'), sql.lastIndexOf('end $$;') + 'end $$;'.length)
    try { await db.exec('rollback'); await db.exec(alarm) } catch (e) { first = e }
    try { await db.exec('rollback') } catch { /* nothing open */ }
  }
  return first
}

describe('import template — step 2 (add a song)', () => {
  it('puts the song in when the slot is free', async () => {
    await db.exec(fill(step(2)))
    expect(await rows()).toEqual([
      { category: 'anuchon', number: 31, title_th: 'เพลงใหม่', content: JSON.parse(CONTENT) },
    ])
  })

  it('REFUSES to overwrite a different song in that slot — and says so loudly', async () => {
    // พี่เปา's song already lives at anuchon/31, with edited content.
    await db.exec(`insert into public.songs (category, number, title_th, content)
                   values ('anuchon', 31, 'เพลงของพี่เปา', '{"version":1,"lines":["แก้แล้ว"]}'::jsonb)`)

    expect((await runAndCatch(fill(step(2))))?.message).toMatch(/เลขเพลงชนกับเพลงที่มีอยู่/)

    // …and nothing was touched.
    expect(await rows()).toEqual([
      { category: 'anuchon', number: 31, title_th: 'เพลงของพี่เปา', content: { version: 1, lines: ['แก้แล้ว'] } },
    ])
  })

  it('is a no-op on re-run of the identical import (no error)', async () => {
    await db.exec(fill(step(2)))
    await db.exec(fill(step(2)))
    expect(await rows()).toHaveLength(1)
  })

  it('names the clashing song in the error, not just a count', async () => {
    await db.exec(`insert into public.songs (category, number, title_th, content)
                   values ('anuchon', 31, 'เพลงของพี่เปา', '{}'::jsonb)`)
    expect((await runAndCatch(fill(step(2))))?.message).toMatch(/เลข 31 = "เพลงของพี่เปา"/)
  })

  it('refuses when only title_en differs (a field you were not looking at)', async () => {
    await db.exec(`insert into public.songs (category, number, title_th, title_en, content)
                   values ('anuchon', 31, 'เพลงใหม่', 'Kept English title', '${CONTENT}'::jsonb)`)
    expect((await runAndCatch(fill(step(2))))?.message).toMatch(/เลขเพลงชนกับเพลงที่มีอยู่/)
    expect(await rows()).toHaveLength(1)
  })
})

describe('overwrite template (the separate, deliberate act)', () => {
  // the same expression STEP 1 of the import template shows the human
  const fingerprint = async () => (await db.query(
    `select md5(coalesce(title_th,'') || '␟' || coalesce(title_en,'') || '␟' || content::text) as f
       from public.songs where number = 31`)).rows[0].f

  it('overwrites only when the row is still exactly the one you looked at', async () => {
    await db.exec(`insert into public.songs (category, number, title_th, content)
                   values ('anuchon', 31, 'ชื่อเดิม', '{"a":1}'::jsonb)`)
    await db.exec(fillOverwrite({
      titleTh: 'ชื่อใหม่', content: '{"a":2}',
      oldTitle: 'ชื่อเดิม', oldFingerprint: await fingerprint(),
    }))
    expect((await rows())[0]).toMatchObject({ title_th: 'ชื่อใหม่', content: { a: 2 } })
  })

  it('aborts when someone edited the song after you looked', async () => {
    await db.exec(`insert into public.songs (category, number, title_th, content)
                   values ('anuchon', 31, 'ชื่อเดิม', '{"a":1}'::jsonb)`)
    const stale = await fingerprint()
    // …พี่เปา edits it in the meantime
    await db.exec(`update public.songs set content = '{"a":99}'::jsonb where number = 31`)

    // Run the guard block on its own, the way the SQL Editor reports the FIRST error —
    // running the whole file also fails, but the message the human is shown is this one.
    const sql = fillOverwrite({
      titleTh: 'ชื่อใหม่', content: '{"a":2}',
      oldTitle: 'ชื่อเดิม', oldFingerprint: stale,
    })
    const guardBlock = sql.slice(sql.indexOf('do $$'), sql.indexOf('end $$;') + 'end $$;'.length)
    await expect(db.exec(guardBlock)).rejects.toThrow(/มีคนแก้เพลงนี้หลังจากที่คุณดู/)
    expect((await rows())[0]).toMatchObject({ title_th: 'ชื่อเดิม', content: { a: 99 } })
  })
})
