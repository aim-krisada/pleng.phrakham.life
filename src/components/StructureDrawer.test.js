// StructureDrawer — the inline editor's 🎼 โครงเพลง surface. These prove it MOUNTS (compiles +
// renders the section/melody cards) and that its buttons emit a correct new content through the
// pure engine. The engine's own correctness (incl. the re-mint AC) is covered in
// lib/songStructure.test.js; here we check the wiring: click → right content out.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StructureDrawer from './StructureDrawer.vue'

const content = () => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3' }]] }],
  arrangement: [
    { stanza: 'A', label: 'ข้อ 1', syllables: ['a', 'b', 'c'] },
    { stanza: 'A', label: 'ข้อ 2', syllables: ['d', 'e', 'f'] },
  ],
})

function mountDrawer(over = {}) {
  return mount(StructureDrawer, {
    props: { open: true, content: content(), cursor: null, clip: null, ...over },
    global: { stubs: { Icon: true } },
  })
}
const lastContent = (w) => w.emitted('update-content').at(-1)[0]

describe('StructureDrawer — mounts and renders the structure', () => {
  it('renders one card per section and one row per melody', () => {
    const w = mountDrawer()
    expect(w.find('.sd-panel').exists()).toBe(true)
    expect(w.findAll('.sd-card').length).toBe(2)
    expect(w.findAll('.sd-mel').length).toBe(1)
  })
  it('closed → renders nothing', () => {
    expect(mountDrawer({ open: false }).find('.sd-panel').exists()).toBe(false)
  })
})

describe('StructureDrawer — actions emit new content', () => {
  it('เพิ่มท่อน adds a section', () => {
    const w = mountDrawer()
    w.find('.sd-add').trigger('click') // first .sd-add = ท่อน
    expect(lastContent(w).arrangement.length).toBe(3)
  })
  it('ทำนองใหม่ adds a melody', () => {
    const w = mountDrawer()
    w.findAll('.sd-add')[1].trigger('click') // second .sd-add = ทำนอง
    expect(lastContent(w).stanzas.map((s) => s.id)).toEqual(['A', 'B'])
  })
  it('delete removes the section (danger icon on the card)', () => {
    const w = mountDrawer()
    w.findAll('.sd-card')[0].find('.sd-icon.danger').trigger('click')
    expect(lastContent(w).arrangement.map((r) => r.label)).toEqual(['ข้อ 2'])
  })
  it('แยกทำนอง shows only when a melody is shared, and clones on click', () => {
    const w = mountDrawer()
    const mk = w.findAll('.sd-mini') // shown on both cards (A shared by 2)
    expect(mk.length).toBe(2)
    mk[1].trigger('click') // make ข้อ 2 unique
    const c = lastContent(w)
    expect(c.stanzas.map((s) => s.id)).toEqual(['A', 'B'])
    expect(c.arrangement[1].stanza).toBe('B')
  })
  it('retagging the melody select repoints the section', async () => {
    // give it a second melody first via a content that already has A + B
    const two = content()
    two.stanzas.push({ id: 'B', lines: [[{ type: 'segment', note: '5 5' }]] })
    const w = mountDrawer({ content: two })
    await w.findAll('.sd-card')[0].find('.sd-badge-sel').setValue('B')
    expect(lastContent(w).arrangement[0].stanza).toBe('B')
  })
})

describe('StructureDrawer — คัดลอก/วาง follows the cursor', () => {
  const cursor = { stanzaId: 'A', lineIndex: 0, barOrdinal: 0, entryIndex: 0 }
  it('with no cursor the copy/paste buttons are disabled', () => {
    const w = mountDrawer({ cursor: null })
    expect(w.find('.sd-cp-btn').attributes('disabled')).toBeDefined()
  })
  it('คัดลอกบรรทัด emits a line clip via set-clip', () => {
    const w = mountDrawer({ cursor })
    // buttons: [0]=คัดลอกห้อง [1]=คัดลอกบรรทัด
    w.findAll('.sd-cp-btn')[1].trigger('click')
    const frag = w.emitted('set-clip').at(-1)[0]
    expect(frag.kind).toBe('line')
  })
  it('with a line clip, วางเป็นท่อนใหม่ adds a melody', () => {
    const w = mountDrawer({ cursor, clip: { kind: 'line', data: { marker: '', markerId: '', cont: false, label: '', section: '', end: false, bars: [{ segments: [{ chord: '', note: '5 6', lyric: '' }], repeatStart: false, repeatEnd: false, volta: 0, pickup: false, repeatStartId: '', repeatEndId: '', voltaId: '', repeatTimes: null, voltaRaw: null }] }, from: 'บรรทัด 1' } })
    w.find('.sd-clip .sd-cp-btn.paste[title="วางเป็นทำนอง/ท่อนใหม่"]').trigger('click')
    const c = lastContent(w)
    expect(c.stanzas.length).toBe(2)
    expect(c.stanzas[1].lines[0].filter((it) => it.type === 'segment').map((it) => it.note)).toEqual(['5 6'])
  })
})
