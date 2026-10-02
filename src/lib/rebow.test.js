// ใบ v3/pleng#98 thread 28393 — พี่เปา: เพลง 50 "เสียงหนักแล้วจริง แต่ยังฟังเหลื่อม · ให้ลงจังหวะแบบเพลง 700".
// In เต็มวง the cello re-bowed every 3 beats counted from each chord's start. That is every bar only in a
// 3-beat bar (เพลง 700, 3/4); in 4/4 the bows fell on beat 4, then beat 3 of the next bar… — 98% of 4/4
// re-bows missed beat 1 (measured 2 ต.ค. 2569 on the published songs). Now it bows on the song's OWN
// beat 1 (and on the secondary stress of a bar longer than 4 beats), wherever the chord starts.
import { describe, it, expect } from 'vitest'
import { rebowBeats, songToNotes } from './midi.js'
import { meterRuns } from './meterRegions.js'
import { resolveContent } from './songModel.js'

const run = (barBeats, phase = 0, ts) => [{ from: 0, to: 1e6, barBeats, phase, ts }]

describe('ใบ#98 thread 28393 — the ensemble cello bows on beat 1', () => {
  it('4/4: a chord held 8 beats is bowed at 0 and 4 (it was 0, 3, 6)', () => {
    expect(rebowBeats({ startBeat: 0, beats: 8 }, run(4), '4/4')).toEqual([0, 4])
  })
  it('4/4: a chord that starts mid-bar re-bows at the next beat 1, not 3 beats on', () => {
    expect(rebowBeats({ startBeat: 2, beats: 6 }, run(4), '4/4')).toEqual([2, 4])
  })
  it('3/4 (เพลง 700): a chord from beat 1 is bowed exactly as before — every 3 beats', () => {
    expect(rebowBeats({ startBeat: 0, beats: 6 }, run(3), '3/4')).toEqual([0, 3])
  })
  it('a pickup of 1.5 beats (เพลง 50): bows at 1.5, 5.5, 9.5 — the real bar starts', () => {
    expect(rebowBeats({ startBeat: 1.5, beats: 12 }, run(4, 1.5), '4/4')).toEqual([1.5, 5.5, 9.5])
  })
  it('a 6-beat bar (6/4) also bows on its secondary stress, so one bow never lasts the whole bar', () => {
    expect(rebowBeats({ startBeat: 0, beats: 12 }, run(6), '6/4')).toEqual([0, 3, 6, 9])
    expect(rebowBeats({ startBeat: 4, beats: 5 }, run(6), '6/4')).toEqual([4, 6])
  })
  it('a chord that runs into the next stretch of bars (a new pickup moves the grid) bows on THAT grid', () => {
    // เพลง 778-like: bars on phase 2 until 16, then on phase 0 → a chord 10..20 bows at 10, 14, then 16
    const runs = [{ from: 0, to: 16, barBeats: 4, phase: 2 }, { from: 16, to: 60, barBeats: 4, phase: 0 }]
    expect(rebowBeats({ startBeat: 10, beats: 10 }, runs, '4/4')).toEqual([10, 14, 16])
  })
  it('a short chord is one bow', () => {
    expect(rebowBeats({ startBeat: 0, beats: 2 }, run(4), '4/4')).toEqual([0])
  })
  it('read off a real song: a 4/4 pickup of 1.5 beats, every bow after the first is on a bar start', () => {
    const seg = (chord, note) => ({ type: 'segment', chord, note })
    const c = { version: 2, key: 'F', timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [[seg('', '5_ 1_ 3_'), { type: 'bar' }, seg('F', '5 5 6 5'), { type: 'bar' }, seg('F', '5 5 0 0'), { type: 'bar' }, seg('C', '4 4 4 4')]] }],
      arrangement: [{ stanza: 'A', label: '', syllables: [] }] }
    const notes = songToNotes({ ...c, lines: resolveContent(c) })
    const runs = meterRuns(notes, '4/4')
    expect(runs[0].phase).toBe(1.5)
    expect(rebowBeats({ startBeat: 1.5, beats: 8 }, runs, '4/4')).toEqual([1.5, 5.5])
  })
})
