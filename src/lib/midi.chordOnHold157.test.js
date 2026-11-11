// ใบ v3/pleng#157 — a chord written over a '-' (the tune just holds) must still sound.
// Song 264 bar "2 - - 0": Em over "2", A7 over "- -", then a rest. Before the fix the A7 was
// folded into the held 2 and never played.
import { describe, it, expect } from 'vitest'
import { songToNotes, buildChordVoice } from './midi.js'

const bar = (segs) => ({ key: 'D', lines: [segs] })

describe('ใบ#157 chord over a held note', () => {
  it('Em on "2", A7 on "- -" → two chord events, A7 starts at beat 1 for 2 beats', () => {
    const notes = songToNotes(bar([
      { type: 'segment', chord: 'Em', note: '2' },
      { type: 'segment', chord: 'A7', note: '- - 0' },
    ]))
    // melody is unchanged: one attack of 2 held 3 beats, then a rest
    expect(notes.filter((n) => n.midi != null)).toHaveLength(1)
    expect(notes[0].beats).toBe(3)
    const ev = buildChordVoice(notes)
    expect(ev.map((e) => [e.chord, e.startBeat, e.beats])).toEqual([['Em', 0, 1], ['A7', 1, 3]])
  })
  it('D G D over "1 - - 0" → D, G, D', () => {
    const notes = songToNotes(bar([
      { type: 'segment', chord: 'D', note: '1 -' },
      { type: 'segment', chord: 'G', note: '-' },
      { type: 'segment', chord: 'D', note: '0' },
    ]))
    expect(buildChordVoice(notes).map((e) => [e.chord, e.startBeat, e.beats])).toEqual([['D', 0, 2], ['G', 2, 1], ['D', 3, 1]])
  })
  it('a chord change on a tied-on note (~) is kept', () => {
    const notes = songToNotes(bar([
      { type: 'segment', chord: 'C', note: '1~' },
      { type: 'bar' },
      { type: 'segment', chord: 'F', note: '~1' },
    ]))
    expect(notes.filter((n) => n.midi != null)).toHaveLength(1)
    expect(buildChordVoice(notes).map((e) => [e.chord, e.startBeat])).toEqual([['C', 0], ['F', 1]])
  })
  it('same chord over "-" adds no extra event', () => {
    const notes = songToNotes(bar([
      { type: 'segment', chord: 'D', note: '1' },
      { type: 'segment', chord: 'D', note: '- -' },
    ]))
    expect(notes[0].chordSteps).toBeUndefined()
    expect(buildChordVoice(notes)).toHaveLength(1)
  })
})
