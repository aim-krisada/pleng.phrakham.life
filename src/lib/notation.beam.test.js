// issue8 — GOLDEN tests for syllable-based beaming (DoD ชั้น 2ก · Tier A, no layout).
// beamGroups(note, syllables) connects the underlines of consecutive eighth/sixteenth notes
// into ONE beam only while the later note is a เอื้อน (blank syllable = same word); a note
// that starts a NEW word breaks the beam even mid-beat. These cases are the acceptance
// criteria — they must stay green forever (a future "beam by beat" regression fails here).
import { describe, it, expect } from 'vitest'
import { beamGroups } from './notation.js'

// beams as compact [start,end] pairs for readable assertions
const runs = (note, syl) => beamGroups(note, syl).beams.map((b) => [b.start, b.end])

describe('beamGroups — syllable-based beaming (issue8)', () => {
  // รูป1: within one beat, "คว้า"(1_) + a เอื้อน(2_) → they join; the earlier ".6_" (own
  // word, its own beat) stays a lone note. This is the case that was ALREADY correct
  // (beat edge happened to coincide with the word edge) — it must NOT change.
  it('รูป1: คว้า + เอื้อน join into one beam; the neighbour stays alone', () => {
    // idx: 1.(0) .6_(1) 1_(2) 2_(3) 3(4)  →  beam over 1_(2)–2_(3)
    expect(runs('1. .6_ 1_ 2_ 3', ['ต้อง', 'ไขว่', 'คว้า', '', 'เสาะ'])).toEqual([[2, 3]])
  })

  // รูป2: "อา"(1_) and "ภรณ์"(.6_) are TWO words that fall in the same beat — the old
  // beat-only rule wrongly joined them. Two words → no beam.
  it('รูป2: two words in one beat do NOT beam', () => {
    expect(runs('1 1_ .6_ 1 2', ['ใส่', 'อา', 'ภรณ์', 'งาม', 'นัก'])).toEqual([])
  })

  // รูป3: "ไม่"(3_) + "เคย"(2_) — two words in one beat, again must stay split.
  it('รูป3: ไม่ + เคย do NOT beam (two words)', () => {
    expect(runs('5 3 - 3_ 2_', ['น-', 'ภา', '', 'ไม่', 'เคย'])).toEqual([])
  })

  // issues2 remains covered automatically: "(6_ 5_)" on "ดี" + เอื้อน → one beam over the
  // pair (and NoteRow suppresses its arc — asserted in NoteRow.test.js).
  it('issues2: a within-beat เอื้อน "(6_ 5_)" is ONE beam', () => {
    // idx: 6_(0) 5_(1) — brackets bear no idx
    expect(runs('(6_ 5_)', ['ดี', ''])).toEqual([[0, 1]])
  })

  it('every-note-its-own-word never beams, however many notes', () => {
    // 3(quarter) fills beat 1; "- 3_ 4_" ... every note its own word → all split
    expect(runs('3 - 3_ 4_ 5_ 6_', ['a', '', 'b', 'c', 'd', 'e'])).toEqual([])
  })

  // --- B120 (พี่เปา, 23 ก.ค.): a เอื้อน beam is NOT cut by the beat edge ------------------
  // "เกิน 2 ช่อง เส้นไม่ลากติดกัน … ไม่ว่ากี่ช่อง ถ้าร้องเอื้อนหรือเว้นช่องเนื้อ ต้องลากเส้นให้ต่อกัน".
  // Reference songbook #698 line 2 is the golden case: `5 4 3` under ONE line ACROSS the beat
  // edge, then a SEPARATE line under `2` — because `2` is where the next word (พระ) starts.
  it('รูป698: 5 4 3 beam as one across the beat edge; 2 (new word) breaks it', () => {
    expect(runs('5_ 4_ 3_ 2_', ['วิต', '', '', 'พระ'])).toEqual([[0, 2]])
  })

  it('a เอื้อน run is unbroken at ANY length (3 · 4 · 6 slots)', () => {
    expect(runs('5_ 4_ 3_', ['คำ', '', ''])).toEqual([[0, 2]])
    expect(runs('5_ 4_ 3_ 2_', ['คำ', '', '', ''])).toEqual([[0, 3]])
    expect(runs('5_ 4_ 3_ 2_ 1_ 6_', ['คำ', '', '', '', '', ''])).toEqual([[0, 5]])
  })

  it('blank word slots mid-run do not cut the beam (the pink empty boxes)', () => {
    expect(runs('5_ 4_ 3_ 2_ 1_', ['วิต', '', '', '', 'พระ'])).toEqual([[0, 3]])
  })

  it('a beam never crosses a bar line', () => {
    // `|` is dropped by parseNotes, so the barrier is explicit (barBreakIdx)
    expect(runs('1_ 2_ | 3_ 4_', ['ก', '', '', ''])).toEqual([
      [0, 1],
      [2, 3],
    ])
    expect(runs('1_ 2_ 3_ | 4_ 5_ 6_', ['ก', '', '', '', '', ''])).toEqual([
      [0, 2],
      [3, 5],
    ])
  })

  it('a rest / extension still cuts a long เอื้อน run', () => {
    expect(runs('1_ 2_ 0 3_ 4_', ['ก', '', '', '', ''])).toEqual([
      [0, 1],
      [3, 4],
    ])
  })

  it('a เอื้อน run of three within one beat beams all three', () => {
    // 4 sixteenths in beat 0, first has the word, rest blank → one beam over all four
    expect(runs('1__ 2__ 3__ 4__', ['คำ', '', '', ''])).toEqual([[0, 3]])
    // and it is flagged u2 (double beam) since they are sixteenths
    expect(beamGroups('1__ 2__ 3__ 4__', ['คำ', '', '', '']).beams[0].u2).toBe(true)
  })

  it('v1 fallback: no syllables → beat-only beaming, unchanged', () => {
    expect(runs('3_ 4_', null)).toEqual([[0, 1]]) // same beat, both eighths → one beam
    expect(runs('1 1_ .6_ 1 2', null)).toEqual([[1, 2]]) // old beat-only would join 1_ .6_
  })

  it('groups + beamed flags are stamped for NoteRow (beamOnly suppression)', () => {
    const { groups } = beamGroups('(6_ 5_)', ['ดี', ''])
    const slur = groups.find((g) => g.group === 'slur')
    expect(slur.tokens.every((t) => t.beamed)).toBe(true) // → NoteRow drops the arc
  })

  it('lone eighth / eighth+quarter never beam', () => {
    expect(runs('1_ 2', ['a', 'b'])).toEqual([])
    expect(runs('5', ['a'])).toEqual([])
  })

  it('triplets are not swept into beam runs', () => {
    expect(runs('{1_ 2_ 3_}', ['a', 'b', 'c'])).toEqual([])
  })
})
