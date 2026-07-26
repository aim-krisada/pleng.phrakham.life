// /v2 has no separate editor — the inline (✏️) one is it — so a person editing there must be
// able to make a second set of WORDS on the same melody without going back to the v1 editor
// (P'Aim, 26 ก.ค.: "คนแก้บน v2 ต้องสร้างชุดใหม่ได้"). These are the pure content ops behind
// that button, on the same seam as every other structure action.
import { describe, it, expect } from 'vitest'
import { addLyricSet, deleteLyricSet } from './songStructure.js'
import { lyricSetCount, resolveContent, lyricSetName } from './songModel.js'

const plain = () => ({
  version: 2,
  key: 'C',
  timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', chord: 'C', note: '1 2' }]] }],
  arrangement: [{ stanza: 'A', label: '', syllables: ['กา', 'ขา'] }],
})

describe('addLyricSet — the ＋ behind /v2’s inline editor', () => {
  it('an ordinary song gains its FIRST pair of sets, existing words tagged as set 0', () => {
    const next = addLyricSet(plain())
    expect(next.lyricSets).toHaveLength(2)
    expect(lyricSetCount(next)).toBe(2)
    // the pre-existing words are now set 0's, NOT shared — an untagged row would show up under
    // the new set too, which is the "two sets stacked" reading the feature exists to prevent
    const [first, second] = next.arrangement
    expect(first.set).toBe(0)
    expect(first.syllables).toEqual(['กา', 'ขา'])
    expect(second.set).toBe(1)
    expect(second.syllables).toEqual([]) // the new set starts wordless
    expect(second.stanza).toBe('A') // …on the SAME melody
    expect(next.stanzas).toEqual(plain().stanzas) // melody untouched
  })

  it('the new set is captioned by POSITION, and stores no caption of its own', () => {
    const next = addLyricSet(plain())
    expect(next.lyricSets.map((s, i) => lyricSetName(s, i))).toEqual(['เนื้อร้องที่ 1', 'เนื้อร้องที่ 2'])
    // nothing written down = nothing to go stale when a middle set is deleted later
    expect(next.lyricSets).toEqual([{}, {}])
  })

  it('deleting a middle set renumbers the survivors (3 sets, drop the 2nd → 1 and 2)', () => {
    const three = addLyricSet(addLyricSet(plain()))
    expect(three.lyricSets.map((s, i) => lyricSetName(s, i)))
      .toEqual(['เนื้อร้องที่ 1', 'เนื้อร้องที่ 2', 'เนื้อร้องที่ 3'])
    const two = deleteLyricSet(three, 1)
    expect(two.lyricSets.map((s, i) => lyricSetName(s, i)))
      .toEqual(['เนื้อร้องที่ 1', 'เนื้อร้องที่ 2'])
    expect(two.arrangement.map((r) => r.set)).toEqual([0, 1])
  })

  it('a THIRD set appends without disturbing the first two', () => {
    const two = addLyricSet(plain())
    const three = addLyricSet(two)
    expect(three.lyricSets).toHaveLength(3)
    expect(three.arrangement.map((r) => r.set)).toEqual([0, 1, 2])
    expect(three.arrangement[0].syllables).toEqual(['กา', 'ขา'])
  })

  it('each set’s sheet shows only its own words (the reader path agrees)', () => {
    const two = addLyricSet(plain())
    const withWords = {
      ...two,
      arrangement: two.arrangement.map((r) => (r.set === 1 ? { ...r, syllables: ['คา', 'งา'] } : r)),
    }
    const set0 = JSON.stringify(resolveContent(withWords, { set: 0 }))
    const set1 = JSON.stringify(resolveContent(withWords, { set: 1 }))
    expect(set0).toContain('กา')
    expect(set0).not.toContain('คา')
    expect(set1).toContain('คา')
    expect(set1).not.toContain('กา')
  })

  it('a song with no melody at all is returned untouched (nothing to hang words on)', () => {
    const empty = { version: 2, stanzas: [], arrangement: [] }
    expect(addLyricSet(empty)).toBe(empty)
  })
})

describe('deleteLyricSet — removes one set’s words, never the melody', () => {
  const three = () => addLyricSet(addLyricSet(plain()))

  it('deletes a MIDDLE set and shifts the later ones down', () => {
    const c = three()
    const tagged = {
      ...c,
      arrangement: c.arrangement.map((r) => ({ ...r, syllables: ['set' + r.set] })),
    }
    const next = deleteLyricSet(tagged, 1)
    expect(next.lyricSets).toHaveLength(2)
    expect(next.arrangement.map((r) => r.set)).toEqual([0, 1])
    const words = next.arrangement.flatMap((r) => r.syllables)
    expect(words).toEqual(['set0', 'set2']) // set 1's words gone, set 2 kept and reindexed
    expect(next.stanzas).toEqual(plain().stanzas)
  })

  it('a SHARED row (no `set`) survives every delete', () => {
    const c = three()
    const withShared = { ...c, arrangement: [...c.arrangement, { stanza: 'A', label: 'รับ', syllables: ['รับ'] }] }
    const next = deleteLyricSet(withShared, 1)
    expect(next.arrangement.some((r) => r.syllables[0] === 'รับ' && r.set === undefined)).toBe(true)
  })

  it('down to ONE set the song collapses back to an ordinary one — byte-identical shape', () => {
    let c = addLyricSet(plain())
    c = deleteLyricSet(c, 1)
    expect('lyricSets' in c).toBe(false)
    expect(c.arrangement.every((r) => !('set' in r))).toBe(true)
    expect(c.arrangement[0].syllables).toEqual(['กา', 'ขา']) // set 0's words survive
    expect(lyricSetCount(c)).toBe(0)
  })

  it('the LAST set can never be deleted, and junk indices are no-ops', () => {
    const one = plain()
    expect(deleteLyricSet(one, 0)).toBe(one)
    const two = addLyricSet(plain())
    expect(deleteLyricSet(two, -1)).toBe(two)
    expect(deleteLyricSet(two, 9)).toBe(two)
  })
})
