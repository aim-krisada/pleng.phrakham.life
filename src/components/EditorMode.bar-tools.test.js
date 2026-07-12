// B092 — the per-bar move/copy/delete tools are surfaced out of the ⋯ popover into the bar
// toolbar (one tap, no menu). The ⋯ menu keeps only the rarely-used checkboxes (pickup /
// repeat / volta). Asserts the buttons are directly present, work, carry edge-disabled +
// aria, and that the menu no longer holds them.
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

// one line, TWO bars (bar token splits them)
const SONG = {
  id: 's-bt',
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

describe('B092 — bar move/copy/delete surfaced from the ⋯ menu', () => {
  it('the four bar tools are directly in the toolbar (no ⋯ open needed), one set per bar', async () => {
    const w = mountEd()
    await nextTick()
    expect(w.findAll('.ed-bar-menu').length).toBe(0) // no popover open
    // two bars → two of each surfaced tool, and none sit inside a .ed-bar-menu
    for (const label of ['ย้ายห้องไปทางซ้าย', 'ย้ายห้องไปทางขวา', 'ทำสำเนาห้องนี้', 'ลบห้องนี้']) {
      const btns = byAria(w, label)
      expect(btns.length).toBe(2)
      expect(btns.every((b) => !b.element.closest('.ed-bar-menu'))).toBe(true)
    }
  })

  it('edge guards: first bar cannot move left, last bar cannot move right', async () => {
    const w = mountEd()
    await nextTick()
    const left = byAria(w, 'ย้ายห้องไปทางซ้าย')
    const right = byAria(w, 'ย้ายห้องไปทางขวา')
    expect(left[0].attributes('disabled')).toBeDefined() // bar 0 (first of first line)
    expect(right[1].attributes('disabled')).toBeDefined() // bar 1 (last of last line)
  })

  it('duplicate adds a bar; delete removes one — straight from the toolbar', async () => {
    const w = mountEd()
    await nextTick()
    expect(w.findAll('.seg-strip').length).toBe(2)
    await byAria(w, 'ทำสำเนาห้องนี้')[0].trigger('click')
    await nextTick()
    expect(w.findAll('.seg-strip').length).toBe(3)
    await byAria(w, 'ลบห้องนี้')[0].trigger('click')
    await nextTick()
    expect(w.findAll('.seg-strip').length).toBe(2)
  })

  it('responsive-split: move (←→) stays surfaced; copy/delete also live in ⋯ (phone-only via CSS) alongside the checkboxes', async () => {
    const w = mountEd()
    await nextTick()
    // surfaced copy/delete carry .bar-act-wide (CSS-hidden on phones); move buttons do NOT
    expect(byAria(w, 'ทำสำเนาห้องนี้').every((b) => b.classes().includes('bar-act-wide'))).toBe(true)
    expect(byAria(w, 'ลบห้องนี้').every((b) => b.classes().includes('bar-act-wide'))).toBe(true)
    expect(byAria(w, 'ย้ายห้องไปทางซ้าย').some((b) => b.classes().includes('bar-act-wide'))).toBe(false)

    await w.findAll('button[aria-label^="เครื่องมือห้องนี้"]')[0].trigger('click')
    await nextTick()
    const menu = w.find('.ed-bar-menu')
    expect(menu.exists()).toBe(true)
    // the ⋯ holds the phone copy/delete row (.bar-menu-narrow) + the checkboxes; NO move buttons
    const narrow = menu.find('.bar-menu-narrow')
    expect(narrow.exists()).toBe(true)
    expect(narrow.findAll('button').length).toBe(2) // สำเนา + ลบ
    expect(menu.text()).toContain('ห้องต่อกัน')
    expect(menu.findAll('input[type="checkbox"]').length).toBeGreaterThanOrEqual(3)
    expect(byAria(w, 'ย้ายห้องไปทางซ้าย').every((b) => !b.element.closest('.ed-bar-menu'))).toBe(true)
  })
})
