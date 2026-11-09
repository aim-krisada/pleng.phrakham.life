// ใบ v3/pleng#164 — "กำลังเก็บเพลงไว้ในเครื่อง… 98%" never moved (owner, 9 พ.ย. 2569, after ~6 deploys).
// Every path that used to leave the percent up for ever now ends green or amber.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  offlineStatus, refreshOfflineStatus, watchOfflineStatus, _resetOfflineStatus, RETRIES,
  FILL_WAIT, GIVE_UP_MS, onWorkerMessage, followRegistration, statusText,
} from './offlineReady.js'
import { isStandalone } from './pwaInstall.js'

const FULL = {
  supported: true, online: true, swActive: true, swInstalling: false,
  samples: { expected: 205, have: 205 }, shell: { expected: 5, have: 5 },
  catalog: { count: 884, at: Date.UTC(2026, 10, 9, 3) },
}
// The screenshot: the NEW build's asset list is kept, only its 2 entry files are here → 98%.
const NEW_BUILD_HALF = { ...FULL, shell: { expected: 5, have: 2 } }
const RETRY_TOTAL = RETRIES.reduce((a, b) => a + b, 0)

// A probe whose answer the test changes as "the device" changes.
function device(start) {
  const d = { now: start }
  return { d, probe: vi.fn(async () => d.now) }
}

beforeEach(() => {
  isStandalone.value = false
  vi.useFakeTimers()
  Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined })
})
afterEach(() => { vi.useRealTimers() })

describe('ใบ#164 — the line always ends', () => {
  it('the screenshot state is 98%', async () => {
    _resetOfflineStatus(async () => NEW_BUILD_HALF)
    await refreshOfflineStatus()
    expect(offlineStatus.value).toMatchObject({ state: 'filling', percent: 98 })
  })

  it('re-checks used up, worker idle → asks it once to fetch what is missing; its answer → green', async () => {
    const { d, probe } = device(NEW_BUILD_HALF)
    const askFill = vi.fn(async () => true)
    _resetOfflineStatus(probe, askFill)
    await refreshOfflineStatus()
    await vi.advanceTimersByTimeAsync(RETRY_TOTAL)
    expect(askFill).toHaveBeenCalledTimes(1)
    expect(offlineStatus.value.state).toBe('filling') // waiting for the worker, not amber yet
    d.now = FULL // the worker fetched the 3 missing files
    onWorkerMessage({ type: 'pleng-cache', done: true, fill: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(offlineStatus.value.state).toBe('ready')
    await vi.runAllTimersAsync()
    expect(askFill).toHaveBeenCalledTimes(1) // asked once, no loop
    expect(offlineStatus.value.state).toBe('ready')
  })

  it('the worker answers but files are still missing (a sample 404s) → amber with what to do', async () => {
    const askFill = vi.fn(async () => true)
    _resetOfflineStatus(async () => ({ ...FULL, samples: { expected: 205, have: 204 } }), askFill)
    await refreshOfflineStatus()
    await vi.advanceTimersByTimeAsync(RETRY_TOTAL)
    onWorkerMessage({ type: 'pleng-cache', done: true, fill: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(offlineStatus.value).toMatchObject({ state: 'failed', reason: 'incomplete' })
    expect(statusText(offlineStatus.value).text).toContain('เปิดเว็บนี้อีกครั้งตอนมีเน็ต')
  })

  it('the worker never answers the top-up → amber after FILL_WAIT', async () => {
    const askFill = vi.fn(async () => true)
    _resetOfflineStatus(async () => NEW_BUILD_HALF, askFill)
    await refreshOfflineStatus()
    await vi.advanceTimersByTimeAsync(RETRY_TOTAL)
    expect(offlineStatus.value.state).toBe('filling')
    await vi.advanceTimersByTimeAsync(FILL_WAIT)
    expect(offlineStatus.value).toMatchObject({ state: 'failed', reason: 'incomplete' })
  })

  it('a new worker still installing when the re-checks ran out, then killed with no message → amber after GIVE_UP_MS', async () => {
    const askFill = vi.fn(async () => true)
    _resetOfflineStatus(async () => ({ ...NEW_BUILD_HALF, swInstalling: true }), askFill)
    await refreshOfflineStatus()
    await vi.advanceTimersByTimeAsync(RETRY_TOTAL)
    expect(offlineStatus.value.state).toBe('filling')
    expect(askFill).not.toHaveBeenCalled() // not while it is installing
    await vi.advanceTimersByTimeAsync(GIVE_UP_MS)
    expect(offlineStatus.value).toMatchObject({ state: 'failed', reason: 'incomplete' })
  })

  it('amber is not final: files that arrive later still turn it green', async () => {
    const { d, probe } = device({ ...NEW_BUILD_HALF, swInstalling: true })
    _resetOfflineStatus(probe, async () => true)
    await refreshOfflineStatus()
    await vi.advanceTimersByTimeAsync(RETRY_TOTAL + GIVE_UP_MS)
    expect(offlineStatus.value.state).toBe('failed')
    d.now = FULL
    onWorkerMessage({ type: 'pleng-cache', active: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(offlineStatus.value.state).toBe('ready')
  })

  it('songs never saved on this visit (the song list could not load) → amber, not an endless percent', async () => {
    _resetOfflineStatus(async () => ({ ...FULL, catalog: null }), async () => true)
    await refreshOfflineStatus()
    expect(offlineStatus.value.state).toBe('filling')
    await vi.runAllTimersAsync()
    expect(offlineStatus.value).toMatchObject({ state: 'failed', reason: 'incomplete' })
  })

  it('no worker to ask → amber right after the last re-check', async () => {
    const askFill = vi.fn(async () => false)
    _resetOfflineStatus(async () => NEW_BUILD_HALF, askFill)
    await refreshOfflineStatus()
    await vi.advanceTimersByTimeAsync(RETRY_TOTAL)
    expect(offlineStatus.value.state).toBe('failed')
  })

  it('back online after amber → a fresh round (re-checks + one more top-up)', async () => {
    const askFill = vi.fn(async () => false)
    _resetOfflineStatus(async () => NEW_BUILD_HALF, askFill)
    watchOfflineStatus()
    await vi.runAllTimersAsync()
    expect(offlineStatus.value.state).toBe('failed')
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(offlineStatus.value.state).toBe('filling')
    await vi.runAllTimersAsync()
    expect(askFill).toHaveBeenCalledTimes(2)
    expect(offlineStatus.value.state).toBe('failed')
  })
})

describe('ใบ#164 — a deploy: the page follows the new worker', () => {
  it('updatefound and each state change of the new worker → look again (ends green after activation)', async () => {
    const { d, probe } = device({ ...NEW_BUILD_HALF, swInstalling: true })
    _resetOfflineStatus(probe, async () => true)
    await refreshOfflineStatus()
    await vi.advanceTimersByTimeAsync(RETRY_TOTAL) // re-checks used up while it installs
    const n = probe.mock.calls.length
    const reg = new EventTarget()
    reg.installing = null
    reg.waiting = null
    followRegistration(reg)
    const w = new EventTarget()
    reg.installing = w
    reg.dispatchEvent(new Event('updatefound'))
    await vi.advanceTimersByTimeAsync(0)
    expect(probe.mock.calls.length).toBe(n + 1)
    d.now = FULL // installed + activated: all 5 new files cached
    w.dispatchEvent(new Event('statechange'))
    await vi.advanceTimersByTimeAsync(0)
    expect(probe.mock.calls.length).toBe(n + 2)
    expect(offlineStatus.value.state).toBe('ready')
  })

  it('a worker already installing when the page opened is followed too, and only once', async () => {
    const probe = vi.fn(async () => FULL)
    _resetOfflineStatus(probe)
    const w = new EventTarget()
    const reg = new EventTarget()
    reg.installing = w
    reg.waiting = null
    followRegistration(reg)
    followRegistration(reg)
    w.dispatchEvent(new Event('statechange')) // e.g. 'redundant' — a newer deploy replaced it
    await vi.advanceTimersByTimeAsync(0)
    expect(probe).toHaveBeenCalledTimes(1)
  })
})
