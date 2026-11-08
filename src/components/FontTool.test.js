// FontTool — THE Aa button on the shared top bar (ใบ v3/pleng#142): on every page (no song needed),
// ก− [%] ก+ buttons (no slider), คืนค่าปกติ, and ตัวอักษรไทย ไม่มีหัว / มีหัว in the same popup.
// It rides the shared one-open-at-a-time shellMenu channel (key 'aa').
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FontTool from './FontTool.vue'
import { currentSong, readingFontScale, shellMenu, siteFont, setSiteFont } from '../store.js'

let w = null
const mountT = () => (w = mount(FontTool, { attachTo: document.body, global: { stubs: { Icon: true } } }))
async function openPop() {
  await w.find('.ft-btn').trigger('click')
  await nextTick()
}

beforeEach(() => {
  w?.unmount()
  localStorage.clear()
  readingFontScale.value = 1
  shellMenu.value = null
  setSiteFont('default')
  document.documentElement.removeAttribute('data-font')
  currentSong.value = null
})

describe('ใบ#142 — the top-bar Aa', () => {
  it('shows on every page — no song needed — closed until tapped', async () => {
    mountT()
    const btn = w.find('.ft-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('Aa')
    expect(btn.attributes('aria-label')).toBe('ขนาดตัวอักษร')
    expect(btn.attributes('aria-expanded')).toBe('false')
    expect(w.find('.ft-menu').exists()).toBe(false)
    await openPop()
    expect(btn.attributes('aria-expanded')).toBe('true')
    expect(shellMenu.value).toBe('aa')
  })

  it('AC2 — the popup has −, the %, +, คืนค่าปกติ — and no slider', async () => {
    mountT()
    await openPop()
    expect(w.find('[aria-label="ตัวเล็กลง"]').exists()).toBe(true)
    expect(w.find('.ft-pct').text()).toBe('100%')
    expect(w.find('[aria-label="ตัวใหญ่ขึ้น"]').exists()).toBe(true)
    expect(w.find('.ft-reset').text()).toContain('คืนค่าปกติ')
    expect(w.find('input[type="range"]').exists()).toBe(false)
  })

  it('ใบ#159 — the steps read ก− / ก+ (bold text, not arrow icons), hidden from screen readers behind the aria-label', async () => {
    mountT()
    await openPop()
    const dn = w.find('[aria-label="ตัวเล็กลง"]')
    const up = w.find('[aria-label="ตัวใหญ่ขึ้น"]')
    expect(dn.text()).toBe('ก−')
    expect(up.text()).toBe('ก+')
    expect(dn.find('.ft-step-txt').attributes('aria-hidden')).toBe('true')
    expect(up.find('.ft-step-txt').attributes('aria-hidden')).toBe('true')
    expect(w.find('[name="a-arrow-down"]').exists()).toBe(false)
    expect(w.find('[name="a-arrow-up"]').exists()).toBe(false)
  })

  it('AC3 — each press moves 10%', async () => {
    mountT()
    await openPop()
    await w.find('[aria-label="ตัวใหญ่ขึ้น"]').trigger('click')
    expect(readingFontScale.value).toBeCloseTo(1.1, 5)
    expect(w.find('.ft-pct').text()).toBe('110%')
    await w.find('[aria-label="ตัวเล็กลง"]').trigger('click')
    await w.find('[aria-label="ตัวเล็กลง"]').trigger('click')
    expect(readingFontScale.value).toBeCloseTo(0.9, 5)
    expect(w.find('.ft-pct').text()).toBe('90%')
  })

  it('reset returns to 100%, and is dimmed while already at 100%', async () => {
    readingFontScale.value = 1.6
    mountT()
    await openPop()
    await w.find('.ft-reset').trigger('click')
    expect(readingFontScale.value).toBe(1)
    expect(w.find('.ft-reset').attributes('disabled')).toBeDefined()
  })

  it('AC7 sad path — at 220% + is dimmed, at 80% − is dimmed, the number never leaves the range', async () => {
    readingFontScale.value = 2.2
    mountT()
    await openPop()
    expect(w.find('[aria-label="ตัวใหญ่ขึ้น"]').attributes('disabled')).toBeDefined()
    await w.find('[aria-label="ตัวใหญ่ขึ้น"]').trigger('click')
    expect(w.find('.ft-pct').text()).toBe('220%')
    readingFontScale.value = 0.8
    await nextTick()
    expect(w.find('[aria-label="ตัวเล็กลง"]').attributes('disabled')).toBeDefined()
    expect(w.find('[aria-label="ตัวใหญ่ขึ้น"]').attributes('disabled')).toBeUndefined()
    await w.find('[aria-label="ตัวเล็กลง"]').trigger('click')
    expect(w.find('.ft-pct').text()).toBe('80%')
  })

  it('AC4 — ไม่มีหัว / มีหัว sit in the same popup with ก ข ค samples; the pick applies at once and is remembered', async () => {
    mountT()
    await openPop()
    const opts = w.findAll('.sb-font-opts button')
    expect(opts).toHaveLength(2)
    expect(w.find('.sb-font-opts').attributes('role')).toBe('radiogroup')
    expect(opts[0].text()).toContain('ไม่มีหัว')
    expect(opts[1].text()).toContain('มีหัว')
    expect(opts[1].find('.sb-font-eg.looped').text()).toMatch(/ก\s*ข\s*ค/)
    expect(opts[0].attributes('aria-checked')).toBe('true')
    await opts[1].trigger('click')
    expect(siteFont.value).toBe('looped')
    expect(localStorage.getItem('pleng.siteFont')).toBe('looped')
    expect(document.documentElement.getAttribute('data-font')).toBe('looped')
    await opts[0].trigger('click')
    expect(siteFont.value).toBe('default')
    expect(document.documentElement.hasAttribute('data-font')).toBe(false)
  })

  it('Esc closes the popup and puts focus back on Aa; another menu taking the channel closes it', async () => {
    mountT()
    await openPop()
    await w.find('.ft-menu').trigger('keydown', { key: 'Escape' })
    expect(w.find('.ft-menu').exists()).toBe(false)
    expect(document.activeElement).toBe(w.find('.ft-btn').element)
    await openPop()
    shellMenu.value = 'guide'
    await nextTick()
    expect(w.find('.ft-menu').exists()).toBe(false)
  })
})
