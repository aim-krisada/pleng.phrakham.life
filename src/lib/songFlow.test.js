import { describe, it, expect } from 'vitest'
import {
  voltaNums, hasFlow, isNonEmptyFlow, mintMarkerIds, allMarkerIds,
  repeatPasses, forcedEnding, findOrphanFlows, stripEditorMarkerIds,
} from './songFlow.js'

// helper: a v2 song shell with the given stanza lines
const song = (lines, arrangement = [{ stanza: 'A', label: '' }]) => ({
  version: 2, key: 'C', timeSignature: '4/4',
  stanzas: [{ id: 'A', lines }], arrangement,
})

describe('voltaNums — reads single number AND list (R2)', () => {
  it('single number → one-element list', () => {
    expect(voltaNums({ type: 'volta', num: 1 })).toEqual([1])
  })
  it('list → deduped list of positive numbers', () => {
    expect(voltaNums({ type: 'volta', num: [2, 3] })).toEqual([2, 3])
    expect(voltaNums({ type: 'volta', num: [2, 2, 3] })).toEqual([2, 3])
  })
  it('missing / invalid → empty', () => {
    expect(voltaNums({ type: 'volta' })).toEqual([])
    expect(voltaNums({ type: 'volta', num: 0 })).toEqual([])
    expect(voltaNums(null)).toEqual([])
  })
})

describe('mintMarkerIds — R1 core', () => {
  it('mints ids for markers that have none, pairing repeat-start↔repeat-end with ONE id', () => {
    const c = song([[
      { type: 'repeat-start' },
      { type: 'segment', note: '1 2 3 4' },
      { type: 'repeat-end' },
    ]])
    const { content, changed } = mintMarkerIds(c)
    expect(changed).toBe(true)
    const items = content.stanzas[0].lines[0]
    const start = items.find((i) => i.type === 'repeat-start')
    const end = items.find((i) => i.type === 'repeat-end')
    expect(start.id).toBeTruthy()
    expect(start.id).toBe(end.id) // the pair shares one id
  })

  it('is idempotent — a second mint changes nothing and keeps the same ids', () => {
    const first = mintMarkerIds(song([[
      { type: 'repeat-start' }, { type: 'segment', note: '1' }, { type: 'repeat-end' },
      { type: 'volta', num: 1 },
    ]])).content
    const idsBefore = [...allMarkerIds(first)].sort()
    const second = mintMarkerIds(first)
    expect(second.changed).toBe(false)
    expect([...allMarkerIds(second.content)].sort()).toEqual(idsBefore)
  })

  it('ROUND-TRIP: load → (save = mint) → reload → ids identical (the #1 risk)', () => {
    const authored = mintMarkerIds(song([[
      { type: 'repeat-start' }, { type: 'segment', note: '1 2' }, { type: 'repeat-end' },
    ]])).content
    // simulate reload: the stored content already has ids; minting again must not reissue
    const reloaded = mintMarkerIds(JSON.parse(JSON.stringify(authored)))
    expect(reloaded.changed).toBe(false)
    expect(allMarkerIds(reloaded.content)).toEqual(allMarkerIds(authored))
  })

  it('preserves existing ids and fills only the gaps (never reassigns)', () => {
    const c = song([[
      { type: 'repeat-start', id: 'r5' }, { type: 'segment', note: '1' }, { type: 'repeat-end', id: 'r5' },
      { type: 'repeat-start' }, { type: 'segment', note: '2' }, { type: 'repeat-end' },
    ]])
    const { content } = mintMarkerIds(c)
    const items = content.stanzas[0].lines[0]
    const starts = items.filter((i) => i.type === 'repeat-start')
    expect(starts[0].id).toBe('r5') // untouched
    expect(starts[1].id).toBe('r1') // smallest free, not r6
    expect(starts[1].id).not.toBe('r5')
  })

  it('does not mutate the input content', () => {
    const c = song([[{ type: 'repeat-start' }, { type: 'segment', note: '1' }, { type: 'repeat-end' }]])
    const snapshot = JSON.parse(JSON.stringify(c))
    mintMarkerIds(c)
    expect(c).toEqual(snapshot)
  })

  it('CONTROL: a song with no structural markers is returned unchanged', () => {
    const c = song([[{ type: 'segment', note: '1 2 3 4' }]])
    const { content, changed } = mintMarkerIds(c)
    expect(changed).toBe(false)
    expect(content.stanzas[0].lines[0]).toEqual(c.stanzas[0].lines[0])
  })
})

describe('repeatPasses — R3 skip / times precedence', () => {
  it('no flow → melody default', () => {
    expect(repeatPasses(undefined, 'r1', 2)).toBe(2)
    expect(repeatPasses({}, 'r1', 3)).toBe(3)
  })
  it('skip of THIS id → play once', () => {
    expect(repeatPasses({ skip: ['r1'] }, 'r1', 2)).toBe(1)
  })
  it('skip "*" → play every repeat once (song 105)', () => {
    expect(repeatPasses({ skip: ['*'] }, 'r1', 2)).toBe(1)
    expect(repeatPasses({ skip: ['*'] }, 'r2', 2)).toBe(1)
  })
  it('skip of a DIFFERENT id → unaffected', () => {
    expect(repeatPasses({ skip: ['r2'] }, 'r1', 2)).toBe(2)
  })
  it('times override → that count', () => {
    expect(repeatPasses({ times: { r1: 3 } }, 'r1', 2)).toBe(3)
    expect(repeatPasses({ times: { r2: 4 } }, 'r1', 2)).toBe(2) // other id untouched
  })
  it('R4: a skip/times to an unknown id is ignored (orphan → melody default)', () => {
    const known = new Set(['r1'])
    expect(repeatPasses({ skip: ['rX'] }, 'r1', 2, known)).toBe(2)
    expect(repeatPasses({ times: { rX: 9 } }, 'r1', 2, known)).toBe(2)
    // but "*" still works even with knownIds (it is not an id)
    expect(repeatPasses({ skip: ['*'] }, 'r1', 2, known)).toBe(1)
  })
})

describe('forcedEnding — R3 ending', () => {
  it('null when no flow / no ending', () => {
    expect(forcedEnding({})).toBe(null)
    expect(forcedEnding({ skip: ['r1'] })).toBe(null)
  })
  it('returns the forced ending number', () => {
    expect(forcedEnding({ ending: 3 })).toBe(3)
  })
})

describe('findOrphanFlows — R4', () => {
  const withFlow = (flow) => song(
    [[{ type: 'repeat-start', id: 'r1' }, { type: 'segment', note: '1' }, { type: 'repeat-end', id: 'r1' }]],
    [{ stanza: 'A', label: 'ข้อ 1' }, { stanza: 'A', label: 'ข้อ 2', flow }],
  )
  it('flags a skip to a deleted id', () => {
    const orphans = findOrphanFlows(withFlow({ skip: ['rZ'] }))
    expect(orphans).toEqual([{ entryIndex: 1, kind: 'skip', ref: 'rZ' }])
  })
  it('does NOT flag a valid id or "*"', () => {
    expect(findOrphanFlows(withFlow({ skip: ['r1'] }))).toEqual([])
    expect(findOrphanFlows(withFlow({ skip: ['*'] }))).toEqual([])
  })
  it('flags times to a deleted id', () => {
    expect(findOrphanFlows(withFlow({ times: { rZ: 3 } }))).toEqual([
      { entryIndex: 1, kind: 'times', ref: 'rZ' },
    ])
  })
  it('flags skipSections to a non-existent stanza', () => {
    expect(findOrphanFlows(withFlow({ skipSections: ['Z'] }))).toEqual([
      { entryIndex: 1, kind: 'skipSections', ref: 'Z' },
    ])
    expect(findOrphanFlows(withFlow({ skipSections: ['A'] }))).toEqual([])
  })
})

describe('hasFlow / isNonEmptyFlow', () => {
  it('empty flow is not counted', () => {
    expect(isNonEmptyFlow({})).toBe(false)
    expect(isNonEmptyFlow(null)).toBe(false)
    expect(hasFlow(song([[{ type: 'segment', note: '1' }]], [{ stanza: 'A', flow: {} }]))).toBe(false)
  })
  it('any directive counts', () => {
    expect(isNonEmptyFlow({ skip: ['r1'] })).toBe(true)
    expect(isNonEmptyFlow({ times: { r1: 2 } })).toBe(true)
    expect(isNonEmptyFlow({ ending: 2 })).toBe(true)
    expect(isNonEmptyFlow({ jump: 'segno' })).toBe(true)
    expect(isNonEmptyFlow({ skipSections: ['B'] })).toBe(true)
    expect(isNonEmptyFlow({ path: ['r1'] })).toBe(true)
  })
})

describe('stripEditorMarkerIds — R1 rule 2 (copy-paste remint)', () => {
  it('clears ids on a cloned line + its bars', () => {
    const line = { markerId: 'm1', bars: [{ repeatStartId: 'r1', repeatEndId: 'r1', voltaId: 'v1' }] }
    stripEditorMarkerIds(line)
    expect(line.markerId).toBe('')
    expect(line.bars[0]).toEqual({ repeatStartId: '', repeatEndId: '', voltaId: '' })
  })
})
