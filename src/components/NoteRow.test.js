// B062 — slur/tie draw as continuous SVG arcs (not CSS pseudo-arcs that break into
// pieces once a group grows). These assertions ARE B062's acceptance criteria for the
// NoteRow layer: one arc per slur group at ANY length, and tie half-arcs at bar edges.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteRow from './NoteRow.vue'

describe('NoteRow slur/tie SVG (B062)', () => {
  it('draws exactly ONE slur arc path for a 4-note slur group', () => {
    const w = mount(NoteRow, { props: { notes: '(1 2 3 4)' } })
    expect(w.findAll('.slur-arc').length).toBe(1)
    expect(w.findAll('.slur-arc path').length).toBe(1)
  })

  it('a long slur stays ONE path (does not break into pieces)', () => {
    const w = mount(NoteRow, { props: { notes: "(1 2 3 4 5 6 7 1')" } })
    // one group -> one arc -> one path, regardless of how many notes it spans
    expect(w.findAll('.slur-arc').length).toBe(1)
    expect(w.findAll('.slur-arc path').length).toBe(1)
  })

  it('draws one arc per slur group when there are several', () => {
    const w = mount(NoteRow, { props: { notes: '(1 2) 3 (4 5) 6' } })
    expect(w.findAll('.slur-arc').length).toBe(2)
  })

  it('renders no slur arc when there is no slur', () => {
    const w = mount(NoteRow, { props: { notes: '1 2 3 4' } })
    expect(w.findAll('.slur-arc').length).toBe(0)
  })

  it('does not put a slur arc on a triplet group', () => {
    const w = mount(NoteRow, { props: { notes: '{1 2 3}' } })
    expect(w.findAll('.slur-arc').length).toBe(0)
    expect(w.findAll('.g-triplet').length).toBe(1)
  })

  it('draws SVG half-arcs for a tie (start + end), not the old CSS hooks', () => {
    const w = mount(NoteRow, { props: { notes: '1~ ~1' } })
    expect(w.findAll('.tie-start-arc').length).toBe(1)
    expect(w.findAll('.tie-end-arc').length).toBe(1)
    expect(w.findAll('.tie-arc path').length).toBe(2)
  })

  it('a bar-crossing tie end (leading ~) still renders its half-arc', () => {
    // the note after a bar carries only tieEnd; its half-arc must still draw so it can
    // meet the previous segment's start-half over the bar line
    const w = mount(NoteRow, { props: { notes: '~5' } })
    expect(w.findAll('.tie-end-arc').length).toBe(1)
    expect(w.findAll('.tie-start-arc').length).toBe(0)
  })
})
