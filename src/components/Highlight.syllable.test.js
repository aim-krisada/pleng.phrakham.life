// B006 / US-H1 — per-syllable follow-along highlight.
// The whole feature rests on ONE invariant: the syllable-slot index midi.js stamps on
// each played attack (`syk`) points at the same per-syllable span SongSheet renders and
// the same NoteRow digit. These tests pin that alignment, then the render + tap-to-jump.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { songToNotes } from '../lib/midi.js'
import { resolveContent } from '../lib/songModel.js'
import SongSheet from './SongSheet.vue'

// helper: the syk sequence of the notes that actually sound (drop rests / held)
const syks = (notes) => notes.filter((n) => n.midi != null).map((n) => n.syk)

describe('midi.js — syllable-slot index per attack (the alignment invariant)', () => {
  it('a 4-attack segment stamps slots 0,1,2,3 in order', () => {
    const notes = songToNotes({ key: 'C', lines: [[{ type: 'segment', note: '5 5 4 3' }]] })
    expect(syks(notes)).toEqual([0, 1, 2, 3])
  })

  it("a '-' extension keeps its slot but no word: slots jump past the held box", () => {
    // note 1 (slot 0) is held by '-' (slot 1); note 2 is slot 2
    const notes = songToNotes({ key: 'C', lines: [[{ type: 'segment', note: '1 - 2' }]] })
    expect(syks(notes)).toEqual([0, 2])
  })

  it('a rest takes a slot and no syllable; the next attack is the following slot', () => {
    const notes = songToNotes({ key: 'C', lines: [[{ type: 'segment', note: '0 3' }]] })
    // the rest (midi null) carries no syk; the sung note is slot 1
    expect(notes.map((n) => n.syk)).toEqual([undefined, 1])
    expect(syks(notes)).toEqual([1])
  })

  it('a melisma (same-pitch slur) folds to one sound but the held note keeps its blank slot', () => {
    const notes = songToNotes({ key: 'C', lines: [[{ type: 'segment', note: '(3 3) 2' }]] })
    // one sound for the slur (slot 0), the 2nd 3 folds (blank slot 1), then note 2 (slot 2)
    expect(syks(notes)).toEqual([0, 2])
  })

  it('the slot resets per segment so each segment addresses its own words', () => {
    const notes = songToNotes({
      key: 'C',
      lines: [[{ type: 'segment', note: '1 2' }, { type: 'bar' }, { type: 'segment', note: '3 4' }]],
    })
    expect(notes.map((n) => ({ si: n.si, syk: n.syk }))).toEqual([
      { si: 0, syk: 0 }, { si: 0, syk: 1 }, { si: 1, syk: 0 }, { si: 1, syk: 1 },
    ])
  })
})

describe('songModel.resolveContent — v2 segments carry the raw syllable slots', () => {
  const v2 = {
    version: 2,
    key: 'C',
    stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 - 2 3' }]] }],
    // 4 note boxes → 4 slots; the '-' held box is an intentionally blank slot
    arrangement: [{ stanza: 'A', label: '', syllables: ['พระ', '', 'เจ้า', 'รัก'] }],
  }
  it('attaches a syllables[] array (blanks kept) aligned to the note boxes', () => {
    const lines = resolveContent(v2)
    const seg = lines[0].find((it) => it.type === 'segment')
    expect(seg.syllables).toEqual(['พระ', '', 'เจ้า', 'รัก'])
  })
  it('midi slots index straight into that array', () => {
    const lines = resolveContent(v2)
    const seg = lines[0].find((it) => it.type === 'segment')
    const sung = songToNotes({ key: 'C', lines }).filter((n) => n.midi != null)
    // every sung note points at a real (non-blank) word via its syk
    expect(sung.map((n) => seg.syllables[n.syk])).toEqual(['พระ', 'เจ้า', 'รัก'])
  })
})

describe('SongSheet — per-syllable render, highlight and tap-to-jump', () => {
  // a v2-resolved line: one segment, 3 syllable-bearing notes
  const content = {
    key: 'C',
    lines: [[{ type: 'segment', chord: 'C', note: '1 2 3', lyric: 'ก ข ค', syllables: ['ก', 'ข', 'ค'] }]],
  }
  const mountSheet = (props = {}) =>
    mount(SongSheet, { props: { content, mode: 'full', interactive: true, ...props } })

  it('renders one .syl span per syllable-bearing note', () => {
    const w = mountSheet()
    expect(w.findAll('.syl').map((s) => s.text())).toEqual(['ก', 'ข', 'ค'])
  })

  it('lights the exact word + note that are sounding (not the whole segment)', () => {
    const w = mountSheet({ playingSyl: { li: 0, si: 0, syk: 1 } })
    const lit = w.findAll('.syl-playing')
    expect(lit.length).toBe(1)
    expect(lit[0].text()).toBe('ข')
    // the matching digit is highlighted too, and the segment is NOT whole-highlighted
    expect(w.findAll('.nt-playing').length).toBe(1)
    expect(w.find('.segment').classes()).not.toContain('seg-playing')
  })

  it('tapping a syllable emits seek with its address (jump)', async () => {
    const w = mountSheet()
    await w.findAll('.syl')[2].trigger('click')
    expect(w.emitted('seek')).toBeTruthy()
    expect(w.emitted('seek')[0]).toEqual([{ li: 0, si: 0, syk: 2 }])
  })

  it('is inert when not interactive (no seek emitted)', async () => {
    const w = mount(SongSheet, { props: { content, mode: 'full', interactive: false } })
    await w.find('.segment').trigger('click')
    expect(w.emitted('seek')).toBeFalsy()
  })

  it('v1 segment (no syllables array) falls back to whole-segment highlight', () => {
    const v1 = { key: 'C', lines: [[{ type: 'segment', chord: 'C', note: '1 2', lyric: 'ครบถ้วน' }]] }
    const w = mount(SongSheet, { props: { content: v1, mode: 'full', playingSeg: { li: 0, si: 0 } } })
    expect(w.findAll('.syl').length).toBe(0) // no per-syllable spans
    expect(w.find('.segment').classes()).toContain('seg-playing') // segment-level fallback
  })
})
