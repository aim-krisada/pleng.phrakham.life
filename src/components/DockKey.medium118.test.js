// ใบ v3/pleng#118 — screens from 600 to 1023px wide (a Fold opened ≈ 712px or turned sideways ≈ 884px,
// a tablet held upright)
// get the phone's keypad rule from ใบ#114:
//   • the note keypad shows only while a note cell (or the keypad itself) has focus;
//   • on a touch screen, while a note cell is typed in, the bar is just the keypad (dk-keysonly),
//     instead of the whole bar — keypad included — stepping aside for the keyboard (measured
//     before: at 712×884 touch, typing a note left NO keypad on screen).
// Icon-only buttons stay phone-only (< 600px). From 1024px nothing changes.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
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
    <DockKey :items="items" store-key="m118" label="แถบทดสอบ" />
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

describe('ใบ#118 — 600–1023px: the keypad follows the note cell', () => {
  for (const width of [600, 712, 768, 884, 1023]) {
    it(`${width}px: no keypad until a note cell has focus; gone again on a lyric cell`, async () => {
      setView({ width, height: 900 })
      const w = mountBar()
      await flush()
      expect(keys(w).exists()).toBe(false)
      await focus(w.find('input.note-box').element)
      expect(keys(w).exists()).toBe(true)
      await blurTo(w.find('input.syl-box').element)
      expect(keys(w).exists()).toBe(false)
      w.unmount()
    })
  }
  it('712px touch (Fold opened): typing a note keeps the keypad — only the button rows step aside', async () => {
    setView({ width: 712, height: 884, touch: true })
    const w = mountBar()
    await flush()
    await focus(w.find('input.note-box').element)
    const host = w.find('.dk-host')
    expect(host.classes()).toContain('dk-keysonly')
    expect(host.classes()).not.toContain('dk-kbd')
    expect(keys(w).exists()).toBe(true)
    w.unmount()
  })
  it('712px touch: a lyric cell still hides the whole bar (ใบ#111)', async () => {
    setView({ width: 712, height: 884, touch: true })
    const w = mountBar()
    await flush()
    await focus(w.find('input.syl-box').element)
    expect(w.find('.dk-host').classes()).toContain('dk-kbd')
    expect(w.find('.dk-host').classes()).not.toContain('dk-keysonly')
    w.unmount()
  })
  it('712px: the buttons keep their words (icon-only is phone-only) and none moves into ⚙', async () => {
    setView({ width: 712, height: 884 })
    const w = mountBar()
    await flush()
    // the class is still set (it is the stylesheet's < 600px block that drops the words)
    expect(w.find('[data-cell="play"]').text()).toContain('ฟังท่อน')
    expect(w.find('[data-cell="save"]').text()).toContain('เผยแพร่')
    const onBar = w.findAll('.dk-host .dk-btnrow [data-cell]').map((c) => c.attributes('data-cell'))
    expect(onBar).toEqual(expect.arrayContaining(['undo', 'play', 'save', 'setting']))
    w.unmount()
  })
  it('1024px: unchanged — the keypad is always there, typing on touch hides the whole bar', async () => {
    setView({ width: 1024, height: 768, touch: true })
    const w = mountBar()
    await flush()
    expect(keys(w).exists()).toBe(true)
    await focus(w.find('input.note-box').element)
    expect(w.find('.dk-host').classes()).toContain('dk-kbd')
    expect(w.find('.dk-host').classes()).not.toContain('dk-keysonly')
    w.unmount()
  })
})
