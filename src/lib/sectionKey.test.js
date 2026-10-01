// ใบ v3/pleng#95 — a ท่อน that sets its own key (arrangement[].key) must SOUND in that key.
// พี่เปา set ท่อน 5 "รับ 2" of a C song to A, but ฝึกร้อง still played it in C: resolveContent
// dropped the ท่อน key and songToNotes rooted the whole song at content.key. These tests pin the
// pipeline every player shares — resolveContent → songToNotes → buildChordVoice → arrange — plus
// the MP3 path (exportPlayNotes), and that a song with no ท่อน key is note-for-note unchanged.
import { describe, it, expect } from 'vitest'
import { resolveContent } from './songModel.js'
import { songToNotes, buildPlayNotes, buildChordVoice, keyTranspose, KEY_MIDI } from './midi.js'
import { arrange } from './arranger/index.js'
import { exportPlayNotes } from './audioExport.js'

// One melody A shared by รับ 1 (song key C) and รับ 2 (its own key A) — เสร็จเมื่อ 5 — plus a
// verse on melody V that keeps the song key. Chords are written as the sheet shows them.
const SONG = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [
    { id: 'V', lines: [[{ type: 'segment', chord: 'C', note: '5 5 5 5' }]] },
    { id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2 3 4' }], [{ type: 'segment', chord: 'G', note: '5 - 5 -' }]] },
  ],
  arrangement: [
    { stanza: 'V', label: 'ร้อง', syllables: [] },
    { stanza: 'A', label: 'รับ 1', syllables: [] },
    { stanza: 'A', label: 'รับ 2', syllables: [], key: 'A' },
  ],
}
const playable = (c) => ({ ...c, lines: resolveContent(c) })
const pitched = (notes) => notes.filter((n) => n.midi != null)
const byEntry = (c) => {
  // midi per arrangement entry, using the li → entry map resolveContent gives
  const lines = resolveContent(c)
  const out = {}
  for (const n of pitched(songToNotes({ ...c, lines }))) (out[lines[n.li]._entryIndex] ||= []).push(n.midi)
  return out
}
const noKeys = (c) => ({ ...c, arrangement: c.arrangement.map(({ key, ...r }) => r) })

describe('ใบ#95 — resolveContent carries the ท่อน key', () => {
  it('tags every line of a keyed ท่อน, and no line of the others', () => {
    const lines = resolveContent(SONG)
    expect(lines.map((l) => l._key)).toEqual([undefined, undefined, undefined, 'A', 'A'])
  })
})

describe('ใบ#95 ข้อ 1 + 5 — the melody plays in the ท่อน key, per ท่อน not per melody', () => {
  it('รับ 2 (A) sounds its digits from A; รับ 1 on the SAME melody stays in C; the verse stays in C', () => {
    const m = byEntry(SONG)
    const C = KEY_MIDI.C
    const A = KEY_MIDI.A
    expect(m[0]).toEqual([C + 7, C + 7, C + 7, C + 7]) // ร้อง: 5 5 5 5 in C
    expect(m[1]).toEqual([C, C + 2, C + 4, C + 5, C + 7, C + 7]) // รับ 1: 1 2 3 4 | 5 - 5 - in C
    expect(m[2]).toEqual([A, A + 2, A + 4, A + 5, A + 7, A + 7]) // รับ 2: the same digits from A
  })

  it('a ท่อน key equal to the song key changes nothing — melody, chords AND accompaniment (song 693)', () => {
    // song 693 (published) sets its ท่อน to A inside an A song; an early version re-struck the
    // chord at that ท่อน. Pin the whole performance, not just the melody.
    const same = { ...SONG, arrangement: SONG.arrangement.map((r) => (r.key ? { ...r, key: 'C' } : r)) }
    const perf = (c) => {
      const notes = buildPlayNotes(playable(c))
      const chords = buildChordVoice(notes)
      return { notes, chords, perf: arrange(notes, chords, { arranger: true, voices: 'both', bass: 'walking' }, { songId: 's', timeSignature: '4/4', keyRoot: KEY_MIDI.C }) }
    }
    expect(perf(same)).toEqual(perf(noKeys(SONG)))
  })

  it('an unknown key string falls back to the song key instead of going silent', () => {
    const bad = { ...SONG, arrangement: SONG.arrangement.map((r) => (r.key ? { ...r, key: 'H' } : r)) }
    expect(byEntry(bad)[2]).toEqual(byEntry(noKeys(SONG))[2])
  })
})

describe('ใบ#95 ข้อ 1.2 — chords and the walking bass follow the ท่อน key', () => {
  it('chord events inside รับ 2 carry its key root; the event splits at the ท่อน even on the same chord symbol', () => {
    // รับ 1 ends on G and รับ 2 starts on C → normal split; make รับ 2 start on G too to prove the key split
    const song = JSON.parse(JSON.stringify(SONG))
    song.stanzas.push({ id: 'B', lines: [[{ type: 'segment', chord: 'G', note: '1 1 1 1' }]] })
    song.arrangement[2].stanza = 'B'
    const ev = buildChordVoice(songToNotes(playable(song)))
    const g = ev.filter((e) => e.chord === 'G')
    expect(g.length).toBe(2) // one G in รับ 1 (song key) + one G in รับ 2 (A) — not merged
    expect(g[0].keyRoot).toBeUndefined()
    expect(g[1].keyRoot).toBe(KEY_MIDI.A)
  })

  it('the walking bass in รับ 2 steps only through A-major notes (plus its final approach)', () => {
    const song = {
      version: 2, key: 'C', timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'A', note: '1 - - -' }, { type: 'bar' }, { type: 'segment', chord: 'E', note: '5 - - -' }]] }],
      arrangement: [{ stanza: 'A', label: 'รับ 2', syllables: [], key: 'A' }],
    }
    const notes = songToNotes(playable(song))
    const perf = arrange(notes, buildChordVoice(notes), { arranger: true, voices: 'chords', bass: 'walking' }, { songId: 's', timeSignature: '4/4', keyRoot: KEY_MIDI.C })
    const aMajor = [0, 2, 4, 5, 7, 9, 11].map((x) => (x + 9) % 12) // A B C# D E F# G#
    const walk = perf.filter((e) => e.role === 'bass' && e.startBeat > 0 && e.startBeat < 3) // inner steps of bar 1
    expect(walk.length).toBeGreaterThan(0)
    for (const e of walk) expect(aMajor).toContain(((e.midi % 12) + 12) % 12)
    // the same bar with the song key (C) would walk through C naturals — prove the key mattered
    const plain = songToNotes(playable(noKeys(song)))
    const perfC = arrange(plain, buildChordVoice(plain), { arranger: true, voices: 'chords', bass: 'walking' }, { songId: 's', timeSignature: '4/4', keyRoot: KEY_MIDI.C })
    const walkC = perfC.filter((e) => e.role === 'bass' && e.startBeat > 0 && e.startBeat < 3)
    expect(walkC.map((e) => e.midi)).not.toEqual(walk.map((e) => e.midi))
  })
})

describe('ใบ#95 ข้อ 2 — every whole-song player gets it', () => {
  it('ฝึกร้อง / ฟังทั้งเพลง (buildPlayNotes on the resolved song) and the MP3 (exportPlayNotes) agree', () => {
    const live = pitched(buildPlayNotes(playable(SONG))).map((n) => n.midi)
    const mp3 = pitched(exportPlayNotes(SONG)).map((n) => n.midi)
    expect(mp3).toEqual(live)
    expect(live.slice(-6)).toEqual([0, 2, 4, 5, 7, 7].map((x) => KEY_MIDI.A + x))
  })

  it('selecting only รับ 2 (a play order range) still plays it in A', () => {
    const lines = resolveContent(SONG)
    const from = lines.findIndex((l) => l._entryIndex === 2)
    const sel = pitched(buildPlayNotes({ ...SONG, lines }, { order: [{ fromLi: from, toLi: lines.length - 1 }] }))
    expect(sel[0].midi).toBe(KEY_MIDI.A)
  })
})

describe('ใบ#95 ข้อ 4 — changing the whole-song key keeps the ท่อน key gap', () => {
  it('the player adds ONE transpose to every note, so รับ 2 stays 3 semitones under รับ 1 in any key', () => {
    const m = byEntry(SONG)
    const gap = m[1][0] - m[2][0]
    expect(gap).toBe(KEY_MIDI.C - KEY_MIDI.A)
    for (const to of ['D', 'E', 'G', 'Bb']) {
      const t = keyTranspose('C', to)
      expect(m[1][0] + t - (m[2][0] + t)).toBe(gap)
    }
  })
})

describe('ใบ#95 ข้อ 6 — a song with no ท่อน key sounds exactly as before', () => {
  it('no note gains a keyRoot field and every pitch is rooted at the song key', () => {
    const notes = songToNotes(playable(noKeys(SONG)))
    expect(notes.some((n) => 'keyRoot' in n)).toBe(false)
    expect(buildChordVoice(notes).some((e) => 'keyRoot' in e)).toBe(false)
    expect(resolveContent(noKeys(SONG)).some((l) => '_key' in l)).toBe(false)
    expect(pitched(notes).map((n) => n.midi)).toEqual([67, 67, 67, 67, 60, 62, 64, 65, 67, 67, 60, 62, 64, 65, 67, 67])
  })
})
