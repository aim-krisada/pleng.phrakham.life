// ใบ v3/pleng#156 · #155 — the home-page install card, its ✕, the sheet it opens, and the
// "พร้อมใช้แบบไม่มีเน็ต" line that replaces it once installed.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import axe from 'axe-core'
import InstallCard from './InstallCard.vue'
import InstallSheet from './InstallSheet.vue'
import {
  isStandalone, installCardDismissed, installSheet, _setDeferredPrompt, appInstalled,
  checkInstalledRelatedApps, _resetAppInstalled,
} from '../lib/pwaInstall.js'
import {
  offlineStatus, _resetOfflineStatus, refreshOfflineStatus, songPrints, READY_ACK_KEY,
} from '../lib/offlineReady.js'

const ROWS = [
  { id: 1, number: 1, title_th: 'พระคุณ', content: 'ก', category: 'A' },
  { id: 2, number: 2, title_th: 'สรรเสริญ', content: 'ข', category: 'A' },
]
const AT = Date.UTC(2026, 10, 8, 3)
const readyProbe = (rows) => async () => ({
  supported: true, online: true, swActive: true,
  samples: { expected: 1, have: 1 }, shell: { expected: 1, have: 1 },
  catalog: { count: rows.length, at: AT, prints: songPrints(rows) },
})

const ANDROID = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
const LINE = 'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Line/14.16.1/IAB'
function setUA(ua) { Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true }) }

let wrappers = []
const mountIt = (C) => { const w = mount(C, { attachTo: document.body }); wrappers.push(w); return w }

beforeEach(() => {
  _resetOfflineStatus(() => new Promise(() => {})) // never answers: each test sets the line itself
  _setDeferredPrompt(null)
  isStandalone.value = false
  installCardDismissed.value = false
  installSheet.value = null
  try { localStorage.clear() } catch { /* jsdom */ }
  _resetAppInstalled()
  Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined })
  setUA(ANDROID)
})
afterEach(() => { wrappers.forEach((w) => w.unmount()); wrappers = [] })

describe('InstallCard', () => {
  it('shows the card with the one ติดตั้งแอพ button when not installed', () => {
    const w = mountIt(InstallCard)
    expect(w.find('[data-test="install-card"]').exists()).toBe(true)
    expect(w.text()).toContain('ติดตั้งเป็นแอพ ใช้ได้แม้ไม่มีเน็ต')
    expect(w.findAll('.ic-btn')).toHaveLength(1)
  })

  it('installed (standalone): no card · first ready shows the green line with ✕ (ใบ #158)', async () => {
    isStandalone.value = true
    _resetOfflineStatus(readyProbe(ROWS))
    const w = mountIt(InstallCard)
    await refreshOfflineStatus()
    await nextTick()
    expect(w.find('[data-test="install-card"]').exists()).toBe(false)
    const line = w.find('[data-test="offline-status"]')
    expect(line.text()).toContain('✓ พร้อมใช้แบบไม่มีเน็ตแล้ว · 2 เพลง')
    expect(line.attributes('role')).toBe('status')
    const x = w.find('[data-test="ready-close"]')
    expect(x.element.tagName).toBe('BUTTON')
    expect(x.attributes('aria-label')).toBe('ปิดข้อความพร้อมใช้')
  })

  it('✕ on the green line hides it, and it stays hidden after a reload', async () => {
    installCardDismissed.value = true
    _resetOfflineStatus(readyProbe(ROWS))
    const w = mountIt(InstallCard)
    await refreshOfflineStatus()
    await nextTick()
    await w.find('[data-test="ready-close"]').trigger('click')
    expect(w.find('[data-test="offline-status"]').exists()).toBe(false)
    expect(localStorage.getItem(READY_ACK_KEY)).toBeTruthy()
    // reload: the module state starts again from what this device remembers
    w.unmount(); wrappers = []
    _resetOfflineStatus(readyProbe(ROWS))
    const w2 = mountIt(InstallCard)
    await refreshOfflineStatus()
    await nextTick()
    expect(w2.find('[data-test="offline-status"]').exists()).toBe(false)
  })

  for (const [name, rows, words] of [
    ['a new song', [...ROWS, { id: 3, number: 3, title_th: 'ใหม่', content: 'ค', category: 'A' }], 'เพิ่ม 1 เพลง'],
    ['a fixed song', [{ ...ROWS[0], content: 'แก้แล้ว' }, ROWS[1]], 'แก้ 1 เพลง'],
    ['a removed song', [ROWS[0]], 'ลบ 1 เพลง'],
  ]) {
    it('closed, then the saved list has ' + name + ' → the line is back: ' + words, async () => {
      isStandalone.value = true
      _resetOfflineStatus(readyProbe(ROWS))
      const w = mountIt(InstallCard)
      await refreshOfflineStatus()
      await nextTick()
      await w.find('[data-test="ready-close"]').trigger('click')
      expect(w.find('[data-test="offline-status"]').exists()).toBe(false)
      _resetOfflineStatus(readyProbe(rows)) // next online visit: the list was saved again by itself
      await refreshOfflineStatus()
      await nextTick()
      const t = w.find('[data-test="offline-status"]').text()
      expect(t).toContain('✓ อัปเดตเพลงให้แล้วอัตโนมัติ')
      expect(t).toContain(words)
      expect(t).toContain('พร้อมใช้แบบไม่มีเน็ต ' + rows.length + ' เพลง')
      expect(w.find('[data-test="ready-close"]').exists()).toBe(true)
    })
  }

  it('installed or ✕: amber lines show on their own, with no ✕', async () => {
    isStandalone.value = true
    const w = mountIt(InstallCard)
    for (const s of [{ state: 'filling', percent: 80 }, { state: 'failed', reason: 'full' }, { state: 'offline-empty' }, { state: 'at-risk', count: 884 }]) {
      offlineStatus.value = s
      await nextTick()
      expect(w.find('[data-test="offline-line"]').classes()).toContain('ic-wait')
      expect(w.find('[data-test="offline-status"]').attributes('role')).toBe('status')
      expect(w.find('[data-test="ready-close"]').exists()).toBe(false)
    }
  })

  it('storage that throws: the green line still shows, and ✕ hides it for this visit', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      installCardDismissed.value = true
      _resetOfflineStatus(readyProbe(ROWS))
      const w = mountIt(InstallCard)
      await refreshOfflineStatus()
      await nextTick()
      expect(w.find('[data-test="offline-status"]').exists()).toBe(true)
      await w.find('[data-test="ready-close"]').trigger('click')
      expect(w.find('[data-test="offline-status"]').exists()).toBe(false)
    } finally { get.mockRestore(); set.mockRestore() }
  })

  it('inside the card the green line shows even when ready from the start', async () => {
    const w = mountIt(InstallCard)
    offlineStatus.value = { state: 'ready', count: 884, at: Date.UTC(2026, 10, 8, 3) }
    await nextTick()
    expect(w.find('[data-test="install-card"] [data-test="offline-status"]').text()).toContain('พร้อมใช้แบบไม่มีเน็ตแล้ว')
  })

  it('the card has no ✕ on its own green line', async () => {
    const w = mountIt(InstallCard)
    offlineStatus.value = { state: 'ready', count: 884, at: AT }
    await nextTick()
    expect(w.find('[data-test="ready-close"]').exists()).toBe(false)
  })

  it('✕ hides it and is remembered on this device', async () => {
    const w = mountIt(InstallCard)
    await w.find('.ic-x').trigger('click')
    expect(w.find('[data-test="install-card"]').exists()).toBe(false)
    expect(localStorage.getItem('pleng:install-card-dismissed')).toBe('1')
  })

  it('the status rides inside the card while not installed', async () => {
    const w = mountIt(InstallCard)
    offlineStatus.value = { state: 'filling', percent: 60 }
    await nextTick()
    expect(w.find('[data-test="install-card"] [data-test="offline-status"]').text()).toContain('กำลังเก็บเพลงไว้ในเครื่อง… 60%')
  })

  it('cancelling the native dialog leaves the card, with no error and no sheet', async () => {
    _setDeferredPrompt({ prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'dismissed' }) })
    const w = mountIt(InstallCard)
    await w.find('.ic-btn').trigger('click')
    await flushPromises()
    expect(installSheet.value).toBe(null)
    expect(w.find('[data-test="install-card"]').exists()).toBe(true)
  })
})

// ใบ v3/pleng#158 — installed, but this is the normal browser tab (not standalone)
describe('InstallCard — app already installed, seen from the browser tab', () => {
  it('the appinstalled event hides the card and shows the "already installed" line', async () => {
    const w = mountIt(InstallCard)
    expect(w.find('[data-test="install-card"]').exists()).toBe(true)
    window.dispatchEvent(new Event('appinstalled'))
    await nextTick()
    expect(appInstalled.value).toBe(true)
    expect(localStorage.getItem('pleng.appInstalled')).toBe('1')
    expect(w.find('[data-test="install-card"]').exists()).toBe(false)
    expect(w.find('[data-test="installed-note"]').text()).toContain('ติดตั้งแอพในเครื่องนี้แล้ว')
  })

  it('getInstalledRelatedApps non-empty → hidden; empty → the flag is cleared and the card is back', async () => {
    const w = mountIt(InstallCard)
    await checkInstalledRelatedApps({ getInstalledRelatedApps: async () => [{ platform: 'webapp' }] })
    await nextTick()
    expect(w.find('[data-test="install-card"]').exists()).toBe(false)
    expect(localStorage.getItem('pleng.appInstalled')).toBe('1')
    await checkInstalledRelatedApps({ getInstalledRelatedApps: async () => [] })
    await nextTick()
    expect(appInstalled.value).toBe(false)
    expect(localStorage.getItem('pleng.appInstalled')).toBe(null)
    expect(w.find('[data-test="install-card"]').exists()).toBe(true)
  })

  it('no such API + the remembered flag → hidden', async () => {
    localStorage.setItem('pleng.appInstalled', '1')
    _resetAppInstalled()
    expect(await checkInstalledRelatedApps({})).toBe(null)
    const w = mountIt(InstallCard)
    expect(w.find('[data-test="install-card"]').exists()).toBe(false)
    expect(w.find('[data-test="installed-note"]').exists()).toBe(true)
  })

  it('✕ on the "already installed" line is remembered for good', async () => {
    localStorage.setItem('pleng.appInstalled', '1')
    _resetAppInstalled()
    const w = mountIt(InstallCard)
    await w.find('[data-test="installed-note"] button').trigger('click')
    expect(w.find('[data-test="installed-note"]').exists()).toBe(false)
    _resetAppInstalled()
    const w2 = mountIt(InstallCard)
    expect(w2.find('[data-test="installed-note"]').exists()).toBe(false)
  })

  it('accepting the native install dialog counts as installed', async () => {
    _setDeferredPrompt({ prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) })
    const w = mountIt(InstallCard)
    await w.find('.ic-btn').trigger('click')
    await flushPromises()
    expect(appInstalled.value).toBe(true)
    expect(w.find('[data-test="install-card"]').exists()).toBe(false)
  })
})

describe('InstallSheet — opened from the card', () => {
  it('LINE: the sheet says to open in the browser, with the link that leaves LINE', async () => {
    setUA(LINE)
    const card = mountIt(InstallCard)
    const sheet = mountIt(InstallSheet)
    await card.find('.ic-btn').trigger('click')
    await flushPromises()
    expect(sheet.find('[role="dialog"]').text()).toContain('ติดตั้งจากใน LINE ไม่ได้')
    expect(sheet.find('a.is-primary').attributes('href')).toContain('openExternalBrowser=1')
  })

  it('a dialog: focus moves in, Esc closes it, focus returns to ติดตั้งแอพ', async () => {
    const card = mountIt(InstallCard)
    const sheet = mountIt(InstallSheet)
    const btn = card.find('.ic-btn')
    btn.element.focus()
    await btn.trigger('click')
    await flushPromises()
    const dlg = sheet.find('[role="dialog"]')
    expect(dlg.attributes('aria-modal')).toBe('true')
    expect(dlg.element.contains(document.activeElement)).toBe(true)
    expect(sheet.findAll('.is-step')).toHaveLength(2)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(sheet.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(btn.element)
  })

  it('เข้าใจแล้ว closes it', async () => {
    const card = mountIt(InstallCard)
    const sheet = mountIt(InstallSheet)
    await card.find('.ic-btn').trigger('click')
    await flushPromises()
    await sheet.find('.is-close').trigger('click')
    expect(installSheet.value).toBe(null)
  })

  it('axe: card and open sheet have no violations', async () => {
    const card = mountIt(InstallCard)
    const sheet = mountIt(InstallSheet)
    await card.find('.ic-btn').trigger('click')
    await flushPromises()
    expect(sheet.find('[role="dialog"]').exists()).toBe(true)
    const res = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
    expect(res.violations.map((v) => v.id)).toEqual([])
  })
})
