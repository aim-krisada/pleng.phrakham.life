// B028 — audit log presentation helpers (pure JS, no DB). The real trigger/RPC behaviour
// is tested against Postgres in db/004-audit-log-events.test.js.
import { describe, it, expect } from 'vitest'
import {
  classifyChange,
  EVENT_META,
  eventMeta,
  actorLabel,
  rowDiff,
  collapseOpGroups,
  loadSongHistory,
} from './auditLog.js'

describe('classifyChange — raw change -> meaningful event (mirrors the SQL trigger)', () => {
  it('draft INSERT = create (editor)', () => {
    expect(classifyChange({ table: 'song_drafts', op: 'INSERT' })).toEqual({
      event: 'create',
      hand: 'editor',
    })
  })
  it('draft edit (content changed, status unchanged) = edit (editor)', () => {
    expect(
      classifyChange({ table: 'song_drafts', op: 'UPDATE', oldStatus: 'draft', newStatus: 'draft' })
    ).toEqual({ event: 'edit', hand: 'editor' })
  })
  it('draft -> pending = submit (editor)', () => {
    expect(
      classifyChange({ table: 'song_drafts', op: 'UPDATE', oldStatus: 'draft', newStatus: 'pending' })
    ).toEqual({ event: 'submit', hand: 'editor' })
  })
  it('rejected -> pending = submit (re-send after a bounce)', () => {
    expect(
      classifyChange({ table: 'song_drafts', op: 'UPDATE', oldStatus: 'rejected', newStatus: 'pending' })
    ).toEqual({ event: 'submit', hand: 'editor' })
  })
  it('pending -> approved = approve_publish (approver)', () => {
    expect(
      classifyChange({ table: 'song_drafts', op: 'UPDATE', oldStatus: 'pending', newStatus: 'approved' })
    ).toEqual({ event: 'approve_publish', hand: 'approver' })
  })
  it('pending -> rejected = reject (approver)', () => {
    expect(
      classifyChange({ table: 'song_drafts', op: 'UPDATE', oldStatus: 'pending', newStatus: 'rejected' })
    ).toEqual({ event: 'reject', hand: 'approver' })
  })
  it('draft DELETE = not logged (null)', () => {
    expect(classifyChange({ table: 'song_drafts', op: 'DELETE' })).toBeNull()
  })
  it('songs INSERT = approve_publish (approver)', () => {
    expect(classifyChange({ table: 'songs', op: 'INSERT' })).toEqual({
      event: 'approve_publish',
      hand: 'approver',
    })
  })
  it('songs UPDATE = edit_published (approver)', () => {
    expect(classifyChange({ table: 'songs', op: 'UPDATE' })).toEqual({
      event: 'edit_published',
      hand: 'approver',
    })
  })
  it('songs DELETE = unpublish (approver)', () => {
    expect(classifyChange({ table: 'songs', op: 'DELETE' })).toEqual({
      event: 'unpublish',
      hand: 'approver',
    })
  })
  it('covers every event in EVENT_META', () => {
    const produced = new Set()
    for (const t of ['song_drafts', 'songs']) {
      for (const op of ['INSERT', 'UPDATE', 'DELETE']) {
        for (const [oldStatus, newStatus] of [
          ['draft', 'draft'],
          ['draft', 'pending'],
          ['pending', 'approved'],
          ['pending', 'rejected'],
        ]) {
          const r = classifyChange({ table: t, op, oldStatus, newStatus })
          if (r) produced.add(r.event)
        }
      }
    }
    for (const ev of Object.keys(EVENT_META)) expect(produced.has(ev)).toBe(true)
  })
})

describe('eventMeta', () => {
  it('every event has a Thai label + icon + hand', () => {
    for (const [ev, meta] of Object.entries(EVENT_META)) {
      expect(meta.label).toBeTruthy()
      expect(meta.icon).toBeTruthy()
      expect(['editor', 'approver']).toContain(meta.hand)
      expect(eventMeta(ev)).toBe(meta)
    }
  })
  it('unknown event falls back gracefully', () => {
    expect(eventMeta('mystery').label).toBeTruthy()
  })
})

describe("actorLabel — the name must never vanish (P'Aim #4)", () => {
  it('uses the write-time snapshot even when the profile is gone', () => {
    // profile map is EMPTY (user deleted), yet the snapshot name still shows
    expect(actorLabel({ actor_name: 'พี่เปา', actor_id: 'u1' }, {})).toBe('พี่เปา')
  })
  it('snapshot wins over a since-renamed live profile', () => {
    expect(actorLabel({ actor_name: 'ชื่อเดิม', actor_id: 'u1' }, { u1: 'ชื่อใหม่' })).toBe('ชื่อเดิม')
  })
  it('falls back to the live map for pre-004 rows (no snapshot)', () => {
    expect(actorLabel({ actor_id: 'u1' }, { u1: 'สมชาย' })).toBe('สมชาย')
    expect(actorLabel({ editor_id: 'u2' }, { u2: 'สมหญิง' })).toBe('สมหญิง')
  })
  it('unknown actor -> ไม่ทราบชื่อ', () => {
    expect(actorLabel({}, {})).toBe('ไม่ทราบชื่อ')
  })
})

describe('rowDiff', () => {
  const before = { title_th: 'ก', number: 1, content: { key: 'C', lines: [] } }
  const after = { title_th: 'ข', number: 1, content: { key: 'C', lines: [] } }
  it('reads the new before/after columns', () => {
    expect(rowDiff({ before, after })).toContain('ชื่อ: "ก" → "ข"')
  })
  it('falls back to legacy old_row/new_row', () => {
    expect(rowDiff({ old_row: before, new_row: after })).toContain('ชื่อ: "ก" → "ข"')
  })
  it('null before = created', () => {
    expect(rowDiff({ before: null, after })).toEqual(['สร้างเพลง'])
  })
  it('no snapshot at all = no diff (never crashes)', () => {
    expect(rowDiff({ event: 'submit' })).toEqual([])
    expect(rowDiff({ before: null, after: null })).toEqual([])
  })
})

describe("collapseOpGroups — approve+publish shows as ONE line (P'Aim #3)", () => {
  it('merges rows sharing an op_group and shows the most meaningful event', () => {
    // newest-first: the songs insert and the draft approval share group g1
    const rows = [
      { id: 10, op_group: 'g1', entity: 'song', event: 'approve_publish', actor_name: 'พี่เปา', after: { title_th: 'x' } },
      { id: 9, op_group: 'g1', entity: 'draft', event: 'approve_publish', actor_name: 'พี่เปา' },
      { id: 5, op_group: null, entity: 'draft', event: 'submit', actor_name: 'น้องเอ' },
    ]
    const out = collapseOpGroups(rows)
    expect(out).toHaveLength(2) // group collapsed + the standalone submit
    expect(out[0].event).toBe('approve_publish')
    expect(out[0].members).toHaveLength(2)
    expect(out[0].entity).toBe('song') // representative = the published copy
    expect(out[1].event).toBe('submit')
  })
  it('an edit_published + approve_publish group surfaces approve_publish', () => {
    const rows = [
      { id: 2, op_group: 'g2', entity: 'song', event: 'edit_published', after: { title_th: 'y' } },
      { id: 1, op_group: 'g2', entity: 'draft', event: 'approve_publish' },
    ]
    const out = collapseOpGroups(rows)
    expect(out).toHaveLength(1)
    expect(out[0].event).toBe('approve_publish')
  })
  it('rows without an op_group stay separate', () => {
    const rows = [
      { id: 3, event: 'edit', op_group: null },
      { id: 2, event: 'edit', op_group: null },
    ]
    expect(collapseOpGroups(rows)).toHaveLength(2)
  })
})

describe('loadSongHistory — unifies the draft + published timeline', () => {
  // a tiny chainable fake of the supabase client
  function fakeClient({ drafts = [], revisions = [] }) {
    return {
      from(table) {
        const q = {
          _table: table,
          _filters: {},
          select() { return q },
          eq(col, val) { q._filters[col] = val; return q },
          in(col, vals) { q._in = { col, vals }; return q },
          order() { return q },
          limit() {
            if (q._table === 'song_revisions') {
              const { col, vals } = q._in
              return Promise.resolve({
                data: revisions.filter((r) => vals.includes(r[col])),
                error: null,
              })
            }
            return Promise.resolve({ data: [], error: null })
          },
          then(res) {
            // song_drafts query resolves here (no .limit())
            const data = drafts.filter((d) => d.song_id === q._filters.song_id)
            return Promise.resolve({ data, error: null }).then(res)
          },
        }
        return q
      },
    }
  }

  it('pulls rows keyed by the song id AND by its linked draft ids', async () => {
    const client = fakeClient({
      drafts: [{ id: 'draft-1', song_id: 'song-1' }],
      revisions: [
        { id: 5, song_ref: 'song-1', event: 'edit_published' },
        { id: 3, song_ref: 'draft-1', event: 'submit' }, // early draft row (song_id was null then)
        { id: 2, song_ref: 'draft-1', event: 'create' },
        { id: 1, song_ref: 'other', event: 'create' }, // unrelated
      ],
    })
    const out = await loadSongHistory({ songId: 'song-1' }, client)
    const events = out.map((r) => r.event)
    expect(events).toContain('edit_published')
    expect(events).toContain('submit')
    expect(events).toContain('create')
    expect(out.find((r) => r.song_ref === 'other')).toBeUndefined()
  })

  it('returns [] when nothing identifies the song', async () => {
    const client = fakeClient({})
    expect(await loadSongHistory({}, client)).toEqual([])
  })
})
