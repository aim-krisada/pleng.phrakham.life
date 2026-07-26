// 717 multi-lyric on /v2 — the viewer switches WORD SETS under one shared melody, and (the
// important half) leaves every EXISTING song untouched. Back-compat is asserted with a song
// fixture that declares NO lyricSets: no tabs, identical words, untouched print heading.
// Also covers the tab filter (set N shows only its rows) and the SHARED entry (no `set`)
// appearing in every set.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../lib/midi.js', () => ({
  playSong: vi.fn(() => new Promise(() => {})),
  playEnsemble: vi.fn(() => new Promise(() => {})),
  stopPlayback: () => {},
  setTranspose: vi.fn(),
  keyTranspose: () => 0,
  songToNotes: () => [],
  buildPlayNotes: () => [],
  effectiveOrder: () => undefined,
  TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }],
}))
window.matchMedia = window.matchMedia || (() => ({ matches: false }))
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'

const Harness = {
  components: { SongViewer },
  props: { song: { type: Object, required: true } },
  template: `<div><SongViewer :song="song" tier="guest" /></div>`,
}
const mountSong = (song) => mount(Harness, { props: { song } })

// an ORDINARY song (v2 shape, NO lyricSets) — the 100+ existing library
const plainSong = {
  number: 1,
  title_th: 'เพลงปกติ',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['กา', 'ขา'] }],
  },
}
// a 717 song: one melody (A) + a shared refrain (B), two word sets, and B shared across both
const twoSetSong = {
  number: 717,
  title_th: '717',
  content: {
    version: 2, key: 'C', timeSignature: '4/4',
    lyricSets: [{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๒' }],
    stanzas: [
      { id: 'A', lines: [[{ type: 'segment', note: '1 2', chord: 'C' }]] },
      { id: 'B', lines: [[{ type: 'segment', note: '3', chord: 'G' }]] },
    ],
    arrangement: [
      { stanza: 'A', set: 0, syllables: ['เนื้อหนึ่งเอ', 'เนื้อหนึ่งบี'] },
      { stanza: 'A', set: 1, syllables: ['เนื้อสองเอ', 'เนื้อสองบี'] },
      { stanza: 'B', syllables: ['รับรวม'] }, // no `set` → shared in every set
    ],
  },
}

describe('SongViewer /v2 — 717 lyric sets + back-compat', () => {
  it('back-compat: a song with NO lyricSets shows no tabs and renders its words', () => {
    const w = mountSong(plainSong)
    expect(w.find('.lyric-set-tabs').exists()).toBe(false)
    expect(w.text()).toContain('กา')
    expect(w.text()).toContain('ขา')
  })

  it('a song declaring 1 set (edge) still shows no tabs', () => {
    const one = { ...twoSetSong, content: { ...twoSetSong.content, lyricSets: [{ label: 'ทำนอง ๑' }] } }
    expect(mountSong(one).find('.lyric-set-tabs').exists()).toBe(false)
  })

  it('a 717 song (>1 set) shows one tab per set, first active', () => {
    const w = mountSong(twoSetSong)
    const tabs = w.findAll('.lset-tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].text()).toBe('ทำนอง 1')
    expect(tabs[0].classes()).toContain('active')
  })

  it('THE BUG: /v2 no longer stacks the other set’s words on as a further ข้อ', async () => {
    const w = mountSong(twoSetSong)
    expect(w.text()).toContain('เนื้อหนึ่งเอ')
    expect(w.text()).not.toContain('เนื้อสองเอ')
    // this song has 3 arrangement entries; each SET shows 2 of them (its verse + the shared
    // refrain), so the auto numbering stops at ข้อ 2. Stacking both sets — the /v2 bug — put
    // the other set's words on the same sheet as a third ข้อ.
    expect(w.text()).toContain('ข้อ 2')
    expect(w.text()).not.toContain('ข้อ 3')
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(w.text()).not.toContain('ข้อ 3')
  })

  it('the active set filters words; the shared (no-set) entry shows in BOTH sets', async () => {
    const w = mountSong(twoSetSong)
    expect(w.text()).toContain('รับรวม')
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(w.text()).toContain('เนื้อสองเอ')
    expect(w.text()).toContain('รับรวม') // shared refrain still there
    expect(w.text()).not.toContain('เนื้อหนึ่งเอ')
  })
})

// ---- set NAMES (P'Aim: "different words must have different names") ----------------------
// Two sets of words are two different songs to whoever sings them, so each set carries its
// own name.
const SET1 = 'เนื้อร้องชุดที่หนึ่งของเพลงนี้'
const SET2 = 'เนื้อร้องชุดที่สองของเพลงนี้'
const withSets = (lyricSets) => ({
  ...twoSetSong,
  content: { ...twoSetSong.content, lyricSets },
})

describe('SongViewer /v2 — lyric-set names', () => {
  it('shows each set’s own `name` on its tab', () => {
    // the merge SQL writes name AND label with the same value
    const w = mountSong(withSets([{ name: SET1, label: SET1 }, { name: SET2, label: SET2 }]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual([SET1, SET2])
  })

  it('`name` wins over `label` when they disagree', () => {
    const w = mountSong(withSets([{ name: SET1, label: 'ทำนอง ๑' }, { name: SET2, label: 'ทำนอง ๒' }]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual([SET1, SET2])
  })

  it('back-compat: label-only sets (song 717 as it sits in the DB today) read — in arabic', () => {
    const w = mountSong(withSets([{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๒' }]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual(['ทำนอง 1', 'ทำนอง 2'])
  })

  it('back-compat: no name AND no label falls back to the positional ทำนอง 1/2', () => {
    const w = mountSong(withSets([{}, {}]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual(['ทำนอง 1', 'ทำนอง 2'])
  })

  it('a blank/whitespace name does not blank the tab — it falls back', () => {
    const w = mountSong(withSets([{ name: '   ', label: 'ทำนอง ๑' }, { name: '' }]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual(['ทำนอง 1', 'ทำนอง 2'])
  })

  it('no Thai numeral reaches the tabs — the app numbers everything else in arabic', () => {
    const w = mountSong(withSets([{}, {}, {}]))
    expect(w.find('.lyric-set-wrap').text()).not.toMatch(/[๐-๙]/)
  })

  it('tabs are a proper ARIA tablist: selected state, roving tabindex, panel link', () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const tabs = w.findAll('.lset-tab')
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[1].attributes('aria-selected')).toBe('false')
    expect(tabs[0].attributes('tabindex')).toBe('0')
    expect(tabs[1].attributes('tabindex')).toBe('-1') // roving: only the active tab is tabbable
    const panel = w.find('#lset-panel')
    expect(panel.attributes('role')).toBe('tabpanel')
    expect(tabs[0].attributes('aria-controls')).toBe('lset-panel')
    expect(panel.attributes('aria-labelledby')).toBe(tabs[0].attributes('id'))
    expect(w.find('.lyric-set-tabs').attributes('aria-label')).toBe('เลือกเนื้อร้อง')
  })

  it('a live region announces which set is showing', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const live = w.find('[aria-live="polite"]')
    expect(live.text()).toContain(SET1)
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(w.find('[aria-live="polite"]').text()).toContain(SET2)
  })

  it('← → Home End move between tabs (keyboard, no pointer)', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const list = w.find('.lyric-set-tabs')
    await list.trigger('keydown', { key: 'ArrowRight' })
    expect(w.findAll('.lset-tab')[1].attributes('aria-selected')).toBe('true')
    await list.trigger('keydown', { key: 'ArrowRight' }) // wraps back to the first
    expect(w.findAll('.lset-tab')[0].attributes('aria-selected')).toBe('true')
    await list.trigger('keydown', { key: 'End' })
    expect(w.findAll('.lset-tab')[1].attributes('aria-selected')).toBe('true')
    await list.trigger('keydown', { key: 'Home' })
    expect(w.findAll('.lset-tab')[0].attributes('aria-selected')).toBe('true')
  })

  it('the print heading names the set being printed (print = the selected set only)', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const viewer = w.findComponent(SongViewer)
    expect(viewer.vm.printTitle).toBe('717. 717 — ' + SET1)
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(viewer.vm.printTitle).toBe('717. 717 — ' + SET2)
  })

  // ---- hostile state (adversarial review, 26 ก.ค.) ----
  it('a set disappearing without the song id changing does not leave a dangling tab', async () => {
    // the id watcher can't see this: the same song object comes back with one set deleted.
    const three = withSets([{ name: 'ก' }, { name: 'ข' }, { name: 'ค' }])
    const w = mountSong(three)
    await w.findAll('.lset-tab')[2].trigger('click')
    await nextTick()
    expect(w.findAll('.lset-tab')[2].attributes('aria-selected')).toBe('true')
    // now the third set is gone, same id
    await w.setProps({ song: { ...three, content: { ...three.content, lyricSets: [{ name: 'ก' }, { name: 'ข' }] } } })
    await nextTick()
    const tabs = w.findAll('.lset-tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].attributes('aria-selected')).toBe('true') // clamped back, not "nothing selected"
    // …and the panel names a tab that actually exists
    expect(w.find('#lset-panel').attributes('aria-labelledby')).toBe(tabs[0].attributes('id'))
  })

  it('the play-order breadcrumb numbers ท่อน by position on THIS sheet, not by raw index', () => {
    // set 1's only verse is arrangement[1]; it is ท่อน 1 of that set, not ท่อน 2.
    const jumpy = {
      number: 717, title_th: '717',
      content: {
        version: 2, key: 'C', timeSignature: '4/4',
        lyricSets: [{ name: SET1 }, { name: SET2 }],
        stanzas: [{ id: 'A', lines: [[
          { type: 'segment', note: '1 2', chord: 'C' },
          { type: 'jump', kind: 'segno' }, { type: 'jump', kind: 'dc' },
        ]] }],
        arrangement: [
          { stanza: 'A', set: 0, syllables: ['ก1', 'ก2'] },
          { stanza: 'A', set: 1, syllables: ['ข1', 'ข2'] },
        ],
      },
    }
    const w = mountSong(jumpy)
    const vm = w.findComponent(SongViewer).vm
    expect(vm.playOrderCrumbs.every((c) => c === 'ท่อน 1')).toBe(true)
  })

  it('the tabpanel is reachable by keyboard when it holds no focusable content (WAI-ARIA APG)', () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    expect(w.find('#lset-panel').attributes('tabindex')).toBe('0')
    // an ordinary song is not a tabpanel at all, so it gains no tab stop
    expect(mountSong(plainSong).find('.sheet-scale').attributes('tabindex')).toBeUndefined()
  })

  it('back-compat: an ordinary song’s print heading is untouched (no set suffix, no tabpanel)', () => {
    const w = mountSong(plainSong)
    expect(w.findComponent(SongViewer).vm.printTitle).toBe('1. เพลงปกติ')
    expect(w.find('#lset-panel').exists()).toBe(false)
  })
})

// ---- the switcher folds away (P'Aim, 26 ก.ค. — "accordion, ยุบได้ เพราะไม่ได้ใช้บ่อย") ----
// Collapsed by default, but the summary must still SAY which words are on the sheet: folding
// the tabs away must not fold away the answer to "what am I singing?".
const setBadgeHarness = {
  components: { SongViewer },
  props: { song: { type: Object, required: true }, setBadge: { type: Boolean, default: true } },
  template: `<div><SongViewer :song="song" :set-badge="setBadge" tier="guest" /></div>`,
}
const mountVariant = (song, setBadge) => mount(setBadgeHarness, { props: { song, setBadge } })

describe('SongViewer /v2 — the lyric-set switcher is a collapsed disclosure', () => {
  it('starts collapsed, and the summary names the set on the sheet', () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const sum = w.find('.lset-summary')
    expect(sum.exists()).toBe(true)
    expect(sum.attributes('aria-expanded')).toBe('false')
    expect(sum.text()).toContain(SET1) // the singer still knows WHICH words these are
    expect(w.find('.lyric-set-tabs').attributes('style')).toContain('display: none')
  })

  it('the summary opens and closes the tabs, and says so to a screen reader', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const sum = w.find('.lset-summary')
    expect(sum.attributes('aria-controls')).toBe('lset-tabs')
    expect(w.find('#lset-tabs').exists()).toBe(true)
    await sum.trigger('click')
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('true')
    expect(w.find('.lyric-set-tabs').attributes('style') || '').not.toContain('display: none')
    await w.find('.lset-summary').trigger('click')
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('false')
  })

  it('picking a set applies it, folds the panel back and re-labels the summary', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    await w.find('.lset-summary').trigger('click')
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    const sum = w.find('.lset-summary')
    expect(sum.attributes('aria-expanded')).toBe('false') // a choice closes the chooser
    expect(sum.text()).toContain(SET2)
    expect(w.text()).toContain('เนื้อสองเอ') // and the WORDS actually changed
    expect(w.text()).not.toContain('เนื้อหนึ่งเอ')
  })

  it('arrow keys browse without the panel shutting; Esc closes without changing the set', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    await w.find('.lset-summary').trigger('click')
    const list = w.find('.lyric-set-tabs')
    await list.trigger('keydown', { key: 'ArrowRight' })
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('true') // still browsable
    expect(w.findAll('.lset-tab')[1].attributes('aria-selected')).toBe('true')
    await list.trigger('keydown', { key: 'Escape' })
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('false')
    expect(w.findAll('.lset-tab')[1].attributes('aria-selected')).toBe('true') // Esc ≠ undo
  })

  it('variant B shows the set count; variant A does not (P’Aim picks)', () => {
    const b = mountVariant(withSets([{ name: SET1 }, { name: SET2 }]), true)
    expect(b.find('.lset-count').exists()).toBe(true)
    expect(b.find('.lset-count').text()).toBe('2 ชุด')
    const a = mountVariant(withSets([{ name: SET1 }, { name: SET2 }]), false)
    expect(a.find('.lset-count').exists()).toBe(false)
    expect(a.find('.lset-summary').text()).toContain(SET1) // A still names the set
  })

  it('back-compat: an ordinary song gets no summary at all', () => {
    expect(mountSong(plainSong).find('.lset-summary').exists()).toBe(false)
  })
})
