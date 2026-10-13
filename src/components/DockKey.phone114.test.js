// ใบ v3/pleng#114 — the bottom bar on a phone (narrower than 600px) gives the page more room:
//   ข้อ 1  a keys band with `showFor` shows only while a matching field (the editor's note cell)
//          has focus — like the phone's own keyboard. A key that takes focus keeps it up. On a touch
//          screen the bar then shows ONLY the keypad (the phone keyboard is up too), lifted on top
//          of that keyboard; any other text field still hides the whole bar (ใบ#111).
//   ข้อ 2  a `phoneIcon` button shows its icon only, keeps its name (aria-label + tooltip).
// From 600px up nothing changes. jsdom has no layout: media queries go through a fake matchMedia.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import fs from 'node:fs'
import path from 'node:path'
import DockKey from './DockKey.vue'

const realMM = window.matchMedia
const realVV = window.visualViewport
function setView({ width = 375, height = 812, touch = false } = {}) {
  window.matchMedia = (q) => {
    let matches = false
    const mw = /max-width:\s*(\d+)px/.exec(q)
    const mh = /max-height:\s*(\d+)px/.exec(q)
    if (mw) matches = width <= +mw[1]
    else if (mh) matches = height <= +mh[1]
    else if (/pointer:\s*coarse/.test(q)) matches = touch
    return { matches, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  }
}

const items = (extra = {}) => [
  { id: 'keys', kind: 'keys', name: 'แป้นสัญลักษณ์', rows: [['1', '2'], ['.', '#']], onInsert: () => {}, showFor: 'input.note-box', ...extra },
  { id: 'undo', kind: 'btn', name: 'ย้อน', icon: 'undo-2', place: { anchor: 'left', row: 1 }, run: () => {} },
  { id: 'play', kind: 'btn', name: 'ฟังท่อน A', label: 'ฟังท่อน', icon: 'play', place: { anchor: 'rightOf:undo', row: 1 }, run: () => {}, phoneIcon: true },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
  { id: 'save', kind: 'btn', name: 'เผยแพร่', label: 'เผยแพร่', icon: 'badge-check', prime: true, place: { row: 2, col: 1 }, run: () => {} },
]
const Host = {
  components: { DockKey },
  props: ['items'],
  template: `<div>
    <input class="note-box" type="text" aria-label="ช่องโน้ต" />
    <input class="syl-box" type="text" aria-label="ช่องเนื้อร้อง" />
    <DockKey :items="items" store-key="p114" label="แถบทดสอบ" />
  </div>`,
}
const mountBar = (it = items()) => mount(Host, { props: { items: it }, global: { stubs: { Icon: true } }, attachTo: document.body })
const flush = async () => { for (let i = 0; i < 4; i++) await nextTick() }
const tick = () => new Promise((r) => setTimeout(r, 5))
async function focus(el) {
  el.focus()
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  await flush()
}
async function blurTo(el) {
  const prev = document.activeElement
  if (el) el.focus()
  else prev?.blur?.()
  prev?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  if (el) el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  await tick()
  await flush()
}
const keys = (w) => w.find('.dk-keys')

beforeEach(() => { localStorage.clear(); document.body.innerHTML = '' })
afterEach(() => {
  window.matchMedia = realMM
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: realVV })
})

describe('ข้อ 1 — phone: the note keypad shows only while a note cell is being edited', () => {
  it('nothing focused → no keypad; note cell focused → keypad; lyric cell → gone; blur → gone', async () => {
    setView({ width: 375 })
    const w = mountBar()
    await flush()
    expect(keys(w).exists()).toBe(false)
    await focus(w.find('input.note-box').element)
    expect(keys(w).exists()).toBe(true)
    expect(w.findAll('.dk-key').map((k) => k.text())).toEqual(['1', '2', '.', '#'])
    await blurTo(w.find('input.syl-box').element)
    expect(keys(w).exists()).toBe(false)
    await focus(w.find('input.note-box').element)
    expect(keys(w).exists()).toBe(true)
    await blurTo(null)
    expect(keys(w).exists()).toBe(false)
    w.unmount()
  })

  it('tapping a key does not take the focus away from the note cell (mousedown is held back)', async () => {
    setView({ width: 375 })
    const w = mountBar()
    await flush()
    const note = w.find('input.note-box').element
    await focus(note)
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    w.find('.dk-key').element.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
    await flush()
    expect(document.activeElement).toBe(note)
    expect(keys(w).exists()).toBe(true)
    w.unmount()
  })

  it('a key that does get focus (keyboard / an odd browser) keeps its own keypad up', async () => {
    setView({ width: 375 })
    const w = mountBar()
    await flush()
    await focus(w.find('input.note-box').element)
    await blurTo(w.find('.dk-key').element)
    expect(keys(w).exists()).toBe(true)
    w.unmount()
  })

  it('a band without showFor is always there, even on a phone', async () => {
    setView({ width: 375 })
    const w = mountBar(items({ showFor: undefined }))
    await flush()
    expect(keys(w).exists()).toBe(true)
    w.unmount()
  })

  for (const width of [600, 712, 1280]) {
    it(`${width}px (not a phone): the keypad is always on the bar, as before`, async () => {
      setView({ width })
      const w = mountBar()
      await flush()
      expect(keys(w).exists()).toBe(true)
      await focus(w.find('input.syl-box').element)
      expect(keys(w).exists()).toBe(true)
      w.unmount()
    })
  }
})

describe('ข้อ 1 — phone + touch: while a note cell is typed in, the bar is just the keypad', () => {
  it('note cell → dk-keysonly (keypad shown, button rows hidden by CSS), not the whole bar hidden', async () => {
    setView({ width: 375, touch: true })
    const w = mountBar()
    await flush()
    await focus(w.find('input.note-box').element)
    const host = w.find('.dk-host')
    expect(host.classes()).toContain('dk-keysonly')
    expect(host.classes()).not.toContain('dk-kbd')
    expect(keys(w).exists()).toBe(true)
    w.unmount()
  })
  it('lyric cell → the whole bar steps aside as before (ใบ#111)', async () => {
    setView({ width: 375, touch: true })
    const w = mountBar()
    await flush()
    await focus(w.find('input.syl-box').element)
    const host = w.find('.dk-host')
    expect(host.classes()).toContain('dk-kbd')
    expect(host.classes()).not.toContain('dk-keysonly')
    w.unmount()
  })
  it('touch tablet (712px): unchanged — any field hides the whole bar', async () => {
    setView({ width: 712, touch: true })
    const w = mountBar()
    await flush()
    await focus(w.find('input.note-box').element)
    expect(w.find('.dk-host').classes()).toContain('dk-kbd')
    expect(w.find('.dk-host').classes()).not.toContain('dk-keysonly')
    w.unmount()
  })
  it('the keypad sits on top of the phone keyboard: lifted by the part of the page the keyboard covers', async () => {
    setView({ width: 375, touch: true })
    const listeners = {}
    const vv = { height: 812, offsetTop: 0, addEventListener: (t, f) => { listeners[t] = f }, removeEventListener() {} }
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
    Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 812 })
    const w = mountBar()
    await flush()
    await focus(w.find('input.note-box').element)
    expect(w.find('.dk-host').classes()).not.toContain('dk-lift') // no keyboard yet
    vv.height = 812 - 300 // the phone keyboard comes up: 300px of the page is behind it
    listeners.resize()
    await flush()
    const host = w.find('.dk-host')
    expect(host.classes()).toContain('dk-lift')
    expect(host.attributes('style')).toContain('bottom: 300px')
    await blurTo(null)
    expect(w.find('.dk-host').classes()).not.toContain('dk-lift')
    expect(w.find('.dk-host').attributes('style') || '').not.toContain('bottom')
    w.unmount()
    delete document.documentElement.clientHeight
  })
})

describe('ข้อ 2 — phone: icon-only buttons keep their name; the main action keeps its words', () => {
  it('phoneIcon marks the labelled button; its name stays as aria-label + tooltip', async () => {
    setView({ width: 375 })
    const w = mountBar()
    await flush()
    const play = w.find('[data-cell="play"]')
    expect(play.classes()).toContain('dk-phoneicon')
    expect(play.attributes('aria-label')).toBe('ฟังท่อน A')
    expect(play.attributes('title')).toBe('ฟังท่อน A')
    const save = w.find('[data-cell="save"]')
    expect(save.classes()).not.toContain('dk-phoneicon')
    expect(save.text()).toContain('เผยแพร่')
    w.unmount()
  })
  it('the stylesheet hides the words only below 600px and keeps a 48px square', () => {
    const css = fs.readFileSync(path.resolve(__dirname, 'DockKey.vue'), 'utf8').replace(/\r\n/g, '\n').split('<style scoped>')[1]
    const i = css.indexOf('@media (max-width: 599px) {')
    expect(i).toBeGreaterThan(0)
    const block = css.slice(i, css.indexOf('}\n}', i) + 3)
    expect(block).toMatch(/\.dk-bar \.dk-btn\.wide\.dk-phoneicon \{ width: var\(--touch-min\); padding: 0;/)
    expect(block).toMatch(/\.dk-bar \.dk-phoneicon \.dk-btn-lbl \{ display: none; \}/)
    expect(css).toMatch(/\.dk-host\.dk-keysonly \.dk-row \{ display: none; \}/)
  })
})
