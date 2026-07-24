// songStructure.js — the inline editor's STRUCTURE + COPY/PASTE engine. Every expected result
// is derived from the v2 model (slot counts, id sets), never hard-copied, so a model change that
// breaks an assumption fails here. The headline is the RE-MINT guard: a structural copy that
// carries a repeat/marker must produce NEW ids so no two markers share one (silent wrong playback).
import { describe, it, expect } from 'vitest'
import {
  addVerse, deleteVerse, moveVerse, moveVerseBy, duplicateVerse, setVerseStanza, makeVerseUnique,
  addStanza, removeStanza,
  copyBar, copyLine, pasteBarInLine, pasteLineInStanza, pasteLineAsStanza,
  duplicateBar, duplicateLine, moveBar, moveLine,
  lineSlotLen, lineSlotStart,
} from './songStructure.js'
import { allMarkerIds, findOrphanFlows, mintMarkerIds } from './songFlow.js'
import { resolveContent } from './songModel.js'
import { syllableSlots } from './notation.js'

// ---- fixtures -------------------------------------------------------------------------
// one melody A (2 lines: 3 + 2 notes), two verses that share it with distinct words.
const shared = () => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [
    [{ type: 'segment', chord: 'C', note: '1 2 3' }],
    [{ type: 'segment', chord: 'F', note: '4 5' }],
  ] }],
  arrangement: [
    { stanza: 'A', label: 'ข้อ 1', syllables: ['a', 'b', 'c', 'd', 'e'] },
    { stanza: 'A', label: 'ข้อ 2', syllables: ['p', 'q', 'r', 's', 't'] },
  ],
})

// a melody whose line carries a ‖: … :‖ repeat (id r1) AND a *** marker (id m1); verse 2 skips
// the repeat via flow → proves a paste must not clone r1.
const marked = () => mintMarkerIds({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [
    [{ type: 'repeat-start' }, { type: 'marker', label: '***' },
      { type: 'segment', chord: 'C', note: '1 2' }, { type: 'repeat-end', times: 2 }],
  ] }],
  arrangement: [
    { stanza: 'A', label: 'ข้อ 1', syllables: ['a', 'b'] },
    { stanza: 'A', label: 'ข้อ 2', syllables: ['c', 'd'] },
  ],
}).content

// notes of a stored line (segment items only)
const notesOf = (line) => (line || []).filter((it) => it.type === 'segment').map((it) => it.note)
// every marker id in the song, and a helper to read one stanza's repeat pair ids
const idsIn = (content) => [...allMarkerIds(content)]
function repeatIdsOfStanza(content, sid) {
  const s = content.stanzas.find((x) => x.id === sid)
  const out = []
  for (const line of s.lines) for (const it of line) if (it.type === 'repeat-start' || it.type === 'repeat-end') out.push(it.id)
  return out
}

// ======================================================================================
describe('section (arrangement) ops', () => {
  it('addVerse inserts after, inherits the neighbour melody, empty words', () => {
    const c = addVerse(shared(), 0)
    expect(c.arrangement.length).toBe(3)
    expect(c.arrangement[1].stanza).toBe('A') // inherited
    expect(c.arrangement[1].syllables).toEqual([]) // empty
    expect(c.arrangement[2].label).toBe('ข้อ 2') // original row 2 pushed down
  })
  it('deleteVerse removes one, never drops below one section', () => {
    let c = deleteVerse(shared(), 1)
    expect(c.arrangement.map((r) => r.label)).toEqual(['ข้อ 1'])
    c = deleteVerse(c, 0)
    expect(c.arrangement.length).toBe(1) // re-seeded, not empty
    expect(c.arrangement[0].stanza).toBe('A')
  })
  it('moveVerse / moveVerseBy reorder', () => {
    expect(moveVerse(shared(), 0, 1).arrangement.map((r) => r.label)).toEqual(['ข้อ 2', 'ข้อ 1'])
    expect(moveVerseBy(shared(), 1, -1).arrangement.map((r) => r.label)).toEqual(['ข้อ 2', 'ข้อ 1'])
    expect(moveVerse(shared(), 0, 0)).toEqual(shared()) // no-op returns equivalent
  })
  it('duplicateVerse makes a true copy (words + melody), drops afterEachVerse', () => {
    const base = shared()
    base.arrangement[0].afterEachVerse = true
    const c = duplicateVerse(base, 0)
    expect(c.arrangement.length).toBe(3)
    expect(c.arrangement[1].syllables).toEqual(['a', 'b', 'c', 'd', 'e']) // words copied
    expect(c.arrangement[1].stanza).toBe('A') // same melody (share)
    expect(c.arrangement[1].afterEachVerse).toBeUndefined() // never two refrains
  })
  it('setVerseStanza retags melody; ignores unknown melody id', () => {
    const two = addStanza(shared()) // adds melody B
    const c = setVerseStanza(two, 1, 'B')
    expect(c.arrangement[1].stanza).toBe('B')
    expect(setVerseStanza(two, 1, 'ZZ')).toBe(two) // unknown → same ref (no-op)
  })
})

describe('makeVerseUnique (แยกทำนอง)', () => {
  it('clones the melody to a fresh id and repoints only that section', () => {
    const c = makeVerseUnique(shared(), 1)
    expect(c.stanzas.map((s) => s.id)).toEqual(['A', 'B'])
    expect(c.arrangement[0].stanza).toBe('A') // sister untouched
    expect(c.arrangement[1].stanza).toBe('B') // now independent
    expect(notesOf(c.stanzas[1].lines[0])).toEqual(['1 2 3']) // same melody content
  })
  it('the clone gets NEW marker ids — never shares the original repeat id', () => {
    const c = makeVerseUnique(marked(), 1)
    const aIds = repeatIdsOfStanza(c, 'A')
    const bIds = repeatIdsOfStanza(c, c.stanzas[1].id)
    expect(new Set(aIds).size).toBe(1) // A's pair still one shared id
    expect(new Set(bIds).size).toBe(1) // clone's pair one shared id
    expect(aIds[0]).not.toBe(bIds[0]) // …but a DIFFERENT id from A
    expect(new Set(idsIn(c)).size).toBeGreaterThanOrEqual(4) // r + m for each of the 2 melodies
  })
})

describe('melody (stanza) list ops', () => {
  it('addStanza appends an empty melody with a fresh id', () => {
    const c = addStanza(shared())
    expect(c.stanzas.map((s) => s.id)).toEqual(['A', 'B'])
    expect(lineSlotLen(c.stanzas[1].lines[0])).toBe(0) // empty
  })
  it('removeStanza drops the melody + its sections, keeps ≥1 of each', () => {
    let c = addStanza(shared()) // A + empty B
    c = setVerseStanza(c, 1, 'B') // verse 2 → B
    c = removeStanza(c, 'A') // drop A and verse 1
    expect(c.stanzas.map((s) => s.id)).toEqual(['B'])
    expect(c.arrangement.length).toBe(1)
    expect(c.arrangement[0].stanza).toBe('B')
    expect(removeStanza({ ...shared() }, 'A')).toEqual(shared()) // last melody → refuse
  })
})

// ======================================================================================
describe('copy / paste — bars & lines (melody only, words never follow)', () => {
  it('copyLine → pasteLineAsStanza: new melody holds the copied notes, words unchanged', () => {
    const frag = copyLine(shared(), { stanzaId: 'A', lineIndex: 0 })
    expect(frag.kind).toBe('line')
    const c = pasteLineAsStanza(shared(), frag)
    expect(c.stanzas.length).toBe(2)
    expect(notesOf(c.stanzas[1].lines[0])).toEqual(['1 2 3'])
    expect(c.arrangement.map((r) => r.syllables)).toEqual([['a', 'b', 'c', 'd', 'e'], ['p', 'q', 'r', 's', 't']])
  })
  it('copyLine → pasteLineInStanza: appended to a melody, no word ripple', () => {
    const frag = copyLine(shared(), { stanzaId: 'A', lineIndex: 0 })
    const c = pasteLineInStanza(shared(), 'A', frag)
    expect(c.stanzas[0].lines.map((l) => notesOf(l)[0])).toEqual(['1 2 3', '4 5', '1 2 3'])
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c', 'd', 'e']) // unshifted
  })
  it('copyBar → pasteBarInLine: the bar lands at the end of the chosen line', () => {
    const frag = copyBar(shared(), { stanzaId: 'A', lineIndex: 0, barOrdinal: 0 })
    expect(frag.kind).toBe('bar')
    const c = pasteBarInLine(shared(), 'A', 1, frag) // paste "1 2 3" bar onto line 2 ("4 5")
    expect(notesOf(c.stanzas[0].lines[1])).toEqual(['4 5', '1 2 3'])
    expect(notesOf(c.stanzas[0].lines[0])).toEqual(['1 2 3']) // source untouched
  })
  it('bad address → null fragment / same content ref', () => {
    expect(copyLine(shared(), { stanzaId: 'Z', lineIndex: 0 })).toBeNull()
    expect(copyBar(shared(), { stanzaId: 'A', lineIndex: 0, barOrdinal: 9 })).toBeNull()
    const base = shared()
    expect(pasteLineInStanza(base, 'A', { kind: 'bar' })).toBe(base) // wrong-kind fragment = no-op
    expect(pasteBarInLine(base, 'A', 0, { kind: 'line' })).toBe(base)
  })
})

describe('duplicate / move — words follow the melody', () => {
  it('duplicateLine copies the line AND every verse gains the duplicated word slice', () => {
    const c = duplicateLine(shared(), 'A', 0) // line 0 bears slots 0..2 (a b c / p q r)
    expect(c.stanzas[0].lines.map((l) => notesOf(l)[0])).toEqual(['1 2 3', '1 2 3', '4 5'])
    // each verse's first-line words are duplicated in place, then line-2 words follow
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'd', 'e'])
    expect(c.arrangement[1].syllables).toEqual(['p', 'q', 'r', 'p', 'q', 'r', 's', 't'])
  })
  it('moveLine swaps melody lines AND carries each verse word slice', () => {
    const c = moveLine(shared(), 'A', 0, 1) // swap line0(3) <-> line1(2)
    expect(c.stanzas[0].lines.map((l) => notesOf(l)[0])).toEqual(['4 5', '1 2 3'])
    expect(c.arrangement[0].syllables).toEqual(['d', 'e', 'a', 'b', 'c']) // line2 words up, line1 down
    expect(c.arrangement[1].syllables).toEqual(['s', 't', 'p', 'q', 'r'])
  })
  it('duplicateBar opens blank word slots so later words stay aligned', () => {
    // single verse, one line "1 2 3" with words a b c; duplicate bar 0 → 3 blank slots inserted
    const one = { version: 2, key: 'C', stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1 2 3' }]] }],
      arrangement: [{ stanza: 'A', label: '', syllables: ['a', 'b', 'c'] }] }
    const c = duplicateBar(one, 'A', 0, 0)
    expect(notesOf(c.stanzas[0].lines[0])).toEqual(['1 2 3', '1 2 3'])
    // original 3 words keep their notes; the copy's 3 slots are blank (trailing blanks trimmed away)
    expect(c.arrangement[0].syllables).toEqual(['a', 'b', 'c'])
  })
  it('moveBar hops to the next line at a line edge', () => {
    const c = moveBar(shared(), 'A', 0, 0, 1) // line0 has ONE bar → moving right hops it to line1 front
    expect(notesOf(c.stanzas[0].lines[0])).toEqual([]) // emptied line keeps ≥1 (empty) bar
    expect(notesOf(c.stanzas[0].lines[1])).toEqual(['1 2 3', '4 5'])
  })
})

// ======================================================================================
// THE HEADLINE — marker ids MUST re-mint on paste (silent-wrong-playback guard)
// ======================================================================================
describe('RE-MINT on paste (non-negotiable AC)', () => {
  it('pasting a line with a repeat + marker mints NEW ids — no id shared by two markers', () => {
    const src = marked()
    const srcIds = idsIn(src) // e.g. r1 (pair) + m1
    const frag = copyLine(src, { stanzaId: 'A', lineIndex: 0 })
    const c = pasteLineAsStanza(src, frag)

    // (1) the ORIGINAL melody's ids are untouched
    expect(idsIn(src)).toEqual(srcIds)
    // (2) the pasted melody's repeat pair shares ONE id, distinct from the original's
    const aRep = repeatIdsOfStanza(c, 'A')
    const bRep = repeatIdsOfStanza(c, c.stanzas[1].id)
    expect(new Set(aRep).size).toBe(1)
    expect(new Set(bRep).size).toBe(1)
    expect(aRep[0]).not.toBe(bRep[0]) // ← the whole point: NOT a duplicated id
    // (3) every id in the song is used by exactly one logical marker (a repeat pair counts once):
    //     total distinct ids == 2 melodies × (1 repeat + 1 marker) = 4
    expect(new Set(idsIn(c)).size).toBe(4)
  })

  it('a verse flow that referenced the original repeat still resolves (no orphan, no ambiguity)', () => {
    // verse 2 skips the ORIGINAL repeat r1
    let src = marked()
    const r1 = repeatIdsOfStanza(src, 'A')[0]
    src = { ...src, arrangement: src.arrangement.map((r, i) => (i === 1 ? { ...r, flow: { skip: [r1] } } : r)) }
    expect(findOrphanFlows(src)).toEqual([]) // sanity: flow valid before paste

    const frag = copyLine(src, { stanzaId: 'A', lineIndex: 0 })
    const c = pasteLineAsStanza(src, frag)

    // the skip still points ONLY at r1, which still exists exactly once → unambiguous play order
    expect(c.arrangement[1].flow.skip).toEqual([r1])
    expect(findOrphanFlows(c)).toEqual([]) // no dangling reference introduced by the paste
    const r1Count = c.stanzas.flatMap((s) => s.lines.flat())
      .filter((it) => (it.type === 'repeat-start' || it.type === 'repeat-end') && it.id === r1).length
    expect(r1Count).toBe(2) // exactly the ORIGINAL pair (start+end) — the copy got a different id
  })

  it('mint is idempotent — re-running changes nothing (round-trip stable)', () => {
    const c = pasteLineAsStanza(marked(), copyLine(marked(), { stanzaId: 'A', lineIndex: 0 }))
    expect(mintMarkerIds(c).changed).toBe(false)
  })

  it('duplicateLine of a marked line also re-mints (in-place duplicate)', () => {
    const c = duplicateLine(marked(), 'A', 0)
    const reps = c.stanzas[0].lines.flat().filter((it) => it.type === 'repeat-start').map((it) => it.id)
    expect(reps.length).toBe(2) // two repeat-starts now
    expect(reps[0]).not.toBe(reps[1]) // …with distinct ids
    expect(findOrphanFlows(c)).toEqual([])
  })
})

describe('slot helpers derive from the model', () => {
  it('lineSlotLen counts syllable-bearing boxes; lineSlotStart accumulates', () => {
    const lines = shared().stanzas[0].lines
    expect(lineSlotLen(lines[0])).toBe(syllableSlots('1 2 3'))
    expect(lineSlotStart(lines, 1)).toBe(lineSlotLen(lines[0]))
  })
})
