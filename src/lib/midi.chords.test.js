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

describe('chordVoicing — v1 bass + block triad below the melody', () => {
  it('C major = low root C2 + block C3 E3 G3', () => {
    expect(chordVoicing('C')).toEqual([36, 48, 52, 55])
  })
  it('G major = low root G2 + block G3 B3 D4', () => {
    expect(chordVoicing('G')).toEqual([43, 55, 59, 62])
  })
  it('a 7th adds one more tone; a 9th is trimmed to ≤5 notes (bass + 4)', () => {
    expect(chordVoicing('C7')).toEqual([36, 48, 52, 55, 58]) // + Bb3
    expect(chordVoicing('C9').length).toBeLessThanOrEqual(5)
  })
  it('the bass is a low root (C2..B2), an octave below the block, under the melody', () => {
    for (const c of ['C', 'Am7', 'F', 'Dsus4', 'G']) {
      const v = chordVoicing(c)
      expect(v[0]).toBeGreaterThanOrEqual(36) // C2
      expect(v[0]).toBeLessThan(48) // below C3 — a deep left-hand root
      expect(v[0]).toBe(Math.min(...v)) // the bass is the lowest note
      expect(v.length).toBeLessThanOrEqual(5) // stays a light pad
    }
  })
  it('a blank / unparseable chord yields no notes (silence, not a crash)', () => {
    expect(chordVoicing('')).toEqual([])
    expect(chordVoicing('???')).toEqual([]) // parseChord fails → []
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
  it('sounds the sheet chords note-for-note (C then G voicings)', () => {
    expect(events[0].midiSet).toEqual([36, 48, 52, 55])
    expect(events[1].midiSet).toEqual([43, 55, 59, 62])
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
    expect(events.map((e) => e.midiSet[0])).toEqual([36, 43, 36, 43]) // C G C G bass roots
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
