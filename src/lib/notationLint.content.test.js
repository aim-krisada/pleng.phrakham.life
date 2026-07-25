// lintContent — the whole-song (v2 content) lint the inline editor shows. It is the content-level
// counterpart of lintBar/lintLine (which take a note string). The proof is DERIVED FROM THE
// EXISTING RULES, not restated: for each bar, lintContent's findings must equal lintBar on that
// bar's note string; per-line structure findings must equal lintRepeatVolta; and the bar grouping
// must match deserializeLine (the serializer's own notion of a bar) so a repeat-start boundary
// can't drift. So we never re-encode a rule here — we assert lintContent routes the SAME rules to
// the SAME located spots. (memory pleng-compare-to-model-not-intuition.)
import { describe, it, expect } from 'vitest'
import { lintContent, lintBar, lintRepeatVolta, SEVERITY } from './notationLint.js'
import { deserializeLine } from './editorSerde.js'

const seg = (note) => ({ type: 'segment', note })
const bar = () => ({ type: 'bar' })
const song = (stanzas, timeSignature = '4/4') => ({
  version: 2, timeSignature,
  stanzas,
  arrangement: stanzas.map((s) => ({ stanza: s.id })),
})
const stz = (id, ...lines) => ({ id, lines })
const bare = ({ stanzaId, lineIndex, barIndex, ...f }) => f // strip the location to compare to the raw rule
const perBar = (res) => res.findings.filter((f) => 'barIndex' in f)
const atBar = (res, li, bi) => perBar(res).filter((f) => f.lineIndex === li && f.barIndex === bi).map(bare)

describe('lintContent — per-bar findings equal lintBar, located', () => {
  it('routes each bar to lintBar and tags it with (stanzaId, lineIndex, barIndex)', () => {
    const s = song([stz('A', [seg('1 2'), bar(), seg('3')])]) // bar0 "1 2" (short beats), bar1 "3"
    const res = lintContent(s)
    expect(atBar(res, 0, 0)).toEqual(lintBar('1 2', { timeSignature: '4/4' }))
    expect(atBar(res, 0, 1)).toEqual(lintBar('3', { timeSignature: '4/4' }))
    for (const f of perBar(res)) { expect(f.stanzaId).toBe('A'); expect(f.lineIndex).toBe(0) }
  })

  it('uses the song timeSignature by default; an explicit option overrides it', () => {
    const s = song([stz('A', [seg('1 2 3')])], '3/4')
    expect(atBar(lintContent(s), 0, 0)).toEqual(lintBar('1 2 3', { timeSignature: '3/4' }))
    expect(atBar(lintContent(s, { timeSignature: '4/4' }), 0, 0)).toEqual(lintBar('1 2 3', { timeSignature: '4/4' }))
  })

  it('a clean song produces no findings (count 0, no codes)', () => {
    const s = song([stz('A', [seg('1 2 3 4')])]) // 4 beats in 4/4 = fine
    const res = lintContent(s)
    expect(res.findings).toEqual([])
    expect(res.count).toBe(0)
    expect(res.codes).toEqual([])
  })
})

describe('lintContent — bar grouping matches the serializer (no drift on repeat-start)', () => {
  it('a repeat-start starts a new bar, exactly like deserializeLine groups it', () => {
    // '@a' / '@b' are unreadable tokens → one guaranteed 'unreadable' finding per non-empty bar.
    const items = [{ type: 'repeat-start' }, seg('@a'), bar(), seg('@b'), { type: 'repeat-end', times: 2 }]
    const s = song([{ id: 'A', lines: [items] }])
    // oracle: the serializer's own bar note-strings
    const oracleBars = deserializeLine(items).bars
      .map((b) => b.segments.map((x) => x.note).join(' ').trim())
      .filter(Boolean)
    expect(oracleBars).toEqual(['@a', '@b']) // repeat-start + bar → two bars
    // lintContent must lint exactly those bars, in order
    oracleBars.forEach((noteStr, i) => {
      expect(atBar(lintContent(s), 0, i)).toEqual(lintBar(noteStr, { timeSignature: '4/4' }))
    })
  })
})

describe('lintContent — beats respect pickups/continuations (no crying wolf on an anacrusis)', () => {
  const pickup = () => ({ type: 'pickup' })
  const cont = () => ({ type: 'continue' })

  it('a plain bar that does not fill the meter IS flagged (the check still works)', () => {
    const s = song([stz('A', [seg('1 2')])]) // 2 of 4 beats, no pickup
    expect(lintContent(s).codes).toContain('beats')
  })

  it('an anacrusis pair (opening ½ + short final ½) that sums to a whole bar is NOT flagged', () => {
    // 6/8 = 3 beats/bar. Opening pickup "3_" (½) + a full bar + a short final pickup "3_ 3_ 3_ 3_ 3_"
    // (2½) → the two isolated pickups sum to 3 = one whole bar. Real hymns look exactly like this.
    const s = song([{ id: 'A', lines: [[
      pickup(), seg('3_'),                          // bar 0: opening anacrusis ½ beat  (pickup)
      { type: 'bar' }, seg('1 1 1'),                // bar 1: a full 3-beat bar
      { type: 'bar' }, pickup(), seg('3_ 3_ 3_ 3_ 3_'), // bar 2: short final 2½ beats (pickup)
    ]] }], '6/8')
    expect(lintContent(s).findings.some((f) => f.code === 'beats')).toBe(false)
  })

  it('pickup bars whose group does NOT sum to a whole bar ARE flagged', () => {
    // one isolated pickup of ½ beat, nothing to complete it → 0.5 is not a whole number of bars
    const s = song([{ id: 'A', lines: [[pickup(), seg('3_'), { type: 'bar' }, seg('1 1 1')]] }], '6/8')
    expect(lintContent(s).findings.some((f) => f.code === 'beats')).toBe(true)
  })

  it('a bar split across a line break (continuation) is checked as the joined pair, not each half', () => {
    // bar A-end "1 1" (2) + the cont line's first bar "1 1" (2) = 4 = a whole 4/4 bar → not flagged
    const s = song([
      { id: 'A', lines: [[seg('1 1 1 1'), { type: 'bar' }, seg('1 1')]] }, // last bar is only 2 beats…
      { id: 'B', lines: [[cont(), seg('1 1'), { type: 'bar' }, seg('1 1 1 1')]] }, // …completed by the cont head
    ], '4/4')
    // the join completes → NO beats finding on the A tail or the B head
    const bad = lintContent(s).findings.filter((f) => f.code === 'beats')
    expect(bad).toEqual([])
  })
})

describe('lintContent — per-line structure findings equal lintRepeatVolta, located', () => {
  it('an unbalanced repeat is surfaced on its line (no barIndex)', () => {
    const items = [seg('1'), { type: 'repeat-end' }] // a :‖ with no ‖: → imbalance
    const s = song([{ id: 'A', lines: [items] }])
    const structure = lintContent(s).findings.filter((f) => !('barIndex' in f) && f.lineIndex === 0)
    expect(structure.map(bare)).toEqual(lintRepeatVolta(items))
    expect(structure.length).toBeGreaterThan(0) // this fixture really does trip R8
  })
})

describe('lintContent — song-wide orphan repeat directives (findOrphanJumps)', () => {
  it('a D.S. with no Segno is surfaced as a ds-orphan warning (song-level, not line-tied)', () => {
    const items = [seg('1'), { type: 'jump', kind: 'ds' }] // D.S. but no 𝄋 anywhere
    const s = song([{ id: 'A', lines: [items] }])
    const orphan = lintContent(s).findings.find((f) => f.code === 'ds-orphan')
    expect(orphan).toBeTruthy()
    expect(orphan.severity).toBe(SEVERITY.WARNING)
    expect(orphan.message).toMatch(/Segno|𝄋/)
    expect('lineIndex' in orphan).toBe(false) // song-wide, carries no location
  })

  it('a complete D.S. al Coda routing raises NO orphan', () => {
    const items = [
      { type: 'jump', kind: 'segno' }, seg('1'),
      seg('2'), { type: 'jump', kind: 'to-coda' },
      seg('3'), { type: 'jump', kind: 'coda' }, { type: 'jump', kind: 'ds', al: 'coda' },
    ]
    const s = song([{ id: 'A', lines: [items] }])
    expect(lintContent(s).findings.some((f) => f.code.endsWith('-orphan'))).toBe(false)
  })
})

describe('lintContent — aggregate (the publish-gate shape EditorMode.lintSong produced)', () => {
  it('count / codes are the non-HINT tally, distinct codes, over the whole song', () => {
    const s = song([
      stz('A', [seg('1 2')]),        // short beats → WARNING 'beats'
      stz('B', [seg('@x')]),         // unreadable → ERROR 'unreadable'
    ])
    const res = lintContent(s)
    const nonHint = res.findings.filter((f) => f.severity !== SEVERITY.HINT)
    expect(res.count).toBe(nonHint.length)
    expect(res.codes.sort()).toEqual([...new Set(nonHint.map((f) => f.code))].sort())
    expect(res.codes).toContain('beats')
    expect(res.codes).toContain('unreadable')
  })

  it('HINT-severity findings never inflate the count', () => {
    const s = song([stz('A', [seg('1 2 3 4')])])
    const res = lintContent(s)
    // whatever findings exist, count == the non-HINT subset (belt + braces on the filter)
    expect(res.count).toBe(res.findings.filter((f) => f.severity !== SEVERITY.HINT).length)
  })

  it('non-v2 content (no stanzas) → empty result, never a throw', () => {
    expect(lintContent(null)).toEqual({ findings: [], count: 0, codes: [] })
    expect(lintContent({ version: 1, lines: [] })).toEqual({ findings: [], count: 0, codes: [] })
  })
})
