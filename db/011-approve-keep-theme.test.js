// @vitest-environment node
// 011 — approve_and_publish must not wipe a field the caller never mentioned.
//
// This runs the REAL migrations (004 → 006 → 011) against an in-process Postgres (pglite) and
// calls the REAL RPC with the EXACT payloads EditorMode.approve() builds. Production is never
// touched — nothing here talks to Supabase.
//
// Cases covered (the ones that matter for the live library: 162 songs · 80 with a ธีม ·
// 80 outside เล่มอนุชน):
//   * ธีม not sent (unknown) → kept                       ← the bug
//   * ธีม sent null / '' (user cleared it)  → cleared     ← clearing must still work
//   * ธีม sent with a value                 → written
//   * หมวด not sent → kept · sent → written · sent ''     → kept (a blank can't blank a book)
//   * title_en / number: same three shapes
//   * NEW song (draft with no song_id) → behaves exactly as db/006, author_id = the writer
//   * a draft whose category/theme columns are still NULL (every pre-010 row) → song intact
//   * the audit trail (db/004) still writes ONE op_group across both rows
//   * the guard: 011 aborts instead of overwriting a hand-edited function, and is idempotent
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (f) => readFileSync(join(HERE, f), 'utf8')
const M004 = read('004-audit-log-events.sql')
const M006 = read('006-author-id-fix.sql')
const M011 = read('011-approve-keep-theme.sql')
const ROLLBACK = read('011-rollback-approve-keep-theme.sql')

const EDITOR = '11111111-1111-1111-1111-111111111111'
const APPROVER = '22222222-2222-2222-2222-222222222222'

// Same stand-in for the 001/002 objects as db/004-audit-log-events.test.js, plus the two
// columns db/010 added to song_drafts (already live on Supabase).
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

async function freshDb({ apply011 = true } = {}) {
  const db = await PGlite.create()
  await db.exec(BOOTSTRAP)
  await db.exec(M004)
  await db.exec(M006)
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

/** A published song exactly like the live ones: has a ธีม and lives outside เล่มอนุชน. */
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
     values ($1, $2, $3, '{"lines":[]}'::jsonb, $4, $5, '[]'::jsonb, $6) returning id`,
    [s.number, s.title_th, s.title_en, s.category, s.theme, EDITOR]
  )
  return r.id
}

/** A pending draft of that song — pre-010 rows have category/theme NULL, which is the norm. */
async function pendingDraft(db, songId, over = {}) {
  const [r] = await rows(
    db,
    `insert into public.song_drafts (song_id, title_th, content, status, author_id, category, theme)
     values ($1, $2, '{"lines":[]}'::jsonb, 'pending', $3, $4, $5) returning id`,
    [
      songId,
      over.title_th ?? 'เพลงเดิม',
      over.author_id ?? EDITOR,
      over.category ?? null,
      over.theme ?? null,
    ]
  )
  return r.id
}

/**
 * The payload EditorMode.approve() actually builds (src/components/EditorMode.vue:1653-1663,
 * and identically on `main` at :1601-1611): the five always-present keys, plus category/theme
 * ONLY when that field is known.
 */
function approvePayload({ known = {}, meta = {} } = {}) {
  const p = {
    number: meta.number ?? null,
    title_th: meta.title_th ?? 'เพลงเดิม',
    title_en: meta.title_en === undefined ? 'Old Title' : meta.title_en,
    content: { lines: [] },
    review_flags: [],
  }
  if (known.category) p.category = meta.category || 'anuchon'
  if (known.theme) p.theme = meta.theme || null
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

describe('the bug — ธีม the approver never knew about', () => {
  it('KEEPS the stored ธีม when the payload has no theme key', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)

    await approve(db, draftId, approvePayload({ known: { category: false, theme: false } }))

    const s = await songById(db, songId)
    expect(s.theme).toBe('ความรอด') // ← was null before 011
    expect(s.category).toBe('lem-yai') // ← was 'anuchon' before 011
  })

  it('db/006 (pre-fix) really did wipe it — the test is testing something', async () => {
    const old = await freshDb({ apply011: false })
    const songId = await publishedSong(old)
    const draftId = await pendingDraft(old, songId)
    await asUser(old, APPROVER)

    await approve(old, draftId, approvePayload({ known: { category: false, theme: false } }))

    const s = await songById(old, songId)
    expect(s.theme).toBe(null) // the bug, reproduced
  })

  it('rolling back restores the old (wiping) behaviour — the rollback file really is db/006', async () => {
    await db.exec(ROLLBACK)
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)

    await approve(db, draftId, approvePayload({ known: { category: false, theme: false } }))

    expect((await songById(db, songId)).theme).toBe(null)
  })
})

describe('ธีม — the other shapes still behave', () => {
  const cases = [
    ['a real value is written', { theme: 'พระคุณ' }, 'พระคุณ'],
    ['null clears it (user deliberately cleared the field)', { theme: null }, null],
    ['empty string clears it', { theme: '' }, null],
  ]
  for (const [name, meta, expected] of cases) {
    it(name, async () => {
      const songId = await publishedSong(db)
      const draftId = await pendingDraft(db, songId)
      await asUser(db, APPROVER)

      const p = approvePayload({ known: { theme: true } })
      p.theme = meta.theme // known → key present, whatever the value
      await approve(db, draftId, p)

      expect((await songById(db, songId)).theme).toBe(expected)
    })
  }
})

describe('หมวด (book) — a blank can never blank a book', () => {
  it('keeps the stored หมวด when the key is absent', async () => {
    const songId = await publishedSong(db, { category: 'dek-lek' })
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(db, draftId, approvePayload({ known: { theme: true } }))
    expect((await songById(db, songId)).category).toBe('dek-lek')
  })

  it('writes a real หมวด when the key is present', async () => {
    const songId = await publishedSong(db, { category: 'dek-lek' })
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(
      db,
      draftId,
      approvePayload({ known: { category: true, theme: true }, meta: { category: 'lem-yai' } })
    )
    expect((await songById(db, songId)).category).toBe('lem-yai')
  })

  it('keeps the stored หมวด when the key is present but empty', async () => {
    const songId = await publishedSong(db, { category: 'dek-lek' })
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    const p = approvePayload({ known: { theme: true } })
    p.category = ''
    await approve(db, draftId, p)
    expect((await songById(db, songId)).category).toBe('dek-lek')
  })
})

describe('the same hole in title_en and number', () => {
  it('keeps title_en / number when the keys are absent', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(db, draftId, {
      title_th: 'เพลงเดิม',
      content: { lines: [] },
      review_flags: [],
    })
    const s = await songById(db, songId)
    expect(s.title_en).toBe('Old Title')
    expect(s.number).toBe(123)
  })

  it('still clears title_en / number when the client sends them as null (the live payload always does)', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(
      db,
      draftId,
      approvePayload({ known: { theme: true }, meta: { title_en: null, number: null } })
    )
    const s = await songById(db, songId)
    expect(s.title_en).toBe(null)
    expect(s.number).toBe(null)
  })

  it('still writes new values for title_en / number', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(
      db,
      draftId,
      approvePayload({ known: { theme: true }, meta: { title_en: 'New Title', number: 456 } })
    )
    const s = await songById(db, songId)
    expect(s.title_en).toBe('New Title')
    expect(s.number).toBe(456)
  })
})

describe('nothing else about the RPC changed', () => {
  it('a NEW song still publishes with the 006 defaults and credits the writer', async () => {
    const [d] = await rows(
      db,
      `insert into public.song_drafts (title_th, content, status, author_id)
       values ('เพลงใหม่', '{"lines":[]}'::jsonb, 'pending', '${EDITOR}') returning id`
    )
    await asUser(db, APPROVER)
    const res = await approve(db, d.id, {
      number: 900,
      title_th: 'เพลงใหม่',
      title_en: null,
      content: { lines: [] },
      review_flags: [],
    })
    const s = await songById(db, res.rows[0].id)
    expect(s.category).toBe('anuchon') // db/006 default for a new song
    expect(s.theme).toBe(null)
    expect(s.author_id).toBe(EDITOR) // db/006 fix intact: the writer, not the approver
  })

  it('non-approvers are still refused', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, EDITOR)
    await expect(approve(db, draftId, approvePayload({ known: { theme: true } }))).rejects.toThrow(
      /only approvers/
    )
    expect((await songById(db, songId)).theme).toBe('ความรอด')
  })

  it('a missing draft still raises', async () => {
    await asUser(db, APPROVER)
    await expect(
      approve(db, '33333333-3333-3333-3333-333333333333', approvePayload({}))
    ).rejects.toThrow(/not found/)
  })

  it('the draft is still closed and the review comment recorded', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(db, draftId, approvePayload({ known: { theme: true } }), 'ดีแล้ว')
    const [d] = await rows(db, `select * from public.song_drafts where id = $1`, [draftId])
    expect(d.status).toBe('approved')
    expect(d.song_id).toBe(songId)
    expect(d.review_comment).toBe('ดีแล้ว')
  })

  it('the audit log still ties both rows together with ONE op_group (B028)', async () => {
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(db, draftId, approvePayload({ known: { theme: true } }))
    const log = await rows(
      db,
      `select op_group from public.song_revisions where created_at > now() - interval '1 minute'
         and op_group is not null`
    )
    expect(log.length).toBeGreaterThanOrEqual(2)
    expect(new Set(log.map((r) => r.op_group)).size).toBe(1)
  })
})

describe('the migration itself', () => {
  it('is idempotent — re-running is a no-op, not an error', async () => {
    await db.exec(M011)
    await db.exec(M011)
    const songId = await publishedSong(db)
    const draftId = await pendingDraft(db, songId)
    await asUser(db, APPROVER)
    await approve(db, draftId, approvePayload({}))
    expect((await songById(db, songId)).theme).toBe('ความรอด')
  })

  it('REFUSES to overwrite a function that was hand-edited on the server', async () => {
    const fresh = await freshDb({ apply011: false })
    // someone extended the function by hand to also publish book_refs
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
          title_en = p_song->>'title_en',
          category = coalesce(p_song->>'category', category),
          theme = p_song->>'theme',
          book_refs = p_song->'book_refs',   -- the hand edit
          author_id = coalesce(author_id, d.author_id)
        where id = v_song_id;
        return v_song_id;
      end $$;`)
    await expect(fresh.exec(M011)).rejects.toThrow(/STOP: the live approve_and_publish differs/)
  })

  it('REFUSES when db/006 has not been run yet (still the db/004 body)', async () => {
    const fresh = await PGlite.create()
    await fresh.exec(BOOTSTRAP)
    await fresh.exec(M004) // 004 only — no 006
    await expect(fresh.exec(M011)).rejects.toThrow(/STOP: the live function is not the db\/006/)
  })

  it('REFUSES when the function does not exist at all', async () => {
    const fresh = await PGlite.create()
    await fresh.exec(BOOTSTRAP)
    await expect(fresh.exec(M011)).rejects.toThrow(/STOP: public.approve_and_publish/)
  })

  it('leaves the function callable throughout — the grant survives the replace', async () => {
    const [g] = await rows(
      db,
      `select has_function_privilege('authenticated',
         'public.approve_and_publish(uuid, jsonb, text)', 'execute') as ok`
    )
    expect(g.ok).toBe(true)
  })
})
