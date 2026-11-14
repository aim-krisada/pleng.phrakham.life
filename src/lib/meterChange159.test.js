import { describe, it, expect } from 'vitest'
import { resolveContent, stanzaLineMeters } from './songModel.js'
import { songToNotes } from './midi.js'

// ใบ v3/pleng#159 — song 515: one melody, ข้อ in 4/4, รับ in 3/4, then back to 4/4. Every verse shares it.
const seg = (note) => ({ type: 'segment', chord: '', note })
const song = () => ({
  version: 2,
  key: 'G',
  timeSignature: '4/4',
  stanzas: [{
    id: 'A',
    lines: [
      [seg('1 2 3 4'), { type: 'bar' }, seg('5 - - -')],
      [{ type: 'meter', ts: '3/4' }, seg('2 2 2'), { type: 'bar' }, seg('5 - -')],
      [{ type: 'meter', ts: '4/4' }, seg('1 2 3 4'), { type: 'bar' }, seg('1 - - -')],
    ],
  }],
  arrangement: [
    { stanza: 'A', label: 'ข้อ 1', syllables: Array(16).fill('ก') },
    { stanza: 'A', label: 'ข้อ 2', syllables: Array(16).fill('ข') },
  ],
})
const metersOf = (line) => line.filter((it) => it.type === 'meter').map((it) => it.ts)

describe('ใบ#159 — a melody that changes meter part-way', () => {
  it('each line knows its meter; back to the song meter = no tag', () => {
    expect(stanzaLineMeters(song().stanzas[0], '4/4')).toEqual([undefined, '3/4', undefined])
  })

  it('the sheet gets the new meter at the line where it changes, for every verse', () => {
    const lines = resolveContent(song())
    expect(lines).toHaveLength(6)
    expect(lines.map((l) => l._ts || '')).toEqual(['', '3/4', '', '', '3/4', ''])
    expect(lines.map(metersOf)).toEqual([[], ['3/4'], ['4/4'], [], ['3/4'], ['4/4']])
  })

  it('verse 2 does not repeat a meter on its heading — the song is back in 4/4 when it starts', () => {
    const lines = resolveContent(song())
    const head = lines[3].find((it) => it.type === 'section')
    expect(head.name).toBe('ข้อ 2')
    expect(head.meter).toBeUndefined()
  })

  it('the words still land on the right notes (the mark takes no syllable)', () => {
    const lines = resolveContent(song())
    const sylls = lines.slice(0, 3).flatMap((l) => l.filter((it) => it.type === 'segment').flatMap((it) => it.syllables))
    expect(sylls.filter((x) => x === 'ก').length).toBeGreaterThanOrEqual(13)
  })

  it('the sound counts the 3/4 lines in 3/4 (resolved song)', () => {
    const lines = resolveContent(song())
    const notes = songToNotes({ ...song(), lines })
    const byLine = (li) => [...new Set(notes.filter((n) => n.li === li).map((n) => n.ts || '4/4'))]
    expect(byLine(0)).toEqual(['4/4'])
    expect(byLine(1)).toEqual(['3/4'])
    expect(byLine(2)).toEqual(['4/4'])
  })

  it('the editor playing the raw melody lines follows the marks too', () => {
    const s = song()
    const notes = songToNotes({ key: 'G', timeSignature: '4/4', lines: s.stanzas[0].lines })
    const byLine = (li) => [...new Set(notes.filter((n) => n.li === li).map((n) => n.ts || '4/4'))]
    expect(byLine(1)).toEqual(['3/4'])
    expect(byLine(2)).toEqual(['4/4'])
  })

  it('a song with no mark resolves exactly as before (no meter items, no tags)', () => {
    const s = song()
    s.stanzas[0].lines = s.stanzas[0].lines.map((l) => l.filter((it) => it.type !== 'meter'))
    const lines = resolveContent(s)
    expect(lines.every((l) => !l._ts && !metersOf(l).length)).toBe(true)
  })
})
