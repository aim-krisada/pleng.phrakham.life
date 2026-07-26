// 717 multi-lyric — the viewer switches WORD SETS under one shared melody, and (the important
// half) leaves every EXISTING song untouched. Back-compat is asserted with real song fixtures
// that declare NO lyricSets: they must render with no tabs and identical words. Also covers the
// tab filter (set N shows only its rows) and the SHARED entry (no `set`) appearing in every set.
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

describe('SongViewer — 717 lyric sets + back-compat', () => {
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

  it('the active set filters words; the shared (no-set) entry shows in BOTH sets', async () => {
    const w = mountSong(twoSetSong)
    // set 0 active: set-0 words + shared, NOT set-1 words
    expect(w.text()).toContain('เนื้อหนึ่งเอ')
    expect(w.text()).toContain('รับรวม')
    expect(w.text()).not.toContain('เนื้อสองเอ')
    // switch to set 1
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(w.text()).toContain('เนื้อสองเอ')
    expect(w.text()).toContain('รับรวม') // shared refrain still there
    expect(w.text()).not.toContain('เนื้อหนึ่งเอ')
  })
})

// ---- set NAMES (P'Aim: "different words must have different names") ----------------------
// Two sets of words are two different songs to whoever sings them, so each set carries its
// own name. The real names from song 717 are used so a failure reads as the actual bug.
const SET1 = 'บรรดาคนบาป เชิญท่านเข้ามา'
const SET2 = 'ผู้ที่ถูกบาปทำร้ายจงมา'
const withSets = (lyricSets) => ({
  ...twoSetSong,
  content: { ...twoSetSong.content, lyricSets },
})

describe('SongViewer — lyric-set names', () => {
  it('shows each set’s own `name` on its tab', () => {
    // the merge SQL writes name AND label with the same value
    const w = mountSong(withSets([{ name: SET1, label: SET1 }, { name: SET2, label: SET2 }]))
    const tabs = w.findAll('.lset-tab')
    expect(tabs[0].text()).toBe(SET1)
    expect(tabs[1].text()).toBe(SET2)
  })

  it('`name` wins over `label` when they disagree', () => {
    const w = mountSong(withSets([{ name: SET1, label: 'ทำนอง ๑' }, { name: SET2, label: 'ทำนอง ๒' }]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual([SET1, SET2])
  })

  it('back-compat: label-only sets (every 717 song saved so far) still read — in arabic', () => {
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

  it('tabs are a proper ARIA tablist: selected state, roving tabindex, panel link', async () => {
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
    const viewer = w.findComponent({ name: 'SongViewer' })
    expect(viewer.vm.printTitle).toBe('717. 717 — ' + SET1)
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(viewer.vm.printTitle).toBe('717. 717 — ' + SET2)
  })

  it('back-compat: an ordinary song’s print heading is untouched (no set suffix, no tabpanel)', () => {
    const w = mountSong(plainSong)
    expect(w.findComponent({ name: 'SongViewer' }).vm.printTitle).toBe('1. เพลงปกติ')
    expect(w.find('#lset-panel').exists()).toBe(false)
  })
})

// ---- the switcher folds away (P'Aim, 26 ก.ค. — "accordion, ยุบได้ เพราะไม่ได้ใช้บ่อย") ----
// Collapsed by default, but the summary must still SAY which words are on the sheet: folding
// the tabs away must not fold away the answer to "what am I singing?".
describe('SongViewer — the lyric-set switcher is a collapsed disclosure', () => {
  it('starts collapsed, and the summary names the set on the sheet', () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const sum = w.find('.lset-summary')
    expect(sum.exists()).toBe(true)
    expect(sum.attributes('aria-expanded')).toBe('false')
    expect(sum.text()).toContain(SET1) // the singer still knows WHICH words these are
    // the tabs are in the DOM (v-show) but hidden
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

  it('the live region announces the set that is now on the sheet', async () => {
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    const live = w.find('[aria-live="polite"]')
    expect(live.text()).toContain(SET1)
    await w.find('.lset-summary').trigger('click')
    await w.findAll('.lset-tab')[1].trigger('click')
    await nextTick()
    expect(w.find('[aria-live="polite"]').text()).toContain(SET2)
  })

  it('the collapsed summary always carries the COUNT (P’Aim, 26 ก.ค.)', () => {
    // progressive disclosure: you must be able to learn this song has other words WITHOUT
    // opening anything — a switcher that folds away silently would hide the whole feature.
    const w = mountSong(withSets([{ name: SET1 }, { name: SET2 }]))
    expect(w.find('.lset-count').text()).toBe('2 ชุด')
    expect(w.find('.lset-summary').attributes('aria-expanded')).toBe('false')
    const three = mountSong(withSets([{ name: SET1 }, { name: SET2 }, { name: 'ค' }]))
    expect(three.find('.lset-count').text()).toBe('3 ชุด')
  })

  it('back-compat: an ordinary song gets no summary at all', () => {
    expect(mountSong(plainSong).find('.lset-summary').exists()).toBe(false)
  })
})
