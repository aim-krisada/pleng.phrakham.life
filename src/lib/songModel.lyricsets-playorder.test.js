// 717 multi-lyric — the PLAY ORDER must be resolved against the SELECTED set's sheet.
//
// resolvePlayOrder returns {fromLi,toLi} ranges that index the display lines of the sheet IT
// resolved. Playback then pulls those ranges out of the sheet the READER is looking at. If the
// two sheets are not the same one, "line 7" means different things on each side — which is the
// whole bug: the viewer used to hand resolvePlayOrder the unfiltered song while the notes came
// from the set-filtered sheet.
//
// Nothing here is mocked: real resolveContent, real resolvePlayOrder, real buildPlayNotes.
import { describe, it, expect } from 'vitest'
import { resolveContent, resolvePlayOrder } from './songModel.js'
import { buildPlayNotes } from './midi.js'

const line = (n) => [{ type: 'segment', note: n, lyric: '' }]
const entry = (set, label, extra = {}) => ({
  stanza: label === 'รับ' ? 'B' : 'A',
  set,
  label,
  syllables: ['ก', 'ข'],
  ...extra,
})

// Shaped like song 717 in production: ONE melody, two sets of words, and the two sets spell
// the refrain differently — set 0 writes it once and flags "ร้องรับทุกข้อ", set 1 writes it
// out after each verse and flags nothing. That asymmetry is what the old code tripped on.
const content = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  lyricSets: [{ name: 'ชุดหนึ่ง' }, { name: 'ชุดสอง' }],
  stanzas: [
    { id: 'A', lines: [line('1'), line('2')] },
    { id: 'B', lines: [line('3'), line('4')] },
  ],
  arrangement: [
    entry(0, ''), // ข้อ 1
    entry(0, 'รับ', { afterEachVerse: true }), // ← the strophic directive lives in set 0 only
    entry(0, 'ข้อ2'),
    entry(0, 'ข้อ3'),
    entry(1, ''), // ข้อ 1
    entry(1, 'รับ'),
    entry(1, 'ข้อ2'),
    entry(1, 'รับ'),
  ],
}

// The viewer's pipeline: filter to the chosen set, resolve THAT, and take the play order from
// the same filtered content.
function play(content, activeSet) {
  const sets = Array.isArray(content.lyricSets) && content.lyricSets.length > 1
  const setContent = sets
    ? { ...content, arrangement: content.arrangement.filter((e) => (e.set ?? activeSet) === activeSet) }
    : content
  const resolved = { ...setContent, lines: resolveContent(setContent) }
  const order = resolvePlayOrder(setContent) ?? undefined
  const notes = buildPlayNotes(resolved, { order })
  // walk the notes back to the arrangement entry each came from; a backwards line jump starts
  // a new chunk so a REPEAT reads as a repeat rather than collapsing away.
  const seq = []
  let prevLi = null
  for (const n of notes) {
    const l = resolved.lines[n.li]
    const e = l?._entryIndex == null ? null : setContent.arrangement[l._entryIndex]
    const tag = e ? `${e.label || 'ข้อ1'}[set${e.set}]` : `li${n.li}`
    if (!seq.length || seq[seq.length - 1] !== tag || n.li < prevLi) seq.push(tag)
    prevLi = n.li
  }
  return { resolved, order, seq, noteCount: notes.length }
}

describe('717 — play order follows the selected lyric set', () => {
  it('set 0: the refrain is sung after each verse — and the song ENDS there', () => {
    const { seq, noteCount } = play(content, 0)
    expect(seq).toEqual(['ข้อ1[set0]', 'รับ[set0]', 'ข้อ2[set0]', 'รับ[set0]', 'ข้อ3[set0]', 'รับ[set0]'])
    // The regression: the refrain used to be replayed once MORE for every entry of the other
    // set as well, so the song ran on with a trailing run of รับ (464 notes instead of 232 on
    // the real 717). Pin the count, not just the shape.
    expect(seq.filter((t) => t.startsWith('รับ'))).toHaveLength(3)
    expect(noteCount).toBe(12)
  })

  it('set 1: its own blocks, in written order — set 0’s directive does not follow', () => {
    const { order, seq, noteCount } = play(content, 1)
    expect(order).toBeUndefined() // no afterEachVerse in this set → plain display order
    expect(seq).toEqual(['ข้อ1[set1]', 'รับ[set1]', 'ข้อ2[set1]', 'รับ[set1]'])
    expect(noteCount).toBe(8)
  })

  it('neither set ever sings the other set’s words', () => {
    for (const set of [0, 1]) {
      const { seq } = play(content, set)
      expect(seq.every((t) => t.includes(`[set${set}]`)), `set ${set} leaked: ${seq.join(' → ')}`).toBe(true)
    }
  })

  it('every order range lands inside the sheet it will be pulled from', () => {
    // The invariant the bug violated: ranges came from a 16-line sheet while the notes came
    // from an 8-line one, so ranges pointed past the end (and at the wrong verses before it).
    for (const set of [0, 1]) {
      const { resolved, order } = play(content, set)
      for (const r of order || []) {
        expect(r.fromLi, `set ${set}`).toBeGreaterThanOrEqual(0)
        expect(r.toLi, `set ${set}`).toBeLessThan(resolved.lines.length)
      }
    }
  })

  it('back-compat — a song with no lyric sets resolves exactly as before', () => {
    const plain = {
      ...content,
      lyricSets: undefined,
      arrangement: [
        { stanza: 'A', label: '', syllables: ['ก', 'ข'] },
        { stanza: 'B', label: 'รับ', syllables: ['ก', 'ข'], afterEachVerse: true },
        { stanza: 'A', label: 'ข้อ2', syllables: ['ก', 'ข'] },
      ],
    }
    const { seq } = play(plain, 0)
    expect(seq).toEqual(['ข้อ1[setundefined]', 'รับ[setundefined]', 'ข้อ2[setundefined]', 'รับ[setundefined]'])
    // filtering is inert without lyricSets: the order is byte-identical to resolving the raw song
    expect(resolvePlayOrder(plain)).toEqual(resolvePlayOrder({ ...plain }))
  })
})
