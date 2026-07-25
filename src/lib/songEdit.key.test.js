// B060 — changing a song's KEY. The melody is stored as scale degrees, so it follows the key
// by itself; the chords are absolute letters and must move with it or the harmony stops
// matching the numbers. And nothing else in the song may move by a single byte.
import { describe, it, expect } from 'vitest'
import { withSongKey } from './songEdit.js'

// a song that carries the things this editor does NOT model — a marker id a verse's flow
// points at, a `holds` sustain field on a segment, a repeat with times, and an unknown
// top-level key. All of them are the control group: they must come back identical.
const song = () => ({
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  bpm: 92,
  futureThing: { keep: 'me' },
  stanzas: [
    {
      id: 'A',
      lines: [
        [
          { type: 'marker', label: '***', id: 'mk1' },
          { type: 'segment', note: '1 2', chord: 'C', holds: [1] },
          { type: 'bar' },
          { type: 'segment', note: '3 -', chord: 'G/B' },
          { type: 'repeat-end', id: 'r1', times: 3 },
        ],
      ],
    },
  ],
  arrangement: [{ stanza: 'A', label: 'ข้อ 1', syllables: ['ก', 'ข'], flow: { skip: ['r1'] } }],
})

const chords = (c) => c.stanzas[0].lines[0].filter((i) => i.type === 'segment').map((i) => i.chord)

describe('withSongKey — a key change transposes the song', () => {
  it('moves every chord by the interval and spells it for the new key', () => {
    const out = withSongKey(song(), 'D')
    expect(out.key).toBe('D')
    expect(chords(out)).toEqual(['D', 'A/C#']) // +2 semitones — the slash BASS moves too
  })

  it('spells flat keys with flats (same rule the reading transpose uses)', () => {
    expect(chords(withSongKey(song(), 'Eb'))).toEqual(['Eb', 'Bb/D'])
  })

  it('leaves the jianpu numbers alone — they are scale degrees, they follow the key', () => {
    const out = withSongKey(song(), 'A')
    const notes = out.stanzas[0].lines[0].filter((i) => i.type === 'segment').map((i) => i.note)
    expect(notes).toEqual(['1 2', '3 -'])
  })

  it('🔴 touches NOTHING but `key` and the chord strings (flow · marker ids · holds · repeats · unknown keys)', () => {
    const before = song()
    const out = withSongKey(before, 'F')
    // rebuild the "expected" from the original by changing ONLY what may change
    const expected = JSON.parse(JSON.stringify(before))
    expected.key = 'F'
    expected.stanzas[0].lines[0][1].chord = 'F'
    expected.stanzas[0].lines[0][3].chord = 'C/E'
    expect(JSON.parse(JSON.stringify(out))).toEqual(expected)
    // and the input itself is never mutated (the editor's undo relies on that)
    expect(JSON.parse(JSON.stringify(before))).toEqual(JSON.parse(JSON.stringify(song())))
  })

  it('is a no-op (same reference) when the key does not actually change', () => {
    const c = song()
    expect(withSongKey(c, 'C')).toBe(c)
    expect(withSongKey(c, '')).toBe(c)
    expect(withSongKey(null, 'D')).toBe(null)
  })

  it('a segment with no chord stays chord-free (no "" turning into a chord)', () => {
    const c = song()
    delete c.stanzas[0].lines[0][1].chord
    const out = withSongKey(c, 'G')
    expect(out.stanzas[0].lines[0][1].chord).toBeUndefined()
  })

  it('a v1-shaped song (flat `lines`) transposes too — no song left behind', () => {
    const v1 = { key: 'C', lines: [{ type: 'segment', note: '1', chord: 'Am' }] }
    const out = withSongKey(v1, 'D')
    expect(out.key).toBe('D')
    expect(out.lines[0].chord).toBe('Bm')
  })
})
