// ps3 §③ / B035 · B031 · B003 · B032 — the redesigned edit header (edhead). Asserts the
// prototype-aligned surface: no duplicate ท่อน/ข้อ dropdowns (rail is the only nav), the
// layout toggle, the per-bar/whole-song "ดูผล" render, and the rail delete affordances.
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

// one stanza, one line, TWO bars (bar token splits them) · two verses so delete is offered
const SONG = {
  id: 's1',
  number: 3,
  title_th: 'เพลงทดสอบ',
  title_en: '',
  content: {
    version: 2,
    key: 'C',
    timeSignature: '4/4',
    stanzas: [
      {
        id: 'A',
        lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }, { type: 'bar' }, { type: 'segment', chord: 'G', note: '5 6 7 1' }]],
      },
    ],
    arrangement: [
      { stanza: 'A', label: 'ร้อง 1', syllables: [] },
      { stanza: 'A', label: 'ร้อง 2', syllables: [] },
    ],
  },
}

beforeEach(() => {
  document.body.innerHTML = '<div id="shell-title"></div><div id="shell-menus"></div>'
})

function mountEd() {
  return mount(EditorMode, {
    props: { song: SONG, tier: 'approver', active: true },
    attachTo: document.body,
    global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
  })
}

describe('edhead — prototype-aligned edit header', () => {
  it('B031/B003: the edit surface has NO ท่อน/ข้อ dropdowns (rail is the only nav)', async () => {
    const w = mountEd()
    await nextTick()
    // the old breadcrumb rendered <select class="pick"> for ท่อน + ข้อ — gone now
    expect(w.find('.edhead').exists()).toBe(true)
    expect(w.findAll('.edhead select').length).toBe(0)
    // breadcrumb is a position label, not a menu
    expect(w.find('.ed-crumb').text()).toContain('ท่อน A')
  })

  it('B035: layout toggle flips the strip stack ⇄ flow', async () => {
    const w = mountEd()
    await nextTick()
    const strip = w.find('.ed-strip')
    expect(strip.classes()).toContain('lay-stack') // default = 1 ห้อง/แถว (matches prototype)
    const flowBtn = w.findAll('.ed-lay button').find((b) => b.text() === 'ต่อกัน')
    await flowBtn.trigger('click')
    expect(w.find('.ed-strip').classes()).toContain('lay-flow')
  })

  it('B035: ดูผลทั้งเพลง renders every bar and the label is authoritative', async () => {
    const w = mountEd()
    await nextTick()
    const chip = w.find('.ed-chip')
    expect(chip.text()).toContain('ดูผลทั้งเพลง')
    expect(w.findAll('.seg-strip').length).toBe(2) // two bars, both editable
    await chip.trigger('click')
    expect(w.findAll('.ed-bar-render').length).toBe(2) // both flipped to render
    expect(w.findAll('.seg-strip').length).toBe(0)
    expect(w.find('.ed-chip').text()).toContain('กลับไปแก้ทั้งเพลง') // label reflects allShown
    await w.find('.ed-chip').trigger('click')
    expect(w.findAll('.seg-strip').length).toBe(2) // back to editing
  })

  it('B035: per-bar ดูผล flips one bar only, in place', async () => {
    const w = mountEd()
    await nextTick()
    const btn = w.findAll('button[aria-label="ดูผลห้องนี้"]')
    expect(btn.length).toBe(2)
    await btn[0].trigger('click')
    expect(w.findAll('.ed-bar-render').length).toBe(1) // just that one bar
    expect(w.findAll('.seg-strip').length).toBe(1)
  })

  it('B035: ฮุก + ซ้ำ quick-struct act on the active line and round-trip in the model', async () => {
    const w = mountEd()
    await nextTick()
    await w.find('button[aria-label="ท่อนฮุก"]').trigger('click')
    await w.find('button[aria-label="เล่นซ้ำบรรทัด"]').trigger('click')
    await nextTick()
    const content = w.emitted('change').at(-1)[0].content
    const items = content.stanzas[0].lines[0]
    expect(items.some((it) => it.type === 'marker')).toBe(true) // ฮุก → marker
    expect(items.some((it) => it.type === 'repeat-start')).toBe(true) // ซ้ำ → wraps line
    expect(items.some((it) => it.type === 'repeat-end')).toBe(true)
  })

  it('B032: each verse row offers a delete, and it removes the ข้อ', async () => {
    const w = mountEd()
    await nextTick()
    expect(w.findAll('.rail-rowwrap.lyr').length).toBe(2)
    const del = w.find('.rail-rowwrap.lyr .rail-del')
    expect(del.exists()).toBe(true)
    await del.trigger('click')
    expect(w.findAll('.rail-rowwrap.lyr').length).toBe(1)
  })
})
