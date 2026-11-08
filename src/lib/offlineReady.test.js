// ใบ v3/pleng#155 — "พร้อมใช้แบบไม่มีเน็ต" is said only when ALL four pieces are on the device.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  offlineState, statusText, cacheNames, offlineStatus, refreshOfflineStatus, watchOfflineStatus,
  _resetOfflineStatus, RETRIES, standaloneLine, songPrints, diffPrints, readyNews, dismissReadyLine,
  savedPrints, READY_ACK_KEY,
} from './offlineReady.js'
import { isStandalone } from './pwaInstall.js'

const FULL = {
  supported: true, online: true, swActive: true,
  samples: { expected: 115, have: 115 }, shell: { expected: 40, have: 40 },
  catalog: { count: 884, at: Date.UTC(2026, 10, 8, 3) },
}

describe('offlineState', () => {
  it('ready only when worker + samples + app files + songs are all here', () => {
    expect(offlineState(FULL)).toMatchObject({ state: 'ready', count: 884 })
    expect(offlineState({ ...FULL, swActive: false }).state).toBe('filling')
    expect(offlineState({ ...FULL, samples: { expected: 115, have: 114 } }).state).toBe('filling')
    expect(offlineState({ ...FULL, shell: { expected: 40, have: 0 } }).state).toBe('filling')
    expect(offlineState({ ...FULL, catalog: null }).state).toBe('filling')
    expect(offlineState({ ...FULL, samples: { expected: 0, have: 0 } }).state).toBe('filling') // list unread ≠ done
  })

  it('filling shows a percent that never reaches 100 before ready', () => {
    const s = offlineState({ ...FULL, samples: { expected: 115, have: 50 }, catalog: null })
    expect(s.state).toBe('filling')
    expect(s.percent).toBeGreaterThan(0)
    expect(s.percent).toBeLessThan(100)
    expect(offlineState({ ...FULL, samples: { expected: 1000, have: 999 } }).percent).toBeLessThanOrEqual(99)
  })

  it('failed: storage full, or the worker finished and files are still missing', () => {
    expect(offlineState({ ...FULL, storageFull: true })).toMatchObject({ state: 'failed', reason: 'full' })
    expect(offlineState({ ...FULL, samples: { expected: 115, have: 3 }, settled: true })).toMatchObject({ state: 'failed', reason: 'incomplete' })
  })

  it('offline with nothing saved → ask to connect once (never blank)', () => {
    expect(offlineState({ ...FULL, online: false, catalog: null }).state).toBe('offline-empty')
    expect(statusText({ state: 'offline-empty' }).text).toContain('ต่อเน็ต')
  })

  it('offline with only part saved → not ready, open again with internet', () => {
    expect(offlineState({ ...FULL, online: false, shell: { expected: 40, have: 10 } }).state).toBe('failed')
  })

  it('installed app refused permanent storage → amber, not green', () => {
    expect(offlineState({ ...FULL, persistDenied: true, standalone: true }).state).toBe('at-risk')
    expect(offlineState({ ...FULL, persistDenied: true, standalone: false }).state).toBe('ready')
  })

  it('no service worker support / dev build → says nothing', () => {
    expect(offlineState({ supported: false }).state).toBe('none')
    expect(statusText({ state: 'none' })).toBe(null)
  })
})

describe('statusText', () => {
  it('green line with the song count and the day saved', () => {
    const t = statusText(offlineState(FULL))
    expect(t.tone).toBe('ok')
    expect(t.text).toMatch(/^✓ พร้อมใช้แบบไม่มีเน็ตแล้ว · 884 เพลง · 8 /)
  })
  it('amber while filling and when not ready', () => {
    expect(statusText({ state: 'filling', percent: 60 })).toEqual({ tone: 'wait', text: 'กำลังเก็บเพลงไว้ในเครื่อง… 60%' })
    expect(statusText({ state: 'failed', reason: 'incomplete' }).text).toContain('เปิดเว็บนี้อีกครั้งตอนมีเน็ต')
    expect(statusText({ state: 'failed', reason: 'full' }).text).toContain('เต็ม')
  })
})

describe('cacheNames — same names as sw.js', () => {
  it('root keeps the old names; a sub-folder gets its suffix', () => {
    expect(cacheNames('/')).toEqual({ root: '/', app: 'pleng-app-v1', samples: 'pleng-samples-v1' })
    expect(cacheNames('/v2/').samples).toBe('pleng-samples-v1--v2')
  })
})

describe('the live checker', () => {
  beforeEach(() => { isStandalone.value = false })

  it('asks for permanent storage once when it first reaches ready, and handles a missing API', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist, persisted: vi.fn().mockResolvedValue(false) } })
    _resetOfflineStatus(async () => FULL)
    await refreshOfflineStatus()
    await refreshOfflineStatus()
    expect(offlineStatus.value.state).toBe('ready')
    expect(persist).toHaveBeenCalledTimes(1)
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined })
    _resetOfflineStatus(async () => FULL)
    await refreshOfflineStatus()
    expect(offlineStatus.value.state).toBe('ready')
  })

  it('installed + persistence denied → at-risk', async () => {
    isStandalone.value = true
    Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist: vi.fn().mockResolvedValue(false) } })
    _resetOfflineStatus(async () => FULL)
    await refreshOfflineStatus()
    expect(offlineStatus.value.state).toBe('at-risk')
  })

  it('re-checks a few times only while filling, then stops (no endless polling)', async () => {
    vi.useFakeTimers()
    const probe = vi.fn(async () => ({ ...FULL, samples: { expected: 115, have: 10 } }))
    _resetOfflineStatus(probe)
    watchOfflineStatus()
    await vi.runAllTimersAsync()
    expect(probe).toHaveBeenCalledTimes(RETRIES.length + 1)
    expect(offlineStatus.value).toMatchObject({ state: 'failed', reason: 'incomplete' })
    vi.useRealTimers()
  })

  it('a filling probe that completes moves to ready', async () => {
    let n = 0
    _resetOfflineStatus(async () => (n++ ? FULL : { ...FULL, catalog: null }))
    await refreshOfflineStatus()
    expect(offlineStatus.value.state).toBe('filling')
    await refreshOfflineStatus()
    expect(offlineStatus.value.state).toBe('ready')
  })
})

// ใบ v3/pleng#157 · #158 — outside the install card: amber always; green with ✕ until closed,
// then only when the saved song list changed since.
const ROWS = [
  { id: 1, number: 1, title_th: 'พระคุณ', content: 'ก', category: 'A' },
  { id: 2, number: 2, title_th: 'สรรเสริญ', content: 'ข', category: 'A' },
]
const READY = { state: 'ready', count: 884, at: Date.UTC(2026, 10, 8, 3) }
const probeWith = (rows) => async () => ({ ...FULL, catalog: { count: rows.length, at: 1, prints: songPrints(rows) } })

describe('song fingerprints', () => {
  it('same fields → same print; a field a reader sees changes it; other fields do not', () => {
    const a = songPrints(ROWS)
    expect(songPrints(ROWS.map((r) => ({ ...r })))).toEqual(a)
    expect(songPrints([{ ...ROWS[0], content: 'ค' }, ROWS[1]])['1']).not.toBe(a['1'])
    expect(songPrints([{ ...ROWS[0], review_flags: ['x'], verified: true }, ROWS[1]])).toEqual(a)
  })
  it('diffPrints counts added · edited · removed', () => {
    const a = songPrints(ROWS)
    expect(diffPrints(a, a)).toEqual({ added: 0, edited: 0, removed: 0 })
    expect(diffPrints(a, songPrints([...ROWS, { id: 3, title_th: 'ใหม่' }]))).toEqual({ added: 1, edited: 0, removed: 0 })
    expect(diffPrints(a, songPrints([{ ...ROWS[0], title_th: 'แก้' }, ROWS[1]]))).toEqual({ added: 0, edited: 1, removed: 0 })
    expect(diffPrints(a, songPrints([ROWS[0]]))).toEqual({ added: 0, edited: 0, removed: 1 })
  })
  it('the "updated" wording leaves out a part whose count is 0', () => {
    const t = statusText(READY, { closed: true, changed: true, added: 3, edited: 2, removed: 0 })
    expect(t.tone).toBe('ok')
    expect(t.text).toMatch(/^✓ อัปเดตเพลงให้แล้วอัตโนมัติ · เพิ่ม 3 เพลง · แก้ 2 เพลง · พร้อมใช้แบบไม่มีเน็ต 884 เพลง · 8 /)
    expect(t.text).not.toContain('ลบ')
    expect(statusText(READY, { closed: true, changed: true, added: 0, edited: 0, removed: 1 }).text)
      .toMatch(/^✓ อัปเดตเพลงให้แล้วอัตโนมัติ · ลบ 1 เพลง · พร้อมใช้/)
  })
})

describe('the line outside the card', () => {
  beforeEach(() => {
    try { localStorage.clear() } catch { /* jsdom */ }
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined })
  })

  it('standaloneLine: amber always with no ✕ · green with ✕ until closed · closed + nothing new → nothing', () => {
    const amber = statusText({ state: 'filling', percent: 40 })
    const green = statusText(READY)
    for (const t of [amber, statusText({ state: 'failed', reason: 'full' }), statusText({ state: 'offline-empty' }), statusText({ state: 'at-risk', count: 1 })]) {
      expect(standaloneLine(t, { closed: true, changed: false })).toMatchObject({ tone: 'wait', closable: false })
    }
    expect(standaloneLine(green, { closed: false })).toMatchObject({ tone: 'ok', closable: true })
    expect(standaloneLine(green, { closed: true, changed: false })).toBe(null)
    expect(standaloneLine(green, { closed: true, changed: true })).toMatchObject({ closable: true })
    expect(standaloneLine(null, { closed: false })).toBe(null)
  })

  it('first ready → shows; ✕ hides it and saves what it was closed on', async () => {
    _resetOfflineStatus(probeWith(ROWS))
    await refreshOfflineStatus()
    expect(readyNews.value.closed).toBe(false)
    dismissReadyLine()
    expect(readyNews.value).toMatchObject({ closed: true, changed: false })
    expect(JSON.parse(localStorage.getItem(READY_ACK_KEY))).toEqual(songPrints(ROWS))
  })

  it('a new song · a fixed song · a removed song → news with the counts', async () => {
    _resetOfflineStatus(probeWith(ROWS))
    await refreshOfflineStatus()
    dismissReadyLine()
    savedPrints.value = songPrints([...ROWS, { id: 3, title_th: 'ใหม่' }])
    expect(readyNews.value).toMatchObject({ closed: true, changed: true, added: 1, edited: 0, removed: 0 })
    savedPrints.value = songPrints([{ ...ROWS[0], content: 'แก้แล้ว' }, ROWS[1]])
    expect(readyNews.value).toMatchObject({ changed: true, added: 0, edited: 1, removed: 0 })
    savedPrints.value = songPrints([ROWS[0]])
    expect(readyNews.value).toMatchObject({ changed: true, added: 0, edited: 0, removed: 1 })
  })

  it('✕ stays closed after a reload (fresh module, same storage)', async () => {
    _resetOfflineStatus(probeWith(ROWS))
    await refreshOfflineStatus()
    dismissReadyLine()
    vi.resetModules()
    const fresh = await import('./offlineReady.js')
    fresh._resetOfflineStatus(probeWith(ROWS))
    await fresh.refreshOfflineStatus()
    expect(fresh.readyNews.value).toMatchObject({ closed: true, changed: false })
    expect(fresh.standaloneLine(fresh.statusText(fresh.offlineStatus.value, fresh.readyNews.value), fresh.readyNews.value)).toBe(null)
  })

  it('storage that throws → the line still shows, and ✕ hides it for this visit', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      vi.resetModules()
      const fresh = await import('./offlineReady.js')
      fresh._resetOfflineStatus(probeWith(ROWS))
      await fresh.refreshOfflineStatus()
      const line = () => fresh.standaloneLine(fresh.statusText(fresh.offlineStatus.value, fresh.readyNews.value), fresh.readyNews.value)
      expect(line()).toMatchObject({ tone: 'ok', closable: true })
      fresh.dismissReadyLine()
      expect(line()).toBe(null)
    } finally { get.mockRestore(); set.mockRestore() }
  })
})
