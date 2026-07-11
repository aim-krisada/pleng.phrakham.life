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
    // breadcrumb is a position label, not a menu (melody label = "ทำนอง A" — editor-section-ux)
    expect(w.find('.ed-crumb').text()).toContain('ทำนอง A')
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

  const findChip = (w, text) => w.findAll('.ed-chip').find((b) => b.text().includes(text))

  it('B (editor-preview-split): "ดูผลทั้งเพลง" opens a NON-MODAL floating window; editing stays; toggles closed', async () => {
    const w = mountEd()
    await nextTick()
    const btn = () => findChip(w, 'ดูผลทั้งเพลง')
    expect(btn()).toBeTruthy()
    expect(w.find('.ed-float').exists()).toBe(false) // closed by default
    expect(w.findAll('.seg-strip').length).toBe(2) // two bars, editable
    await btn().trigger('click')
    expect(w.find('.ed-float').exists()).toBe(true) // window opened
    expect(w.findAll('.seg-strip').length).toBe(2) // still editable underneath (non-modal, no backdrop)
    expect(btn().attributes('aria-pressed')).toBe('true')
    expect(w.find('.ed-float-x').exists()).toBe(true) // has a close control
    await btn().trigger('click')
    expect(w.find('.ed-float').exists()).toBe(false) // toggled closed
  })

  it('B (editor-preview-refine): the floating window carries a bottom-right resize handle', async () => {
    const w = mountEd()
    await nextTick()
    expect(w.find('.ed-float-resize').exists()).toBe(false) // no window, no handle
    await findChip(w, 'ดูผลทั้งเพลง').trigger('click')
    expect(w.find('.ed-float-resize').exists()).toBe(true) // desktop window offers resize
  })

  it('B (editor-preview-refine): dragging the handle sets an explicit size, floored at the minimum', async () => {
    const w = mountEd()
    await nextTick()
    await findChip(w, 'ดูผลทั้งเพลง').trigger('click')
    const handle = w.find('.ed-float-resize')
    const float = () => w.find('.ed-float')
    // grab, then drag out by +500 / +400 → explicit width/height style appears (default is CSS-only)
    await handle.trigger('pointerdown', { clientX: 400, clientY: 300, pointerId: 1 })
    await handle.trigger('pointermove', { clientX: 900, clientY: 700, pointerId: 1 })
    let style = float().attributes('style') || ''
    expect(style).toMatch(/width:\s*\d+px/)
    expect(style).toMatch(/height:\s*\d+px/)
    // now drag far past the top-left (huge negative delta) → floored at FLOAT_MIN_W/H (280×200)
    await handle.trigger('pointermove', { clientX: -5000, clientY: -5000, pointerId: 1 })
    style = float().attributes('style') || ''
    expect(style).toContain('width: 280px')
    expect(style).toContain('height: 200px')
    // drag far beyond the screen → capped at the viewport (jsdom 1024×768, pinned at 0,0, −4 gutter)
    await handle.trigger('pointermove', { clientX: 5000, clientY: 5000, pointerId: 1 })
    style = float().attributes('style') || ''
    expect(style).toContain('width: 1020px') // innerWidth 1024 − 4
    expect(style).toContain('height: 764px') // innerHeight 768 − 4
    await handle.trigger('pointerup', { pointerId: 1 })
  })

  it('A (editor-preview-refine): live "ตัวอย่างสด" preview renders PER BAR, IN PLACE (above each ห้อง)', async () => {
    const w = mountWorded() // real SongSheet
    await nextTick()
    // livePreview is on by default; each ห้อง carries its own preview above its edit boxes — the
    // worded line has 2 bars → 2 in-place previews (no shared line-head strip anymore).
    expect(w.find('.ed-line-live').exists()).toBe(false) // old whole-line strip is gone
    const previews = w.findAll('.ed-bar-live')
    expect(previews.length).toBe(2)
    // each preview sits inside its own .ed-bar (in place, not a separate strip)
    expect(previews.every((p) => p.element.closest('.ed-bar'))).toBe(true)
    // section head shows once (on the first bar's preview only), not stamped on every ห้อง (B051)
    expect(w.findAll('.ed-bar-live .section-label').length).toBe(1)
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

  it('B050: the floating ดูผลทั้งเพลง window shows the selected verse words, not notes alone', async () => {
    const w = mountWorded()
    await nextTick()
    await findChip(w, 'ดูผลทั้งเพลง').trigger('click') // open floating window
    await nextTick()
    const syls = w.findAll('.ed-float .syl').map((s) => s.text())
    // every syllable of ร้อง 1 lands under a note (8 words across the two bars)
    expect(syls).toEqual(['สรร', 'เส', 'ริญ', 'พระ', 'เจ้า', 'ผู้', 'ทรง', 'ฤทธิ์'])
  })

  it('B051: the section head shows once per line in the floating window', async () => {
    const w = mountWorded()
    await nextTick()
    await findChip(w, 'ดูผลทั้งเพลง').trigger('click')
    await nextTick()
    // the full arranged sheet also shows the verse label ("ร้อง 1"); the LINE's own section
    // head ("ท่อนขึ้น") must still appear once per line, never stamped per bar (B051 intent).
    const stanzaHeads = w.findAll('.ed-float .section-label').map((h) => h.text()).filter((t) => t.includes('ท่อนขึ้น'))
    expect(stanzaHeads.length).toBe(1)
  })

  it('editor-section-ux (B049/E4): "โครงเพลง" lists ท่อน rows; the bottom ลำดับเพลง block is cut; para editor stays', async () => {
    const w = mountEd()
    await nextTick()
    // the single "โครงเพลง" rail list holds one row per ท่อน (arrangement row) — a multi-verse
    // song is still buildable, with reorder controls on each row
    expect(w.findAll('.srow').length).toBe(2)
    expect(w.findAll('.srow .updown').length).toBe(2)
    // the old bottom "📜 ลำดับเพลง" block (.arr-row) is gone (moved to the rail + canvas header)
    expect(w.findAll('.arr-row').length).toBe(0)
    // lyric entry still available via the collapsible "แก้เนื้อแบบย่อหน้า (ข้อที่เลือก)" panel
    const paraBtn = w.findAll('button').find((b) => b.text().includes('แก้เนื้อแบบย่อหน้า'))
    expect(paraBtn).toBeTruthy()
  })

  it('editor-section-ux (B032): each ท่อน row offers a delete, and it removes the ท่อน', async () => {
    const w = mountEd()
    await nextTick()
    expect(w.findAll('.srow').length).toBe(2)
    const del = w.find('.srow-del')
    expect(del.exists()).toBe(true)
    await del.trigger('click')
    expect(w.findAll('.srow').length).toBe(1)
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
