// @vitest-environment node
// 011 — approve_and_publish must not wipe a field the caller never mentioned.
//
// The "before" side of every test below is the body that is ACTUALLY LIVE (P'Aim read it out
// of production on 23 Jul 2026 with pg_get_functiondef) — kept verbatim in LIVE_FN, not taken
// from the repo. The repo's db/006 was never deployed; production still credits auth.uid().
//
// Everything runs on a real in-process Postgres (pglite). Production is never contacted.
//
// The three things PM asked to be proven are tagged (ก) (ข) (ค) in the describe titles:
//   (ก) not one row of data is touched by the migration      → xmin-level diff
//   (ข) the change only ever points safer                     → case matrix
//   (ค) the live v1 app keeps working identically             → replay of the DEPLOYED payload
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (f) => readFileSync(join(HERE, f), 'utf8')
const M004 = read('004-audit-log-events.sql') // gives us the trigger + the original RPC
const M011 = read('011-approve-keep-theme.sql')
const ROLLBACK = read('011-rollback-approve-keep-theme.sql')

// ── The live function, verbatim from production (23 Jul 2026) ────────────────────────────
// db/004 installs its own copy; production has since diverged only in that the insert branch
// still says auth.uid() (i.e. db/006 was NOT run). Applying this after 004 makes the test DB
// byte-identical to production before every test.
const LIVE_FN = ROLLBACK

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

create table public.profiles (
  id uuid primary key, display_name text, role text not null default 'editor'
);
create or replace function public.app_role() returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid() $$;

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  number int, title_th text, title_en text, content jsonb,
  category text, theme text, review_flags jsonb, verified boolean default false,
  author_id uuid, created_at timestamptz default now(), updated_at timestamptz default now()
);

-- song_drafts INCLUDING the two columns db/010 added (confirmed present on live)
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

/** A database in exactly production's state; apply011 = after running the migration. */
async function freshDb({ apply011 = true } = {}) {
  const db = await PGlite.create()
  await db.exec(BOOTSTRAP)
  await db.exec(M004)
  await db.exec(LIVE_FN) // ← production's body, replacing 004's copy
  if (apply011) await db.exec(M011)
  await db.exec(`
    insert into public.profiles (id, display_name, role) values
      ('${EDITOR}', 'น้องเอ', 'editor'),
      ('${APPROVER}', 'พี่เปา', 'approver');
  `)
  return db
}
const asUser = (db, uid) => db.exec(`set test.uid = '${uid}';`)
const rows = async (db, sql, params) => (await db.query(sql, params)).rows

/** A published song shaped like the live ones: has a เลขเพลง, a ธีม, and is not อนุชน. */
async function publishedSong(db, over = {}) {
  const s = {
    number: 123,
    title_th: 'เพลงเดิม',
    title_en: 'Old Title',
    category: 'lem-yai',
    theme: 'ความรอด',
    ...over,
  }
  const [r] = await rows(
    db,
    `insert into public.songs (number, title_th, title_en, content, category, theme, review_flags, author_id)
     values ($1,$2,$3,'{"lines":[]}'::jsonb,$4,$5,'[]'::jsonb,$6) returning id`,
    [s.number, s.title_th, s.title_en, s.category, s.theme, EDITOR]
  )
  return r.id
}

/** A pending draft of that song. Pre-010 rows have category/theme NULL — the normal case. */
async function pendingDraft(db, songId, over = {}) {
  const [r] = await rows(
    db,
    `insert into public.song_drafts (song_id, title_th, title_en, number, content, status, author_id, category, theme)
     values ($1,$2,$3,$4,'{"lines":[]}'::jsonb,'pending',$5,$6,$7) returning id`,
    [
      songId,
      over.title_th ?? 'เพลงเดิม',
      over.title_en ?? null,
      over.number ?? null,
      over.author_id ?? EDITOR,
      over.category ?? null,
      over.theme ?? null,
    ]
  )
  return r.id
}

/**
 * THE PAYLOAD THE DEPLOYED APP ACTUALLY SENDS.
 * Transcribed from https://pleng.phrakham.life/assets/index-CSAfPjE3.js (fetched 23 Jul 2026):
 *   const m = {number: C.number||null, title_th: C.title_th.trim(),
 *              title_en: C.title_en?.trim()||null, content: ..., review_flags: d};
 *   H.value && (m.category = C.category||"anuchon");   // only when หมวด is known
 *   re.value && (m.theme = C.theme||null);             // only when ธีม is known
 * → those five keys are ALWAYS present; category/theme are attached only when known.
 */
function livePayload({ categoryKnown = false, themeKnown = false, meta = {} } = {}) {
  const p = {
    number: meta.number ?? null,
    title_th: (meta.title_th ?? 'เพลงเดิม').trim(),
    title_en: meta.title_en === undefined ? 'Old Title' : meta.title_en,
    content: { lines: [] },
    review_flags: [],
  }
  if (categoryKnown) p.category = meta.category || 'anuchon'
  if (themeKnown) p.theme = meta.theme || null
  return p
}

const approve = (db, draftId, payload, comment = null) =>
  db.query(`select public.approve_and_publish($1, $2::jsonb, $3) as id`, [
    draftId,
    JSON.stringify(payload),
    comment,
  ])

const songById = async (db, id) =>
  (await rows(db, `select * from public.songs where id = $1`, [id]))[0]

let db
beforeEach(async () => {
  db = await freshDb()
})

// ══════════════════════════════════════════════════════════════════════════════════════════
describe('the bug, on the body that is actually live', () => {
  it('LIVE today: approving with an unresolved ธีม wipes ธีม, ชื่อ EN and เลขเพลง', async () => {
    const live = await freshDb({ apply011: false })
    const songId = await publishedSong(live)
    const draftId = await pendingDraft(live, songId)
    await asUser(live, APPROVER)

    // the app could not resolve the ธีม → it omits the key (and here the user typed no
    // number/title_en either, so the app sends them as null — its normal behaviour)
    await approve(live, draftId, { title_th: 'เพลงเดิม', content: { lines: [] }, review_flags: [] })

    const s = await songById(live, songId)
    expect(s.theme).toBe(null) // ธีมหาย
    expect(s.title_en).toBe(null) // ชื่อ EN หาย
    expect(s.number).toBe(null) // เลขเพลงหาย
  })

  it('AFTER 011: the same approve keeps all three', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)

    await approve(db, draftId, { title_th: 'เพลงเดิม', content: { lines: [] }, review_flags: [] })

    const s = await songById(db, songId)
    expect(s.theme).toBe('ความรอด')
    expect(s.title_en).toBe('Old Title')
    expect(s.number).toBe(123)
    expect(s.category).toBe('lem-yai')
  })

  it('the rollback file really restores the live (wiping) body', async () => {
    await db.exec(ROLLBACK)
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(db, draftId, { title_th: 'เพลงเดิม', content: { lines: [] }, review_flags: [] })
    expect((await songById(db, songId)).theme).toBe(null)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════════
describe('(ค) the live v1 app keeps working — identical, field by field', () => {
  // Replay the DEPLOYED payload through the live function and through 011 and diff every
  // column. Anything the app sends today must come out the same on both.
  const COLS = ['number', 'title_th', 'title_en', 'content', 'category', 'theme', 'review_flags']

  const SCENARIOS = [
    ['nothing known (app omits both)', { categoryKnown: false, themeKnown: false }],
    ['both known, unchanged', { categoryKnown: true, themeKnown: true, meta: { category: 'lem-yai', theme: 'ความรอด' } }],
    ['both known, user changed them', { categoryKnown: true, themeKnown: true, meta: { category: 'dek-lek', theme: 'พระคุณ' } }],
    ['known but user cleared ธีม', { categoryKnown: true, themeKnown: true, meta: { category: 'lem-yai', theme: '' } }],
    ['หมวด known, ธีม not', { categoryKnown: true, themeKnown: false, meta: { category: 'dek-lek' } }],
    ['new เลขเพลง + ชื่อ EN typed in', { categoryKnown: true, themeKnown: true, meta: { number: 456, title_en: 'New Title', category: 'lem-yai', theme: 'ความรอด' } }],
    ['เลขเพลง + ชื่อ EN cleared by the user', { categoryKnown: true, themeKnown: true, meta: { number: null, title_en: null, category: 'lem-yai', theme: 'ความรอด' } }],
  ]

  for (const [name, opts] of SCENARIOS) {
    it(`${name} → same result on both bodies (or safer)`, async () => {
      const before = await freshDb({ apply011: false })
      const after = await freshDb({ apply011: true })
      const payload = livePayload(opts)

      const out = {}
      for (const [key, target] of [
        ['before', before],
        ['after', after],
      ]) {
        const songId = await publishedSong(target)
        const draftId = await pendingDraft(target, songId)
        await asUser(target, APPROVER)
        await approve(target, draftId, payload)
        out[key] = await songById(target, songId)
      }

      for (const c of COLS) {
        if (!('theme' in payload) && c === 'theme') {
          // the ONE case that changes: unknown ธีม was wiped, is now kept
          expect(out.before.theme).toBe(null)
          expect(out.after.theme).toBe('ความรอด')
          continue
        }
        expect({ [c]: out.after[c] }).toEqual({ [c]: out.before[c] })
      }
    })
  }

  it('every key the app always sends is honoured exactly as before (presence is always true)', async () => {
    const p = livePayload({ categoryKnown: true, themeKnown: true })
    for (const k of ['number', 'title_th', 'title_en', 'content', 'review_flags']) {
      expect(Object.prototype.hasOwnProperty.call(p, k)).toBe(true)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════════
describe('(ก) the migration touches no data at all', () => {
  it('every row of songs / song_drafts / song_revisions is byte-identical, xmin included', async () => {
    const fresh = await freshDb({ apply011: false })
    const songId = await publishedSong(fresh)
    await publishedSong(fresh, { number: 7, title_th: 'อีกเพลง', category: 'dek-lek', theme: 'สรรเสริญ' })
    await pendingDraft(fresh, songId)

    // xmin = the transaction that last wrote the row; ANY write to a row changes it
    const snapshot = async () => ({
      songs: await rows(fresh, `select *, xmin::text from public.songs order by id`),
      drafts: await rows(fresh, `select *, xmin::text from public.song_drafts order by id`),
      revs: await rows(fresh, `select *, xmin::text from public.song_revisions order by id`),
    })

    const before = await snapshot()
    await fresh.exec(M011)
    const after = await snapshot()

    expect(after).toEqual(before)
  })

  it('the migration file runs no data statement of its own', () => {
    // Strip comments, then strip the function body it INSTALLS (the insert/update in there
    // belong to the RPC and only run later, when an approver presses the button). What is
    // left is what this file executes at migration time — it must be metadata-only.
    const executed = M011.replace(/^\s*--.*$/gm, '').replace(/\$ddl\$[\s\S]*\$ddl\$/, '<function body>')
    expect(executed).not.toMatch(/\b(insert|delete|truncate|alter\s+table|drop)\b/i)
    expect(executed).not.toMatch(/update\s+public\./i)
    // the only things it does execute
    expect(executed).toMatch(/create or replace function|<function body>/)
    expect(executed).toMatch(/grant execute on function/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════════
describe('(ข) each field, each shape — never less safe than today', () => {
  const FIELDS = [
    ['theme', 'ความรอด', 'พระคุณ'],
    ['title_en', 'Old Title', 'New Title'],
  ]
  for (const [field, stored, fresh] of FIELDS) {
    it(`${field}: key absent → kept`, async () => {
      const songId = await publishedSong(db)
      const draftId = await pendingDraft(db, songId)
      await asUser(db, APPROVER)
      await approve(db, draftId, { title_th: 'เพลงเดิม', content: { lines: [] }, review_flags: [] })
      expect((await songById(db, songId))[field]).toBe(stored)
    })
    it(`${field}: key present with a value → written`, async () => {
      const songId = await publishedSong(db)
      const draftId = await pendingDraft(db, songId)
      await asUser(db, APPROVER)
      await approve(db, draftId, { title_th: 'เพลงเดิม', [field]: fresh })
      expect((await songById(db, songId))[field]).toBe(fresh)
    })
    it(`${field}: key present but null → cleared on purpose (still possible)`, async () => {
      const songId = await publishedSong(db)
      const draftId = await pendingDraft(db, songId)
      await asUser(db, APPROVER)
      await approve(db, draftId, { title_th: 'เพลงเดิม', [field]: null })
      expect((await songById(db, songId))[field]).toBe(null)
    })
  }

  it('number: absent → kept · present → written · present-null → cleared · present-"" → cleared', async () => {
    const run = async (payloadExtra) => {
      const songId = await publishedSong(db)
      const draftId = await pendingDraft(db, songId)
      await asUser(db, APPROVER)
      await approve(db, draftId, { title_th: 'เพลงเดิม', ...payloadExtra })
      return (await songById(db, songId)).number
    }
    expect(await run({})).toBe(123)
    expect(await run({ number: 456 })).toBe(456)
    expect(await run({ number: null })).toBe(null)
    expect(await run({ number: '' })).toBe(null)
  })

  it('category keeps its original coalesce — untouched by 011', async () => {
    const songId = await publishedSong(db, { category: 'dek-lek' })
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(db, draftId, { title_th: 'เพลงเดิม' })
    expect((await songById(db, songId)).category).toBe('dek-lek')
    const songId2 = await publishedSong(db, { category: 'dek-lek' })
    const draftId2 = await pendingDraft(db, songId2)
    await approve(db, draftId2, { title_th: 'เพลงเดิม', category: 'lem-yai' })
    expect((await songById(db, songId2)).category).toBe('lem-yai')
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════════
describe('the INSERT branch (a brand-new song) — the same hole, closed the same way', () => {
  const newDraft = async (target, over = {}) => {
    const [r] = await rows(
      target,
      `insert into public.song_drafts (title_th, title_en, number, content, status, author_id, category, theme)
       values ('เพลงใหม่', $1, $2, '{"lines":[]}'::jsonb, 'pending', '${EDITOR}', $3, $4) returning id`,
      // `in`, not `??` — the tests below pass null ON PURPOSE (a draft that recorded nothing)
      ['title_en' in over ? over.title_en : 'Draft EN', 'number' in over ? over.number : 900,
       'category' in over ? over.category : 'lem-yai', 'theme' in over ? over.theme : 'พระคุณ']
    )
    return r.id
  }

  it('LIVE today: a draft that carries หมวด/ธีม/เลข loses them all on publish', async () => {
    const live = await freshDb({ apply011: false })
    const draftId = await newDraft(live)
    await asUser(live, APPROVER)
    const res = await approve(live, draftId, { title_th: 'เพลงใหม่', content: { lines: [] } })
    const s = await songById(live, res.rows[0].id)
    expect(s.theme).toBe(null)
    expect(s.category).toBe('anuchon') // ← the B108 fallback
    expect(s.number).toBe(null)
    expect(s.title_en).toBe(null)
  })

  it('AFTER 011: the draft\'s own values are used instead', async () => {
    const draftId = await newDraft(db)
    await asUser(db, APPROVER)
    const res = await approve(db, draftId, { title_th: 'เพลงใหม่', content: { lines: [] } })
    const s = await songById(db, res.rows[0].id)
    expect(s.theme).toBe('พระคุณ')
    expect(s.category).toBe('lem-yai')
    expect(s.number).toBe(900)
    expect(s.title_en).toBe('Draft EN')
  })

  it('a draft with nothing recorded still falls back to อนุชน, exactly as today', async () => {
    const draftId = await newDraft(db, { category: null, theme: null, number: null, title_en: null })
    await asUser(db, APPROVER)
    const res = await approve(db, draftId, { title_th: 'เพลงใหม่', content: { lines: [] } })
    const s = await songById(db, res.rows[0].id)
    expect(s.category).toBe('anuchon')
    expect(s.theme).toBe(null)
  })

  it('the payload still wins over the draft when it says something', async () => {
    const draftId = await newDraft(db)
    await asUser(db, APPROVER)
    const res = await approve(db, draftId, {
      title_th: 'เพลงใหม่',
      content: { lines: [] },
      category: 'dek-lek',
      theme: 'สรรเสริญ',
      number: 901,
    })
    const s = await songById(db, res.rows[0].id)
    expect(s.category).toBe('dek-lek')
    expect(s.theme).toBe('สรรเสริญ')
    expect(s.number).toBe(901)
  })

  it('author_id still records auth.uid() — db/006 is NOT applied as a side effect', async () => {
    const draftId = await newDraft(db)
    await asUser(db, APPROVER)
    const res = await approve(db, draftId, { title_th: 'เพลงใหม่', content: { lines: [] } })
    expect((await songById(db, res.rows[0].id)).author_id).toBe(APPROVER)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════════
describe('nothing else about the RPC changed', () => {
  it('non-approvers are still refused, and the song is left alone', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, EDITOR)
    await expect(approve(db, draftId, livePayload({}))).rejects.toThrow(/only approvers/)
    expect((await songById(db, songId)).theme).toBe('ความรอด')
  })

  it('a missing draft still raises', async () => {
    await asUser(db, APPROVER)
    await expect(
      approve(db, '33333333-3333-3333-3333-333333333333', livePayload({}))
    ).rejects.toThrow(/not found/)
  })

  it('the draft is still closed and the review comment recorded', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(db, draftId, livePayload({}), 'ดีแล้ว')
    const [d] = await rows(db, `select * from public.song_drafts where id = $1`, [draftId])
    expect(d.status).toBe('approved')
    expect(d.song_id).toBe(songId)
    expect(d.review_comment).toBe('ดีแล้ว')
  })

  it('the audit log still ties both rows together with ONE op_group (B028)', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(db, draftId, livePayload({}))
    const log = await rows(
      db,
      `select op_group from public.song_revisions
       where created_at > now() - interval '1 minute' and op_group is not null`
    )
    expect(log.length).toBeGreaterThanOrEqual(2)
    expect(new Set(log.map((r) => r.op_group)).size).toBe(1)
  })

  it('the grant survives the replace — the app can still call it', async () => {
    const [g] = await rows(
      db,
      `select has_function_privilege('authenticated',
         'public.approve_and_publish(uuid, jsonb, text)', 'execute') as ok`
    )
    expect(g.ok).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════════
describe('the migration guards itself', () => {
  it('is idempotent — re-running is a no-op, not an error', async () => {
    await db.exec(M011)
    await db.exec(M011)
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(db, draftId, { title_th: 'เพลงเดิม' })
    expect((await songById(db, songId)).theme).toBe('ความรอด')
  })

  it('REFUSES a function that was hand-edited on the server (and changes nothing)', async () => {
    const fresh = await freshDb({ apply011: false })
    await fresh.exec(`
      alter table public.songs add column book_refs jsonb;
      create or replace function public.approve_and_publish(
        p_draft_id uuid, p_song jsonb, p_review_comment text default null)
      returns uuid language plpgsql security definer set search_path = public as $$
      declare d public.song_drafts%rowtype; v_song_id uuid;
      begin
        select * into d from public.song_drafts where id = p_draft_id;
        v_song_id := d.song_id;
        update public.songs set
          number = nullif(p_song->>'number', '')::int,
          title_th = coalesce(p_song->>'title_th', title_th),
          title_en = p_song->>'title_en',
          content = coalesce(p_song->'content', content),
          category = coalesce(p_song->>'category', category),
          theme = p_song->>'theme',
          review_flags = coalesce(p_song->'review_flags', review_flags),
          book_refs = p_song->'book_refs'      -- the hand edit
        where id = v_song_id and auth.uid() is not null;
        return v_song_id;
      end $$;`)
    await expect(fresh.exec(M011)).rejects.toThrow(/STOP: the live approve_and_publish is not/)
    // and the hand edit is still there, untouched
    const [{ def }] = await rows(
      fresh,
      `select pg_get_functiondef('public.approve_and_publish(uuid,jsonb,text)'::regprocedure) as def`
    )
    expect(def).toMatch(/book_refs/)
  })

  it('REFUSES if db/006 turns out to have been run after all', async () => {
    const fresh = await freshDb({ apply011: false })
    await fresh.exec(read('006-author-id-fix.sql'))
    await expect(fresh.exec(M011)).rejects.toThrow(/STOP: the live function no longer credits/)
  })

  it('REFUSES if db/010 is missing (the new insert branch reads d.category/d.theme)', async () => {
    const fresh = await PGlite.create()
    await fresh.exec(BOOTSTRAP.replace('author_id uuid, category text, theme text,', 'author_id uuid,'))
    await fresh.exec(M004)
    await fresh.exec(LIVE_FN)
    await expect(fresh.exec(M011)).rejects.toThrow(/STOP: song_drafts is missing category, theme/)
  })

  it('REFUSES when the function does not exist at all', async () => {
    const fresh = await PGlite.create()
    await fresh.exec(BOOTSTRAP)
    await expect(fresh.exec(M011)).rejects.toThrow(/STOP: public.approve_and_publish/)
  })
})
