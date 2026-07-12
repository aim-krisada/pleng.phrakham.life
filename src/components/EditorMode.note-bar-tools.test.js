// B098 — the editor exposes 4 DISTINCT copy/delete actions at two clear scopes:
//   • NOTE level (one seg-col only): คัดลอกโน้ต + ลบโน้ต — live inside the seg-col.
//   • BAR level (the whole ห้อง): คัดลอกห้อง + ลบห้อง — live in the bar foot, NOT the seg-col.
// Asserts each acts at the right scope: delete-note keeps the bar; delete-bar removes it.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
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

// one line, TWO bars; bar 0 has ONE segment (chord C, note "1 2"), bar 1 has ONE (chord G, "3 4")
const SONG = {
  id: 's-nbt',
  number: 3,
  title_th: 'เพลงทดสอบ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2' }, { type: 'bar' }, { type: 'segment', chord: 'G', note: '3 4' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})

function mountEd(song = SONG) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

const byAria = (w, substr) => w.findAll('button').filter((b) => (b.attributes('aria-label') || '').includes(substr))
// segments in bar `bi` = seg-cols inside that bar's seg-strip
const segCount = (w, bi) => w.findAll('.seg-strip')[bi].findAll('.seg-col').length
const barCount = (w) => w.findAll('.seg-strip').length

describe('B098 — note vs bar copy/delete: 4 distinct actions at two scopes', () => {
  it('all four actions are present and labelled clearly', async () => {
    const w = mountEd()
    await nextTick()
    // note level: one คัดลอกโน้ต + one ลบโน้ต per segment → 2 bars × 1 seg = 2 each
    expect(byAria(w, 'คัดลอกโน้ตนี้').length).toBe(2)
    expect(byAria(w, 'ลบโน้ตนี้').length).toBe(2)
    // bar level: one คัดลอกห้อง + one ลบห้อง per bar (surfaced in the foot) → 2 each
    expect(byAria(w, 'ทำสำเนาห้องนี้').length).toBe(2)
    expect(byAria(w, 'ลบห้องนี้').length).toBe(2)
  })

  it('scopes are visually separated: note tools sit in the seg-col, bar tools do NOT', async () => {
    const w = mountEd()
    await nextTick()
    expect(byAria(w, 'คัดลอกโน้ตนี้').every((b) => b.element.closest('.seg-col'))).toBe(true)
    expect(byAria(w, 'ลบโน้ตนี้').every((b) => b.element.closest('.seg-col'))).toBe(true)
    expect(byAria(w, 'ทำสำเนาห้องนี้').every((b) => !b.element.closest('.seg-col'))).toBe(true)
    expect(byAria(w, 'ลบห้องนี้').every((b) => !b.element.closest('.seg-col'))).toBe(true)
  })

  it('COPY note: duplicates ONE segment in place — the bar stays, no bar added', async () => {
    const w = mountEd()
    await nextTick()
    expect(segCount(w, 0)).toBe(1)
    expect(barCount(w)).toBe(2)
    await byAria(w, 'คัดลอกโน้ตนี้')[0].trigger('click')
    await nextTick()
    expect(segCount(w, 0)).toBe(2) // note duplicated within bar 0
    expect(segCount(w, 1)).toBe(1) // other bar untouched
    expect(barCount(w)).toBe(2) // no whole-bar copy
  })

  it('DELETE note: removes ONE segment but leaves the bar intact', async () => {
    const w = mountEd()
    await nextTick()
    await byAria(w, 'คัดลอกโน้ตนี้')[0].trigger('click') // bar 0 → 2 segments
    await nextTick()
    expect(segCount(w, 0)).toBe(2)
    await byAria(w, 'ลบโน้ตนี้')[0].trigger('click')
    await nextTick()
    expect(segCount(w, 0)).toBe(1) // one note removed
    expect(barCount(w)).toBe(2) // bar still there
  })

  it('DELETE note on the last note keeps the bar (never deletes the whole ห้อง)', async () => {
    const w = mountEd()
    await nextTick()
    expect(segCount(w, 0)).toBe(1)
    await byAria(w, 'ลบโน้ตนี้')[0].trigger('click')
    await nextTick()
    expect(barCount(w)).toBe(2) // the ห้อง survives (reset to an empty note slot)
    expect(segCount(w, 0)).toBe(1)
  })

  it('COPY bar: duplicates the WHOLE ห้อง right after it', async () => {
    const w = mountEd()
    await nextTick()
    expect(barCount(w)).toBe(2)
    await byAria(w, 'ทำสำเนาห้องนี้')[0].trigger('click')
    await nextTick()
    expect(barCount(w)).toBe(3) // a whole new bar
  })

  it('DELETE bar: removes the WHOLE ห้อง', async () => {
    const w = mountEd()
    await nextTick()
    expect(barCount(w)).toBe(2)
    await byAria(w, 'ลบห้องนี้')[0].trigger('click')
    await nextTick()
    expect(barCount(w)).toBe(1) // the whole bar is gone
  })
})
