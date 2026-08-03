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

  it('a เอื้อน run that crosses a beat edge breaks at the edge, not into one long beam', () => {
    // 3(quarter) fills beat 1; "- 3_ 4_" ... every note its own word → all split
    expect(runs('3 - 3_ 4_ 5_ 6_', ['a', '', 'b', 'c', 'd', 'e'])).toEqual([])
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

// --- B110 — GOLDEN tests: one beam bar PER LEVEL ---------------------------------------
// พี่เปา: "พิมพ์ขเบ็ด 1 ชั้น แต่โชว์เป็น 2 ชั้น". The old code collapsed a run to a single
// `u2` flag, so ONE sixteenth in a run thickened the whole run. beamGroups now returns a
// `levels` structure: level 1 spans the whole run, each higher level spans only the notes
// that really own it, and a lone note at a level gets a PARTIAL beam (ขีดหัก) pointing at
// the note it is beamed to. These cases are B110's acceptance criteria.
const levels = (note, syl) =>
  beamGroups(note, syl).beams.map((b) =>
    b.levels.map((l) => `L${l.level}:${l.start}-${l.end}${l.partial ? '/' + l.partial : ''}`),
  )

describe('beamGroups — beam levels (B110)', () => {
  // เพลง 751 ข้อ 1 ห้อง "7. 1" — dotted eighth (1 underline) beamed to a sixteenth (2).
  // Level 1 must still span BOTH; level 2 must touch only the sixteenth, as a stub.
  it('.7_. 1__ — level 1 over the whole run, level 2 a LEFT stub on the sixteenth only', () => {
    expect(levels('.7_. 1__', null)).toEqual([['L1:0-1', 'L2:1-1/left']])
  })

  // mirrored: the sixteenth leads, so its stub must point RIGHT (into the beam)
  it('1__ .7_. — the stub flips to RIGHT when the sixteenth starts the run', () => {
    expect(levels('1__ .7_.', null)).toEqual([['L1:0-1', 'L2:0-0/right']])
  })

  // a lone sixteenth in the MIDDLE has a note before it in the run → points left
  it('5_ 6__ 7_ — a sixteenth between two eighths gets a LEFT stub', () => {
    expect(levels('5_ 6__ 7_', null)).toEqual([['L1:0-2', 'L2:1-1/left']])
  })

  // A4 — no regression: a uniform run keeps exactly the shape it had before B110
  it('all eighths → level 1 only (unchanged)', () => {
    expect(levels('5_ 6_', null)).toEqual([['L1:0-1']])
  })

  it('all sixteenths → level 1 and level 2 both span the whole run (unchanged double beam)', () => {
    expect(levels('1__ 2__ 3__ 4__', null)).toEqual([['L1:0-3', 'L2:0-3']])
  })

  // two ADJACENT sixteenths are a real span, never two stubs
  it('1_ 2__ 3__ — adjacent sixteenths give one FULL level-2 span, not partials', () => {
    expect(levels('1_ 2__ 3__', null)).toEqual([['L1:0-2', 'L2:1-2']])
  })

  // The level walk is written for ANY depth, but parseNotes hard-caps underlines at 2
  // (notation.js:46 `while (s[j] === '_' && underlines < 2)`), so 3 underlines is not
  // reachable from a note string today. Pin that cap here: if it is ever raised, this test
  // fails and whoever raises it must also check the level-3 geometry in NoteRow.
  it('parseNotes caps underlines at 2, so no level 3 can be produced today', () => {
    expect(levels('1_ 2___', null)).toEqual([['L1:0-1', 'L2:1-1/left']])
  })

  // the legacy flag is still exported (callers/tests that only ask "any sixteenth?")
  it('u2 stays available for legacy callers but no longer drives drawing', () => {
    const b = beamGroups('.7_. 1__', null).beams[0]
    expect(b.u2).toBe(true)
    expect(b.levels.length).toBe(2)
  })
})
