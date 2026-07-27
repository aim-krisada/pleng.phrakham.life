// โหมดรวมวง (playEnsemble) · the pre-echo referee.
//
// The solo path's referee lives in arranger/referee.js and is covered by referee.test.js. The
// ensemble has its own hand-rolled scheduler and never runs arrange(), so it was left out: on v1 a
// กีตาร์นำ grace could still sing the pitch the tune was about to sing — the "3 ตัวกลายเป็น 4 ตัว"
// complaint, in the one playback mode nobody had checked. These tests pin the ensemble's half.
//
// The negative control is the point: comment out the `!graceVetoed(...)` guard in
// ensembleGuideEvents() and "vetoes a grace that sings the pitch the tune is about to sing" fails.
import { describe, it, expect } from 'vitest'
import { ensembleGuideEvents, PREECHO_ENSEMBLE_LEADS } from './midi.js'

// A tune that walks up and then sings G4 (67) three times. The guitar lead's grace is n.midi - 2,
// so the note at 69 draws a grace at 67 — the pitch the very next attack sings. That is the
// phantom fourth note.
const tune = [
  { midi: 64, beats: 1 },
  { midi: 69, beats: 1 }, // grace would be 67
  { midi: 67, beats: 1 }, // ...which the tune sings right here
  { midi: 67, beats: 1 },
  { midi: 67, beats: 1 },
]
// every note draws a grace: rng() < 0.18 must always be true, and the note must be >= 1 beat.
const alwaysGrace = () => 0
const never = () => 0.99

const run = (notes, opts = {}) => ensembleGuideEvents(notes, { lead: 'guitar', rng: alwaysGrace, ...opts })

describe('ensembleGuideEvents — the tune itself', () => {
  it('plays every sounding note of the sheet, in order, unchanged', () => {
    const out = run(tune)
    expect(out.map((g) => g.midi)).toEqual([64, 69, 67, 67, 67])
    expect(out.map((g) => g.beat)).toEqual([0, 1, 2, 3, 4])
  })

  it('skips rests (midi == null) but still advances the beat clock', () => {
    const out = run([{ midi: 60, beats: 1 }, { midi: null, beats: 2 }, { midi: 62, beats: 1 }])
    expect(out.map((g) => g.beat)).toEqual([0, 3])
  })
})

describe('ensembleGuideEvents — the pre-echo referee', () => {
  it('vetoes a grace that sings the pitch the tune is about to sing', () => {
    const out = run(tune)
    const g = out.find((x) => x.beat === 1)
    expect(g.midi).toBe(69)      // the tune is untouched...
    expect(g.grace).toBeNull()   // ...only the phantom 67 is gone
  })

  it('leaves the same grace alone when the referee is off (the BEFORE state)', () => {
    const out = run(tune, { preEcho: 'off' })
    expect(out.find((x) => x.beat === 1).grace).toEqual({ midi: 67 })
  })

  it('keeps an honest grace — one whose pitch the tune never sings nearby', () => {
    // 60 draws a grace at 58; nothing in the look-ahead sings 58 or 70.
    const out = run([{ midi: 60, beats: 1 }, { midi: 64, beats: 1 }, { midi: 67, beats: 1 }])
    expect(out[0].grace).toEqual({ midi: 58 })
  })

  it('hears an octave as the same note arriving early', () => {
    // grace 67 vs the tune's 79 = G5, one octave up — the ear still binds them.
    const out = run([{ midi: 69, beats: 1 }, { midi: 79, beats: 1 }])
    expect(out[0].grace).toBeNull()
  })

  it('ignores an attack beyond the 2-beat look-ahead', () => {
    // the 67 arrives 3 beats after the grace — the two read as separate events.
    const out = run([{ midi: 69, beats: 3 }, { midi: 67, beats: 1 }])
    expect(out[0].grace).toEqual({ midi: 67 })
  })

  it('never vetoes the tune itself — only the ornament disappears', () => {
    const on = run(tune)
    const off = run(tune, { preEcho: 'off' })
    expect(on.map((g) => g.midi)).toEqual(off.map((g) => g.midi))
    expect(on.map((g) => g.beats)).toEqual(off.map((g) => g.beats))
  })
})

describe('ensembleGuideEvents — the humanize stream must not shift', () => {
  it('draws the same random numbers whether or not a grace is vetoed', () => {
    // If the veto short-circuited the rng() draw, every LATER note would be re-rolled and the whole
    // song's loudness/timing feel would change — a far bigger blast radius than the bug.
    const on = run(tune)
    const off = run(tune, { preEcho: 'off' })
    expect(on.map((g) => g.gd)).toEqual(off.map((g) => g.gd))
    expect(on.map((g) => g.tJit)).toEqual(off.map((g) => g.tJit))
  })
})

describe('ensembleGuideEvents — which leads the referee polices', () => {
  it('polices กีตาร์นำ by default', () => {
    expect(PREECHO_ENSEMBLE_LEADS.has('guitar')).toBe(true)
    expect(run(tune)[1].grace).toBeNull()
  })

  it('leaves ไวโอลินนำ out of the default — held for P\'Aim\'s ear test', () => {
    expect(PREECHO_ENSEMBLE_LEADS.has('violin')).toBe(false)
    expect(run(tune, { lead: 'violin' })[1].grace).toEqual({ midi: 67 })
  })

  it('polices ไวโอลินนำ on demand, for that A/B', () => {
    expect(run(tune, { lead: 'violin', preEcho: 'all' })[1].grace).toBeNull()
  })

  it('เปียโนนำ has no grace to police at all', () => {
    expect(run(tune, { lead: 'piano' }).every((g) => g.grace === null)).toBe(true)
  })

  it('does not draw a grace for a note shorter than a beat', () => {
    expect(run([{ midi: 60, beats: 0.5 }, { midi: 64, beats: 1 }])[0].grace).toBeNull()
  })

  it('does not draw a grace when the dice say no', () => {
    expect(run(tune, { rng: never }).every((g) => g.grace === null)).toBe(true)
  })
})
