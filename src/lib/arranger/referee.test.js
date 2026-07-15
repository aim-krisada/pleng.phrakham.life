// @vitest-environment node
// golden-piano — invariant tests for the REFEREE layer (§1 conductor + §2 guard) and the §3 sections
// data-binding fix. These assert the REAL musical contract on the pure arrange() output (no audio):
//   (1) no ลูกเล่น (role 'emb') onset lands on/near a melody ATTACK — clash count = 0
//   (2) every non-melody voice ≤ concurrent melody gain × 0.8 — the right hand always leads ≥20%
//   (3) no voice is pushed below the audible floor / out of the loaded layer (no silent note)
//   (4) sections are never empty on a real melody (resolveSections) + rubato fires at phrase ends
//   (5) arrange() with the referee on is still pure (MP3 == live)
import { describe, it, expect } from 'vitest'
import { arrange } from './index.js'
import { refereeNoClash, balanceFloor, legatoBass, REFEREE_GAP, MELODY_LEAD, AUDIBLE_FLOOR, BASS_LEGATO_OVERLAP } from './referee.js'
import { rubato, humanizeTime } from './dynamics.js'
import { mulberry32 } from './rng.js'
import { buildChordVoice, phraseSectionsFromMelody, resolveSections } from '../midi.js'
import { gainToVelocity, GRAND_LAYER, clampGainToLayer } from '../sampler.js'

// A line with BOTH textures: a running passage (eighth notes, attacks every 0.5 beat → the tune is
// busy, no room for ลูกเล่น) and a long hold (4 beats → a real gap the referee should allow into).
const LINE = [
  { midi: 60, beats: 0.5, chord: 'C' }, { midi: 62, beats: 0.5, chord: 'C' },
  { midi: 64, beats: 0.5, chord: 'C' }, { midi: 65, beats: 0.5, chord: 'C' },
  { midi: 67, beats: 4, chord: 'G' }, // the hold — a melodic gap
  { midi: 64, beats: 2, chord: 'C' },
  { midi: 60, beats: 3, chord: 'C' }, // phrase-ending long note (song end)
]
const CHORDS = buildChordVoice(LINE)
const META = { songId: 'ref-1', pass: 0, timeSignature: '4/4', keyRoot: 60 }
// everything turned up at once — the exact "เปิดพร้อมกันแล้วเสียงเละ" condition the referee tames.
const LOUD = {
  voices: 'both', chordGain: 0.09,
  embellish: ['sparkle', 'gapFill', 'chromaticApproach'], fills: true, fillLevel: 0.7,
  susCadence: true, sparkleLevel: 0.9,
  dynamics: { accent: true, contour: true, rubato: true, section: true },
}
// the referee is INTRINSIC now (P'Aim 15 ก.ค.: always on, no flag) — arrange() applies it whenever
// the arranger is on. withRef just names the "everything turned up" config for readability.
const withRef = (extra = {}) => ({ ...LOUD, ...extra })

const melodyOnsets = (evs) => evs.filter((e) => e.role === 'melody').map((e) => e.startBeat)
const embOf = (evs) => evs.filter((e) => e.role === 'emb')
// concurrent melody gain at a beat (the ringing melody note, else the most recent) — mirrors balanceFloor.
function melGainAt(evs, b) {
  const mel = evs.filter((e) => e.role === 'melody').sort((a, x) => a.startBeat - x.startBeat)
  const cover = mel.find((m) => b >= m.startBeat - 1e-9 && b < m.startBeat + m.beats)
  if (cover) return cover.gain
  let prev = null
  for (const m of mel) { if (m.startBeat <= b + 1e-9) prev = m; else break }
  return (prev || mel[0]).gain
}

describe('§1 conductor — no ลูกเล่น on top of the melody (clash = 0)', () => {
  it('every emb onset sits ≥ GAP beats from the nearest melody attack (both sides)', () => {
    const evs = arrange(LINE, CHORDS, withRef(), META)
    const onsets = melodyOnsets(evs)
    for (const e of embOf(evs)) {
      const nearest = Math.min(...onsets.map((o) => Math.abs(o - e.startBeat)))
      expect(nearest, `emb at beat ${e.startBeat} is ${nearest} from a melody attack`).toBeGreaterThanOrEqual(REFEREE_GAP - 1e-9)
    }
  })
  it('no emb fires during the busy eighth-note run (beats 0–2), only in the hold/gap', () => {
    const evs = arrange(LINE, CHORDS, withRef(), META)
    expect(embOf(evs).every((e) => e.startBeat >= 2 - 1e-9)).toBe(true)
  })
  it('refereeNoClash drops an emb ON a melody attack, keeps one in a gap (deterministic)', () => {
    const events = [
      { role: 'melody', startBeat: 0, beats: 1 },
      { role: 'melody', startBeat: 1, beats: 4 }, // a hold: beats 1..5 is a gap
      { role: 'melody', startBeat: 5, beats: 1 },
      { role: 'emb', startBeat: 0, midi: 84 }, // ON the first attack → must be dropped
      { role: 'emb', startBeat: 1, midi: 84 }, // ON the hold's attack → dropped
      { role: 'emb', startBeat: 3, midi: 84 }, // deep in the gap (≥GAP from beats 1 and 5) → kept
      { role: 'emb', startBeat: 5, midi: 84 }, // ON the next attack → dropped
      { role: 'inner', startBeat: 0 }, { role: 'bass', startBeat: 0 }, // never policed
    ]
    const kept = refereeNoClash(events, {})
    const embKept = kept.filter((e) => e.role === 'emb')
    expect(embKept.map((e) => e.startBeat)).toEqual([3]) // only the in-gap one survived
    expect(kept.some((e) => e.role === 'inner')).toBe(true) // comp/bass untouched
    expect(kept.some((e) => e.role === 'bass')).toBe(true)
  })
  it('referee is INTRINSIC — arrange with NO referee flag still leaves zero clashes', () => {
    const evs = arrange(LINE, CHORDS, LOUD, META) // LOUD carries no strictReferee — it's always on now
    const onsets = melodyOnsets(evs)
    const clashes = embOf(evs).filter((e) => Math.min(...onsets.map((o) => Math.abs(o - e.startBeat))) < REFEREE_GAP - 1e-9).length
    expect(clashes).toBe(0)
  })
  it('refereeNoClash passes chords-only through untouched (no melody to protect)', () => {
    const chordsOnly = arrange([], CHORDS, { voices: 'chords', embellish: true }, META)
    expect(refereeNoClash(chordsOnly, {})).toBe(chordsOnly)
  })
})

describe('§2 guard — the right hand always leads ≥20% + nothing vanishes', () => {
  it('every non-melody voice ≤ concurrent melody × 0.8 at its onset', () => {
    const evs = arrange(LINE, CHORDS, withRef(), META)
    for (const e of evs) {
      if (e.role === 'melody') continue
      const ceil = melGainAt(evs, e.startBeat) * MELODY_LEAD
      expect(e.gain, `${e.role} at beat ${e.startBeat} gain ${e.gain} > ceil ${ceil}`).toBeLessThanOrEqual(ceil + 1e-9)
    }
  })
  it('no event is silent — every gain maps into the loaded velocity layer', () => {
    const evs = arrange(LINE, CHORDS, withRef(), META)
    for (const e of evs) {
      const v = gainToVelocity(e.gain)
      expect(v).toBeGreaterThanOrEqual(GRAND_LAYER[0])
      expect(v).toBeLessThanOrEqual(GRAND_LAYER[1])
    }
  })
  it('balanceFloor lifts a driven-down voice back to the audible floor (but not past the lead)', () => {
    const evs = [
      { role: 'melody', startBeat: 0, beats: 4, gain: 0.31 },
      { role: 'inner', startBeat: 0, beats: 1, gain: 0.005 }, // driven far below audible
      { role: 'inner', startBeat: 1, beats: 1, gain: 0.30 }, // above the melody → must be pulled under
    ]
    balanceFloor(evs, {})
    expect(evs[1].gain).toBeGreaterThanOrEqual(Math.min(AUDIBLE_FLOOR, 0.31 * MELODY_LEAD) - 1e-9) // floored up
    expect(evs[2].gain).toBeLessThanOrEqual(0.31 * MELODY_LEAD + 1e-9) // capped under the tune
    expect(evs[0].gain).toBe(0.31) // melody untouched
  })
  it('the tune is never touched — melody pitches match the printed notes exactly (referee shifts no pitch)', () => {
    const printed = LINE.filter((n) => n.midi != null).map((n) => n.midi)
    const mel = arrange(LINE, CHORDS, withRef(), META).filter((e) => e.role === 'melody')
    expect(mel.map((e) => e.midi)).toEqual(printed) // every printed pitch, in order — referee removed none
  })
})

describe('§1 legato — no "ฟันหลอ" seam in the left hand + bass is the on-grid anchor', () => {
  it('legatoBass stretches each bass note past the next bass onset (no silent gap), onsets untouched', () => {
    const evs = [
      { role: 'bass', startBeat: 0, beats: 2, midi: 40 },
      { role: 'bass', startBeat: 4, beats: 2, midi: 43 }, // a 2-beat gap after the first note's end
      { role: 'bass', startBeat: 8, beats: 2, midi: 45 },
      { role: 'melody', startBeat: 0, beats: 12, midi: 60 },
    ]
    const onsetsBefore = evs.filter((e) => e.role === 'bass').map((e) => e.startBeat)
    legatoBass(evs, {})
    const bass = evs.filter((e) => e.role === 'bass').sort((a, b) => a.startBeat - b.startBeat)
    // every non-final bass note now reaches at least the next onset + the overlap (seam closed)
    for (let i = 0; i < bass.length - 1; i++) {
      expect(bass[i].startBeat + bass[i].beats).toBeGreaterThanOrEqual(bass[i + 1].startBeat + BASS_LEGATO_OVERLAP - 1e-9)
    }
    expect(bass.map((e) => e.startBeat)).toEqual(onsetsBefore) // ONSETS never move (grid untouched)
    expect(bass[bass.length - 1].beats).toBe(2) // the last note keeps its own length
    expect(evs.find((e) => e.role === 'melody').beats).toBe(12) // the tune is never touched
  })
  it('a bass note already reaching the next onset is not shortened', () => {
    const evs = [{ role: 'bass', startBeat: 0, beats: 5, midi: 40 }, { role: 'bass', startBeat: 4, beats: 2, midi: 43 }]
    legatoBass(evs, {})
    expect(evs[0].beats).toBeGreaterThanOrEqual(5) // never shrinks a held note
  })
  it('humanizeTime keeps the bass dead on the grid (anchor), while melody/inner breathe', () => {
    const evs = [
      { role: 'bass', startBeat: 0, beats: 4, timeShift: 0 },
      { role: 'inner', startBeat: 0, beats: 1, timeShift: 0 },
      { role: 'melody', startBeat: 0, beats: 1, timeShift: 0 },
    ]
    humanizeTime(evs, mulberry32(5), 0.012)
    expect(evs.find((e) => e.role === 'bass').timeShift).toBe(0) // bass never jittered
  })
  it('in the full arrange, every bass onset lands exactly on the sheet grid (no timing drift)', () => {
    const bassEvs = arrange(LINE, CHORDS, withRef(), META).filter((e) => e.role === 'bass')
    for (const b of bassEvs) expect(b.timeShift).toBe(0)
  })
})

describe('§3 sections — data-binding fix + phrase fallback (rubato works on every song)', () => {
  const notesOf = (line) => line // buildPlayNotes shape ≈ these {midi,beats}
  it('phraseSectionsFromMelody segments at long-note / rest boundaries, never empty', () => {
    const secs = phraseSectionsFromMelody(notesOf(LINE))
    expect(secs.length).toBeGreaterThanOrEqual(2) // the 4-beat hold + the final 3-beat note split it
    expect(secs[0].fromBeat).toBe(0)
    // contiguous, covering the whole span
    for (let i = 1; i < secs.length; i++) expect(secs[i].fromBeat).toBeCloseTo(secs[i - 1].toBeat, 6)
  })
  it('resolveSections is never empty on a real melody (unlabelled v2 → phrase fallback)', () => {
    const v2 = { key: 'C', timeSignature: '4/4', stanzas: [], arrangement: [] }
    const secs = resolveSections(v2, notesOf(LINE))
    expect(secs.length).toBeGreaterThanOrEqual(2)
  })
  it('rubato ritards the note before each phrase boundary, not every long note', () => {
    const secs = phraseSectionsFromMelody(notesOf(LINE))
    const mel = LINE.filter((n) => n.midi != null).map((n, i) => ({ role: 'melody', midi: n.midi, startBeat: 0, beats: n.beats, timeShift: 0, _i: i }))
    let b = 0; for (const m of mel) { m.startBeat = b; b += m.beats }
    const before = mel.map((m) => m.beats)
    rubato(mel, secs)
    const stretched = mel.filter((m, i) => m.beats > before[i] + 1e-9)
    expect(stretched.length).toBeGreaterThan(0) // at least one phrase-end note rings longer
    expect(stretched.length).toBeLessThan(mel.length) // NOT every note (would be the old bug)
  })
})

describe('§5 purity — arrange() with the referee stays deterministic (MP3 == live)', () => {
  it('same input + seed → byte-identical output', () => {
    expect(arrange(LINE, CHORDS, withRef(), META)).toEqual(arrange(LINE, CHORDS, withRef(), META))
  })
  it('every preset combo stays in-layer with the referee on across passes', () => {
    for (let pass = 0; pass < 6; pass++) {
      for (const e of arrange(LINE, CHORDS, withRef(), { ...META, pass })) {
        expect(clampGainToLayer(e.gain)).toBeCloseTo(e.gain, 9) // already in-window (no silent note)
      }
    }
  })
})
