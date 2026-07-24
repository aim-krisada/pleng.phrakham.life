// Data-safety gate: the editor must NEVER drop what it doesn't model. These tests are the
// regression net for the silent-data-loss bug (2026-07-24) — a segment's `holds`, an imported
// symbol (unknown item type), and future fields at every level must survive load → save.
// If someone re-narrows serializeLine to an allow-list of fields, these go RED.
import { describe, it, expect } from 'vitest'
import {
  deserializeLine, serializeLine, rest,
  CONTENT_KEYS, STANZA_KEYS, ARRANGEMENT_KEYS, newLine, newSegment,
} from './editorSerde.js'

// full content <-> editState round-trip, mirroring EditorMode.applyRow / previewContent, so the
// test proves the WHOLE pipeline (content top-level + stanza + arrangement + line) not just lines.
function toEditState(content) {
  return {
    contentExtras: rest(content, CONTENT_KEYS),
    key: content.key,
    timeSignature: content.timeSignature,
    bpm: content.bpm,
    stanzas: (content.stanzas || []).map((s) => ({
      id: s.id,
      lines: (s.lines || []).map(deserializeLine),
      _extra: rest(s, STANZA_KEYS),
    })),
    arrangement: (content.arrangement || []).map((r) => ({
      stanza: r.stanza,
      label: r.label || '',
      syllables: [...(r.syllables || [])],
      key: r.key || '',
      afterEachVerse: !!r.afterEachVerse,
      _extra: rest(r, ARRANGEMENT_KEYS),
    })),
  }
}
function toContent(st) {
  return {
    version: 2,
    key: st.key,
    timeSignature: st.timeSignature,
    ...(st.bpm ? { bpm: st.bpm } : {}),
    ...st.contentExtras,
    stanzas: st.stanzas.map((s) => ({ id: s.id, lines: s.lines.map(serializeLine), ...(s._extra || {}) })),
    arrangement: st.arrangement.map((r) => ({
      stanza: r.stanza,
      label: r.label?.trim() || '',
      syllables: r.syllables.map((t) => (t || '').trim()),
      ...(r.key ? { key: r.key } : {}),
      ...(r.afterEachVerse ? { afterEachVerse: true } : {}),
      ...(r._extra || {}),
    })),
  }
}

// A song that exercises EVERY kind of "the editor doesn't model this":
//  · segment.holds            — the real field lost in the live DB (audit 2026-07-23)
//  · segment.foo              — a synthetic future segment field
//  · {type:'ornament', …}     — an unknown ITEM TYPE (e.g. a symbol imported from a file)
//  · stanza.mystery           — an unknown per-stanza key
//  · arrangement row.futureFlag — an unknown per-verse key (the `flow` feature's prerequisite)
//  · content.capo / content._future — unknown top-level keys
const RICH = {
  version: 2,
  key: 'G',
  timeSignature: '4/4',
  bpm: 90,
  capo: 3,
  _future: { experiment: true },
  stanzas: [
    {
      id: 'A',
      mystery: { imported: 'keep-me' },
      lines: [
        [
          { type: 'section', name: 'ท่อน 1' },
          { type: 'segment', chord: 'G', note: '1', holds: 2 },
          { type: 'segment', chord: '', note: '2', foo: { deep: [1, 2] } },
          { type: 'ornament', kind: 'trill', over: '2' },
          { type: 'bar' },
          { type: 'segment', chord: 'D', note: '3' },
        ],
      ],
    },
  ],
  arrangement: [
    { stanza: 'A', label: 'ร้อง 1', syllables: ['พระ', 'เจ้า', 'ดี'], futureFlag: 'repeat-each' },
  ],
}

const j = (x) => JSON.stringify(x)

describe('editorSerde — lossless round-trip', () => {
  it('preserves EVERY unknown thing when the song is opened and saved untouched', () => {
    const out = toContent(toEditState(RICH))
    // deep-equal: no field, item, or key lost anywhere in the tree
    expect(out).toEqual(RICH)
  })

  it('preserves unknowns when an UNRELATED part is edited', () => {
    const st = toEditState(RICH)
    // edit only the last segment's note — a normal author action, nowhere near the unknowns
    st.stanzas[0].lines[0].bars[1].segments[0].note = '5'
    const out = toContent(st)
    // the edit landed
    const lastSeg = out.stanzas[0].lines[0].find((it) => it.type === 'segment' && it.note === '5')
    expect(lastSeg).toBeTruthy()
    // …and NOTHING unknown was dropped
    const items = out.stanzas[0].lines[0]
    expect(items.find((it) => it.type === 'segment' && it.note === '1').holds).toBe(2)
    expect(items.find((it) => it.type === 'segment' && it.note === '2').foo).toEqual({ deep: [1, 2] })
    expect(items.find((it) => it.type === 'ornament')).toEqual({ type: 'ornament', kind: 'trill', over: '2' })
    expect(out.capo).toBe(3)
    expect(out._future).toEqual({ experiment: true })
    expect(out.stanzas[0].mystery).toEqual({ imported: 'keep-me' })
    expect(out.arrangement[0].futureFlag).toBe('repeat-each')
  })

  it('holds survives even when the SAME segment is edited (not just via passthrough)', () => {
    const st = toEditState(RICH)
    st.stanzas[0].lines[0].bars[0].segments[0].chord = 'Gsus4' // edit the holds-bearing segment
    const out = toContent(st)
    const seg = out.stanzas[0].lines[0].find((it) => it.type === 'segment' && it.note === '1')
    expect(seg.chord).toBe('Gsus4') // edit applied
    expect(seg.holds).toBe(2) // unknown field still preserved on an edited segment
  })

  it('untouched line is emitted byte-for-byte (exact original items, ordering included)', () => {
    const line = deserializeLine(RICH.stanzas[0].lines[0])
    expect(j(serializeLine(line))).toBe(j(RICH.stanzas[0].lines[0]))
  })

  it('a freshly created (unloaded) line has no _source and serializes structurally', () => {
    const line = newLine()
    line.bars[0].segments[0].note = '1'
    line.bars[0].segments[0].chord = 'C'
    expect(serializeLine(line)).toEqual([{ type: 'segment', chord: 'C', note: '1' }])
  })

  it('a cleared lyric is dropped, a set lyric is kept (classic v2 shape for new segments)', () => {
    const line = newLine()
    const s = line.bars[0].segments[0]
    s.note = '1'; s.lyric = 'พระ'
    expect(serializeLine(line)[0].lyric).toBe('พระ')
    s.lyric = ''
    expect(serializeLine(line)[0].lyric).toBeUndefined()
  })

  it('an unknown item type in an EDITED line is never dropped (structural path)', () => {
    const line = deserializeLine([
      { type: 'segment', note: '1' },
      { type: 'ornament', kind: 'mordent' },
    ])
    line.bars[0].segments[0].note = '7' // force the structural path
    const out = serializeLine(line)
    expect(out.some((it) => it.type === 'ornament' && it.kind === 'mordent')).toBe(true)
  })

  it('rest() returns only the unknown keys, deep-cloned (no shared references)', () => {
    const src = { id: 'A', lines: [], mystery: { a: 1 } }
    const r = rest(src, STANZA_KEYS)
    expect(r).toEqual({ mystery: { a: 1 } })
    r.mystery.a = 999
    expect(src.mystery.a).toBe(1) // clone, not a live reference
  })
})

// The `holds` field lost in the live DB was NOT the plain number the fixture above uses — it is an
// OBJECT keyed by note-box index → beats, sitting on a `^` (fermata) note, sometimes across several
// boxes. These fixtures are copied VERBATIM from the affected published songs (audit re-derived
// 2026-07-24: 10 songs would lose holds under the pre-fix serde). This pins the fix to the exact
// production shape so a future serializer that special-cases numeric `holds` can't quietly drop it.
describe('editorSerde — holds survives in its real production shape (object, fermata note)', () => {
  // #27 กระซิบ (simple) · #732 พระองค์ละมงกุฎ (repeated) · #760 (multi-box + fractional)
  const REAL_LINE = [
    { note: '3^ 0', type: 'segment', chord: 'B', holds: { 0: 3 } },
    { type: 'bar' },
    { note: '5_.^ 4__', type: 'segment', chord: 'E', holds: { 0: 1 } },
    { type: 'bar' },
    { note: '(5^ #4_^ 4^) 0_', type: 'segment', chord: 'D7', holds: { 0: 0.5, 1: 1, 2: 1.5 } },
    { note: '2_ 2_ 2_ 3_ 3_^ #4_', type: 'segment', chord: 'A7', holds: { 4: 0.5 } },
  ]

  it('open → save untouched keeps every holds object byte-for-byte', () => {
    const out = serializeLine(deserializeLine(REAL_LINE))
    expect(j(out)).toBe(j(REAL_LINE)) // exact — ordering + fractional values included
  })

  it('editing the holds-bearing segment (structural rebuild) still keeps its holds object', () => {
    const line = deserializeLine(REAL_LINE)
    line.bars[0].segments[0].chord = 'Bm7' // touch the segment → forces the rebuild path
    const out = serializeLine(line)
    const seg = out.find((it) => it.type === 'segment' && it.note === '3^ 0')
    expect(seg.chord).toBe('Bm7') // edit applied
    expect(seg.holds).toEqual({ 0: 3 }) // multi-key object preserved exactly
    // the OTHER holds segments (untouched within the same edited line) survive too
    expect(out.find((it) => it.note === '(5^ #4_^ 4^) 0_').holds).toEqual({ 0: 0.5, 1: 1, 2: 1.5 })
    expect(out.find((it) => it.note === '2_ 2_ 2_ 3_ 3_^ #4_').holds).toEqual({ 4: 0.5 })
  })
})

// Melody SSOT must be 100% (P'Aim, gate-level 2026-07-24): a repeat boundary and a volta ending
// are play-order data — losing one changes how many times a phrase is sung, which IS the melody.
// Audit 🟡-2 found these vanish when they sit on a note-less bar and the line is edited (the empty
// -bar filter dropped the whole bar). `rebuild()` deletes the byte-for-byte passthrough anchors so
// serializeLine is FORCED down the structural path — exactly what happens when the author edits
// somewhere else on the line. These pin the fix (barHasMarker keeps marker-only bars).
function rebuild(items) {
  const line = deserializeLine(items)
  delete line._source // force the structural rebuild instead of the untouched-line passthrough
  delete line._pristine
  return serializeLine(line)
}
describe('editorSerde — a repeat / volta / pickup on a note-LESS bar survives an edit-rebuild (🟡-2)', () => {
  it('a :‖ repeat-end with times on the trailing note-less bar is NOT dropped', () => {
    const items = [{ type: 'segment', chord: 'C', note: '1' }, { type: 'bar' }, { type: 'repeat-end', times: 2 }]
    expect(rebuild(items)).toEqual(items) // the whole repeat (play twice) survives
  })

  it('a 1./2. volta ending on a note-less bar is NOT dropped', () => {
    const items = [
      { type: 'segment', chord: 'C', note: '1' }, { type: 'bar' },
      { type: 'volta', num: 2 }, { type: 'bar' },
      { type: 'segment', chord: 'G', note: '3' },
    ]
    expect(rebuild(items)).toEqual(items)
  })

  it('a ‖: … :‖ pair whose closing bar has no note of its own round-trips', () => {
    const items = [
      { type: 'repeat-start' }, { type: 'segment', chord: 'C', note: '1' },
      { type: 'bar' }, { type: 'repeat-end' },
    ]
    expect(rebuild(items)).toEqual(items)
  })

  it('a genuinely empty bar (no note, no marker) is still dropped — no phantom bars', () => {
    // an author who clears a bar to nothing should not leave a stray {type:'bar'} behind
    const out = rebuild([{ type: 'segment', chord: 'C', note: '1' }, { type: 'bar' }])
    expect(out).toEqual([{ type: 'segment', chord: 'C', note: '1' }])
  })
})
