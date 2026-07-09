// B027 — playback duration honours double-dot: tokenBeats (via songToNotes) gives
// `.` = ×1.5 and `..` = ×1.75 of the base note length, same as beatCount's bar math.
import { describe, it, expect } from 'vitest'
import { songToNotes } from './midi.js'

const beats = (note) => songToNotes({ key: 'C', lines: [[{ type: 'segment', note }]] })[0].beats

describe('songToNotes — double-dot playback beats', () => {
  it('plain quarter plays 1 beat', () => {
    expect(beats('5')).toBe(1)
  })
  it('dotted plays ×1.5', () => {
    expect(beats('5.')).toBe(1.5)
  })
  it('double-dotted plays ×1.75', () => {
    expect(beats('5..')).toBe(1.75)
  })
  it('double-dotted eighth plays 0.875', () => {
    expect(beats('5_..')).toBe(0.875)
  })
  it('double-dotted rest still holds 1.75 silent beats', () => {
    // rest keeps its slot; midi null but the duration is the dotted length
    const n = songToNotes({ key: 'C', lines: [[{ type: 'segment', note: '0..' }]] })[0]
    expect(n.midi).toBe(null)
    expect(n.beats).toBe(1.75)
  })
})
