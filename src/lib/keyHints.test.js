// DS note-symbol-set §4.1 (G17) — the key-equivalent hints are MEASURED on the user's own
// machine. The rule that matters: not sure = show nothing (a wrong position is worse than none).
import { describe, it, expect } from 'vitest'
import { baseLabelFor, learnKey, readHints } from './keyHints.js'

function fakeStore() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  }
}
const layout = new Map([['Digit6', '6'], ['Digit1', '1'], ['Minus', '-'], ['Quote', 'ง']])

describe('baseLabelFor', () => {
  it('prefers what the browser measured for that physical key', () => {
    expect(baseLabelFor('Digit6', layout)).toBe('6')
    expect(baseLabelFor('Quote', layout)).toBe('ง') // a Thai layout is reported honestly
  })

  it('falls back only where the code IS the character by definition', () => {
    expect(baseLabelFor('Digit6', null)).toBe('6')
    expect(baseLabelFor('KeyN', null)).toBe('n')
    // punctuation codes differ between layouts → silence, never a US guess
    expect(baseLabelFor('Minus', null)).toBe(null)
    expect(baseLabelFor('Quote', null)).toBe(null)
    expect(baseLabelFor('Backslash', null)).toBe(null)
  })
})

describe('learnKey', () => {
  it('records the shift layer as "⇧ + base" — the case พี่เปา could not find', () => {
    const s = fakeStore()
    expect(learnKey('^', 'Digit6', true, layout, s)).toBe('⇧ + 6')
    expect(readHints(s)['^']).toBe('⇧ + 6')
  })

  it('records an unshifted key as itself', () => {
    const s = fakeStore()
    expect(learnKey('n', 'KeyN', false, layout, s)).toBe('n')
    expect(readHints(s).n).toBe('n')
  })

  it('learns nothing (and stores nothing) when the key cannot be described honestly', () => {
    const s = fakeStore()
    expect(learnKey("'", 'Quote', false, null, s)).toBe(null)
    expect(readHints(s)["'"]).toBeUndefined()
    expect(learnKey('^', '', true, layout, s)).toBe(null)
  })

  it('keeps hints per character, and re-learning the same key is a no-op', () => {
    const s = fakeStore()
    learnKey('^', 'Digit6', true, layout, s)
    learnKey('|', 'Backslash', true, new Map([['Backslash', '\\']]), s)
    expect(readHints(s)).toEqual({ '^': '⇧ + 6', '|': '⇧ + \\' })
    expect(learnKey('^', 'Digit6', true, layout, s)).toBe('⇧ + 6')
  })

  it('unreadable storage never throws', () => {
    const broken = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } }
    expect(readHints(broken)).toEqual({})
    expect(() => learnKey('^', 'Digit6', true, layout, broken)).not.toThrow()
  })
})
