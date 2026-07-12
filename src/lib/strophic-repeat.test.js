// B102 — strophic "ร้องรับทุกข้อ": the sheet writes the refrain ONCE, but singing repeats it
// after every verse. resolvePlayOrder (songModel) expands the PLAY order to display-line ranges
// with the refrain re-inserted; buildPlayNotes (midi) concatenates them so playback repeats the
// refrain while the sheet (resolveContent) still shows it once. This mirrors the real song 141
// shape: arrangement [ข้อ1, รับ, ข้อ2, ข้อ3, ข้อ4], the refrain written once after ข้อ1.
import { describe, it, expect } from 'vitest'
import { resolveContent, resolvePlayOrder } from './songModel.js'
import { buildPlayNotes } from './midi.js'

// stanza A = the verse melody (2 lines · 2 notes each = 4 notes); stanza B = the refrain
// (1 line · 3 notes). The four verses reuse melody A; the refrain is sung after each of them.
const song141 = {
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [
    { id: 'A', lines: [[{ type: 'segment', note: '1 2' }], [{ type: 'segment', note: '3 4' }]] },
    { id: 'B', lines: [[{ type: 'segment', note: '5 5 5' }]] },
  ],
  arrangement: [
    { stanza: 'A', label: '' }, // ข้อ 1 (unlabelled, like 141)
    { stanza: 'B', label: 'รับ', afterEachVerse: true }, // the refrain — sung after every verse
    { stanza: 'A', label: 'ข้อ 2' },
    { stanza: 'A', label: 'ข้อ 3' },
    { stanza: 'A', label: 'ข้อ 4' },
  ],
}
// the same song WITHOUT the directive — the current on-server state (bug: refrain sung once)
const noDirective = JSON.parse(JSON.stringify(song141))
delete noDirective.arrangement[1].afterEachVerse

const resolvedOf = (c) => ({ ...c, lines: resolveContent(c) })
const refrainLiCount = (notes) => notes.filter((n) => n.li === 2).length // li 2 = the single refrain line

describe('resolvePlayOrder — strophic refrain expansion (AC-1)', () => {
  it('inserts the refrain after every verse (refrain plays 4×, once per verse)', () => {
    const order = resolvePlayOrder(song141)
    // ข้อ1 → รับ → ข้อ2 → รับ → ข้อ3 → รับ → ข้อ4 → รับ  (refrain range {2,2} appears 4×)
    expect(order.map((r) => `${r.fromLi}-${r.toLi}`)).toEqual([
      '0-1', '2-2', '3-4', '2-2', '5-6', '2-2', '7-8', '2-2',
    ])
    expect(order.filter((r) => r.fromLi === 2).length).toBe(4)
  })

  it('does NOT double the refrain that the arrangement already writes after ข้อ 1', () => {
    // ข้อ1's refrain is authored inline (entry 1). The resolver must not add a second one there.
    const order = resolvePlayOrder(song141)
    expect(order[0]).toMatchObject({ fromLi: 0, toLi: 1 }) // ข้อ 1
    expect(order[1]).toMatchObject({ fromLi: 2, toLi: 2 }) // its refrain (from the arrangement)
    expect(order[2]).toMatchObject({ fromLi: 3, toLi: 4 }) // ข้อ 2 comes next, not a 2nd refrain
  })

  it('a refrain written once at the END still expands correctly (order-independent)', () => {
    const endRefrain = {
      version: 2, key: 'C', timeSignature: '4/4',
      stanzas: song141.stanzas,
      arrangement: [
        { stanza: 'A', label: 'ข้อ 1' },
        { stanza: 'A', label: 'ข้อ 2' },
        { stanza: 'B', label: 'รับ', afterEachVerse: true },
      ],
    }
    const order = resolvePlayOrder(endRefrain)
    // ข้อ1 → รับ → ข้อ2 → รับ  (refrain line = li 4 here)
    expect(order.map((r) => r.fromLi)).toEqual([0, 4, 2, 4])
  })
})

describe('buildPlayNotes — playback repeats the refrain (AC-1 note count)', () => {
  it('with the directive → refrain plays 4×; without → once (the bug)', () => {
    const resolved = resolvedOf(song141)
    const before = buildPlayNotes(resolved, { order: resolvePlayOrder(noDirective) ?? undefined })
    const after = buildPlayNotes(resolved, { order: resolvePlayOrder(song141) ?? undefined })
    expect(refrainLiCount(before)).toBe(3) // refrain (3 notes) sung ONCE — the reported bug
    expect(refrainLiCount(after)).toBe(12) // 4 passes × 3 notes = refrain sung 4×
    // whole run grows by exactly the 3 extra refrain passes (3 × 3 notes)
    expect(after.length).toBe(before.length + 9)
  })

  it('repeated refrain notes keep their ORIGINAL li (highlight/timeline anchor)', () => {
    const after = buildPlayNotes(resolvedOf(song141), { order: resolvePlayOrder(song141) })
    // every refrain note — on all four passes — reports li 2 (the one display line)
    expect(after.filter((n) => n.li === 2).every((n) => n.li === 2)).toBe(true)
  })
})

describe('display (resolveContent) is untouched — refrain shown ONCE + rubric (AC-1)', () => {
  it('the sheet still lists the refrain a single time', () => {
    const lines = resolveContent(song141)
    const refrainLines = lines.filter((l) => l.some((it) => it.type === 'section' && it.name === 'รับ'))
    expect(refrainLines.length).toBe(1) // one refrain block on the sheet, not four
  })

  it('the refrain section carries the one-time rubric "ร้องรับทุกข้อ"', () => {
    const lines = resolveContent(song141)
    const marker = lines.flat().find((it) => it.type === 'section' && it.name === 'รับ')
    expect(marker.rubric).toBe('ร้องรับทุกข้อ')
  })

  it('a non-directive section has no rubric', () => {
    const marker = resolveContent(song141).flat().find((it) => it.type === 'section' && it.name === 'ข้อ 2')
    expect(marker.rubric).toBeUndefined()
  })

  it('every display line is tagged with its arrangement entry index', () => {
    const lines = resolveContent(song141)
    expect(lines.map((l) => l._entryIndex)).toEqual([0, 0, 1, 2, 2, 3, 3, 4, 4])
  })
})

describe('no directive / not v2 → null (AC-7 regression: whole song unchanged)', () => {
  it('resolvePlayOrder returns null when no section carries the directive', () => {
    expect(resolvePlayOrder(noDirective)).toBeNull()
  })

  it('returns null for a v1 (flat lines) song', () => {
    expect(resolvePlayOrder({ key: 'C', lines: [[{ type: 'segment', note: '1' }]] })).toBeNull()
  })

  it('with null order, buildPlayNotes plays the whole song exactly as before', () => {
    const resolved = resolvedOf(noDirective)
    const whole = buildPlayNotes(resolved, {})
    const viaOrder = buildPlayNotes(resolved, { order: resolvePlayOrder(noDirective) ?? undefined })
    expect(viaOrder.map((n) => n.li)).toEqual(whole.map((n) => n.li))
  })
})

describe('directive round-trips through save/download (AC-4)', () => {
  it('survives JSON serialize + parse and still expands', () => {
    const roundTripped = JSON.parse(JSON.stringify(song141))
    expect(roundTripped.arrangement[1].afterEachVerse).toBe(true)
    expect(resolvePlayOrder(roundTripped).filter((r) => r.fromLi === 2).length).toBe(4)
  })
})
