// ใบ v3/pleng#98 — the accompaniment's "beat 1" must be the song's REAL downbeat. Measured 1 ต.ค. 2569 on the
// 607 published songs: x/4 songs with a pickup were stressed on the real beat 1 in only 7% of their bars,
// 6/8 in 22%, 3/2 in 9% — because (1) bars were counted from the first note, so a pickup shifted every bar,
// and (2) the bar length was the time signature's NUMERATOR (6/8 → 6) instead of quarter beats (6/8 → 3).
// After: every meter 99.9–100%, no song worse, and songs already counted right are untouched.
import { describe, it, expect } from 'vitest'
import { resolveContent } from './songModel.js'
import { songToNotes, ensembleAccent } from './midi.js'
import { arrange } from './arranger/index.js'
import { meterRuns, shiftOf, mediumOf } from './meterRegions.js'

const seg = (note) => ({ type: 'segment', chord: 'C', note })
const song = (ts, ...bars) => ({
  version: 2, key: 'C', timeSignature: ts,
  stanzas: [{ id: 'A', lines: [bars.flatMap((b, i) => (i ? [{ type: 'bar' }, seg(b)] : [seg(b)]))] }],
  arrangement: [{ stanza: 'A', label: '', syllables: [] }],
})
const notesOf = (c) => songToNotes({ ...c, lines: resolveContent(c) })
// accent only, every other gain shaper off → a melody note's gain ∝ its bar-position factor
const ACCENT = { arranger: true, voices: 'melody', humanize: false, easeUnderHold: false, lockDownbeats: false,
  dynamics: { section: false, contour: false, rubato: false, cresc: false } }
function gains(c) {
  const ev = arrange(notesOf(c), [], ACCENT, { songId: 's', timeSignature: c.timeSignature })
  const g = new Map(ev.filter((e) => e.role === 'melody').map((e) => [e.startBeat, e.gain]))
  const top = Math.max(...g.values())
  return { g, top, strong: (b) => Math.abs(g.get(b) - top) < 1e-9 }
}

describe('ใบ#98 — a pickup no longer shifts every bar', () => {
  // 4/4 with a 1-beat pickup: real downbeats at 1, 5, 9
  const c = song('4/4', '5', '1 2 3 4', '5 4 3 2', '1 - - -')
  it('the real downbeats (1, 5, 9) get the downbeat stress; the pickup and old grid (0, 4, 8) do not', () => {
    const { strong } = gains(c)
    expect([1, 5, 9].every(strong)).toBe(true)
    expect([0, 4, 8].some(strong)).toBe(false)
  })
  it('meterRuns reads the grid off the bar lines: one run, phase 1, shift −3', () => {
    const r = meterRuns(notesOf(c), '4/4')
    expect(r.map((x) => [x.barBeats, x.phase])).toEqual([[4, 1]])
    expect(shiftOf(r[0])).toBe(-3)
  })
  it('a pickup in the MIDDLE of a song (a refrain that starts on an upbeat) re-anchors there', () => {
    const c2 = { ...c, stanzas: [...c.stanzas, { id: 'B', lines: [[seg('5 5'), { type: 'bar' }, seg('1 2 3 4'), { type: 'bar' }, seg('5 - - -')]] }],
      arrangement: [...c.arrangement, { stanza: 'B', label: 'รับ', syllables: [] }] }
    // song A = 13 beats (1 + 4 + 4 + 4) → B's pickup at 13–14, its full bars at 15 and 19
    const { strong } = gains(c2)
    expect([15, 19].every(strong)).toBe(true)
  })
})

describe('ใบ#98 — a bar stretched by a fermata hold does not shift the next bars', () => {
  it('the bar after a held note still gets its downbeat', () => {
    // bar 2 ends on 5^ held 2 extra beats (default) → bar 3 starts 2 beats later than a plain 4-beat grid
    const c = song('4/4', '1 2 3 4', '5 4 3 5^', '1 2 3 4', '5 - - -')
    const { strong } = gains(c)
    expect(strong(0) && strong(4)).toBe(true)
    expect(strong(10) && strong(14)).toBe(true) // bars 3 and 4, after the +2 hold
    expect(strong(8)).toBe(false) // the old grid's beat 8 is mid-bar now
  })
})

describe('ใบ#98 — bar length in quarter beats, not the numerator', () => {
  it('6/8 = 3 quarter beats a bar: every bar gets beat 1, and there is no mid-bar stress', () => {
    const c = song('6/8', '1_ 2_ 3_ 4_ 5_ 6_', '5_ 4_ 3_ 2_ 1_ 2_', '3_ 2_ 1_ 2_ 3_ 4_', '5. 5.')
    const { g, strong } = gains(c)
    expect([0, 3, 6, 9].every(strong)).toBe(true)
    expect(mediumOf('6/8', 3)).toBeNull()
    expect(g.get(1.5)).toBeLessThan(g.get(0)) // the 2nd dotted-quarter pulse is not a downbeat
  })
  it('2/2 = 4 quarter beats: the downbeat is stronger than the half bar (was stressed the same)', () => {
    const c = song('2/2', '1 2 3 4', '5 4 3 2')
    const { g, strong } = gains(c)
    expect(strong(0) && strong(4)).toBe(true)
    expect(g.get(2)).toBeLessThan(g.get(0))
  })
  it('3/2 = 6 quarter beats: no extra "downbeat" in the middle of the bar', () => {
    const c = song('3/2', '1 2 3 4 5 6', '6 5 4 3 2 1')
    const { strong } = gains(c)
    expect(strong(0) && strong(6)).toBe(true)
    expect(strong(3)).toBe(false)
  })
  it('9/8 = 4.5 quarter beats: the downbeat on a half beat (4.5) is still found', () => {
    const c = song('9/8', '1_ 2_ 3_ 4_ 5_ 6_ 7_ 1\'_ 2\'_', '2\'_ 1\'_ 7_ 6_ 5_ 4_ 3_ 2_ 1_')
    const { strong } = gains(c)
    expect(strong(0) && strong(4.5)).toBe(true)
  })
})

describe('ใบ#98 — the ensemble (เต็มวง) counts the song’s bars too', () => {
  const plain = (pb) => { const p = ((pb % 4) + 4) % 4; if (p < 0.01) return 1; if (Math.abs(p - 2) < 0.01) return 0.9; if (Math.abs(p - 1) < 0.01 || Math.abs(p - 3) < 0.01) return 0.8; return 0.72 }
  it('a 3/4 song: beat 1 of every 3-beat bar is the downbeat (it used to assume a 4-beat bar)', () => {
    const c = song('3/4', '1 2 3', '3 2 1', '1 2 3')
    const a = ensembleAccent(notesOf(c), '3/4', plain)
    expect([0, 3, 6].map(a)).toEqual([1, 1, 1])
    expect(a(4)).toBeLessThan(1) // the old 4-beat grid's downbeat
  })
  it('a 4/4 song with a pickup: downbeats at 1, 5', () => {
    const a = ensembleAccent(notesOf(song('4/4', '5', '1 2 3 4', '5 4 3 2')), '4/4', plain)
    expect([a(1), a(5)]).toEqual([1, 1])
    expect(a(4)).toBeLessThan(1)
  })
  it('a 4/4 song already on the grid gets exactly the old accent', () => {
    const a = ensembleAccent(notesOf(song('4/4', '1 2 3 4', '5 4 3 2')), '4/4', plain)
    for (const b of [0, 0.5, 1, 2, 3, 3.5, 4, 6, 7.25]) expect(a(b)).toBe(plain(b))
  })
})

describe('ใบ#98 เสร็จเมื่อ 3 — a song already counted right is untouched', () => {
  it('an on-grid 4/4 song is one run with no shift (the arranger takes its old path)', () => {
    const r = meterRuns(notesOf(song('4/4', '1 2 3 4', '5 4 3 2', '1 - - -')), '4/4')
    expect(r.length).toBe(1)
    expect(shiftOf(r[0])).toBe(0)
    expect(r[0].barBeats).toBe(4)
    expect(mediumOf('4/4', 4)).toBe(2) // the long-standing floor(bar/2) secondary stress, unchanged
    expect(mediumOf('3/4', 3)).toBe(1)
  })
})
