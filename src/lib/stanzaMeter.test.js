// ใบ v3/pleng#96 — a MELODY can set its own meter (stanzas[].timeSignature). Song 306 รักปรารถนา: ข้อ is
// 6/8, รับ is 4/4 (book p.361). Unset = the song's meter, and a song with no melody meter must come out
// exactly as before (the all-songs comparison in the PR covers that; the last block here pins it too).
import { describe, it, expect } from 'vitest'
import { resolveContent } from './songModel.js'
import { songToNotes, buildChordVoice } from './midi.js'
import { arrange } from './arranger/index.js'
import { meterRegions, regionAt, origin } from './meterRegions.js'
import { exportPlayNotes } from './audioExport.js'

const seg = (note, chord = 'C') => ({ type: 'segment', chord, note })
const bar = () => ({ type: 'bar' })
// ข้อ (song meter 3/4): two full bars · รับ (own 4/4): a 1-beat pickup, then two full bars
const SONG = {
  version: 2,
  key: 'C',
  timeSignature: '3/4',
  stanzas: [
    { id: 'V', lines: [[seg('1 2 3'), bar(), seg('3 2 1')]] },
    { id: 'R', timeSignature: '4/4', lines: [[{ type: 'pickup' }, seg('5', 'G'), bar(), seg('1 2 3 4'), bar(), seg('5 4 3 2', 'F')]] },
  ],
  arrangement: [
    { stanza: 'V', label: 'ข้อ 1', syllables: [] },
    { stanza: 'R', label: 'รับ', syllables: [] },
    { stanza: 'V', label: 'ข้อ 2', syllables: [] },
  ],
}
const noMeter = (c) => ({ ...c, stanzas: c.stanzas.map(({ timeSignature, ...s }) => s) })
const playable = (c) => ({ ...c, lines: resolveContent(c) })
const sectionMarkers = (c) => resolveContent(c).map((l) => l.find((it) => it.type === 'section')).filter(Boolean)

describe('ใบ#96 — resolveContent carries the melody meter', () => {
  it('lines of the 4/4 melody are tagged; the song-meter lines are not', () => {
    expect(resolveContent(SONG).map((l) => l._ts)).toEqual([undefined, '4/4', undefined])
  })
  it('the sheet gets the meter where it CHANGES: 4/4 on รับ, back to 3/4 on ข้อ 2, none on ข้อ 1', () => {
    expect(sectionMarkers(SONG).map((m) => [m.name, m.meter])).toEqual([['ข้อ 1', undefined], ['รับ', '4/4'], ['ข้อ 2', '3/4']])
  })
  it('a song whose first melody sets a meter other than the song meter shows it on the first ท่อน', () => {
    const c = { ...SONG, arrangement: [SONG.arrangement[1], SONG.arrangement[0]] }
    expect(sectionMarkers(c).map((m) => m.meter)).toEqual(['4/4', '3/4'])
  })
})

describe('ใบ#96 — notes and chords carry it', () => {
  it('only the รับ notes are stamped ts 4/4', () => {
    const n = songToNotes(playable(SONG))
    expect(n.filter((x) => x.ts === '4/4').length).toBe(9) // pickup + 4 + 4
    expect(n.filter((x) => x.ts && x.ts !== '4/4').length).toBe(0)
  })
  it('a chord never straddles two meters — the event splits where รับ starts, even on the same symbol', () => {
    const c = JSON.parse(JSON.stringify(SONG))
    c.stanzas[1].lines[0][1].chord = 'C' // รับ's pickup on the SAME chord the verse ends on
    const ev = buildChordVoice(songToNotes(playable(c)))
    const cs = ev.filter((e) => e.chord === 'C')
    expect(cs.some((e) => e.ts === '4/4')).toBe(true)
    expect(cs.some((e) => !e.ts)).toBe(true)
  })
})

describe('ใบ#96 — meterRegions finds the real downbeat', () => {
  it('รับ starts at beat 6 with a 1-beat pickup → its first full bar (the downbeat) is beat 7', () => {
    const r = meterRegions(songToNotes(playable(SONG)))
    expect(r.length).toBe(1)
    expect(r[0]).toMatchObject({ ts: '4/4', from: 6, to: 15, downbeat: 7, barBeats: 4 })
    expect(origin(r[0], 4)).toBe(3) // moved back by whole bars to ≤ 6 → (beat − 3) is never negative
    expect(regionAt(r, 5)).toBeNull()
    expect(regionAt(r, 7)).toBe(r[0])
  })
  it('a seek into the middle of รับ still anchors on a full bar, not on the cut', () => {
    const all = songToNotes(playable(SONG))
    const sliced = all.slice(all.findIndex((n) => n.ts) + 2) // start inside รับ's first full bar
    const r = meterRegions(sliced)
    // first full bar left in the slice is รับ bar 2: beats from the slice start 0..2 are bar-1 leftovers (3 notes)
    expect(r[0].downbeat).toBe(3)
  })
  it('a song with no melody meter has no region at all', () => {
    expect(meterRegions(songToNotes(playable(noMeter(SONG))))).toEqual([])
  })
})

describe('ใบ#96 เสร็จเมื่อ 3 — the accompaniment accents the melody’s own bars', () => {
  // accent only: everything else that shapes gain is switched off, so a melody note's gain is its
  // bar-position factor (downbeat 0.92 · mid-bar 0.86 · other beats 0.82)
  const CFG = { arranger: true, voices: 'melody', humanize: false, easeUnderHold: false, lockDownbeats: false,
    dynamics: { section: false, contour: false, rubato: false, cresc: false } }
  const gainsAt = (c) => {
    const notes = songToNotes(playable(c))
    const ev = arrange(notes, [], CFG, { songId: 's', timeSignature: c.timeSignature })
    return new Map(ev.filter((e) => e.role === 'melody').map((e) => [e.startBeat, e.gain]))
  }
  it('รับ in 4/4: beats 7 and 11 (its downbeats) are the strongest; the song-meter 3/4 count (9, 12) is not', () => {
    const g = gainsAt(SONG)
    const top = Math.max(...[...g.entries()].filter(([b]) => b >= 6 && b < 15).map(([, v]) => v))
    expect(g.get(7)).toBeCloseTo(top, 9)
    expect(g.get(11)).toBeCloseTo(top, 9)
    expect(g.get(9)).toBeLessThan(top)
    expect(g.get(12)).toBeLessThan(top)
    // mid-bar of 4/4 (beat 3 of the bar → 9 and 13) is the secondary stress
    expect(g.get(9)).toBeGreaterThan(g.get(8))
  })
  it('without the melody meter the same notes are counted in 3/4 from beat 0 (what the song did before)', () => {
    const g = gainsAt(noMeter(SONG))
    const top = Math.max(...g.values())
    expect(g.get(9)).toBeCloseTo(top, 9)
    expect(g.get(12)).toBeCloseTo(top, 9)
    expect(g.get(7)).toBeLessThan(top)
  })
  it('the verse after รับ is back on the song meter and unchanged', () => {
    const a = gainsAt(SONG)
    const b = gainsAt(noMeter(SONG))
    for (const beat of [0, 1, 2, 3, 4, 5]) expect(a.get(beat)).toBeCloseTo(b.get(beat), 12)
  })
})

describe('ใบ#96 เสร็จเมื่อ 5 — no melody meter → exactly as before', () => {
  it('no _ts, no ts, no meter on markers, and the MP3 path equals live', () => {
    const c = noMeter(SONG)
    expect(resolveContent(c).some((l) => '_ts' in l)).toBe(false)
    expect(sectionMarkers(c).some((m) => 'meter' in m)).toBe(false)
    expect(songToNotes(playable(c)).some((n) => 'ts' in n)).toBe(false)
    expect(exportPlayNotes(c)).toEqual(songToNotes(playable(c)))
  })
})
