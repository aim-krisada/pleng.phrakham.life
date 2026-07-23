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
