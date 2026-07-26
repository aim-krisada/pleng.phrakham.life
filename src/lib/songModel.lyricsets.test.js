// 717 multi-lyric on /v2 — the MODEL gate. A song can carry several sets of WORDS under one
// shared melody (content.lyricSets + a per-entry `set`). The sheet must write ONE set at a
// time: two sets stacked read as "ข้อ 1 / ข้อ 2", which is a different song than either.
//
// The other half — and the one that matters for the ~120 songs already in the library — is
// that a song with NO lyricSets resolves exactly as before, down to the provenance tags.
import { describe, it, expect } from 'vitest'
import { resolveContent, resolvePlayOrder, lyricSetName, isSetCaption, lyricSetCount, lyricSetFilter } from './songModel.js'

const seg = (note, chord) => ({ type: 'segment', note, chord })
const wordsOf = (lines) =>
  lines.flatMap((l) => l.filter((i) => i.type === 'segment').flatMap((i) => i.syllables || []))
    .filter(Boolean)
const sectionsOf = (lines) =>
  lines.flatMap((l) => l.filter((i) => i && i.type === 'section').map((i) => i.name))

// one melody (A) + a refrain melody (B); two word sets; the B entry carries no `set` → shared
const twoSets = () => ({
  version: 2, key: 'C', timeSignature: '4/4',
  lyricSets: [{ name: 'ชุดหนึ่ง' }, { name: 'ชุดสอง' }],
  stanzas: [
    { id: 'A', lines: [[seg('1 2', 'C')]] },
    { id: 'B', lines: [[seg('3', 'G')]] },
  ],
  arrangement: [
    { stanza: 'A', set: 0, syllables: ['หนึ่งเอ', 'หนึ่งบี'] },
    { stanza: 'A', set: 1, syllables: ['สองเอ', 'สองบี'] },
    { stanza: 'B', syllables: ['รับรวม'] },
  ],
})
// an ORDINARY song — no lyricSets at all (the whole existing library)
const plain = () => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[seg('1 2', 'C')]] }],
  arrangement: [
    { stanza: 'A', label: '', syllables: ['กา', 'ขา'] },
    { stanza: 'A', label: '', syllables: ['คา', 'งา'] },
  ],
})

describe('resolveContent — 717 lyric sets', () => {
  it('THE BUG: the two sets are never written out together', () => {
    const lines = resolveContent(twoSets(), { set: 0 })
    const w = wordsOf(lines)
    expect(w).toContain('หนึ่งเอ')
    expect(w).not.toContain('สองเอ') // ← /v2 used to stack both sets as ข้อ 1 / ข้อ 2
  })

  it('resolving with NO set option picks the FIRST set, never the concatenation', () => {
    // every caller that has no set to pass (mp3 export, structure drawer, studio preview)
    // must still get ONE coherent reading of the song
    const w = wordsOf(resolveContent(twoSets()))
    expect(w).toEqual(wordsOf(resolveContent(twoSets(), { set: 0 })))
    expect(w).not.toContain('สองเอ')
  })

  it('set 1 shows its own words only', () => {
    const w = wordsOf(resolveContent(twoSets(), { set: 1 }))
    expect(w).toContain('สองเอ')
    expect(w).not.toContain('หนึ่งเอ')
  })

  it('an entry with NO `set` is shared — it appears in every set', () => {
    expect(wordsOf(resolveContent(twoSets(), { set: 0 }))).toContain('รับรวม')
    expect(wordsOf(resolveContent(twoSets(), { set: 1 }))).toContain('รับรวม')
  })

  it('a surviving entry keeps its ORIGINAL arrangement index (click-to-edit writes there)', () => {
    // set 1's verse is arrangement[1] and the shared refrain arrangement[2] — the filtered-out
    // entry must NOT renumber them, or an edit would land on another set's words.
    expect(resolveContent(twoSets(), { set: 1 }).map((l) => l._entryIndex)).toEqual([1, 2])
  })

  it('auto "ข้อ N" counts within the set, so a one-block set stays heading-free', () => {
    const c = twoSets()
    c.arrangement = [
      { stanza: 'A', set: 0, syllables: ['หนึ่งเอ', 'หนึ่งบี'] },
      { stanza: 'A', set: 1, syllables: ['สองเอ', 'สองบี'] },
    ]
    expect(sectionsOf(resolveContent(c, { set: 0 }))).toEqual([])
    expect(sectionsOf(resolveContent(c, { set: 1 }))).toEqual([])
    // …but a set that really has two verses still numbers them 1, 2 (not 2, 3)
    c.arrangement.push({ stanza: 'A', set: 1, syllables: ['สองซี', 'สองดี'] })
    expect(sectionsOf(resolveContent(c, { set: 1 }))).toEqual(['ข้อ 1', 'ข้อ 2'])
  })

  it('the melody prints on the first line of EACH set (a set is its own reading)', () => {
    // stanza A is reused across sets; within one set it is written once, with notes.
    expect(resolveContent(twoSets(), { set: 0 })[0]._melodyFirst).toBe(true)
    expect(resolveContent(twoSets(), { set: 1 })[0]._melodyFirst).toBe(true)
  })

  // ---- hostile data (adversarial review, 26 ก.ค.) — the sheet must never come out EMPTY ----
  it('a NUMERIC-STRING `set` ("0"/"1") still selects, instead of blanking the sheet', () => {
    // a tool that stringifies its JSON writes set:"1"; under a raw === that entry matches no
    // set at all and every verse disappears — a worse failure than the stacking this fixes.
    const c = twoSets()
    c.arrangement = [
      { stanza: 'A', set: '0', syllables: ['หนึ่งเอ', 'หนึ่งบี'] },
      { stanza: 'A', set: '1', syllables: ['สองเอ', 'สองบี'] },
    ]
    expect(wordsOf(resolveContent(c, { set: 0 }))).toEqual(['หนึ่งเอ', 'หนึ่งบี'])
    expect(wordsOf(resolveContent(c, { set: 1 }))).toEqual(['สองเอ', 'สองบี'])
  })

  it('a junk `set` reads as SHARED (shown everywhere), never as hidden', () => {
    const c = twoSets()
    c.arrangement = [
      { stanza: 'A', set: 0, syllables: ['หนึ่งเอ', 'หนึ่งบี'] },
      { stanza: 'A', set: 1, syllables: ['สองเอ', 'สองบี'] },
      { stanza: 'B', set: 'ไม่รู้', syllables: ['รับรวม'] },
    ]
    expect(wordsOf(resolveContent(c, { set: 0 }))).toContain('รับรวม')
    expect(wordsOf(resolveContent(c, { set: 1 }))).toContain('รับรวม')
  })

  it('an out-of-range or junk `set` falls back to the first set (never to stacking)', () => {
    for (const bad of [{ set: 9 }, { set: -1 }, { set: 1.5 }, { set: 'ข' }, { set: null }, {}]) {
      const w = wordsOf(resolveContent(twoSets(), bad))
      expect(w).toContain('หนึ่งเอ')
      expect(w).not.toContain('สองเอ')
    }
    // …but a numeric STRING is a real index, not junk — it is what a stringifying tool writes
    expect(wordsOf(resolveContent(twoSets(), { set: '1' }))).toContain('สองเอ')
  })
})

describe('resolveContent — back-compat (no lyricSets)', () => {
  it('a song with no lyricSets is untouched, and the set option is inert', () => {
    const base = resolveContent(plain())
    expect(wordsOf(base)).toEqual(['กา', 'ขา', 'คา', 'งา'])
    expect(sectionsOf(base)).toEqual(['ข้อ 1', 'ข้อ 2'])
    for (const opts of [{ set: 0 }, { set: 1 }, { set: 7 }, undefined]) {
      const l = resolveContent(plain(), opts)
      expect(JSON.stringify(l)).toBe(JSON.stringify(base))
      expect(l.map((x) => x._entryIndex)).toEqual(base.map((x) => x._entryIndex))
      expect(l.map((x) => x._melodyFirst)).toEqual(base.map((x) => x._melodyFirst))
    }
  })

  it('a v1 song (flat lines) is passed through unchanged', () => {
    const v1 = { lines: [[seg('1 2', 'C')]] }
    expect(resolveContent(v1, { set: 1 })).toBe(v1.lines)
  })

  it('a song declaring ONE lyric set is treated as an ordinary song', () => {
    const c = plain()
    c.lyricSets = [{ name: 'ชุดเดียว' }]
    expect(lyricSetCount(c)).toBe(0)
    expect(lyricSetFilter(c, { set: 0 })).toBe(null)
    expect(JSON.stringify(resolveContent(c))).toBe(JSON.stringify(resolveContent(plain())))
  })
})

describe('resolvePlayOrder — 717 lyric sets', () => {
  // the strophic refrain must be found IN the set being played, and its ranges must index the
  // same display lines the reader is looking at
  const strophic = () => ({
    version: 2, key: 'C', timeSignature: '4/4',
    lyricSets: [{ name: 'ชุดหนึ่ง' }, { name: 'ชุดสอง' }],
    stanzas: [
      { id: 'A', lines: [[seg('1 2', 'C')]] },
      { id: 'B', lines: [[seg('3', 'G')]] },
    ],
    arrangement: [
      { stanza: 'A', set: 0, label: 'ข้อ 1', syllables: ['ก', 'ข'] },
      { stanza: 'B', set: 0, label: 'รับ', afterEachVerse: true, syllables: ['ค'] },
      { stanza: 'A', set: 0, label: 'ข้อ 2', syllables: ['ง', 'จ'] },
      { stanza: 'A', set: 1, label: 'ข้อ 1', syllables: ['ฉ', 'ช'] },
    ],
  })

  it('play-order ranges stay inside the resolved sheet of the SAME set', () => {
    for (const set of [0, 1]) {
      const lines = resolveContent(strophic(), { set })
      const order = resolvePlayOrder(strophic(), { set })
      for (const r of order || []) {
        expect(r.fromLi).toBeGreaterThanOrEqual(0)
        expect(r.toLi).toBeLessThan(lines.length)
      }
    }
  })

  it('the refrain is NOT sung twice when the entry between belongs to another set', () => {
    // arrangement: [verse(set0), verse(set1), refrain(set0), verse(set0)]. On set 0's sheet the
    // refrain follows the first verse directly, so nothing may be appended after that verse —
    // but the entry physically next in the array is set 1's, so a raw i+1 adjacency test misses
    // it and the refrain lands twice in a row.
    const c = {
      version: 2, key: 'C', timeSignature: '4/4',
      lyricSets: [{ name: 'ก' }, { name: 'ข' }],
      stanzas: [
        { id: 'A', lines: [[seg('1 2', 'C')]] },
        { id: 'B', lines: [[seg('3', 'G')]] },
      ],
      arrangement: [
        { stanza: 'A', set: 0, syllables: ['ก1', 'ก2'] },
        { stanza: 'A', set: 1, syllables: ['ข1', 'ข2'] },
        { stanza: 'B', set: 0, afterEachVerse: true, syllables: ['ร'] },
        { stanza: 'A', set: 0, syllables: ['ก3', 'ก4'] },
      ],
    }
    // display lines of set 0: 0 = verse1, 1 = refrain, 2 = verse2
    // play order: verse1 · refrain · verse2 · refrain — the refrain never twice running
    expect(resolvePlayOrder(c, { set: 0 })).toEqual([
      { fromLi: 0, toLi: 0 }, { fromLi: 1, toLi: 1 },
      { fromLi: 2, toLi: 2 }, { fromLi: 1, toLi: 1 },
    ])
  })

  it('set 0 expands its refrain after each verse; set 1 (no refrain of its own) does not', () => {
    // set 0: ข้อ1 · รับ · ข้อ2 · รับ  → 4 ranges over 3 display lines
    expect((resolvePlayOrder(strophic(), { set: 0 }) || []).length).toBe(4)
    // set 1 has a single verse and no afterEachVerse entry → no strophic order at all
    expect(resolvePlayOrder(strophic(), { set: 1 })).toBe(null)
  })
})

// พี่เปา used the shipped feature and asked for sequential captions (via P'Aim, 26 ก.ค.):
// "ไม่ต้องใส่ชื่อ". lyricSetName is the ONE place that decides this, so pinning it here pins the
// reader tabs, the collapsed switcher, the editor tabs and the printed heading at once.
describe('lyricSetName — one caption per POSITION, everywhere', () => {
  it('reads the position, not the set', () => {
    expect(lyricSetName({}, 0)).toBe('เนื้อร้องที่ 1')
    expect(lyricSetName(undefined, 1)).toBe('เนื้อร้องที่ 2')
    expect(lyricSetName({}, 2)).toBe('เนื้อร้องที่ 3')
  })
  it('a stored `name`/`label` is IGNORED for display — in every shape it comes in', () => {
    // song 717 as it sits in the DB today: name and label both hold the set's first line
    expect(lyricSetName({ name: 'ชื่อจริง', label: 'ชื่อจริง' }, 0)).toBe('เนื้อร้องที่ 1')
    expect(lyricSetName({ name: 'ชื่อจริง', label: 'ทำนอง ๑' }, 0)).toBe('เนื้อร้องที่ 1')
    expect(lyricSetName({ label: 'ชุดเก่า' }, 1)).toBe('เนื้อร้องที่ 2')
    // the retired captions cannot leak back through either
    expect(lyricSetName({ label: 'ทำนอง ๑' }, 0)).toBe('เนื้อร้องที่ 1')
    expect(lyricSetName({ name: 'ทำนอง ๒' }, 0)).toBe('เนื้อร้องที่ 1') // position wins, always
  })
  it('counts in arabic all the way — one numeral system, no base change mid-list', () => {
    expect(lyricSetName({}, 9)).toBe('เนื้อร้องที่ 10')
    expect(lyricSetName({}, 10)).toBe('เนื้อร้องที่ 11')
  })
  it('the caption is what RENUMBERS a delete: index in, caption out', () => {
    // delete the middle of three and the survivor is read at index 1 → "เนื้อร้องที่ 2".
    // Nothing is stored, so there is no stale number to migrate (the DB is never rewritten).
    const survivors = [{ label: 'ทำนอง ๑' }, { label: 'ทำนอง ๓' }] // set 2 was deleted
    expect(survivors.map((s, i) => lyricSetName(s, i)))
      .toEqual(['เนื้อร้องที่ 1', 'เนื้อร้องที่ 2'])
  })
})

// The stored name is not displayed, but it is still DATA — hidden search text that keeps a set
// findable by the wording a church remembers. isSetCaption is how search tells that data apart
// from app chrome it must never index.
describe('isSetCaption — chrome vs. a name somebody typed', () => {
  it('recognises the caption in all three shapes it has ever taken', () => {
    for (const s of ['เนื้อร้องที่ 1', 'เนื้อร้องที่ 12', 'ทำนอง 2', 'ทำนอง ๒', 'ทำนอง ๑๐', ' ทำนอง 3 ']) {
      expect(isSetCaption(s)).toBe(true)
    }
  })
  it('leaves real free text alone, even when it contains the words or a Thai numeral', () => {
    for (const s of ['ชุดที่ ๒ ของโบสถ์', 'ทำนอง ๑ สำหรับเด็ก', 'เนื้อร้องที่ 2 ของโบสถ์เรา', 'เพลง ๑', '', undefined]) {
      expect(isSetCaption(s)).toBe(false)
    }
  })
})
