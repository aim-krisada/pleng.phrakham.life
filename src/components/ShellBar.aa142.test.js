// ใบ v3/pleng#142 — the Aa button sits on the shared top bar, on every page and every width, and it
// replaced both old places for ตัวอักษรไทย: the desktop ⚙ popover and the ☰ drawer's row (AC1 · AC5).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/' }),
  useRouter: () => ({ push: vi.fn() }),
}))

import './../lib/pk-drawer.js'
import ShellBar from './ShellBar.vue'
import { shellMenu } from '../store.js'

const stubs = {
  ProfileTool: { template: '<div class="sb-login" />' },
  Icon: true,
  RouterLink: { template: '<a><slot /></a>' },
}

let w = null
beforeEach(() => { shellMenu.value = null })
afterEach(() => {
  w?.unmount(); w = null
  document.querySelectorAll('.pk-drawer,.pk-drawer-scrim').forEach((n) => n.remove())
})

describe('ใบ#142 — Aa on the top bar', () => {
  it('AC1 — the bar carries Aa between ค้นหา and ☰ / เข้าสู่ระบบ', () => {
    w = mount(ShellBar, { attachTo: document.body, global: { stubs } })
    const right = w.find('.sb-right').element
    const kids = [...right.children].map((el) => el.className)
    const at = (cls) => kids.findIndex((c) => c.split(' ').includes(cls))
    expect(at('ft-tool')).toBeGreaterThan(-1)
    expect(right.querySelector('.ft-btn').textContent).toBe('Aa')
    expect(at('ft-tool')).toBeGreaterThan(kids.findIndex((c) => c.includes('sb-icon-btn') && !c.includes('sb-burger'))) // after ค้นหา
    expect(at('ft-tool')).toBeLessThan(at('sb-burger'))
    expect(at('ft-tool')).toBeLessThan(at('sb-login'))
  })

  it('AC5 — no ⚙ settings button, and no ตัวอักษรไทย row in the ☰ drawer', () => {
    w = mount(ShellBar, { attachTo: document.body, global: { stubs } })
    expect(w.find('[aria-label="ตั้งค่า"]').exists()).toBe(false)
    expect(w.find('.sb-settings').exists()).toBe(false)
    expect(document.querySelector('.sb-drawer-panel').textContent).not.toContain('ตัวอักษรไทย')
  })

  // jsdom computes no CSS: read the stylesheet. On a phone the bar hides the desktop nav only —
  // nothing may hide the Aa button at any width.
  it('AC1 — no width rule hides Aa (it shows on phone and desktop alike)', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8')
    expect(css).not.toMatch(/\.ft-(tool|btn)[^{]*\{[^}]*display:\s*none/)
    expect(css).not.toMatch(/\.sb-settings/)
    const ft = fs.readFileSync(path.resolve(__dirname, 'FontTool.vue'), 'utf8')
    expect(ft).not.toMatch(/@media[^{]*\{[^}]*\.ft-(tool|btn)[^{]*\{[^}]*display:\s*none/)
    expect(ft).not.toMatch(/v-if="currentSong"/)
  })
})
