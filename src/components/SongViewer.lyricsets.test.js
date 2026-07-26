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
    expect(tabs[0].text()).toBe('ทำนอง ๑')
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

  it('back-compat: label-only sets (song 717 as it sits in the DB today) read as before', () => {
    const w = mountSong(withSets([{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๒' }]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual(['ทำนอง ๑', 'ทำนอง ๒'])
  })

  it('back-compat: no name AND no label falls back to the positional ทำนอง ๑/๒', () => {
    const w = mountSong(withSets([{}, {}]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual(['ทำนอง ๑', 'ทำนอง ๒'])
  })

  it('a blank/whitespace name does not blank the tab — it falls back', () => {
    const w = mountSong(withSets([{ name: '   ', label: 'ทำนอง ๑' }, { name: '' }]))
    expect(w.findAll('.lset-tab').map((t) => t.text())).toEqual(['ทำนอง ๑', 'ทำนอง ๒'])
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

  it('back-compat: an ordinary song’s print heading is untouched (no set suffix, no tabpanel)', () => {
    const w = mountSong(plainSong)
    expect(w.findComponent(SongViewer).vm.printTitle).toBe('1. เพลงปกติ')
    expect(w.find('#lset-panel').exists()).toBe(false)
  })
})
