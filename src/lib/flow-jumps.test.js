// D.C./D.S./Segno/Coda/Fine jump resolver (docs/ds/dc-ds-jump-flow.md). Every expected play
// order below is DERIVED from the model: each stanza here is one display line, so li == the
// stanza's position, and the ranges the resolver returns are checked line-for-line. A final
// integration test drives buildPlayNotes to prove the NOTES actually reorder, not just ranges.
import { describe, it, expect } from 'vitest'
import { resolvePlayOrder, resolveContent } from './songModel.js'
import { buildPlayNotes } from './midi.js'
import { findOrphanFlows, stripEditorMarkerIds, hasMarkerType } from './songFlow.js'

// one line per stanza → li == stanza index. `extra` lets a stanza carry a marker item.
const seg = (note) => ({ type: 'segment', note })
const stanza = (id, note, extra = []) => ({ id, lines: [[seg(note), ...extra]] })
const song = (stanzas, arrangement) => ({ version: 2, key: 'C', timeSignature: '4/4', stanzas, arrangement })

// compress an order to a plain [from,to] tuple list for readable expectations
const tuples = (order) => order.map((r) => [r.fromLi, r.toLi])

describe('resolveJumpOrder — D.C. / D.S. / al Fine / al Coda (play order from the model)', () => {
  it('D.C. al Fine — play A B C, back to start, stop at Fine (in B)', () => {
    const order = resolvePlayOrder(song(
      [stanza('A', '1 2'), stanza('B', '3 4', [{ type: 'marker', kind: 'fine' }]), stanza('C', '5 6')],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C', flow: { jump: 'capo' } }],
    ))
    // first pass 0,1,2 then return from 0 to the Fine line (1)
    expect(tuples(order)).toEqual([[0, 0], [1, 1], [2, 2], [0, 1]])
  })

  it('plain D.C. (no Fine, no Coda) — replay the whole song once from the top', () => {
    const order = resolvePlayOrder(song(
      [stanza('A', '1 2'), stanza('B', '3 4')],
      [{ stanza: 'A' }, { stanza: 'B', flow: { jump: 'capo' } }],
    ))
    expect(tuples(order)).toEqual([[0, 0], [1, 1], [0, 1]])
  })

  it('D.S. al Fine — back to the Segno (B), stop at Fine (C)', () => {
    const order = resolvePlayOrder(song(
      [
        stanza('A', '1 2'),
        stanza('B', '3 4', [{ type: 'segno' }]),
        stanza('C', '5 6', [{ type: 'marker', kind: 'fine' }]),
        stanza('D', '7 1'),
      ],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C' }, { stanza: 'D', flow: { jump: 'segno' } }],
    ))
    // 0,1,2,3 then return from the segno line (1) to the Fine line (2)
    expect(tuples(order)).toEqual([[0, 0], [1, 1], [2, 2], [3, 3], [1, 2]])
  })

  it('D.C. al Coda — first pass stops at the D.C. (Coda not played), return jumps To-Coda→Coda', () => {
    const order = resolvePlayOrder(song(
      [
        stanza('A', '1 2'),
        stanza('B', '3 4', [{ type: 'coda', role: 'source' }]), // To Coda (leave here on the return)
        stanza('C', '5 6'), // ends with the D.C.
        stanza('D', '1 1', [{ type: 'coda', role: 'target' }]), // the Coda section
      ],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C', flow: { jump: 'capo' } }, { stanza: 'D' }],
    ))
    // first pass 0,1,2 (D at li3 dropped — unreachable on pass 1); return 0→To-Coda(1), Coda(3)
    expect(tuples(order)).toEqual([[0, 0], [1, 1], [2, 2], [0, 1], [3, 3]])
  })

  it('D.S. al Coda — back to Segno, run to To-Coda, jump to Coda', () => {
    const order = resolvePlayOrder(song(
      [
        stanza('A', '1 2'),
        stanza('B', '3 4', [{ type: 'segno' }]),
        stanza('C', '5 6', [{ type: 'coda', role: 'source' }]),
        stanza('D', '7 1'), // ends with the D.S.
        stanza('E', '1 1', [{ type: 'coda', role: 'target' }]),
      ],
      [
        { stanza: 'A' }, { stanza: 'B' }, { stanza: 'C' },
        { stanza: 'D', flow: { jump: 'segno' } }, { stanza: 'E' },
      ],
    ))
    // first pass 0..3 (E dropped); return Segno(1)→To-Coda(2), Coda(4)
    expect(tuples(order)).toEqual([[0, 0], [1, 1], [2, 2], [3, 3], [1, 2], [4, 4]])
  })

  it('Coda WINS over Fine when both are present (G: To-Coda reached before Fine)', () => {
    const order = resolvePlayOrder(song(
      [
        stanza('A', '1 2', [{ type: 'coda', role: 'source' }, { type: 'marker', kind: 'fine' }]),
        stanza('B', '3 4'),
        stanza('C', '5 6', [{ type: 'coda', role: 'target' }]),
      ],
      [{ stanza: 'A' }, { stanza: 'B', flow: { jump: 'capo' } }, { stanza: 'C' }],
    ))
    // al Coda path (not al Fine): return 0→To-Coda(0), then Coda(2)
    expect(tuples(order)).toEqual([[0, 0], [1, 1], [0, 0], [2, 2]])
  })
})

describe('resolveJumpOrder — safety / no-op cases', () => {
  it('no jump → null (unchanged whole-song playback)', () => {
    expect(resolvePlayOrder(song(
      [stanza('A', '1 2'), stanza('B', '3 4')],
      [{ stanza: 'A' }, { stanza: 'B' }],
    ))).toBeNull()
  })

  it('ORPHAN D.S. (jump:"segno" but no Segno marker) → falls back, does not jump', () => {
    const s = song(
      [stanza('A', '1 2'), stanza('B', '3 4')],
      [{ stanza: 'A' }, { stanza: 'B', flow: { jump: 'segno' } }],
    )
    expect(resolvePlayOrder(s)).toBeNull() // no jump applied — plays as written
    expect(findOrphanFlows(s)).toEqual([{ entryIndex: 1, kind: 'jump', ref: 'segno' }])
  })

  it('jump:"none" is a no-op (never jumps, never orphan)', () => {
    const s = song(
      [stanza('A', '1 2'), stanza('B', '3 4')],
      [{ stanza: 'A' }, { stanza: 'B', flow: { jump: 'none' } }],
    )
    expect(resolvePlayOrder(s)).toBeNull()
    expect(findOrphanFlows(s)).toEqual([])
  })

  it('composes with afterEachVerse strophic order (refrain expanded, then D.C. appended)', () => {
    const order = resolvePlayOrder(song(
      [stanza('A', '1 2'), stanza('R', '5 5')],
      [
        { stanza: 'A', label: 'ข้อ 1' },
        { stanza: 'R', label: 'รับ', afterEachVerse: true },
        { stanza: 'A', label: 'ข้อ 2', flow: { jump: 'capo' } },
      ],
    ))
    // display lines: li0=A(ข้อ1), li1=R(รับ), li2=A(ข้อ2). strophic base = ข้อ1·รับ·ข้อ2·รับ
    // = [0,1,2,1]. The jump entry is ข้อ2; nothing starts after its line, so the full strophic
    // first pass is kept, then D.C. (no Fine/Coda) replays the whole song 0→lastLi(2).
    expect(tuples(order)).toEqual([[0, 0], [1, 1], [2, 2], [1, 1], [0, 2]])
  })
})

describe('multi-line stanzas — entry ranges span, marker resolves to its own line', () => {
  it('D.S. al Fine where each stanza is 2 display lines', () => {
    // A = li0,1 ; B(segno on its 1st line) = li2,3 ; C(Fine on its 2nd line) = li4,5 ; D = li6,7
    const two = (id, extra1 = [], extra2 = []) => ({
      id, lines: [[seg('1 2'), ...extra1], [seg('3 4'), ...extra2]],
    })
    const order = resolvePlayOrder(song(
      [two('A'), two('B', [{ type: 'segno' }]), two('C', [], [{ type: 'marker', kind: 'fine' }]), two('D')],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C' }, { stanza: 'D', flow: { jump: 'segno' } }],
    ))
    // first pass li 0..7, then return from the segno line (2) to the Fine line (5)
    expect(tuples(order)).toEqual([[0, 1], [2, 3], [4, 5], [6, 7], [2, 5]])
  })
})

describe('buildPlayNotes integration — the NOTES reorder (D.C. al Fine)', () => {
  it('replays the returned span with original li tags', () => {
    const content = song(
      [stanza('A', '1'), stanza('B', '2', [{ type: 'marker', kind: 'fine' }]), stanza('C', '3')],
      [{ stanza: 'A' }, { stanza: 'B' }, { stanza: 'C', flow: { jump: 'capo' } }],
    )
    // resolveContent output is what songToNotes consumes; buildPlayNotes needs resolved content.
    const { resolveContent } = require('./songModel.js')
    const resolved = { ...content, lines: resolveContent(content) }
    const order = resolvePlayOrder(content)
    const notes = buildPlayNotes(resolved, { order })
    // each stanza is one note; li sequence must be A(0) B(1) C(2) A(0) B(1)
    expect(notes.filter((n) => n.midi != null).map((n) => n.li)).toEqual([0, 1, 2, 0, 1])
  })
})

describe('paste-dedup + marker-type guards (songFlow)', () => {
  it('stripEditorMarkerIds clears segnoId / codaId so a pasted Segno/Coda re-mints', () => {
    const node = { markerId: 'm1', segnoId: 's1', codaId: 'c1', bars: [{ repeatStartId: 'r1' }] }
    stripEditorMarkerIds(node)
    expect(node.segnoId).toBe('')
    expect(node.codaId).toBe('')
    expect(node.markerId).toBe('')
  })

  it('hasMarkerType detects segno / coda presence', () => {
    const s = song([stanza('A', '1', [{ type: 'segno' }])], [{ stanza: 'A' }])
    expect(hasMarkerType(s, 'segno')).toBe(true)
    expect(hasMarkerType(s, 'coda')).toBe(false)
  })
})
