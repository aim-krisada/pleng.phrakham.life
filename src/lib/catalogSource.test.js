// Supabase quota (23 พ.ย. 2569): readers read the catalog file from GitHub and ask the database
// only for what changed since. These pin the merge and the "when to fall back to the full list".
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const calls = []
let answers = {}
function builder(kind) {
  const b = {
    kind, filters: [],
    select(cols, opts) { this.cols = cols; this.opts = opts; if (opts?.head) this.kind = 'count'; else if (cols === 'id') this.kind = 'ids'; return this },
    is() { return this }, order() { return this }, limit() { return this },
    gt(col, v) { this.kind = 'changed'; this.since = v; return this },
    range() { return this },
    then(res, rej) { calls.push(this.kind); return Promise.resolve(answers[this.kind]).then(res, rej) },
  }
  return b
}
vi.mock('../supabase.js', () => ({ supabase: { from: () => builder('full') } }))

const { fetchCatalog, mergeCatalog, catalogOrder, _forgetCatalogFile } = await import('./catalogSource.js')

const song = (id, number, extra = {}) => ({ id, number, title_th: 't' + id, verified: true, ...extra })
const file = { v: 1, at: '2026-11-22T00:00:00Z', count: 3, rows: [song('a', 1), song('b', 2), song('c', null)] }

beforeEach(() => {
  calls.length = 0
  _forgetCatalogFile()
  answers = {}
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => file }))
})
afterEach(() => { delete globalThis.fetch })

describe('mergeCatalog', () => {
  it('replaces changed rows, adds new ones, keeps the order, drops the query-only stamp', () => {
    const out = mergeCatalog(file.rows, [song('b', 2, { title_th: 'new', updated_at: 'x' }), song('d', 0)])
    expect(out.map((r) => r.id)).toEqual(['d', 'a', 'b', 'c'])
    expect(out[2]).toEqual(song('b', 2, { title_th: 'new' }))
  })
  it('drops songs no longer in the id list, and never keeps an unchecked one', () => {
    expect(mergeCatalog(file.rows, [song('a', 1, { verified: false })], ['a', 'c']).map((r) => r.id)).toEqual(['c'])
  })
  it('orders blank numbers last, then by id', () => {
    expect([song('z', null), song('y', null), song('x', 5)].sort(catalogOrder).map((r) => r.id)).toEqual(['x', 'y', 'z'])
  })
})

describe('fetchCatalog', () => {
  it('a reader with nothing changed: the file + two tiny questions, no full read', async () => {
    answers = { changed: { data: [], error: null }, count: { count: 3, error: null } }
    const { data } = await fetchCatalog()
    expect(data.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(calls.sort()).toEqual(['changed', 'count'])
  })
  it('asks only for songs changed after the file was made', async () => {
    answers = { changed: { data: [song('b', 2, { title_th: 'แก้แล้ว' })], error: null }, count: { count: 3, error: null } }
    const { data } = await fetchCatalog()
    expect(data.find((r) => r.id === 'b').title_th).toBe('แก้แล้ว')
  })
  it('a song left the list: reads the ids and drops it', async () => {
    answers = { changed: { data: [], error: null }, count: { count: 2, error: null }, ids: { data: [{ id: 'a' }, { id: 'c' }], error: null } }
    const { data } = await fetchCatalog()
    expect(data.map((r) => r.id)).toEqual(['a', 'c'])
    expect(calls).not.toContain('full')
  })
  it('the database is down: the file alone', async () => {
    answers = { changed: { data: null, error: { message: 'x' } }, count: { count: null, error: { message: 'x' } } }
    const { data, error } = await fetchCatalog()
    expect(error).toBeNull()
    expect(data).toHaveLength(3)
  })
  it('no file (not deployed yet / offline GitHub): the full list from the database, as before', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false }))
    answers = { full: { data: [song('a', 1)], error: null } }
    const { data } = await fetchCatalog()
    expect(calls).toEqual(['full'])
    expect(data).toHaveLength(1)
  })
  it('the team (signed in) reads the full list — they must see unchecked songs', async () => {
    answers = { full: { data: [song('a', 1)], error: null } }
    await fetchCatalog({ signedIn: true })
    expect(calls).toEqual(['full'])
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
