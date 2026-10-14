// ใบ v3/pleng#118 — the editor from 600 to 1023px wide (a Fold opened ≈ 712px or turned sideways
// ≈ 884px, a tablet held upright).
//   ข้อ 1  the pinned ท่อน header (.cshead) sits right under what is visible above it at EVERY width:
//          600–760px used the stylesheet's top: 58px under a 122px site header → 64px of it (the
//          number and name row) was hidden. Up to 760px: under the site header. From 761px: under
//          the site header + the pinned edit header (.edhead).
//   ข้อ 2  both follow the site header sliding away (0) and back below 1024px too.
//   ข้อ 3  the one-row ท่อน header (name · toggle · ▲▼) reaches up to 1023px; 1024px+ unchanged.
// jsdom has no layout: sizes are stubbed, the CSS half is checked in the stylesheet itself.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('../lib/midi.js', () => ({ playSong: vi.fn(), playEnsemble: vi.fn(), stopPlayback: () => {} }))
vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'
import { headerHidden } from '../lib/headerHide.js'

Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

const SONG = {
  id: 's1', number: 5, title_th: 'เพลงทดสอบ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }]] }],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: [] },
      { stanza: 'A', label: 'ร้อง 2', syllables: [] },
    ],
  },
}

const realMM = window.matchMedia
function setWidth(px) {
  window.matchMedia = (q) => {
    const m = /max-width:\s*(\d+)px/.exec(q)
    return { matches: m ? px <= +m[1] : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  }
}
let realRect
beforeEach(() => {
  localStorage.clear()
  headerHidden.value = false
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div><header class="shell-bar"></header>'
  realRect = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function () {
    if (this.classList?.contains('shell-bar')) return { height: 122, width: 375, top: 0, bottom: 122, left: 0, right: 375 }
    if (this.classList?.contains('edhead')) return { height: 94, width: 1160, top: 122, bottom: 216, left: 0, right: 1160 }
    return realRect.call(this)
  }
})
afterEach(() => {
  window.matchMedia = realMM
  Element.prototype.getBoundingClientRect = realRect
  headerHidden.value = false
})

const mountEd = () => mount(EditorMode, {
  props: { song: SONG, tier: 'approver', active: true },
  attachTo: document.body,
  global: { stubs: { Icon: true, 'router-link': true, ExportTool: true, ComboSelect: true } },
})
const flush = async () => { for (let i = 0; i < 4; i++) await nextTick() }

const top = (w, sel) => /top:\s*(-?\d+)px/.exec(w.find(sel).attributes('style') || '')?.[1] ?? null

describe('ข้อ 1–2 — the ท่อน header pins under what is visible above it', () => {
  for (const width of [600, 712, 760]) {
    it(`${width}px: right under the site header (122px), at 0 while it is slid away; the edit header is not pinned`, async () => {
      setWidth(width)
      const w = mountEd()
      await flush()
      expect(top(w, '.cshead')).toBe('122')
      expect(top(w, '.edhead')).toBe(null)
      headerHidden.value = true
      await flush()
      expect(top(w, '.cshead')).toBe('0')
      headerHidden.value = false
      await flush()
      expect(top(w, '.cshead')).toBe('122')
      w.unmount()
    })
  }
  for (const width of [768, 884, 1023]) {
    it(`${width}px: under the site header + the pinned edit header (122 + 94), and both move up together when the header slides away`, async () => {
      setWidth(width)
      const w = mountEd()
      await flush()
      expect(top(w, '.edhead')).toBe('122')
      expect(top(w, '.cshead')).toBe('216')
      headerHidden.value = true
      await flush()
      expect(top(w, '.edhead')).toBe('0')
      expect(top(w, '.cshead')).toBe('94')
      w.unmount()
    })
  }
  it('375px phone: as ใบ#114 — under the header, 0 while it is away', async () => {
    setWidth(375)
    const w = mountEd()
    await flush()
    expect(top(w, '.cshead')).toBe('122')
    headerHidden.value = true
    await flush()
    expect(top(w, '.cshead')).toBe('0')
    w.unmount()
  })
  it('1280px desktop: unchanged — header 122 + edit header 94', async () => {
    setWidth(1280)
    const w = mountEd()
    await flush()
    expect(top(w, '.edhead')).toBe('122')
    expect(top(w, '.cshead')).toBe('216')
    w.unmount()
  })
})

describe('ข้อ 3 — the stylesheet', () => {
  const css = () => fs.readFileSync(path.resolve(__dirname, 'EditorMode.vue'), 'utf8').replace(/\r\n/g, '\n').split('<style scoped>')[1]
  it('the one-row ท่อน header (toggle + hidden settings) is for screens narrower than 1024px', () => {
    const s = css()
    const i = s.indexOf('@media (max-width: 1023px) {\n  .cshead { gap: 6px;')
    expect(i).toBeGreaterThan(0)
    const block = s.slice(i, s.indexOf('\n}\n', i))
    expect(block).toMatch(/\.cs-moretgl \{\n\s+display: inline-flex;/)
    expect(block).toMatch(/\.cshead:not\(\.cs-open\) \.cs-more,\n\s+\.cshead:not\(\.cs-open\) \.cs-del \{ display: none; \}/)
    expect(block).toMatch(/transition: top 0\.2s ease/)
    // nothing about it is left at the old phone-only line
    expect(s).not.toMatch(/@media \(max-width: 599px\) \{\n  \.cshead/)
  })
  it('761–1023px: the pinned edit header slides with the site header; no slide when reduced motion is asked for', () => {
    const s = css()
    expect(s).toMatch(/@media \(min-width: 761px\) and \(max-width: 1023px\) \{\n  \.edhead \{ transition: top 0\.2s ease; \}\n\}/)
    expect(s).toMatch(/@media \(max-width: 1023px\) and \(prefers-reduced-motion: reduce\) \{\n  \.cshead,\n  \.edhead,\n  \.cs-chev \{ transition: none; \}/)
  })
  it('touch screens under 1024px: the ท่อน header ▲▼ are 44px squares; a mouse and 1024px+ keep the small ones', () => {
    const s = css()
    const i = s.indexOf('@media (max-width: 1023px) and (pointer: coarse) {')
    expect(i).toBeGreaterThan(0)
    const block = s.slice(i, s.indexOf('\n}\n', i))
    expect(block).toMatch(/\.cshead \.updown button \{ width: var\(--touch-min\); height: var\(--touch-min\); min-height: var\(--touch-min\);/)
    // the base (mouse / desktop) size is untouched
    expect(s).toMatch(/\n\.updown button \{\n[^}]*width: 26px;\n\s+height: 26px;/)
    // no other rule sizes the ท่อน ▲▼ for touch from 1024px up
    expect(s).not.toMatch(/@media \([^)]*min-width: 1024px[^{]*\{[^@]*\.cshead \.updown button/)
  })
  it('the edit header is still pinned only from 761px (unchanged)', () => {
    expect(css()).toMatch(/@media \(min-width: 761px\) \{\n  \.edhead \{\n\s+position: sticky;/)
  })
})
