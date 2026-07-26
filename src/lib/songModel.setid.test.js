// 717 — a lyric set's PERMANENT id, and what a shared ?set= link points at.
//
// A share link is a public promise: it goes into a group chat and has to still mean the same
// words next year. A positional ?set=1 cannot promise that — delete the first set and every
// link already out there silently starts pointing at different words, with nobody to notice.
// Hence an id per set, minted once and never reused.
import { describe, it, expect } from 'vitest'
import { lyricSetIdAt, lyricSetIndexById, mintLyricSetIds, lyricSetCount } from './songModel.js'

const base = {
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines: [[{ type: 'segment', note: '1' }]] }],
  arrangement: [{ stanza: 'A', set: 0, syllables: [] }, { stanza: 'A', set: 1, syllables: [] }],
}
const withSets = (sets) => ({ ...base, lyricSets: sets })

describe('mintLyricSetIds', () => {
  it('gives every set an id', () => {
    const out = mintLyricSetIds(withSets([{ name: 'ก' }, { name: 'ข' }]))
    expect(out.lyricSets.every((s) => typeof s.id === 'string' && s.id.length > 3)).toBe(true)
    expect(out.lyricSets[0].id).not.toBe(out.lyricSets[1].id)
  })

  it('NEVER rewrites an id that already exists — links already shared keep working', () => {
    const first = mintLyricSetIds(withSets([{ name: 'ก' }, { name: 'ข' }]))
    const ids = first.lyricSets.map((s) => s.id)
    const again = mintLyricSetIds(first)
    expect(again.lyricSets.map((s) => s.id)).toEqual(ids)
    expect(again).toBe(first) // nothing to do → the very same object
  })

  it('mints only the MISSING one when a set is added later', () => {
    const one = mintLyricSetIds(withSets([{ name: 'ก' }, { name: 'ข' }]))
    const added = { ...one, lyricSets: [...one.lyricSets, { name: 'ค' }] }
    const out = mintLyricSetIds(added)
    expect(out.lyricSets[0].id).toBe(one.lyricSets[0].id) // untouched
    expect(out.lyricSets[1].id).toBe(one.lyricSets[1].id)
    expect(out.lyricSets[2].id).toBeTruthy()
    expect(new Set(out.lyricSets.map((s) => s.id)).size).toBe(3)
  })

  it('re-mints a DUPLICATED id — two sets a link cannot tell apart', () => {
    const dup = withSets([{ name: 'ก', id: 'sAAA' }, { name: 'ข', id: 'sAAA' }])
    const out = mintLyricSetIds(dup)
    expect(out.lyricSets[0].id).toBe('sAAA') // the first keeps it
    expect(out.lyricSets[1].id).not.toBe('sAAA')
  })

  it('keeps the set’s other fields', () => {
    const out = mintLyricSetIds(withSets([{ name: 'ก', label: 'ทำนอง ๑' }, { name: 'ข' }]))
    expect(out.lyricSets[0]).toMatchObject({ name: 'ก', label: 'ทำนอง ๑' })
  })

  it('back-compat — an ordinary song is returned untouched, same object', () => {
    expect(mintLyricSetIds(base)).toBe(base)
    expect(mintLyricSetIds({ ...base, lyricSets: [{ name: 'เดียว' }] })).toMatchObject({ lyricSets: [{ name: 'เดียว' }] })
    expect(lyricSetCount({ ...base, lyricSets: [{ name: 'เดียว' }] })).toBe(0) // 1 set = not a multi-set song
  })

  it('survives junk without throwing', () => {
    expect(() => mintLyricSetIds(null)).not.toThrow()
    expect(() => mintLyricSetIds({})).not.toThrow()
    const out = mintLyricSetIds(withSets([{ name: 'ก', id: 42 }, { name: 'ข' }]))
    expect(typeof out.lyricSets[0].id).toBe('string') // a non-string id is replaced
  })
})

describe('lyricSetIdAt / lyricSetIndexById — the link round-trip', () => {
  const minted = mintLyricSetIds(withSets([{ name: 'ก' }, { name: 'ข' }, { name: 'ค' }]))

  it('round-trips: the id of set i resolves back to i', () => {
    for (const i of [0, 1, 2]) {
      expect(lyricSetIndexById(minted, lyricSetIdAt(minted, i))).toBe(i)
    }
  })

  it('the id is POSITION-INDEPENDENT — deleting an earlier set does not move the link', () => {
    // the whole reason for ids: with ?set=1 this link would now open different words.
    const idOfC = lyricSetIdAt(minted, 2)
    const afterDelete = { ...minted, lyricSets: [minted.lyricSets[0], minted.lyricSets[2]] }
    expect(lyricSetIndexById(afterDelete, idOfC)).toBe(1) // followed the SET, not the slot
    expect(afterDelete.lyricSets[1].name).toBe('ค')
  })

  it('an unknown / deleted / junk id falls back to the FIRST set, never errors', () => {
    for (const bad of ['sNOPE', '', null, undefined, '../../etc', '999']) {
      expect(lyricSetIndexById(minted, bad)).toBe(0)
    }
    const removed = { ...minted, lyricSets: [minted.lyricSets[1], minted.lyricSets[2]] }
    expect(lyricSetIndexById(removed, lyricSetIdAt(minted, 0))).toBe(0)
  })

  it('a set with no id yet (saved before ids existed) reports empty and shares positionless', () => {
    const old = withSets([{ name: 'ก' }, { name: 'ข' }])
    expect(lyricSetIdAt(old, 1)).toBe('')
    expect(lyricSetIndexById(old, '')).toBe(0)
  })

  it('an ordinary song has no set ids and resolves to 0', () => {
    expect(lyricSetIdAt(base, 0)).toBe('')
    expect(lyricSetIndexById(base, 'anything')).toBe(0)
  })
})
