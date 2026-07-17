// Fermata (`^`) playback hold — พี่เปา issue12 · P'Aim "ตอนเล่นไม่ลากเสียงจริง".
//
// THE INVARIANT: a fermata multiplies the note's WRITTEN length by FERMATA_FACTOR — the whole
// note, not just its first box. Sibelius/MuseScore/Finale stretch a fermata 1.5–2× on playback
// (issue12), so the factor must also stay inside that range.
//
// THE REGRESSION THIS GUARDS: the '-' extension beats used to be added AFTER the multiplier, so
// only the first box was ever stretched. The hold then got WEAKER the longer the note ran
// (`1^ -` = 1.375× · `1^ - - -` = 1.19×) — backwards, since a fermata is written on exactly those
// long phrase-ending notes. A ratio test (not a hardcoded beat count) is what catches this class:
// the old code passed every single-box case while being silently wrong on every real one.
import { describe, it, expect } from 'vitest'
import { songToNotes, FERMATA_FACTOR } from './midi.js'

// total played beats for one segment (a note's '-' boxes fold into the note, so sum the list)
const beats = (note) => songToNotes({ key: 'C', lines: [[{ type: 'segment', note }]] })
  .reduce((sum, n) => sum + n.beats, 0)

// how much longer the same notation plays WITH its fermata than without it
const holdRatio = (note) => beats(note) / beats(note.replace(/\^/g, ''))

describe('fermata factor', () => {
  it('sits inside the 1.5–2× range notation software uses (issue12)', () => {
    expect(FERMATA_FACTOR).toBeGreaterThanOrEqual(1.5)
    expect(FERMATA_FACTOR).toBeLessThanOrEqual(2)
  })
})

describe('songToNotes — a fermata stretches the WHOLE written note', () => {
  // The core of the bug: each of these is one note whose written length grows box by box.
  // Every one must stretch by the SAME factor — that's what "multiply the written value" means.
  it.each([
    ['1^', 1, 'quarter'],
    ['1^ -', 2, 'half'],
    ['1^ - -', 3, 'dotted half'],
    ['1^ - - -', 4, 'whole'],
  ])('%s (%i-beat %s) holds ×FERMATA_FACTOR', (note, written) => {
    expect(beats(note)).toBeCloseTo(written * FERMATA_FACTOR, 6)
    expect(holdRatio(note)).toBeCloseTo(FERMATA_FACTOR, 6)
  })

  it('the hold does NOT weaken as the note gets longer (the actual regression)', () => {
    const ratios = ['1^', '1^ -', '1^ - -', '1^ - - -'].map(holdRatio)
    for (const r of ratios) expect(r).toBeCloseTo(ratios[0], 6)
  })

  it('stacks on an augmentation dot (written value = the dotted length)', () => {
    expect(beats('1.^')).toBeCloseTo(1.5 * FERMATA_FACTOR, 6) // dotted quarter = 1.5 written
    expect(beats('1.^ -')).toBeCloseTo(2.5 * FERMATA_FACTOR, 6) // + a '-' box = 2.5 written
  })

  it('holds a fermata REST too (a held silence is still a hold)', () => {
    expect(beats('0^')).toBeCloseTo(1 * FERMATA_FACTOR, 6)
    expect(beats('0^ -')).toBeCloseTo(2 * FERMATA_FACTOR, 6)
  })

  it('leaves notation without a fermata exactly as printed', () => {
    expect(beats('1')).toBe(1)
    expect(beats('1 -')).toBe(2)
    expect(beats('1 - - -')).toBe(4)
  })

  it('stretches ONLY the note that carries the mark', () => {
    // song #118 shape: the fermata is on the 6 only; the 2_ 3_ eighths are untouched.
    expect(beats('6^ 2_ 3_')).toBeCloseTo(1 * FERMATA_FACTOR + 0.5 + 0.5, 6)
  })

  it('a fermata delays every note after it (time stops — the point of a fermata)', () => {
    const notes = songToNotes({ key: 'C', lines: [[{ type: 'segment', note: '1^ - 5' }]] })
    const five = notes[notes.length - 1]
    expect(five.midi).toBe(67) // G — the note after the hold
    // it starts only once the held note has finished: 2 written beats × the factor
    const startBeat = notes.slice(0, -1).reduce((s, n) => s + n.beats, 0)
    expect(startBeat).toBeCloseTo(2 * FERMATA_FACTOR, 6)
  })
})
