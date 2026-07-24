// Jump-marker edit engine (withJumpMarker / removeJumpMarker / updateJumpMarker) — the inline
// editor's insert path for D.C./D.S./Segno/Coda/To-Coda/Fine (docs/ds/marker-entry-ui.md §6).
//
// The correctness proof is DERIVED FROM THE MODEL, not hand-tuned: a song whose markers are
// PLACED by withJumpMarker must drive buildPlayNotes to the exact same notes as the canonical
// hand-authored {type:'jump'} shape the resolver test pins. So we never assert an intuited play
// order here — we assert `play(built-by-withJumpMarker)` === `play(hand-authored)`. If the inserter
// puts a marker one slot off, the resolver (the SSOT the viewer + audio share) disagrees and the
// test fails. (memory pleng-compare-to-model-not-intuition.)
import { describe, it, expect } from 'vitest'
import { withJumpMarker, removeJumpMarker, updateJumpMarker } from './songEdit.js'
import { resolveContent, resolvePlayOrder } from './songModel.js'
import { buildPlayNotes } from './midi.js'

// ---- model oracle ----
const play = (content) => {
  const resolved = { ...content, lines: resolveContent(content) }
  const order = resolvePlayOrder(content)
  return buildPlayNotes(resolved, order ? { order } : {})
}
const pitched = (notes) => notes.filter((n) => n.midi != null)
const trace = (notes) => pitched(notes).map((n) => ({ li: n.li, si: n.si, midi: n.midi }))

// ---- fixtures ----
const seg = (note) => ({ type: 'segment', note })
const J = (kind, al) => (al ? { type: 'jump', kind, al } : { type: 'jump', kind })
// a song of one-line stanzas; `arr` defaults to one verse per stanza in order
const song = (stanzas) => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: stanzas.map((items, i) => ({ id: String.fromCharCode(65 + i), lines: [items] })),
  arrangement: stanzas.map((_, i) => ({ stanza: String.fromCharCode(65 + i) })),
})
// address the si-th segment of stanza `id` line 0
const loc = (id, si) => ({ resolvedLine: { _stanza: id, _stanzaLine: 0 }, si })
const line0 = (content, id) => content.stanzas.find((s) => s.id === id).lines[0]
const jumpsIn = (content) => content.stanzas.flatMap((s) => s.lines.flat()).filter((it) => it.type === 'jump')

describe('withJumpMarker — placement, anchor, id', () => {
  it('anchors an ENTRY marker (segno/coda) BEFORE the caret note', () => {
    const c = withJumpMarker(song([[seg('1'), seg('2')]]), loc('A', 1), { kind: 'segno' })
    const items = line0(c, 'A')
    // segno inserted before the 2nd segment (index of si=1)
    expect(items.map((it) => it.type)).toEqual(['segment', 'jump', 'segment'])
    expect(items[1]).toMatchObject({ type: 'jump', kind: 'segno' })
    expect(items[1].id).toBeTruthy() // permanent id minted
  })

  it('anchors an EXIT/command marker (dc/ds/fine/to-coda) AFTER the caret note', () => {
    const c = withJumpMarker(song([[seg('1'), seg('2')]]), loc('A', 0), { kind: 'dc' })
    const items = line0(c, 'A')
    expect(items.map((it) => it.type)).toEqual(['segment', 'jump', 'segment'])
    expect(items[1]).toMatchObject({ type: 'jump', kind: 'dc' })
  })

  it('carries `al` only on a dc/ds command; a non-command kind never stores al', () => {
    const dc = jumpsIn(withJumpMarker(song([[seg('1')]]), loc('A', 0), { kind: 'dc', al: 'coda' }))[0]
    expect(dc.al).toBe('coda')
    const segno = jumpsIn(withJumpMarker(song([[seg('1')]]), loc('A', 0), { kind: 'segno', al: 'coda' }))[0]
    expect(segno.al).toBeUndefined()
  })

  it('normalises a loose kind ("D.C." / "dal segno") to the canonical set', () => {
    expect(jumpsIn(withJumpMarker(song([[seg('1')]]), loc('A', 0), { kind: 'D.C.' }))[0].kind).toBe('dc')
    expect(jumpsIn(withJumpMarker(song([[seg('1')]]), loc('A', 0), { kind: 'dal segno' }))[0].kind).toBe('ds')
  })

  it('is a no-op (same ref) for an unknown kind or an unresolvable caret', () => {
    const base = song([[seg('1')]])
    expect(withJumpMarker(base, loc('A', 0), { kind: 'wat' })).toBe(base)
    expect(withJumpMarker(base, loc('A', 9), { kind: 'dc' })).toBe(base) // si out of range
    expect(withJumpMarker(base, loc('Z', 0), { kind: 'dc' })).toBe(base) // unknown stanza
  })

  it('leaves an untouched stanza value-equal and adds the marker only to the edited one', () => {
    const base = song([[seg('1')], [seg('2')]])
    const c = withJumpMarker(base, loc('B', 0), { kind: 'dc' })
    // (the final mintMarkerIds pass re-mints every stanza, so refs are not shared — assert values)
    expect(c.stanzas[0]).toEqual(base.stanzas[0]) // stanza A unchanged in content
    expect(jumpsIn({ stanzas: [c.stanzas[0]] })).toHaveLength(0) // no marker leaked into A
    expect(jumpsIn({ stanzas: [c.stanzas[1]] })).toHaveLength(1) // marker only in the edited stanza B
    expect(base.stanzas[1].lines[0].some((it) => it.type === 'jump')).toBe(false) // base not mutated
  })
})

describe('withJumpMarker — the resolver reads what it writes (derived from the model)', () => {
  it('D.C. al Fine placed by the inserter plays identically to the canonical shape', () => {
    // canonical hand-authored (the resolver test's own shape)
    const authored = song([[seg('1')], [seg('2'), J('fine')], [seg('3'), J('dc', 'fine')]])
    // same song, but markers PLACED by withJumpMarker at the caret
    let built = song([[seg('1')], [seg('2')], [seg('3')]])
    built = withJumpMarker(built, loc('B', 0), { kind: 'fine' })        // AFTER note 2
    built = withJumpMarker(built, loc('C', 0), { kind: 'dc', al: 'fine' }) // AFTER note 3
    expect(trace(play(built))).toEqual(trace(play(authored)))
  })

  it('mid-bar Segno placed by the inserter replays only from that mid-bar note (si preserved)', () => {
    // one bar "1 2 3 4"; Segno before note 4 (si3), D.S. al Fine returns to it mid-bar
    const authored = song([[seg('1'), seg('2'), seg('3'), J('segno'), seg('4'), J('fine')], [seg('5'), J('ds', 'fine')]])
    let built = song([[seg('1'), seg('2'), seg('3'), seg('4')], [seg('5')]])
    built = withJumpMarker(built, loc('A', 3), { kind: 'segno' })       // BEFORE note 4 (si3)
    built = withJumpMarker(built, loc('A', 3), { kind: 'fine' })        // AFTER note 4
    built = withJumpMarker(built, loc('B', 0), { kind: 'ds', al: 'fine' })
    const t = trace(play(built))
    expect(t).toEqual(trace(play(authored)))
    // and the mid-bar proof: the return re-enters at si3 (note 4), not the line head
    expect(t[t.length - 1].si).toBe(3)
  })
})

describe('removeJumpMarker', () => {
  it('removes exactly the marker with the given id, keeping the rest', () => {
    let c = withJumpMarker(song([[seg('1'), seg('2')]]), loc('A', 0), { kind: 'segno' })
    c = withJumpMarker(c, loc('A', 1), { kind: 'fine' })
    const [j1] = jumpsIn(c)
    const after = removeJumpMarker(c, j1.id)
    const left = jumpsIn(after)
    expect(left).toHaveLength(1)
    expect(left[0].kind).toBe('fine')
  })

  it('is a no-op (same ref) for an unknown id', () => {
    const c = withJumpMarker(song([[seg('1')]]), loc('A', 0), { kind: 'dc' })
    expect(removeJumpMarker(c, 'nope')).toBe(c)
  })
})

describe('updateJumpMarker', () => {
  it('changes the kind in place', () => {
    const c = withJumpMarker(song([[seg('1')]]), loc('A', 0), { kind: 'segno' })
    const id = jumpsIn(c)[0].id
    expect(jumpsIn(updateJumpMarker(c, id, { kind: 'coda' }))[0].kind).toBe('coda')
  })

  it('sets / clears `al` on a command; drops `al` when the kind stops being a command', () => {
    const c = withJumpMarker(song([[seg('1')]]), loc('A', 0), { kind: 'dc', al: 'coda' })
    const id = jumpsIn(c)[0].id
    expect(jumpsIn(updateJumpMarker(c, id, { al: 'fine' }))[0].al).toBe('fine')
    expect(jumpsIn(updateJumpMarker(c, id, { al: null }))[0].al).toBeUndefined()
    // dc → segno: al must not linger on a non-command marker
    const segno = jumpsIn(updateJumpMarker(c, id, { kind: 'segno' }))[0]
    expect(segno.kind).toBe('segno')
    expect(segno.al).toBeUndefined()
  })

  it('is a no-op (same ref) for an unknown id or an unrecognised kind', () => {
    const c = withJumpMarker(song([[seg('1')]]), loc('A', 0), { kind: 'dc' })
    const id = jumpsIn(c)[0].id
    expect(updateJumpMarker(c, 'nope', { kind: 'ds' })).toBe(c)
    expect(updateJumpMarker(c, id, { kind: 'garbage' })).toBe(c) // never wipes on a bad kind
  })
})

describe('AC-13 — jump markers survive a storage round-trip (inline editor stores v2 verbatim)', () => {
  it('a jsonb round-trip preserves every marker (kind, al, id)', () => {
    let c = withJumpMarker(song([[seg('1')], [seg('2')], [seg('3')]]), loc('B', 0), { kind: 'to-coda' })
    c = withJumpMarker(c, loc('C', 0), { kind: 'dc', al: 'coda' })
    c = withJumpMarker(c, loc('A', 0), { kind: 'coda' })
    const roundTripped = JSON.parse(JSON.stringify(c)) // exactly what Supabase jsonb does
    expect(roundTripped).toEqual(c)
    expect(jumpsIn(roundTripped)).toHaveLength(3)
  })
})
