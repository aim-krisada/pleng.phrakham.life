// ใบ v3/pleng#155 — "พร้อมใช้แบบไม่มีเน็ต" is said only when ALL four pieces are on the device.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  offlineState, statusText, cacheNames, offlineStatus, refreshOfflineStatus, watchOfflineStatus,
  _resetOfflineStatus, RETRIES, standaloneLine, readyFlash, READY_FLASH_MS,
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

// ใบ v3/pleng#157 — outside the install card the green line is news only on the visit it turns ready.
describe('the line outside the card', () => {
  const READY = { state: 'ready', count: 884, at: Date.UTC(2026, 10, 8, 3) }

  it('standaloneLine: amber always · green only while flashing · nothing → nothing', () => {
    const amber = statusText({ state: 'filling', percent: 40 })
    const green = statusText(READY)
    expect(standaloneLine(amber, false)).toBe(amber)
    expect(standaloneLine(statusText({ state: 'failed', reason: 'full' }), false).tone).toBe('wait')
    expect(standaloneLine(statusText({ state: 'offline-empty' }), false).tone).toBe('wait')
    expect(standaloneLine(green, false)).toBe(null)
    expect(standaloneLine(green, true)).toBe(green)
    expect(standaloneLine(null, true)).toBe(null)
  })

  it('ready from the start of the visit → no flash', async () => {
    _resetOfflineStatus(async () => FULL)
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined })
    await refreshOfflineStatus()
    expect(offlineStatus.value.state).toBe('ready')
    expect(readyFlash.value).toBe(false)
  })

  it('filling → ready flashes, and the flash ends by itself after 8 s', async () => {
    vi.useFakeTimers()
    try {
      _resetOfflineStatus()
      offlineStatus.value = { state: 'filling', percent: 70 }
      expect(readyFlash.value).toBe(false)
      offlineStatus.value = READY
      expect(readyFlash.value).toBe(true)
      vi.advanceTimersByTime(READY_FLASH_MS - 1)
      expect(readyFlash.value).toBe(true)
      vi.advanceTimersByTime(1)
      expect(readyFlash.value).toBe(false)
      // a later re-check that is still ready does not flash again
      offlineStatus.value = { ...READY }
      expect(readyFlash.value).toBe(false)
    } finally { vi.useRealTimers() }
  })

  it('the first "not checked yet" (none) does not count as not ready', () => {
    _resetOfflineStatus()
    offlineStatus.value = { state: 'none' }
    offlineStatus.value = READY
    expect(readyFlash.value).toBe(false)
  })
})
