// Offline song library — the copy of the catalog kept on the device so the installed app shows
// songs with no internet. jsdom has no IndexedDB, so a Map stands in for it.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  _setBackend, saveCatalog, readCatalog, readSong, publicRows, isNetworkFailure, savedDateLabel,
} from './offlineSongs.js'

let store
beforeEach(() => {
  store = new Map()
  _setBackend({ get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v) } })
})

const ROWS = [
  { id: 'a', number: 1, title_th: 'ตรวจแล้ว', verified: true },
  { id: 'b', number: 2, title_th: 'ยังไม่ตรวจ', verified: false },
  { id: 'c', number: 3, title_th: 'ถังขยะ', verified: true, deleted_at: '2026-10-01' },
  { id: 7, number: 4, title_th: 'เลขไอดี', verified: true },
]

describe('offlineSongs', () => {
  it('keeps only what a visitor who is not logged in may see', () => {
    expect(publicRows(ROWS).map((r) => r.id)).toEqual(['a', 7])
    expect(publicRows(null)).toEqual([])
  })

  it('saves the catalog and reads it back with the time it was saved', async () => {
    expect(await saveCatalog(ROWS)).toBe(true)
    const c = await readCatalog()
    expect(c.rows.map((r) => r.id)).toEqual(['a', 7])
    expect(c.at).toBeGreaterThan(0)
  })

  it('each save replaces the whole copy, so a song hidden since then drops out', async () => {
    await saveCatalog(ROWS)
    await saveCatalog([{ id: 'a', verified: true }])
    expect((await readCatalog()).rows.map((r) => r.id)).toEqual(['a'])
  })

  it('never overwrites a good copy with nothing', async () => {
    await saveCatalog(ROWS)
    expect(await saveCatalog([])).toBe(false)
    expect(await saveCatalog([{ id: 'b', verified: false }])).toBe(false)
    expect((await readCatalog()).rows).toHaveLength(2)
  })

  it('finds one song by id, whether the id is text or a number', async () => {
    await saveCatalog(ROWS)
    expect((await readSong('a')).title_th).toBe('ตรวจแล้ว')
    expect((await readSong('7')).title_th).toBe('เลขไอดี')
    expect(await readSong('b')).toBe(null) // not verified → never saved
    expect(await readSong('zz')).toBe(null)
  })

  it('no storage (private mode, old browser) → nothing saved, nothing read, no crash', async () => {
    _setBackend({ get: async () => { throw new Error('no idb') }, put: async () => { throw new Error('no idb') } })
    expect(await saveCatalog(ROWS)).toBe(false)
    expect(await readCatalog()).toBe(null)
    expect(await readSong('a')).toBe(null)
  })

  it('tells a request that never reached the server from a server that said no', () => {
    // postgrest-js: a failed fetch comes back as status 0
    expect(isNetworkFailure({ data: null, error: { message: 'TypeError: Failed to fetch' }, status: 0 })).toBe(true)
    // the row does not exist / is hidden by RLS — the server answered
    expect(isNetworkFailure({ data: null, error: { code: 'PGRST116' }, status: 406 })).toBe(false)
    expect(isNetworkFailure({ data: { id: 'a' }, error: null, status: 200 })).toBe(false)
  })

  it('labels the saved date in Thai', () => {
    expect(savedDateLabel(0)).toBe('')
    expect(savedDateLabel(Date.UTC(2026, 9, 23, 5))).toMatch(/ต\.ค\./)
  })
})
