// B098 — the editor exposes 4 DISTINCT copy/delete actions at two clear scopes:
//   • NOTE level (one seg-col only): คัดลอกโน้ต + ลบโน้ต — live inside the seg-col.
//   • BAR level (the whole ห้อง): คัดลอกห้อง + ลบห้อง — live in the bar foot, NOT the seg-col.
// Asserts each acts at the right scope: delete-note keeps the bar; delete-bar removes it.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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
  // dock-space §10: the note copy/delete are now ON-SELECTION in the hoisted toolbox — they
  // appear for the focused note's seg-col (one at a time), not always-visible for every note.
  const focusNote = async (w, i = 0) => { w.findAll('.note-box')[i].element.focus(); await nextTick() }

  it('all four actions are present and labelled clearly', async () => {
    const w = mountEd()
    await nextTick()
    // note level: on-selection → focus a note → its seg's toolbox shows exactly one copy + one delete
    await focusNote(w, 0)
    expect(byAria(w, 'คัดลอกโน้ตนี้').length).toBe(1)
    expect(byAria(w, 'ลบโน้ตนี้').length).toBe(1)
    // bar level: one คัดลอกห้อง + one ลบห้อง per bar (surfaced in the foot, always) → 2 each
    expect(byAria(w, 'ทำซ้ำห้องนี้').length).toBe(2)
    expect(byAria(w, 'ลบห้องนี้').length).toBe(2)
  })

  // P'Aim 21 ก.ค.: the note tools moved OUT of the seg-col into the ONE bar toolbar (foot), in a
  // distinct "note" group (.ed-note-acts) next to the "bar" group (.ed-bar-acts) — so a click shows
  // a single toolbar, and the two ⧉/✕ read as different scopes by their group, not two toolbars.
  it('scopes are separated: note tools in the note group, bar tools in the bar group — one toolbar', async () => {
    const w = mountEd()
    await nextTick()
    await focusNote(w, 0)
    expect(byAria(w, 'คัดลอกโน้ตนี้').every((b) => b.element.closest('.ed-note-acts'))).toBe(true)
    expect(byAria(w, 'ลบโน้ตนี้').every((b) => b.element.closest('.ed-note-acts'))).toBe(true)
    expect(byAria(w, 'ทำซ้ำห้องนี้').every((b) => b.element.closest('.ed-bar-acts') && !b.element.closest('.ed-note-acts'))).toBe(true)
    expect(byAria(w, 'ลบห้องนี้').every((b) => b.element.closest('.ed-bar-acts'))).toBe(true)
    // both groups live in the SAME one bar toolbar (foot) — not two separate toolbars
    expect(byAria(w, 'คัดลอกโน้ตนี้').every((b) => b.element.closest('.ed-bar-foot'))).toBe(true)
    expect(byAria(w, 'ลบห้องนี้').every((b) => b.element.closest('.ed-bar-foot'))).toBe(true)
  })

  it('COPY note: duplicates ONE segment in place — the bar stays, no bar added', async () => {
    const w = mountEd()
    await nextTick()
    expect(segCount(w, 0)).toBe(1)
    expect(barCount(w)).toBe(2)
    await focusNote(w, 0)
    await byAria(w, 'คัดลอกโน้ตนี้')[0].trigger('click')
    await nextTick()
    expect(segCount(w, 0)).toBe(2) // note duplicated within bar 0
    expect(segCount(w, 1)).toBe(1) // other bar untouched
    expect(barCount(w)).toBe(2) // no whole-bar copy
  })

  it('DELETE note: removes ONE segment but leaves the bar intact', async () => {
    const w = mountEd()
    await nextTick()
    await focusNote(w, 0)
    await byAria(w, 'คัดลอกโน้ตนี้')[0].trigger('click') // bar 0 → 2 segments
    await nextTick()
    expect(segCount(w, 0)).toBe(2)
    await byAria(w, 'ลบโน้ตนี้')[0].trigger('click') // toolbox stays on the focused seg (sticky)
    await nextTick()
    expect(segCount(w, 0)).toBe(1) // one note removed
    expect(barCount(w)).toBe(2) // bar still there
  })

  it('DELETE note on the last note keeps the bar (never deletes the whole ห้อง)', async () => {
    const w = mountEd()
    await nextTick()
    expect(segCount(w, 0)).toBe(1)
    await focusNote(w, 0)
    await byAria(w, 'ลบโน้ตนี้')[0].trigger('click')
    await nextTick()
    expect(barCount(w)).toBe(2) // the ห้อง survives (reset to an empty note slot)
    expect(segCount(w, 0)).toBe(1)
  })

  it('COPY bar: duplicates the WHOLE ห้อง right after it', async () => {
    const w = mountEd()
    await nextTick()
    expect(barCount(w)).toBe(2)
    await byAria(w, 'ทำซ้ำห้องนี้')[0].trigger('click')
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

  it('ADD bar: cursor auto-focuses the new ห้อง note box (type notes right away)', async () => {
    const w = mountEd()
    await nextTick()
    expect(barCount(w)).toBe(2)
    await byAria(w, 'เพิ่มห้อง')[0].trigger('click') // add a 3rd bar (index 2)
    await flushPromises() // addBar awaits nextTick before focusing
    expect(barCount(w)).toBe(3)
    const active = document.activeElement
    expect(active).toBeTruthy()
    expect(active.classList.contains('note-box')).toBe(true) // it's a note input
    expect(active.classList.contains('add')).toBe(false) // not the "+" add-note button
    // and it lives inside the newly added bar (data-bar "0-2"), not an old one
    expect(active.closest('[data-bar]')?.getAttribute('data-bar')).toBe('0-2')
  })
})
