import { describe, it, expect } from 'vitest'
import { fetchAllRows } from './fetchAllRows.js'

// A fake query builder over `all` that, like the real API, never returns more than `cap` rows.
function fakeTable(all, cap = 1000) {
  const calls = []
  const make = () => ({
    range(from, to) {
      calls.push([from, to])
      const end = Math.min(to + 1, from + cap)
      return Promise.resolve({ data: all.slice(from, end), error: null })
    },
  })
  return { make, calls }
}

describe('fetchAllRows — lists past the 1000-row cap stay whole', () => {
  it('1030 rows come back as 1030, the last 30 included', async () => {
    const all = Array.from({ length: 1030 }, (_, i) => ({ id: i }))
    const t = fakeTable(all)
    const { data, error } = await fetchAllRows(t.make)
    expect(error).toBeNull()
    expect(data).toHaveLength(1030)
    expect(data[1029].id).toBe(1029)
    expect(t.calls).toEqual([[0, 999], [1000, 1999]])
  })

  it('a short list needs one request', async () => {
    const t = fakeTable([{ id: 1 }, { id: 2 }])
    const { data } = await fetchAllRows(t.make)
    expect(data).toHaveLength(2)
    expect(t.calls).toHaveLength(1)
  })

  it('exactly one full page asks once more and stops on the empty page', async () => {
    const t = fakeTable(Array.from({ length: 4 }, (_, i) => ({ id: i })))
    const { data } = await fetchAllRows(t.make, 2)
    expect(data).toHaveLength(4)
    expect(t.calls).toEqual([[0, 1], [2, 3], [4, 5]])
  })

  it('an error on a later page returns no data at all, never a half list', async () => {
    let n = 0
    const make = () => ({
      range: () => Promise.resolve(n++ === 0 ? { data: Array(1000).fill({}), error: null } : { data: null, error: { message: 'x' } }),
    })
    const { data, error } = await fetchAllRows(make)
    expect(data).toBeNull()
    expect(error).toEqual({ message: 'x' })
  })

  it('an error on the first page returns the error with no data', async () => {
    const make = () => ({ range: () => Promise.resolve({ data: null, error: { message: 'x' } }) })
    const { data, error } = await fetchAllRows(make)
    expect(data).toBeNull()
    expect(error).toEqual({ message: 'x' })
  })
  it('a builder with no range() is simply awaited once', async () => {
    const q = { then: (ok) => Promise.resolve({ data: [{ id: 1 }], error: null }).then(ok) }
    const { data } = await fetchAllRows(() => q)
    expect(data).toEqual([{ id: 1 }])
  })
})
