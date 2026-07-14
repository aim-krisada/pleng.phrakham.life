// B104 — chord accompaniment (the "left hand"). Covers the pure pieces that decide WHAT
// sounds in each of the 3 modes, so the behaviour is provable headless (the actual audio is
// verified by ear in the browser): chord carry-forward onto notes, one-chord-one-block
// grouping timed to the melody, the v1 voicing, and the melody/chords/both rule.
import { describe, it, expect } from 'vitest'
import { songToNotes, buildPlayNotes, buildChordVoice, chordVoicing, voiceFlags } from './midi.js'

// C for two quarters, then G for two quarters (second G restated → must merge into one block)
const SONG = {
  key: 'C',
  lines: [[
    { type: 'segment', chord: 'C', note: '1' },
    { type: 'segment', note: '2' }, // no chord → C holds
    { type: 'bar' },
    { type: 'segment', chord: 'G', note: '3' },
    { type: 'segment', chord: 'G', note: '4' },
  ]],
}

describe('songToNotes — chord carry-forward', () => {
  const notes = songToNotes(SONG)
  it('stamps each note with the chord in force (holds until the next symbol)', () => {
    expect(notes.map((n) => n.chord)).toEqual(['C', 'C', 'G', 'G'])
  })
  it('a rest still carries the chord so the pad rings across it', () => {
    const withRest = songToNotes({ key: 'C', lines: [[
      { type: 'segment', chord: 'F', note: '1' },
      { type: 'segment', note: '0' }, // rest
    ]] })
    expect(withRest[1].midi).toBe(null)
    expect(withRest[1].chord).toBe('F')
  })
})

describe('chordVoicing — B107 voice-leading (bass + upper voices near the last chord)', () => {
  it('C major (no prev) = bass C3 + upper E3 G3 (no doubled root)', () => {
    expect(chordVoicing('C')).toEqual({ bass: 48, up: [52, 55], slashBass: null })
  })
  it('slash chord "G/B" keeps the root as bass + exposes slashBass (B) for a root→bass move', () => {
    const v = chordVoicing('G/B')
    expect(v.bass).toBe(43) // G in the low register (struck FIRST)
    expect(v.slashBass).toBe(47) // B — the bass moves here after the root (P'Aim)
  })
  it('a 7th adds the 7th to the upper voices; a 9th trims to ≤3 upper (≤4 total)', () => {
    expect(chordVoicing('C7')).toEqual({ bass: 48, up: [52, 55, 58], slashBass: null }) // + Bb3
    const v9 = chordVoicing('C9')
    expect(v9.up.length).toBeLessThanOrEqual(3)
    expect(1 + v9.up.length).toBeLessThanOrEqual(4)
  })
  it('upper voices always live in the C3..G4 window (never up in the melody range)', () => {
    for (const c of ['C', 'Am7', 'F', 'Dsus4', 'G', 'B', 'A']) {
      const { up } = chordVoicing(c)
      for (const m of up) { expect(m).toBeGreaterThanOrEqual(48); expect(m).toBeLessThanOrEqual(67) }
    }
  })
  it('the bass is a low root (E2..D#3) and below every upper voice', () => {
    for (const c of ['C', 'Am7', 'F', 'Dsus4', 'G']) {
      const { bass, up } = chordVoicing(c)
      expect(bass).toBeGreaterThanOrEqual(40)
      expect(bass).toBeLessThanOrEqual(51)
      expect(bass).toBeLessThan(Math.min(...up)) // foundation under the pad
    }
  })
  it('voice-leads: passing the previous upper voices moves the pad the SHORT way', () => {
    const cUp = chordVoicing('C').up // [52,55]
    // C→G: with voice-leading, the upper voices stay near cUp (centroid moves < an octave)
    const gUp = chordVoicing('G', cUp).up
    const centroid = (a) => a.reduce((x, y) => x + y, 0) / a.length
    expect(Math.abs(centroid(gUp) - centroid(cUp))).toBeLessThan(6) // < a tritone of drift
  })
  it('a blank / unparseable chord yields no bass (silence, not a crash)', () => {
    expect(chordVoicing('')).toEqual({ bass: null, up: [] })
    expect(chordVoicing('???')).toEqual({ bass: null, up: [] }) // parseChord fails
  })
})

describe('buildChordVoice — one held block per chord, timed to the melody', () => {
  const events = buildChordVoice(buildPlayNotes(SONG))
  it('groups consecutive same-chord notes into one event (adjacent G+G = one block)', () => {
    expect(events).toHaveLength(2)
  })
  it('each event starts where its chord starts and holds its full span (cumulative beats)', () => {
    expect(events[0]).toMatchObject({ startBeat: 0, beats: 2 }) // C over notes 1 & 2
    expect(events[1]).toMatchObject({ startBeat: 2, beats: 2 }) // G over notes 3 & 4
  })
  it('sounds the sheet chords with voice-leading (C then G, pad glides between them)', () => {
    expect(events[0].midiSet).toEqual([48, 52, 55]) // C: bass C3 + E3 G3
    expect(events[1].midiSet).toEqual([43, 50, 59]) // G: bass G2 + D3 B3 (voice-led from C)
    expect(events[0]).toMatchObject({ bass: 48, up: [52, 55] })
    expect(events[1]).toMatchObject({ bass: 43, up: [50, 59] })
  })
  it('leading notes with no chord stay silent until the first symbol', () => {
    const evs = buildChordVoice(buildPlayNotes({ key: 'C', lines: [[
      { type: 'segment', note: '1' }, // no chord yet
      { type: 'segment', chord: 'C', note: '2' },
    ]] }))
    expect(evs).toHaveLength(1)
    expect(evs[0].startBeat).toBe(1) // chord begins on the SECOND beat, not the first
  })
})

describe('repeat/volta — chords replay with the section', () => {
  it('a repeated C→G section sounds its chords on every pass', () => {
    // ‖: C | G :‖  → plays C G C G; chords are attached after expandRepeats so they replay
    const rep = { key: 'C', lines: [[
      { type: 'repeat-start' },
      { type: 'segment', chord: 'C', note: '1' },
      { type: 'bar' },
      { type: 'segment', chord: 'G', note: '5' },
      { type: 'repeat-end' },
    ]] }
    const events = buildChordVoice(buildPlayNotes(rep))
    expect(events).toHaveLength(4) // C G C G — replayed, and no false merge across the seam
    expect(events.map((e) => e.midiSet[0])).toEqual([48, 43, 48, 43]) // C G C G bass roots
  })
})

describe('voiceFlags — the 3 sound modes select the right voices', () => {
  it('melody = tune only', () => expect(voiceFlags('melody')).toEqual({ melody: true, chords: false }))
  it('chords = pad only', () => expect(voiceFlags('chords')).toEqual({ melody: false, chords: true }))
  it('both = together', () => expect(voiceFlags('both')).toEqual({ melody: true, chords: true }))

  // what actually SOUNDS in each mode (mirrors playSong / renderSongToBuffer)
  const sounded = (voices) => {
    const notes = buildPlayNotes(SONG)
    const f = voiceFlags(voices)
    return {
      melody: f.melody ? notes.filter((n) => n.midi != null).map((n) => n.midi) : [],
      chords: f.chords ? buildChordVoice(notes).map((e) => e.midiSet) : [],
    }
  }
  it('melody-only plays the tune and no chords', () => {
    const s = sounded('melody')
    expect(s.melody.length).toBe(4)
    expect(s.chords).toEqual([])
  })
  it('chords-only plays the pad and no tune', () => {
    const s = sounded('chords')
    expect(s.melody).toEqual([])
    expect(s.chords.length).toBe(2)
  })
  it('both plays tune and pad together', () => {
    const s = sounded('both')
    expect(s.melody.length).toBe(4)
    expect(s.chords.length).toBe(2)
  })
  it('melody-only is a byte-for-byte regression: same notes as before the feature', () => {
    // the tune that sounds == the plain melody note list, unchanged
    const plain = buildPlayNotes(SONG).filter((n) => n.midi != null).map((n) => n.midi)
    expect(sounded('melody').melody).toEqual(plain)
  })
})
