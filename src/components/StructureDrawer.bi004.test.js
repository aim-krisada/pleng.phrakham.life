// BI-004 — the structure OUTLINE: clip held → visible ▸ insertion slots that paste at the
// CHOSEN index (not appended to the end), and ▲▼ line / ◀▶ bar reorder. These prove the drawer
// wiring: click a specific slot → the engine inserts THERE. Engine correctness lives in
// lib/songStructure.bi004.test.js.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StructureDrawer from './StructureDrawer.vue'
import { copyLine, copyBar } from '../lib/songStructure.js'

// melody A: line0 = "1 | 2" (2 bars), line1 = "3 | 4" (2 bars); one worded verse over 4 slots.
const content = () => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [
    [{ type: 'segment', note: '1' }, { type: 'bar' }, { type: 'segment', note: '2' }],
    [{ type: 'segment', note: '3' }, { type: 'bar' }, { type: 'segment', note: '4' }],
  ] }],
  arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: ['a', 'b', 'c', 'd'] }],
})
const cursor = { stanzaId: 'A', lineIndex: 0, barOrdinal: 0, entryIndex: 0 }
function mountDrawer(over = {}) {
  return mount(StructureDrawer, {
    props: { open: true, content: content(), cursor, clip: null, ...over },
    global: { stubs: { Icon: true } },
  })
}
const last = (w) => w.emitted('update-content').at(-1)[0]
const notesOf = (ln) => ln.filter((it) => it.type === 'segment').map((s) => s.note).join('')
const lineNotes = (c) => c.stanzas[0].lines.map(notesOf)

describe('outline renders the active melody', () => {
  it('shows one row per line and expands the selected line’s bars', () => {
    const w = mountDrawer()
    expect(w.findAll('.sd-line').length).toBe(2)
    // cursor line 0 is selected → its 2 bars are shown
    expect(w.findAll('.sd-bar').length).toBe(2)
  })
  it('no ▸ paste slots until a clip is held', () => {
    const w = mountDrawer({ clip: null })
    expect(w.findAll('.sd-slot.line').length).toBe(0)
    expect(w.findAll('.sd-slot.bar').length).toBe(0)
  })
})

describe('paste a LINE at a chosen slot', () => {
  it('a line clip lights a slot before/after every line; clicking slot #1 inserts there (not appended)', async () => {
    const clip = copyLine(content(), { stanzaId: 'A', lineIndex: 0 }) // copy "12"
    const w = mountDrawer({ clip })
    const slots = w.findAll('.sd-slot.line')
    expect(slots.length).toBe(3) // before l0, between, after l1
    await slots[1].trigger('click') // insert BEFORE line index 1
    expect(lineNotes(last(w))).toEqual(['12', '12', '34']) // landed in the middle, not the end
  })
  it('the last slot appends at the end', async () => {
    const clip = copyLine(content(), { stanzaId: 'A', lineIndex: 0 })
    const w = mountDrawer({ clip })
    await w.findAll('.sd-slot.line').at(-1).trigger('click')
    expect(lineNotes(last(w))).toEqual(['12', '34', '12'])
  })
})

describe('paste a BAR at a chosen slot within the selected line', () => {
  it('a bar clip lights slots between bars; clicking the first inserts at bar 0', async () => {
    const clip = copyBar(content(), { stanzaId: 'A', lineIndex: 0, barOrdinal: 1 }) // copy bar "2"
    const w = mountDrawer({ clip })
    const slots = w.findAll('.sd-slot.bar')
    expect(slots.length).toBe(3) // before b0, between, after b1
    await slots[0].trigger('click') // insert before bar 0 of line 0
    expect(notesOf(last(w).stanzas[0].lines[0])).toEqual('212')
  })
})

describe('reorder without dragging (WCAG 2.5.7 single-pointer alternative)', () => {
  it('▼ on line 0 moves it below line 1', async () => {
    const w = mountDrawer()
    // line 0 row, its acts: [up(disabled), down, copy, dup] → down is the enabled chevron
    const acts = w.findAll('.sd-line')[0].findAll('.sd-line-acts .sd-icon')
    await acts[1].trigger('click') // ▼
    expect(lineNotes(last(w))).toEqual(['34', '12'])
  })
  it('◀▶ move the selected bar within its line', async () => {
    const w = mountDrawer() // bar 0 selected via cursor.barOrdinal 0
    const mv = w.find('.sd-bar.sel .sd-bar-move')
    const right = mv.findAll('.sd-bar-mv')[1]
    await right.trigger('click') // move bar 0 → right
    expect(notesOf(last(w).stanzas[0].lines[0])).toEqual('21')
  })
})
