// ใบ v3/pleng#156 · #155 — the home-page install card, its ✕, the sheet it opens, and the
// "พร้อมใช้แบบไม่มีเน็ต" line that replaces it once installed.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import axe from 'axe-core'
import InstallCard from './InstallCard.vue'
import InstallSheet from './InstallSheet.vue'
import {
  isStandalone, installCardDismissed, installSheet, _setDeferredPrompt,
} from '../lib/pwaInstall.js'
import { offlineStatus, _resetOfflineStatus, READY_FLASH_MS } from '../lib/offlineReady.js'

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

  it('is hidden when running installed (standalone) — ready from the start shows nothing', async () => {
    isStandalone.value = true
    const w = mountIt(InstallCard)
    offlineStatus.value = { state: 'ready', count: 884, at: Date.UTC(2026, 10, 8, 3) }
    await nextTick()
    expect(w.find('[data-test="install-card"]').exists()).toBe(false)
    expect(w.find('[data-test="offline-status"]').exists()).toBe(false)
  })

  it('installed or ✕: filling → ready shows the green line, then it hides by itself after 8 s (ใบ #157)', async () => {
    vi.useFakeTimers()
    try {
      installCardDismissed.value = true
      const w = mountIt(InstallCard)
      offlineStatus.value = { state: 'filling', percent: 80 }
      await nextTick()
      const line = w.find('[data-test="offline-status"]')
      expect(line.text()).toContain('กำลังเก็บเพลงไว้ในเครื่อง… 80%')
      expect(line.attributes('role')).toBe('status')
      offlineStatus.value = { state: 'ready', count: 884, at: Date.UTC(2026, 10, 8, 3) }
      await nextTick()
      expect(w.find('[data-test="offline-status"]').text()).toContain('พร้อมใช้แบบไม่มีเน็ตแล้ว · 884 เพลง')
      vi.advanceTimersByTime(READY_FLASH_MS)
      await nextTick()
      vi.runAllTimers() // let the fade-out finish
      await nextTick()
      expect(w.find('[data-test="offline-status"]').exists()).toBe(false)
    } finally { vi.useRealTimers() }
  })

  it('installed or ✕: amber lines still show on their own', async () => {
    isStandalone.value = true
    const w = mountIt(InstallCard)
    for (const s of [{ state: 'failed', reason: 'full' }, { state: 'offline-empty' }, { state: 'at-risk', count: 884 }]) {
      offlineStatus.value = s
      await nextTick()
      expect(w.find('[data-test="offline-status"]').classes()).toContain('ic-wait')
    }
  })

  it('inside the card the green line shows even when ready from the start', async () => {
    const w = mountIt(InstallCard)
    offlineStatus.value = { state: 'ready', count: 884, at: Date.UTC(2026, 10, 8, 3) }
    await nextTick()
    expect(w.find('[data-test="install-card"] [data-test="offline-status"]').text()).toContain('พร้อมใช้แบบไม่มีเน็ตแล้ว')
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
