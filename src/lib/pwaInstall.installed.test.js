// ใบ v3/pleng#165 — the app window tells the browser tabs it is installed (shared localStorage),
// and getInstalledRelatedApps() answering [] does not undo that while the app was seen lately.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const DAY = 24 * 60 * 60 * 1000
let realMatchMedia

function fakeMatchMedia(standalone) {
  return (q) => ({
    matches: standalone && q.includes('standalone'),
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  })
}

async function loadModule({ standalone = false } = {}) {
  vi.resetModules()
  window.matchMedia = fakeMatchMedia(standalone)
  return import('./pwaInstall.js')
}

const noApps = { getInstalledRelatedApps: async () => [] }

beforeEach(() => {
  realMatchMedia = window.matchMedia
  localStorage.clear()
})
afterEach(() => {
  window.matchMedia = realMatchMedia
  localStorage.clear()
})

describe('installed app seen standalone (ใบ #165)', () => {
  it('standalone load sets the installed flag and the seen time', async () => {
    const before = Date.now()
    const m = await loadModule({ standalone: true })
    expect(m.isStandalone.value).toBe(true)
    expect(m.appInstalled.value).toBe(true)
    expect(localStorage.getItem('pleng.appInstalled')).toBe('1')
    expect(Number(localStorage.getItem('pleng.appSeenAt'))).toBeGreaterThanOrEqual(before)
  })

  it('normal tab: flag + seen recently + API answers [] → still installed', async () => {
    localStorage.setItem('pleng.appInstalled', '1')
    localStorage.setItem('pleng.appSeenAt', String(Date.now() - 2 * DAY))
    const m = await loadModule()
    expect(m.isStandalone.value).toBe(false)
    await m.checkInstalledRelatedApps(noApps)
    expect(m.appInstalled.value).toBe(true)
    expect(localStorage.getItem('pleng.appInstalled')).toBe('1')
  })

  it('seen 31 days ago + API answers [] → flag cleared', async () => {
    localStorage.setItem('pleng.appInstalled', '1')
    localStorage.setItem('pleng.appSeenAt', String(Date.now() - 31 * DAY))
    const m = await loadModule()
    await m.checkInstalledRelatedApps(noApps)
    expect(m.appInstalled.value).toBe(false)
    expect(localStorage.getItem('pleng.appInstalled')).toBe(null)
  })

  it('never seen standalone + API answers [] → flag cleared', async () => {
    localStorage.setItem('pleng.appInstalled', '1')
    const m = await loadModule()
    await m.checkInstalledRelatedApps(noApps)
    expect(m.appInstalled.value).toBe(false)
    expect(localStorage.getItem('pleng.appInstalled')).toBe(null)
  })

  it('API answers non-empty → flag set', async () => {
    const m = await loadModule()
    expect(m.appInstalled.value).toBe(false)
    await m.checkInstalledRelatedApps({ getInstalledRelatedApps: async () => [{ platform: 'webapp' }] })
    expect(m.appInstalled.value).toBe(true)
    expect(localStorage.getItem('pleng.appInstalled')).toBe('1')
  })
})
