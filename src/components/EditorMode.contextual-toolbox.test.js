// dock-space §10 joint-pass: the per-note toolbars merge into ONE on-selection toolbox,
// hoisted to the .seg-col so it appears in EVERY mode:
//   • note-box focus (no lens)  → [⧉ copy · ✕ delete]        (focusedSeg set, focusedSlot = -1)
//   • syllable focus (lens on)  → [◀ ▶ align ┊ ⧉ copy · ✕]   (focusedSlot ≥ 0 too)
// The old always-visible .seg-tools is gone (no duplicate set). focusedSeg is STICKY (SA §7
// continuity): a blur (fold/rotate/keyboard-close) keeps it; only an outside pointer clears it.
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

const NOTE_SONG = {
  id: 's-ctx', number: 6, title_th: 'ทดสอบ', title_en: '',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: '', note: '5' }]] }],
    arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: [] }], // no words → note-entry mode
  },
}
const LENS_SONG = {
  ...NOTE_SONG, id: 's-ctx-lens',
  content: { ...NOTE_SONG.content, arrangement: [{ stanza: 'A', label: 'ร้อง 1', syllables: ['ดี'] }] },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
  Element.prototype.scrollIntoView = () => {}
})

function mountEd(song) {
  return mount(EditorMode, {
    props: { song, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

const ariaOf = (span) => span.findAll('button').map((b) => b.attributes('aria-label') || '')

describe('dock-space §10 — one hoisted contextual toolbox per note', () => {
  it('there is NO separate always-visible .seg-tools anymore', async () => {
    const w = mountEd(NOTE_SONG)
    await nextTick()
    expect(w.find('.seg-tools').exists()).toBe(false)
    // and the toolbox is hidden until something is selected
    expect(w.find('.slot-tools').exists()).toBe(false)
  })

  it('focusing a NOTE box shows the toolbox with copy + delete (no ◀▶ — nothing to align)', async () => {
    const w = mountEd(NOTE_SONG)
    await nextTick()
    w.findAll('.note-box')[0].element.focus() // focusin → seg-col → focusedSeg
    await nextTick()
    const st = w.find('.slot-tools')
    expect(st.exists()).toBe(true)
    const aria = ariaOf(st)
    expect(aria.some((a) => a.includes('คัดลอกโน้ตนี้'))).toBe(true)
    expect(aria.some((a) => a.includes('ลบโน้ตนี้'))).toBe(true)
    expect(aria.some((a) => a.includes('ดึงคำมาซ้าย'))).toBe(false) // ◀ hidden (focusedSlot = -1)
  })

  it('focusing a SYLLABLE shows the MERGED set (◀ ▶ + copy + delete) in the one toolbox', async () => {
    const w = mountEd(LENS_SONG)
    await nextTick()
    const syl = w.find('.syl-box')
    expect(syl.exists()).toBe(true)
    await syl.trigger('focusin') // seg-col focusin → focusedSeg
    await syl.trigger('focus') // syllable → focusedSlot
    await nextTick()
    const st = w.find('.slot-tools')
    expect(st.exists()).toBe(true)
    const aria = ariaOf(st)
    expect(aria.some((a) => a.includes('ดึงคำมาซ้าย'))).toBe(true) // ◀
    expect(aria.some((a) => a.includes('ดันคำไปขวา'))).toBe(true) // ▶
    expect(aria.some((a) => a.includes('คัดลอกโน้ตนี้'))).toBe(true)
    expect(aria.some((a) => a.includes('ลบโน้ตนี้'))).toBe(true)
  })

  it('copy in the toolbox duplicates the note (wired to duplicateSegment)', async () => {
    const w = mountEd(NOTE_SONG)
    await nextTick()
    expect(w.findAll('.seg-col').length).toBe(1)
    w.findAll('.note-box')[0].element.focus()
    await nextTick()
    const copy = w.find('.slot-tools').findAll('button').find((b) => (b.attributes('aria-label') || '').includes('คัดลอกโน้ตนี้'))
    await copy.trigger('click')
    await nextTick()
    expect(w.findAll('.seg-col').length).toBe(2) // note duplicated
  })

  it('continuity: the toolbox SURVIVES a blur (sticky focusedSeg), cleared only by an outside pointer', async () => {
    const w = mountEd(NOTE_SONG)
    await nextTick()
    const nb = w.findAll('.note-box')[0].element
    nb.focus()
    await nextTick()
    await new Promise((r) => setTimeout(r)) // let the outside-pointer listener attach (setTimeout 0, matches onBarMenuOutside)
    expect(w.find('.slot-tools').exists()).toBe(true)
    nb.blur() // fold/rotate/keyboard-close blurs the input
    await nextTick()
    expect(w.find('.slot-tools').exists()).toBe(true) // still there — selection kept
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) // explicit outside tap
    await nextTick()
    expect(w.find('.slot-tools').exists()).toBe(false) // now dismissed
  })
})
