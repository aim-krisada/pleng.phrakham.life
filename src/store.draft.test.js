// US-D01 / DS-D01 — "save a draft" is one store action (saveDraftRow). The editor builds
// the row + owns which draft it edits; the store owns the single Supabase write. These
// assert the DS-D01 unit criterion: saving a draft produces a row with status 'draft'
// (insert for a new draft, in-place update for an existing one).
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./supabase.js', () => {
  const calls = []
  const makeQuery = () => {
    const q = {}
    q.insert = (row) => (calls.push({ op: 'insert', row }), q)
    q.update = (row) => (calls.push({ op: 'update', row }), q)
    q.select = () => q
    q.eq = (col, val) => (calls.push({ op: 'eq', col, val }), q)
    q.single = () => Promise.resolve({ data: { id: 'new-draft-1' }, error: null })
    q.then = (res) => Promise.resolve({ error: null }).then(res)
    return q
  }
  return { supabase: { from: () => makeQuery(), auth: {}, __calls: calls } }
})

import { supabase } from './supabase.js'
import { saveDraftRow } from './store.js'

const draftRow = () => ({ song_id: null, number: 7, title_th: 'เพลงร่าง', content: { version: 2 }, status: 'draft' })

beforeEach(() => {
  supabase.__calls.length = 0
})

describe('store.saveDraftRow (DS-D01)', () => {
  it('new draft → inserts a row with status draft and returns the new id', async () => {
    const { id, error } = await saveDraftRow(draftRow(), null)
    expect(error).toBeNull()
    expect(id).toBe('new-draft-1')
    const insert = supabase.__calls.find((c) => c.op === 'insert')
    expect(insert).toBeTruthy()
    expect(insert.row.status).toBe('draft')
    expect(insert.row.title_th).toBe('เพลงร่าง')
    // a brand-new draft must not update an existing row
    expect(supabase.__calls.some((c) => c.op === 'update')).toBe(false)
  })

  it('existing draft → updates that row in place, keeps the same id', async () => {
    const { id, error } = await saveDraftRow(draftRow(), 'draft-99')
    expect(error).toBeNull()
    expect(id).toBe('draft-99')
    const update = supabase.__calls.find((c) => c.op === 'update')
    expect(update).toBeTruthy()
    expect(update.row.status).toBe('draft')
    expect(supabase.__calls.some((c) => c.op === 'eq' && c.val === 'draft-99')).toBe(true)
    // updating in place must not insert a second draft
    expect(supabase.__calls.some((c) => c.op === 'insert')).toBe(false)
  })
})
