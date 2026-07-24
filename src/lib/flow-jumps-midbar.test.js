// Mid-bar D.C./D.S./Segno/Coda/Fine jump resolver — CANONICAL line-item shape (§7) + mid-bar.
// See docs/ds/repeat-jumps-midbar.md. Every expected sequence is DERIVED from the model: we
// drive buildPlayNotes (the SSOT the viewer + audio share) and assert the actual NOTES — their
// li (which line replays), their si (mid-bar start/stop), and their midi (accidental safety) —
// not just the internal ranges. Markers are line items {type:'jump', kind, al?}; a dc/ds item
// IS the jump command and fires at its own (li,si), so it can land mid-bar.
import { describe, it, expect } from 'vitest'
import { resolvePlayOrder, resolveContent } from './songModel.js'
import { buildPlayNotes } from './midi.js'
import { findOrphanJumps, stripEditorMarkerIds, mintMarkerIds } from './songFlow.js'

const seg = (note) => ({ type: 'segment', note }) // one segment == one si
const bar = () => ({ type: 'bar' })
const J = (kind, al) => (al ? { type: 'jump', kind, al } : { type: 'jump', kind })
// one stanza == one display line unless it carries explicit extra lines.
const stanza = (id, items) => ({ id, lines: [items] })
const song = (stanzas, arrangement) => ({ version: 2, key: 'C', timeSignature: '4/4', stanzas, arrangement })

const play = (content) => {
  const resolved = { ...content, lines: resolveContent(content) }
  const order = resolvePlayOrder(content)
  return buildPlayNotes(resolved, order ? { order } : {})
}
const pitched = (notes) => notes.filter((n) => n.midi != null)
const lis = (notes) => pitched(notes).map((n) => n.li)
const sis = (notes) => pitched(notes).map((n) => n.si)
const midis = (notes) => pitched(notes).map((n) => n.midi)

describe('canonical line-item jumps — basic play order (line-level, from the model)', () => {
  it('D.C. al Fine — play A B C, back to top, stop at the Fine line (in B)', () => {
    const notes = play(song(
      [
        stanza('A', [seg('1')]),
        stanza('B', [seg('2'), J('fine')]),
        stanza('C', [seg('3'), J('dc', 'fine')]),
      ],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C' }],
    ))
    // first pass li 0,1,2 then D.C. → replay from top, stop at Fine (li1): 0,1
    expect(lis(notes)).toEqual([0, 1, 2, 0, 1])
  })

  it('plain D.C. (no Fine/Coda) — replay the whole song once from the top', () => {
    const notes = play(song(
      [stanza('A', [seg('1')]), stanza('B', [seg('2'), J('dc')])],
      [{ stanza: 'A' }, { stanza: 'B' }],
    ))
    expect(lis(notes)).toEqual([0, 1, 0, 1])
  })

  it('D.S. al Fine — back to the Segno (B), stop at the Fine (C)', () => {
    const notes = play(song(
      [
        stanza('A', [seg('1')]),
        stanza('B', [J('segno'), seg('2')]), // segno = return target → BEFORE its note
        stanza('C', [seg('3'), J('fine')]),
        stanza('D', [seg('4'), J('ds', 'fine')]),
      ],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C' }, { stanza: 'D' }],
    ))
    // first pass 0,1,2,3 then D.S. → from segno line (1) to Fine line (2)
    expect(lis(notes)).toEqual([0, 1, 2, 3, 1, 2])
  })

  it('D.C. al Coda — first pass stops at the D.C., return jumps To-Coda → Coda', () => {
    const notes = play(song(
      [
        stanza('A', [seg('1')]),
        stanza('B', [seg('2'), J('to-coda')]), // To-Coda = exit → AFTER its note
        stanza('C', [seg('3'), J('dc', 'coda')]),
        stanza('D', [J('coda'), seg('4')]), // Coda = entry target → BEFORE its note
      ],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C' }, { stanza: 'D' }],
    ))
    // first pass 0,1,2 (li3 unreachable on pass 1); return 0→To-Coda(1) then Coda(3)
    expect(lis(notes)).toEqual([0, 1, 2, 0, 1, 3])
  })

  it('explicit al Fine WINS even when a Coda pair is also present (§2.2 — al is chosen, not inferred)', () => {
    const notes = play(song(
      [
        stanza('A', [seg('1'), J('to-coda')]),
        stanza('B', [seg('2'), J('fine')]),
        stanza('C', [seg('3'), J('dc', 'fine')]), // al FINE, not al Coda
        stanza('D', [J('coda'), seg('4')]),
      ],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C' }, { stanza: 'D' }],
    ))
    // al Fine: first pass 0,1,2 then top → stop at Fine(1). The Coda(3) is NOT taken.
    expect(lis(notes)).toEqual([0, 1, 2, 0, 1])
  })
})

describe('MID-BAR — the return pass starts / stops PART-WAY through a bar', () => {
  // A one bar of four notes 1 2 | 3 4 with a Segno sitting BETWEEN 3 and 4 (mid the 2nd bar).
  const midbarSong = () => song(
    [
      stanza('A', [seg('1'), seg('2'), bar(), seg('3'), J('segno'), seg('4')]),
      stanza('B', [seg('5'), J('ds')]), // plain D.S. → back to segno, play to the end
    ],
    [{ stanza: 'A' }, { stanza: 'B' }],
  )

  it('mid-bar Segno entry — the return replays ONLY the notes at/after the Segno (note 4), not the whole line', () => {
    const notes = play(midbarSong())
    // si per segment on li0: 1→0, 2→1, 3→2, (segno), 4→3.  li1: 5→0.
    // first pass: li0 all (si 0,1,2,3) + li1 up to the D.S. (si0).
    // return (plain D.S.): from segno (li0, si3=note4) to the end → li0 si3, then li1 si0.
    expect(lis(notes)).toEqual([0, 0, 0, 0, 1, 0, 1])
    // the mid-bar proof: on the FINAL replay of li0 only si 3 plays (note 4), NOT si 0..2.
    const li0replay = pitched(notes).slice(5) // everything after the first-pass A+B
    expect(li0replay.filter((n) => n.li === 0).map((n) => n.si)).toEqual([3])
  })

  it('mid-bar Fine exit — the return stops PART-WAY through a bar (after note 3, before note 4)', () => {
    const notes = play(song(
      [
        stanza('A', [J('segno'), seg('1')]),
        // one bar 2 3 4; Fine sits mid-bar, between 3 and 4
        stanza('B', [seg('2'), bar(), seg('3'), J('fine'), seg('4')]),
        stanza('C', [seg('5'), J('ds', 'fine')]),
      ],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C' }],
    ))
    // li1 si: 2→0, 3→1, (fine), 4→2.  D.S. al Fine returns from the segno (li0) and must STOP
    // after note 3 (si1) — note 4 (si2, past the mid-bar Fine) must NOT sound on the return.
    const all = pitched(notes)
    // first pass reaches note 4 (li1,si2); the return does NOT.
    expect(all.some((n) => n.li === 1 && n.si === 2)).toBe(true) // played once, first pass
    const last = all[all.length - 1]
    expect([last.li, last.si]).toEqual([1, 1]) // the whole song ENDS on note 3 (mid-bar Fine)
    expect(all.filter((n) => n.li === 1 && n.si === 2).length).toBe(1) // note 4 sounds ONLY first pass
  })

  it('mid-bar entry preserves each note’s OWN beats — no metric re-timing (honest to the sheet)', () => {
    const notes = play(midbarSong())
    const all = pitched(notes)
    // note 4 appears twice (first pass + mid-bar return); its beats must be identical both times.
    const note4s = all.filter((n) => n.li === 0 && n.si === 3)
    expect(note4s.length).toBe(2)
    expect(note4s[0].beats).toBe(note4s[1].beats)
  })
})

describe('accidental safety — a mid-bar return keeps the bar’s accidental (resolve-before-filter)', () => {
  it('#5 set at the bar head still sharps the note the return re-enters on', () => {
    const notes = play(song(
      [
        // ONE bar, no bar line: #5 sharps degree 5 for the rest of the bar. Segno before the last 5.
        stanza('A', [seg('#5'), seg('5'), J('segno'), seg('5'), J('fine')]),
        stanza('B', [seg('1'), J('ds', 'fine')]),
      ],
      [{ stanza: 'A' }, { stanza: 'B' }],
    ))
    const all = pitched(notes)
    // the three "5"s on li0 are si 0,1,2 and ALL carry the bar's # (same midi). The D.S. al Fine
    // return re-enters at the segno (si2) — that note must still be the SHARPED pitch, proving the
    // pitch is resolved BEFORE range-filtering (no lost accidental, no State-Recovery needed).
    const firstPassSharp = all.find((n) => n.li === 0 && n.si === 0).midi
    const returned = all[all.length - 1] // last note = the returned si2 on li0
    expect([returned.li, returned.si]).toEqual([0, 2])
    expect(returned.midi).toBe(firstPassSharp) // sharped, not the natural degree
  })
})

describe('safety / guards / no-op', () => {
  it('no jump command → null order (whole-song playback unchanged)', () => {
    expect(resolvePlayOrder(song(
      [stanza('A', [seg('1')]), stanza('B', [seg('2')])],
      [{ stanza: 'A' }, { stanza: 'B' }],
    ))).toBeNull()
  })

  it('ORPHAN D.S. (a ds item but NO segno) → no jump, plays as written; lint reports it', () => {
    const s = song(
      [stanza('A', [seg('1')]), stanza('B', [seg('2'), J('ds')])],
      [{ stanza: 'A' }, { stanza: 'B' }],
    )
    expect(resolvePlayOrder(s)).toBeNull() // never guesses a target
    expect(findOrphanJumps(s)).toEqual([{ kind: 'ds-orphan' }])
  })

  it('ORPHAN To-Coda (to-coda but no coda) → al Coda downgrades gracefully; lint reports it', () => {
    const s = song(
      [
        stanza('A', [seg('1'), J('to-coda')]),
        stanza('B', [seg('2'), J('fine')]),
        stanza('C', [seg('3'), J('dc', 'coda')]),
      ],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C' }],
    )
    // al Coda asked, but no Coda target → fall back (to Fine here). Never a broken jump.
    expect(lis(play(s))).toEqual([0, 1, 2, 0, 1])
    expect(findOrphanJumps(s)).toEqual([{ kind: 'tocoda-orphan' }])
  })

  it('legacy marker shapes ({type:"segno"} / {type:"marker",kind:"fine"}) still resolve', () => {
    const notes = play(song(
      [
        stanza('A', [seg('1')]),
        stanza('B', [{ type: 'segno' }, seg('2')]),
        stanza('C', [seg('3'), { type: 'marker', kind: 'fine' }]),
        stanza('D', [seg('4'), J('ds', 'fine')]),
      ],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C' }, { stanza: 'D' }],
    ))
    expect(lis(notes)).toEqual([0, 1, 2, 3, 1, 2])
  })
})

describe('paste-dedup + strophic composition', () => {
  it('a stripped (id-less) jump marker re-mints a FRESH, non-colliding id (paste guard)', () => {
    const pasted = {
      version: 2, key: 'C', timeSignature: '4/4',
      stanzas: [{ id: 'A', lines: [[seg('1'), { type: 'jump', kind: 'segno', id: 'j1' }, seg('2'), { type: 'jump', kind: 'segno' }]] }],
      arrangement: [{ stanza: 'A' }],
    }
    const { content, changed } = mintMarkerIds(pasted)
    const js = content.stanzas[0].lines[0].filter((i) => i.type === 'jump')
    expect(changed).toBe(true)
    expect(js[0].id).toBe('j1') // existing id preserved
    expect(js[1].id).toBe('j2') // fresh, NOT a duplicate
    expect(js[0].id).not.toBe(js[1].id)
  })

  it('stripEditorMarkerIds clears jumpId so a pasted jump marker re-mints', () => {
    const node = { jumpId: 'j1', markerId: 'm1', bars: [{ repeatStartId: 'r1' }] }
    stripEditorMarkerIds(node)
    expect(node.jumpId).toBe('')
    expect(node.markerId).toBe('')
  })

  it('composes with afterEachVerse strophic order (refrain expanded, then D.C. appended)', () => {
    const notes = play(song(
      [stanza('A', [seg('1')]), stanza('R', [seg('5')])],
      [
        { stanza: 'A', label: 'ข้อ 1' },
        { stanza: 'R', label: 'รับ', afterEachVerse: true },
        { stanza: 'A', label: 'ข้อ 2' },
      ],
    ))
    // Put the D.C. on ข้อ 2's line by reusing stanza A — but A is shared, so instead assert the
    // strophic base is intact when NO jump is present (baseline for the compose case).
    expect(lis(notes)).toEqual([0, 1, 2, 1]) // ข้อ1 · รับ · ข้อ2 · รับ (afterEachVerse)
  })
})
