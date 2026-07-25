// issue9 lead-sheet header (DISPLAY only, spec docs/ds/song-lead-sheet-header.md): the song
// title moves onto its own full <h1> line above the sheet + a Key · Time · Tempo meta strip in
// the international lead-sheet order. Drives the REAL SongViewer. Asserts: title <h1>, meta
// order/values, honest omission of a missing bpm/timeSignature (NO fallback-92), the
// transposed-key indicator, the title_en subtitle, and that scripture still renders below.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('../lib/midi.js', () => ({
  playSong: vi.fn(() => new Promise(() => {})),
  playEnsemble: vi.fn(() => new Promise(() => {})),
  stopPlayback: () => {},
  setTranspose: () => {},
  keyTranspose: () => 0,
  songToNotes: () => [],
  buildPlayNotes: () => [],
  effectiveOrder: () => undefined,
  TEMPO_MARKS: [{ value: 92, label: 'Andante ♩=92' }],
}))
vi.mock('../lib/jsonIO.js', () => ({ downloadSong: vi.fn(), importSong: vi.fn() }))

window.matchMedia = window.matchMedia || (() => ({ matches: false }))
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || function () {}

import SongViewer from './SongViewer.vue'

// base v2 song — key E; caller overrides content bits per case.
const makeSong = (over = {}, contentOver = {}) => ({
  number: 1,
  title_th: 'พระเจ้าเป็นความรัก',
  content: {
    version: 2,
    key: 'E',
    timeSignature: '4/4',
    bpm: 102,
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1', chord: 'E' }]] }],
    arrangement: [{ stanza: 'A', label: '', syllables: ['ก'] }],
    ...contentOver,
  },
  ...over,
})
const mountViewer = (props = {}) =>
  mount(SongViewer, { props: { song: makeSong(), tier: 'guest', ...props } })

describe('issue9 — lead-sheet header', () => {
  it('renders the full song title as an <h1> above the sheet (never truncated)', () => {
    const h1 = mountViewer().find('.lead-header h1.lead-title')
    expect(h1.exists()).toBe(true)
    expect(h1.text()).toBe('1. พระเจ้าเป็นความรัก')
  })

  it('meta strip shows Key · Time · Tempo, in that order, with the notated tempo mark', () => {
    const w = mountViewer()
    expect(w.find('.lm-key').text()).toBe('E')
    expect(w.find('.lm-time').text()).toBe('4/4')
    expect(w.find('.lm-tempo').text()).toBe('♩ = 102')
    // DOM order = key, time, tempo
    const items = w.findAll('.lead-meta .lm-item')
    expect(items).toHaveLength(3)
  })

  it('omits the tempo item entirely when bpm is null (no fallback-92)', () => {
    const w = mountViewer({ song: makeSong({}, { bpm: null }) })
    expect(w.find('.lm-tempo').exists()).toBe(false)
    expect(w.text()).not.toContain('♩')
    expect(w.findAll('.lead-meta .lm-item')).toHaveLength(2) // key + time
  })

  it('omits the tempo item when bpm is 0 or absent', () => {
    expect(mountViewer({ song: makeSong({}, { bpm: 0 }) }).find('.lm-tempo').exists()).toBe(false)
    const noBpm = makeSong()
    delete noBpm.content.bpm
    expect(mountViewer({ song: noBpm }).find('.lm-tempo').exists()).toBe(false)
  })

  it('omits the time item when timeSignature is empty/absent (no invented 4/4)', () => {
    const w = mountViewer({ song: makeSong({}, { timeSignature: '' }) })
    expect(w.find('.lm-time').exists()).toBe(false)
    expect(w.findAll('.lead-meta .lm-item')).toHaveLength(2) // key + tempo
  })

  it('not transposed → shows only the current key, no original indicator', () => {
    const w = mountViewer() // displayKey defaults to content.key (E)
    expect(w.find('.lm-key').text()).toBe('E')
    expect(w.find('.lm-orig').exists()).toBe(false)
  })

  it('transposed (reader shifted key) → current key prominent + "ต้นฉบับ <orig>" muted', () => {
    const w = mountViewer({ startKey: 'G' }) // reader opened at G; original is E
    expect(w.find('.lm-key').text()).toBe('G')
    const orig = w.find('.lm-orig')
    expect(orig.exists()).toBe(true)
    expect(orig.text()).toContain('ต้นฉบับ')
    expect(orig.text()).toContain('E')
  })

  it('shows the English subtitle only when title_en is present', () => {
    expect(mountViewer().find('.lead-subtitle').exists()).toBe(false)
    const w = mountViewer({ song: makeSong({ title_en: 'God Is Love' }) })
    expect(w.find('.lead-subtitle').text()).toBe('God Is Love')
  })

  it('scripture still renders (in .song-refs) below the header', () => {
    const w = mountViewer({ song: makeSong({ scripture: 'บพส.23:2' }) })
    const refs = w.find('.song-refs')
    expect(refs.exists()).toBe(true)
    expect(refs.text()).toContain('บพส.23:2')
  })
})
