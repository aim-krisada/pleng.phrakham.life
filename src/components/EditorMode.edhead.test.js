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

  it('B048: layout defaults to ต่อกัน and toggles to 1 ห้อง/แถว', async () => {
    const w = mountEd()
    await nextTick()
    const strip = w.find('.ed-strip')
    expect(strip.classes()).toContain('lay-flow') // B048: default = ต่อกัน (ห้องต่อกัน)
    const stackBtn = w.findAll('.ed-lay button').find((b) => b.text() === '1 ห้อง/แถว')
    await stackBtn.trigger('click')
    expect(w.find('.ed-strip').classes()).toContain('lay-stack')
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

  // B050/B051 — the "ดูผลทั้งเพลง" preview renders REAL SongSheet (not stubbed) so we can
  // assert the words show and the section head is not repeated per bar.
  const WORDED = {
    id: 's2',
    number: 4,
    title_th: 'เพลงมีเนื้อ',
    title_en: '',
    content: {
      version: 2,
      key: 'C',
      timeSignature: '4/4',
      // one line, section "ท่อนขึ้น", two bars of 4 attack notes each = 8 slots
      stanzas: [
        {
          id: 'A',
          lines: [[{ type: 'section', name: 'ท่อนขึ้น' }, { type: 'segment', chord: 'C', note: '1 2 3 4' }, { type: 'bar' }, { type: 'segment', chord: 'G', note: '5 6 7 1' }]],
        },
      ],
      arrangement: [
        { stanza: 'A', label: 'ร้อง 1', syllables: ['สรร', 'เส', 'ริญ', 'พระ', 'เจ้า', 'ผู้', 'ทรง', 'ฤทธิ์'] },
      ],
    },
  }
  function mountWorded() {
    return mount(EditorMode, {
      props: { song: WORDED, tier: 'approver', active: true },
      attachTo: document.body,
      global: { stubs: { Icon: true, 'router-link': true, StudioDock: true, ComboSelect: true } }, // SongSheet REAL
    })
  }

  it('B050: ดูผลทั้งเพลง shows the selected verse words, not notes alone', async () => {
    const w = mountWorded()
    await nextTick()
    await w.find('.ed-chip').trigger('click') // flip whole song to render
    await nextTick()
    const syls = w.findAll('.ed-bar-render .syl').map((s) => s.text())
    // every syllable of ร้อง 1 lands under a note (8 words across the two bars)
    expect(syls).toEqual(['สรร', 'เส', 'ริญ', 'พระ', 'เจ้า', 'ผู้', 'ทรง', 'ฤทธิ์'])
  })

  it('B051: the section head shows once per line, not on every bar', async () => {
    const w = mountWorded()
    await nextTick()
    await w.find('.ed-chip').trigger('click')
    await nextTick()
    const heads = w.findAll('.ed-bar-render .section-label')
    expect(heads.length).toBe(1) // two bars, but "♦ ท่อนขึ้น" appears only on the first
    expect(heads[0].text()).toContain('ท่อนขึ้น')
  })

  it('B049/E4: ลำดับเพลง keeps arrangement rows but drops the per-row lyric textarea', async () => {
    const w = mountEd()
    await nextTick()
    // arrangement rows stay (stanza select + reorder ▲▼ + ✎ select + ✕) so multi-verse
    // songs are still buildable — E4 only removes the redundant lyric entry, not the section
    expect(w.findAll('.arr-row').length).toBe(2)
    // ...but NO per-row lyric textarea inside a row anymore
    expect(w.findAll('.arr-row textarea').length).toBe(0)
    // lyric entry still available via the collapsible "แก้เนื้อแบบย่อหน้า (ข้อที่เลือก)" panel
    const paraBtn = w.findAll('button').find((b) => b.text().includes('แก้เนื้อแบบย่อหน้า'))
    expect(paraBtn).toBeTruthy()
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

  // B056 — "จบเพลง" (final barline, for songs with no repeat) is lifted OUT of the buried
  // ⋯ menu into a visible per-line toggle in each line's head.
  it('B056: each line head shows a visible จบเพลง toggle (no menu needed)', async () => {
    const w = mountEd()
    await nextTick()
    const toggles = w.findAll('.ed-line-end')
    expect(toggles.length).toBe(1) // one per line
    expect(toggles[0].text()).toContain('จบเพลง')
    expect(toggles[0].attributes('aria-pressed')).toBe('false') // off by default
  })

  it('B056: toggling จบเพลง sets a plain end marker (final barline, no repeat) and round-trips', async () => {
    const w = mountEd()
    await nextTick()
    await w.find('.ed-line-end').trigger('click')
    await nextTick()
    expect(w.find('.ed-line-end').attributes('aria-pressed')).toBe('true')
    const items = w.emitted('change').at(-1)[0].content.stanzas[0].lines[0]
    expect(items.some((it) => it.type === 'end')).toBe(true)
    // plain song-end must NOT imply a repeat/volta
    expect(items.some((it) => it.type === 'volta' || it.type === 'repeat-start' || it.type === 'repeat-end')).toBe(false)
  })

  it('B056: the จบเพลง checkbox is gone from the ⋯ line menu', async () => {
    const w = mountEd()
    await nextTick()
    await w.find('button[aria-label="เพิ่มเติม"]').trigger('click')
    await nextTick()
    const menu = w.find('.ed-more-menu')
    expect(menu.exists()).toBe(true)
    expect(menu.text()).not.toContain('จบเพลง')
  })
})
