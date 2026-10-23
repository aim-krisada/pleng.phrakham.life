// The bottom bar steps aside for the on-screen KEYBOARD, not for focus alone — พี่เอม 23 ต.ค. 2569, iPad,
// installed app, edit page: the bar "ขึ้นบ้างไม่ขึ้นบ้าง". On an iPad a field keeps focus after the keyboard
// is put away (tapping a part of the page that is not a field does not take focus), and with a hardware
// keyboard no on-screen keyboard comes up at all — keyed on focus alone, the whole bar stayed gone.
// jsdom has no layout: media queries go through a fake matchMedia, the keyboard through a fake visualViewport.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DockKey from './DockKey.vue'

const realMM = window.matchMedia
const realVV = window.visualViewport
function setView({ width = 1180, height = 820, touch = true } = {}) {
  window.matchMedia = (q) => {
    let matches = false
    const mw = /max-width:\s*(\d+)px/.exec(q)
    const mh = /max-height:\s*(\d+)px/.exec(q)
    if (mw) matches = width <= +mw[1]
    else if (mh) matches = height <= +mh[1]
    else if (/pointer:\s*coarse/.test(q)) matches = touch
    return { matches, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  }
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: height })
}
// an iPad turned sideways: 1180 × 820, the page's visible part as tall as the page until a keyboard comes
function fakeViewport(height = 820) {
  const listeners = {}
  const vv = { height, offsetTop: 0, scale: 1, addEventListener: (t, f) => { listeners[t] = f }, removeEventListener() {} }
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
  return { vv, fire: () => listeners.resize?.() }
}

const items = [
  { id: 'keys', kind: 'keys', name: 'แป้นสัญลักษณ์', rows: [['1', '2']], onInsert: () => {}, showFor: 'input.note-box' },
  { id: 'undo', kind: 'btn', name: 'ย้อน', icon: 'undo-2', place: { anchor: 'left', row: 1 }, run: () => {} },
  { id: 'setting', kind: 'gear', name: 'ตั้งค่า', place: { anchor: 'right', row: 1 } },
]
const Host = {
  components: { DockKey },
  template: `<div>
    <input class="syl-box" type="text" aria-label="ช่องเนื้อร้อง" />
    <DockKey :items="items" store-key="p138" label="แถบทดสอบ" />
  </div>`,
  data: () => ({ items }),
}
const flush = async () => { for (let i = 0; i < 4; i++) await nextTick() }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function focusField(w) {
  const el = w.find('input.syl-box').element
  el.focus()
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  await flush()
}
const hidden = (w) => w.find('.dk-host').classes().includes('dk-kbd')

beforeEach(() => { localStorage.clear(); document.body.innerHTML = '' })
afterEach(() => {
  window.matchMedia = realMM
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: realVV })
  delete document.documentElement.clientHeight
})

describe('iPad — the bar is hidden only while the on-screen keyboard is up', () => {
  it('a tap into a field hides it at once; the keyboard put away brings it back, though the field keeps focus', async () => {
    setView()
    const { vv, fire } = fakeViewport()
    const w = mount(Host, { global: { stubs: { Icon: true } }, attachTo: document.body })
    await flush()
    expect(hidden(w)).toBe(false)
    await focusField(w)
    expect(hidden(w)).toBe(true) // the keyboard is on its way — as before
    vv.height = 820 - 350 // it comes up
    fire()
    await flush()
    expect(hidden(w)).toBe(true)
    await wait(850)
    vv.height = 820 // put away with the keyboard's own key — the field still has focus
    fire()
    await flush()
    expect(document.activeElement).toBe(w.find('input.syl-box').element)
    expect(hidden(w)).toBe(false)
    w.unmount()
  })

  it('a hardware keyboard (no on-screen keyboard ever comes up): the bar comes back by itself', async () => {
    setView()
    fakeViewport()
    const w = mount(Host, { global: { stubs: { Icon: true } }, attachTo: document.body })
    await flush()
    await focusField(w)
    expect(hidden(w)).toBe(true)
    await wait(900)
    await flush()
    expect(hidden(w)).toBe(false)
    w.unmount()
  })

  it('while the keyboard is still sliding up, a half-way size does not flash the bar back', async () => {
    setView()
    const { vv, fire } = fakeViewport()
    const w = mount(Host, { global: { stubs: { Icon: true } }, attachTo: document.body })
    await flush()
    await focusField(w)
    vv.height = 820 - 40 // first frame of the slide
    fire()
    await flush()
    expect(hidden(w)).toBe(true)
    w.unmount()
  })

  it('a pinch-zoomed page cannot tell a keyboard from the zoom → focus alone decides, as before', async () => {
    setView()
    const { vv } = fakeViewport()
    vv.scale = 2
    vv.height = 410
    const w = mount(Host, { global: { stubs: { Icon: true } }, attachTo: document.body })
    await flush()
    await focusField(w)
    await wait(900)
    await flush()
    expect(hidden(w)).toBe(true)
    w.unmount()
  })

  it('a browser without visualViewport → focus alone decides, as before', async () => {
    setView()
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined })
    const w = mount(Host, { global: { stubs: { Icon: true } }, attachTo: document.body })
    await flush()
    await focusField(w)
    await wait(900)
    await flush()
    expect(hidden(w)).toBe(true)
    w.unmount()
  })
})
