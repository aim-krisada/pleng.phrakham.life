// ใบ v3/pleng#106 — in 6/8 the bar is 2 pulses of 3 eighths, counted 1 2 3 | 4 5 6. The golden piano's
// broken-chord patterns used to treat a 6/8 bar exactly like 3/4 (same length, 3 quarter beats): arpeggio
// struck eighths 1 3 5 (a waltz) and arpeggioDense stressed only eighth 1. Now every broken pattern puts its
// main pulses on eighths 1 and 4 — 1 strongest, 4 next — and the same rule holds for 9/8 and 12/8. Mixed-
// meter songs (song 306: verses 6/8, refrain 4/4) switch exactly at the bar where the meter changes.
import { describe, it, expect } from 'vitest'
import { resolveContent } from '../songModel.js'
import { songToNotes, buildChordVoice } from '../midi.js'
import { arrange } from './index.js'
import { arpeggio, arpeggioDense, flowing, alberti, waltz, fingerpick, sustained } from './patterns.js'
import { pedal, pedalWalk, walking } from './bass.js'
import { gapFill } from './embellish.js'
import { metricAccent, easeUnderHold } from './dynamics.js'
import { pulseOf, compoundStress } from '../meterRegions.js'
import { presetCfg } from './presets.js'

const seg = (note, chord = 'C') => ({ type: 'segment', chord, note })
const bar = () => ({ type: 'bar' })
// one melody, bars in `ts`, one chord per bar
const song = (ts, bars, chords = []) => ({
  version: 2, key: 'C', timeSignature: ts,
  stanzas: [{ id: 'A', lines: [bars.flatMap((b, i) => (i ? [bar(), seg(b, chords[i] ?? 'C')] : [seg(b, chords[0] ?? 'C')]))] }],
  arrangement: [{ stanza: 'A', label: '', syllables: [] }],
})
const notesOf = (c) => songToNotes({ ...c, lines: resolveContent(c) })
const perf = (c, cfg) => {
  const notes = notesOf(c)
  return arrange(notes, buildChordVoice(notes), cfg, { songId: 't', timeSignature: c.timeSignature, keyRoot: 48 })
}
// the eighths (1-based, inside the bar that starts at `from` and lasts `L` quarter beats) a role strikes
const eighths = (evts, role, from, L) => [...new Set(evts
  .filter((e) => e.role === role && e.startBeat > from - 1e-9 && e.startBeat < from + L - 1e-9)
  .map((e) => Math.floor((e.startBeat - from) * 2 + 1e-6) + 1))].sort((a, b) => a - b) // a rolled chord counts at its eighth
// the loudest gain the role strikes at each eighth of that bar → { eighth: gain }
const gainsByEighth = (evts, role, from, L) => {
  const g = {}
  for (const e of evts) {
    if (e.role !== role || e.startBeat < from - 1e-9 || e.startBeat >= from + L - 1e-9) continue
    const k = Math.floor((e.startBeat - from) * 2 + 1e-6) + 1
    g[k] = Math.max(g[k] ?? 0, e.gain)
  }
  return g
}

// the chord alone (no tune → no referee/ease rule can remove a strike), every gain shaper off
const CHORDS = (pattern, bass = 'pedal') => ({ arranger: true, voices: 'chords', pattern, bass, humanize: false, embellish: false,
  easeUnderHold: false, dynamics: { accent: false, contour: false, rubato: false, section: false } })
const SIX = song('6/8', ['1_ 2_ 3_ 4_ 5_ 6_', '5_ 4_ 3_ 2_ 1_ 2_', '3_ 2_ 1_ 2_ 3_ 4_'], ['C', 'F', 'G'])
const THREE = song('3/4', ['1_ 2_ 3_ 4_ 5_ 6_', '5_ 4_ 3_ 2_ 1_ 2_', '3_ 2_ 1_ 2_ 3_ 4_'], ['C', 'F', 'G'])

const up = [60, 64, 67]
const rng = () => 0.5
const one = (beats, startBeat = 0) => ({ startBeat, beats })

describe('ใบ#106 เสร็จเมื่อ 1 — a 6/8 bar is not a 3/4 bar', () => {
  it('the eighths the piano strikes in a 6/8 bar and a 3/4 bar differ (arpeggio, the default แตกคอร์ด)', () => {
    const six = eighths(perf(SIX, CHORDS('arpeggio')), 'inner', 3, 3)
    const three = eighths(perf(THREE, CHORDS('arpeggio')), 'inner', 3, 3)
    expect(six).toEqual([1, 3, 4, 6]) // 1 . 3 | 4 . 6 — the pulses 1 and 4 both struck
    expect(three).toEqual([1, 3, 5]) // 1 | 3 | 5 — three quarter beats, as before
    expect(six).not.toEqual(three)
  })
  it('the same with the site’s own default settings (เปียโนบรรเลง), tune and all', () => {
    const cfg = { ...presetCfg('piano-arrangement'), voices: 'both', humanize: false }
    const six = eighths(perf(SIX, cfg), 'inner', 3, 3)
    const three = eighths(perf(THREE, cfg), 'inner', 3, 3)
    expect(six).toContain(4)
    expect(six).not.toContain(5)
    expect(three).toContain(5)
    expect(six).not.toEqual(three)
  })
  it('every broken pattern: eighth 1 strongest, eighth 4 next, the rest under them', () => {
    const m = pulseOf('6/8')
    for (const fn of [arpeggio, arpeggioDense, flowing, alberti]) {
      const ev = fn(one(3), up, 3, rng, {}, m)
      const at = (b) => Math.max(...ev.filter((e) => Math.abs(e.startBeat - b) < 0.2).map((e) => e.gain))
      const rest = ev.filter((e) => compoundStress(Math.floor(e.startBeat * 2) / 2, 3, m) === 0) // a roll's notes belong to its eighth
      expect(at(0), fn.name).toBeGreaterThan(at(1.5))
      for (const e of rest) expect(e.gain, fn.name).toBeLessThan(at(1.5))
    }
    // waltz / fingerpick leave eighth 1 to the bass (as in 4/4) — eighth 4 is still their firmest strike
    for (const fn of [waltz, fingerpick]) {
      const ev = fn(one(3), up, 3, rng, {}, m)
      expect(ev.some((e) => e.startBeat === 0), fn.name).toBe(false)
      const g4 = Math.max(...ev.filter((e) => e.startBeat === 1.5).map((e) => e.gain))
      for (const e of ev.filter((x) => x.startBeat !== 1.5)) expect(e.gain, fn.name).toBeLessThan(g4)
    }
  })
  it('arpeggioDense: all six eighths, now leaning on 1 AND 4 (3/4 leans on 1 only)', () => {
    const six = gainsByEighth(perf(SIX, CHORDS('arpeggioDense')), 'inner', 3, 3)
    const three = gainsByEighth(perf(THREE, CHORDS('arpeggioDense')), 'inner', 3, 3)
    expect(Object.keys(six).map(Number)).toEqual([1, 2, 3, 4, 5, 6])
    expect(six[1]).toBeGreaterThan(six[4])
    for (const k of [2, 3, 5, 6]) expect(six[k]).toBeLessThan(six[4])
    expect(three[4]).toBe(three[2]) // 3/4: eighth 4 is just a beat, no stress
  })
  it('after the bar accent too: eighth 1 strongest, eighth 4 next (it used to get the weakest accent)', () => {
    const cfg = { ...CHORDS('arpeggioDense'), dynamics: { accent: true, contour: false, rubato: false, section: false } }
    const g = gainsByEighth(perf(SIX, cfg), 'inner', 3, 3)
    expect(g[1]).toBeGreaterThan(g[4])
    for (const k of [2, 3, 5, 6]) expect(g[k]).toBeLessThan(g[4])
    const acc = metricAccent([0, 0.5, 1, 1.5, 2, 2.5].map((b) => ({ startBeat: b, gain: 1 })), 3, null, pulseOf('6/8'))
    expect(acc.map((e) => e.gain)).toEqual([0.92, 0.82, 0.82, 0.86, 0.82, 0.82])
  })
  it('the left hand under a held note keeps eighths 1 and 4 (6/8 used to keep only 1, plus a stray eighth 6)', () => {
    const evts = [{ role: 'melody', startBeat: 0, beats: 6 },
      ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5].map((b) => ({ role: 'inner', startBeat: b }))]
    const kept = easeUnderHold(evts, 3, 2, true, null, pulseOf('6/8')).filter((e) => e.role === 'inner').map((e) => e.startBeat)
    // the first 2 beats are not "held" yet (full comp); from there on only 1 and 4 of each bar remain
    expect(kept).toEqual([0, 0.5, 1, 1.5, 3, 4.5])
    const before = easeUnderHold(evts, 3, 2, true, null).filter((e) => e.role === 'inner').map((e) => e.startBeat)
    expect(before).toEqual([0, 0.5, 1, 1.5, 2.5, 3, 5.5]) // the old reading: 1 only, and eighth 6 rounded onto 1
  })
})

describe('ใบ#106 เสร็จเมื่อ 2 — 9/8 (3 pulses) and 12/8 (4 pulses)', () => {
  for (const [ts, L, pulses] of [['9/8', 4.5, [1, 4, 7]], ['12/8', 6, [1, 4, 7, 10]]]) {
    it(`${ts}: arpeggio strikes every pulse start (${pulses.join(' ')}), eighth 1 the strongest`, () => {
      const m = pulseOf(ts)
      const ev = arpeggio(one(L), up, L, rng, {}, m)
      const hit = ev.map((e) => Math.round(e.startBeat * 2) + 1)
      for (const p of pulses) expect(hit).toContain(p)
      const g = (k) => ev.find((e) => Math.round(e.startBeat * 2) + 1 === k).gain
      for (const p of pulses.slice(1)) expect(g(1)).toBeGreaterThan(g(p))
      for (const k of hit.filter((k) => !pulses.includes(k))) expect(g(k)).toBeLessThan(g(pulses[1]))
    })
    it(`${ts}: arpeggioDense and the bar accent lean on every pulse`, () => {
      const m = pulseOf(ts)
      const ev = metricAccent(arpeggioDense(one(L), up, L, rng, {}, m), L, undefined, m)
      const g = (k) => ev.find((e) => Math.round(e.startBeat * 2) + 1 === k).gain
      for (const p of pulses.slice(1)) {
        expect(g(1)).toBeGreaterThan(g(p))
        expect(g(p)).toBeGreaterThan(g(p + 1))
        expect(g(p)).toBeGreaterThan(g(p - 1))
      }
    })
  }
  it('a 9/8 song: the 2nd bar starts on a half beat (4.5) and is still grouped 1 4 7', () => {
    const c = song('9/8', ['1_ 2_ 3_ 4_ 5_ 6_ 7_ 1\'_ 2\'_', '2\'_ 1\'_ 7_ 6_ 5_ 4_ 3_ 2_ 1_'], ['C', 'G'])
    expect(eighths(perf(c, CHORDS('arpeggio')), 'inner', 4.5, 4.5)).toEqual([1, 3, 4, 6, 7, 9])
  })
})

describe('ใบ#106 — the bass moves by the pulse too', () => {
  const m = pulseOf('6/8')
  const ctx = (extra) => ({ cfg: {}, keyRoot: 48, beatsPerBar: 3, rng, meter: m, ...extra })
  it('ลาก+เชื่อม (pedalWalk): the step into the next chord lands on eighth 4, not eighth 5', () => {
    expect(pedalWalk(one(3), 48, ctx({ nextBass: 43 })).map((e) => e.startBeat)).toEqual([0, 1.5])
    expect(pedalWalk(one(3), 48, { ...ctx({ nextBass: 43 }), meter: null }).map((e) => e.startBeat)).toEqual([0, 2])
  })
  it('เดินเบส (walking): one note per pulse (1 4), not per quarter beat (1 3 5)', () => {
    expect(walking(one(6), 48, ctx({ nextBass: 43 })).map((e) => e.startBeat)).toEqual([0, 1.5, 3, 4.5])
    expect(walking(one(3), 48, { ...ctx({ nextBass: 43 }), meter: null }).map((e) => e.startBeat)).toEqual([0, 1, 2])
  })
  it('ลากอุ้ม (pedal) with a slash chord: the printed bass comes in on eighth 4', () => {
    expect(pedal(one(3), 48, ctx({ slashBass: 50 })).map((e) => [e.startBeat, e.midi])).toEqual([[0, 48], [1.5, 50]])
  })
  it('หยอดโน้ต (gapFill) on a held 6/8 bar lands on eighth 4', () => {
    const r = [0, 0].values()
    expect(gapFill(one(3), { up }, 3, () => r.next().value, {}, m)[0].startBeat).toBe(1.5)
  })
})

describe('ใบ#106 เสร็จเมื่อ 3 — song 306: verses 6/8, refrain 4/4, switching exactly at the bar', () => {
  // ข้อ in the song's 6/8: two full bars (0–3, 3–6). รับ in its own 4/4 (6–10, 10–14). The refrain's first
  // bar has no chord of its own, so the verse's G carries on over the meter change.
  const S306 = {
    version: 2, key: 'C', timeSignature: '6/8',
    stanzas: [
      { id: 'V', lines: [[seg('1_ 2_ 3_ 4_ 5_ 6_', 'C'), bar(), seg('5_ 4_ 3_ 2_ 1_ 2_', 'G')]] },
      { id: 'R', timeSignature: '4/4', lines: [[seg('1 2 3 4', ''), bar(), seg('5 4 3 2', 'F')]] },
    ],
    arrangement: [{ stanza: 'V', label: 'ข้อ 1', syllables: [] }, { stanza: 'R', label: 'รับ', syllables: [] }],
  }
  for (const pattern of ['arpeggio', 'arpeggioDense', 'flowing']) {
    it(`${pattern}: the last verse bar plays 6/8, the first refrain bar plays 4/4`, () => {
      const ev = perf(S306, CHORDS(pattern))
      const verse = eighths(ev, 'inner', 3, 3)
      const refrain = eighths(ev, 'inner', 6, 4)
      const want = {
        arpeggio: [[1, 3, 4, 6], [1, 3, 5, 7]],
        arpeggioDense: [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6, 7, 8]],
        flowing: [[1, 4], [1, 5]], // a roll per pulse in 6/8; every 2 quarter beats in 4/4
      }[pattern]
      expect(verse).toEqual(want[0])
      expect(refrain).toEqual(want[1])
    })
  }
  it('a chord held ACROSS the change (one chord event for both bars) is still cut at the bar', () => {
    const notes = notesOf(S306)
    const ch = buildChordVoice(notes)
    const g = ch.findIndex((e) => e.chord === 'G')
    expect(ch[g + 1].chord).toBe('G') // the sheet already splits it; glue it back into one held chord
    const glued = [...ch.slice(0, g), { ...ch[g], beats: ch[g].beats + ch[g + 1].beats }, ...ch.slice(g + 2)]
    const ev = arrange(notes, glued, CHORDS('arpeggio'), { songId: 't', timeSignature: '6/8', keyRoot: 48 })
    expect(eighths(ev, 'inner', 3, 3)).toEqual([1, 3, 4, 6])
    expect(eighths(ev, 'inner', 6, 4)).toEqual([1, 3, 5, 7])
  })
  it('the first refrain bar is stressed like 4/4 (beat 1, then beat 3), the verse bar like 6/8 (1, then 4)', () => {
    const cfg = { ...CHORDS('arpeggioDense'), dynamics: { accent: true, contour: false, rubato: false, section: false } }
    const ev = perf(S306, cfg)
    const v = gainsByEighth(ev, 'inner', 3, 3)
    const r = gainsByEighth(ev, 'inner', 6, 4)
    expect(v[1]).toBeGreaterThan(v[4])
    expect(v[4]).toBeGreaterThan(v[3])
    expect(r[1]).toBeGreaterThan(r[5])
    expect(r[5]).toBeGreaterThan(r[4]) // 4/4: beat 3 (eighth 5) is the secondary stress, eighth 4 is an off-beat
  })
})

describe('ใบ#106 เสร็จเมื่อ 4 — only 6/8, 9/8 and 12/8 are grouped this way', () => {
  it('every other meter has no compound grouping, so its patterns run their old code', () => {
    for (const ts of ['2/4', '3/4', '4/4', '2/2', '3/2', '6/4', '3/8', '5/8', '7/8', '', undefined, 4]) expect(pulseOf(ts)).toBeNull()
    expect(pulseOf('6/8')).toEqual({ pulseBeats: 1.5, pulses: 2 })
    expect(pulseOf('9/8')).toEqual({ pulseBeats: 1.5, pulses: 3 })
    expect(pulseOf('12/8')).toEqual({ pulseBeats: 1.5, pulses: 4 })
  })
  it('without a compound meter a pattern ignores the new argument entirely', () => {
    for (const fn of [arpeggio, arpeggioDense, flowing, alberti, waltz, fingerpick, sustained]) {
      expect(fn(one(3, 3), up, 3, rng, {}, null)).toEqual(fn(one(3, 3), up, 3, rng, {}))
    }
  })
})
