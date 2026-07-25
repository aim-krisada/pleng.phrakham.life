// BI-015 — pointer-based drag-to-reorder (replaces native HTML5 DnD, which never fired on touch
// and only exposed thin 10px gap drop targets). These drive REAL pointer events (pointerdown →
// pointermove → pointerup) on the grip and assert the emitted v2 content's order changed — the
// same events a mouse or finger produces, not a synthetic dragEvent. Layout is stubbed because
// jsdom has no geometry; a real-browser drag is verified separately (see the inbox evidence).
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StructureDrawer from './StructureDrawer.vue'

// melody A: 3 lines "12" / "34" / "56"; 3 sections so card reorder is exercised too.
const content = () => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [
    [{ type: 'segment', note: '1' }, { type: 'bar' }, { type: 'segment', note: '2' }],
    [{ type: 'segment', note: '3' }, { type: 'bar' }, { type: 'segment', note: '4' }],
    [{ type: 'segment', note: '5' }, { type: 'bar' }, { type: 'segment', note: '6' }],
  ] }],
  arrangement: [
    { stanza: 'A', label: 'ข้อ 1', syllables: ['a', 'b', 'c', 'd', 'e', 'f'] },
    { stanza: 'A', label: 'ข้อ 2' },
    { stanza: 'A', label: 'ข้อ 3' },
  ],
})
const cursor = { stanzaId: 'A', lineIndex: 0, barOrdinal: 0, entryIndex: 0 }
const mountDrawer = (over = {}) => mount(StructureDrawer, {
  props: { open: true, content: content(), cursor, clip: null, ...over },
  global: { stubs: { Icon: true } },
  attachTo: document.body,
})
const last = (w) => w.emitted('update-content').at(-1)[0]
const notesOf = (ln) => ln.filter((it) => it.type === 'segment').map((s) => s.note).join('')
const lineNotes = (c) => c.stanzas[0].lines.map(notesOf)

// give each element a fixed vertical (or horizontal) band so resolveDest has real midpoints
function stubBands(els, { axis = 'y', size = 20, gap = 0 } = {}) {
  els.forEach((el, i) => {
    const start = i * (size + gap)
    el.getBoundingClientRect = () => (axis === 'y'
      ? { top: start, bottom: start + size, left: 0, right: 100, width: 100, height: size, x: 0, y: start }
      : { left: start, right: start + size, top: 0, bottom: 20, width: size, height: 20, x: start, y: 0 })
  })
}
// dispatch a real pointer sequence: press the grip, move across, release
async function pointerDrag(wrapper, gripEl, { downAt, moveTo, axis = 'y' }) {
  const opt = (coord) => (axis === 'y'
    ? { clientX: 5, clientY: coord, pointerId: 1, button: 0, bubbles: true }
    : { clientX: coord, clientY: 5, pointerId: 1, button: 0, bubbles: true })
  gripEl.dispatchEvent(new MouseEvent('pointerdown', opt(downAt)))
  await wrapper.vm.$nextTick()
  window.dispatchEvent(new MouseEvent('pointermove', opt((downAt + moveTo) / 2))) // cross threshold
  window.dispatchEvent(new MouseEvent('pointermove', opt(moveTo)))
  await wrapper.vm.$nextTick()
  window.dispatchEvent(new MouseEvent('pointerup', opt(moveTo)))
  await wrapper.vm.$nextTick()
}

describe('BI-015 pointer drag reorders melody LINES', () => {
  it('dragging line 3 up above line 1 reorders both render order AND v2 model', async () => {
    const w = mountDrawer()
    const lines = w.findAll('.sd-line').map((x) => x.element)
    expect(lines.length).toBe(3)
    stubBands(lines) // bands: L0 0–20 (mid10), L1 20–40 (mid30), L2 40–60 (mid50)
    const grip3 = w.findAll('.sd-line')[2].find('.sd-grip').element
    await pointerDrag(w, grip3, { downAt: 50, moveTo: 3 }) // grab L2, drag above L0's midpoint

    expect(lineNotes(last(w))).toEqual(['56', '12', '34']) // model order changed
    // words follow their melody: verse 1 rebuilt in the new line order
    expect(last(w).arrangement[0].syllables).toEqual(['e', 'f', 'a', 'b', 'c', 'd'])
  })

  it('a tap on the grip (no movement past threshold) does NOT reorder', async () => {
    const w = mountDrawer()
    const lines = w.findAll('.sd-line').map((x) => x.element)
    stubBands(lines)
    const grip3 = w.findAll('.sd-line')[2].find('.sd-grip').element
    await pointerDrag(w, grip3, { downAt: 50, moveTo: 52 }) // 2px < 5px threshold
    expect(w.emitted('update-content')).toBeUndefined() // nothing emitted
  })
})

describe('BI-015 pointer drag reorders SECTION cards', () => {
  it('dragging card 3 up above card 1 reorders the arrangement', async () => {
    const w = mountDrawer()
    const cards = w.findAll('.sd-card').map((x) => x.element)
    expect(cards.length).toBe(3)
    stubBands(cards)
    const grip3 = w.findAll('.sd-card')[2].find('.sd-grip').element
    await pointerDrag(w, grip3, { downAt: 50, moveTo: 3 })
    expect(last(w).arrangement.map((r) => r.label)).toEqual(['ข้อ 3', 'ข้อ 1', 'ข้อ 2'])
  })
})

describe('BI-015 pointer drag reorders BARS (horizontal)', () => {
  it('dragging bar 2 left of bar 1 swaps them in the selected line', async () => {
    const w = mountDrawer()
    const bars = w.findAll('.sd-bar').map((x) => x.element)
    expect(bars.length).toBe(2) // line 0 selected → its 2 bars
    stubBands(bars, { axis: 'x' }) // B0 0–20 (mid10), B1 20–40 (mid30)
    const bar2 = w.findAll('.sd-bar')[1].element
    await pointerDrag(w, bar2, { downAt: 30, moveTo: 3, axis: 'x' })
    expect(notesOf(last(w).stanzas[0].lines[0])).toEqual('21')
  })
})

describe('BI-015 ▲▼ accessible reorder still works (WCAG 2.5.7)', () => {
  it('▼ on line 0 moves it below line 1', async () => {
    const w = mountDrawer()
    const acts = w.findAll('.sd-line')[0].findAll('.sd-line-acts .sd-icon')
    await acts[1].trigger('click') // ▼
    expect(lineNotes(last(w))).toEqual(['34', '12', '56'])
  })
})
