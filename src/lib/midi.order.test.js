// B043 §3b — the play order built from selected section tags, plus the note list
// buildPlayNotes hands both the audio engine and the viewer (dot/markers/scrub/⏮⏭).
import { describe, it, expect } from 'vitest'
import { sectionTags, effectiveOrder, buildPlayNotes } from './midi.js'

// four occurrences: ร้อง1 · รับ · ร้อง2 · รับ (รับ shares a label across two lines)
const sections = [
  { name: 'ร้อง 1', fromLi: 0, toLi: 0 },
  { name: 'รับ', fromLi: 1, toLi: 1 },
  { name: 'ร้อง 2', fromLi: 2, toLi: 2 },
  { name: 'รับ', fromLi: 3, toLi: 3 },
]
// one segment per line so each li yields exactly one note (li == the pitch here)
const content = {
  key: 'C',
  lines: [
    [{ type: 'segment', note: '1' }],
    [{ type: 'segment', note: '2' }],
    [{ type: 'segment', note: '3' }],
    [{ type: 'segment', note: '4' }],
  ],
}

describe('sectionTags — group occurrences by label', () => {
  it('collapses the two รับ occurrences into one tag with two ranges', () => {
    const tags = sectionTags(sections)
    expect(tags.map((t) => t.name)).toEqual(['ร้อง 1', 'รับ', 'ร้อง 2'])
    expect(tags.find((t) => t.name === 'รับ').ranges).toEqual([
      { fromLi: 1, toLi: 1 },
      { fromLi: 3, toLi: 3 },
    ])
  })
})

describe('effectiveOrder — selection → play order (decision D)', () => {
  it('nothing selected → undefined (= play the whole song)', () => {
    expect(effectiveOrder(sections, new Set())).toBeUndefined()
    expect(effectiveOrder(sections, null)).toBeUndefined()
  })

  it('one repeated tag collapses to a single range (loop repeats it)', () => {
    const ord = effectiveOrder(sections, new Set(['รับ']))
    expect(ord).toEqual([{ name: 'รับ', fromLi: 1, toLi: 1 }])
  })

  it('two tags play in song order and collapse the loop seam', () => {
    // pick {ร้อง 2, รับ} → occurrences รับ · ร้อง2 · รับ → seam-collapse → ร้อง2 · รับ
    const ord = effectiveOrder(sections, new Set(['ร้อง 2', 'รับ']))
    expect(ord.map((r) => r.name)).toEqual(['ร้อง 2', 'รับ'])
  })
})

describe('buildPlayNotes — the shared note sequence', () => {
  it('whole song = every note in line order', () => {
    expect(buildPlayNotes(content).map((n) => n.li)).toEqual([0, 1, 2, 3])
  })

  it('order concatenates each range in the given order', () => {
    const ord = [
      { fromLi: 2, toLi: 2 },
      { fromLi: 3, toLi: 3 },
    ]
    expect(buildPlayNotes(content, { order: ord }).map((n) => n.li)).toEqual([2, 3])
  })

  it('a single range still works (legacy play-by-section)', () => {
    expect(buildPlayNotes(content, { range: { fromLi: 1, toLi: 1 } }).map((n) => n.li)).toEqual([1])
  })
})
