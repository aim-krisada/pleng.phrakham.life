// US-B01 / DS-B01 — the print sheet shows the WHOLE song (note + chord + lyric),
// in singing order, and is READ-ONLY (no editing surface). SongSheet is the sheet
// mode's only component, so these assertions ARE US-B01's acceptance criteria.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SongSheet from './SongSheet.vue'

// A tiny two-line song in the v1-shaped `lines` that SongSheet consumes (Studio
// feeds it resolveContent(song), already flattened into singing order).
//   line 1: [verse] "แผ่น"(C, note 1) "เพลง"(G, note 2)
//   line 2: [refrain] "ครบ"(Am, note 3) "ถ้วน"(F, note 5)
const content = {
  key: 'C',
  timeSignature: '4/4',
  lines: [
    [
      { type: 'section', name: 'ท่อน 1' },
      { type: 'segment', chord: 'C', note: '1', lyric: 'แผ่น' },
      { type: 'bar' },
      { type: 'segment', chord: 'G', note: '2', lyric: 'เพลง' },
    ],
    [
      { type: 'section', name: 'ร้องรับ' },
      { type: 'segment', chord: 'Am', note: '3', lyric: 'ครบ' },
      { type: 'bar' },
      { type: 'segment', chord: 'F', note: '5', lyric: 'ถ้วน' },
    ],
  ],
}

const mountSheet = (props = {}) =>
  mount(SongSheet, {
    props: { content, mode: 'full', chordSystem: 'letter', displayKey: 'C', ...props },
  })

describe('SongSheet — full print sheet (US-B01)', () => {
  it('AC1: shows every part of the song, in singing order', () => {
    const wrapper = mountSheet()
    // one .song-line per source line, in order
    const lines = wrapper.findAll('.song-line')
    expect(lines.length).toBe(2)
    // lyrics appear in the exact singing order across the whole song
    const lyrics = wrapper.findAll('.lyric').map((n) => n.text().trim())
    expect(lyrics).toEqual(['แผ่น', 'เพลง', 'ครบ', 'ถ้วน'])
    // section headings are rendered for each ท่อน
    const sections = wrapper.findAll('.section-label').map((n) => n.text())
    expect(sections).toEqual(['♦ ท่อน 1', '♦ ร้องรับ'])
  })

  it('AC2: each segment carries note + chord + lyric (all three)', () => {
    const wrapper = mountSheet()
    const segments = wrapper.findAll('.segment')
    expect(segments.length).toBe(4)
    for (const seg of segments) {
      expect(seg.find('.chord').exists()).toBe(true) // chord row
      expect(seg.find('.note').exists()).toBe(true) // โน้ตตัวเลข row
      expect(seg.find('.lyric').exists()).toBe(true) // lyric row
    }
    // chords are shown verbatim in letter system at the original key
    const chords = wrapper.findAll('.chord').map((n) => n.text().trim())
    expect(chords).toEqual(['C', 'G', 'Am', 'F'])
    // the melody digits render (via NoteRow) alongside the lyric
    const notes = wrapper.findAll('.note').map((n) => n.text().replace(/\s/g, ''))
    expect(notes).toEqual(['1', '2', '3', '5'])
  })

  it('AC3: the sheet is read-only — it renders no editing surface', () => {
    const wrapper = mountSheet()
    expect(wrapper.findAll('input').length).toBe(0)
    expect(wrapper.findAll('textarea').length).toBe(0)
    expect(wrapper.findAll('select').length).toBe(0)
    expect(wrapper.findAll('button').length).toBe(0)
    expect(wrapper.findAll('[contenteditable="true"]').length).toBe(0)
  })

  it('US-I3: the song title prints as a centered heading above the song (P\'Aim)', () => {
    const wrapper = mountSheet({ songTitle: '1. พระเจ้าเป็นความรัก' })
    const title = wrapper.find('.sheet-print-title')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('1. พระเจ้าเป็นความรัก')
  })

  it('US-I3: no printed title when none is given (e.g. editor preview)', () => {
    const wrapper = mountSheet() // no songTitle
    expect(wrapper.find('.sheet-print-title').exists()).toBe(false)
  })

  it('US-I3: the running footer is NOT a component element — it is @page CSS (printChrome)', () => {
    const wrapper = mountSheet({ songTitle: 'พระเจ้าเป็นความรัก' })
    expect(wrapper.find('.print-foot').exists()).toBe(false)
  })

  it('US-B02: consecutive lines group under one ท่อน wrapper (kept together on print)', () => {
    // ท่อน 1 spans TWO source lines (2nd line has no section marker); ร้องรับ is a 3rd.
    const c = {
      key: 'C',
      timeSignature: '4/4',
      lines: [
        [{ type: 'section', name: 'ท่อน 1' }, { type: 'segment', chord: 'C', note: '1', lyric: 'ก' }],
        [{ type: 'segment', chord: 'G', note: '2', lyric: 'ข' }],
        [{ type: 'section', name: 'ร้องรับ' }, { type: 'segment', chord: 'F', note: '4', lyric: 'ค' }],
      ],
    }
    const wrapper = mount(SongSheet, { props: { content: c, mode: 'full' } })
    const groups = wrapper.findAll('.song-section')
    expect(groups.length).toBe(2) // ท่อน 1 (2 lines) + ร้องรับ (1 line)
    expect(groups[0].findAll('.song-line').length).toBe(2)
    expect(groups[1].findAll('.song-line').length).toBe(1)
  })

  it('empty song does not throw and renders no lines', () => {
    const wrapper = mount(SongSheet, {
      props: { content: { key: 'C', timeSignature: '4/4', lines: [] }, mode: 'full' },
    })
    expect(wrapper.findAll('.song-line').length).toBe(0)
    expect(wrapper.findAll('.segment').length).toBe(0)
  })
})
