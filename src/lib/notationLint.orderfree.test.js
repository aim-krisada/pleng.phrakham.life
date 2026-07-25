// G1 — the LIBRARY side of order-free: stored data is never rewritten silently.
// The parser reads a swapped order correctly, and lint reports the mismatch so a
// person can compare with the printed original (docs/ds/note-symbol-set.md §1.2.1).
import { describe, it, expect } from 'vitest'
import { lintBar } from './notationLint.js'

const codes = (s, o) => lintBar(s, o).map((f) => f.code)
const of = (s, code) => lintBar(s).filter((f) => f.code === code)

describe('R10 modifier-order — flag, never rewrite', () => {
  it.each(['5^.', '2^.', '#4^_', '1^_', '2^_', '.#4'])('%s is reported', (box) => {
    const [f] = of(box, 'modifier-order')
    expect(f).toBeTruthy()
    expect(f.severity).toBe('warning')
    expect(f.box).toBe(box)
  })

  it('names both what is stored and how it is read', () => {
    const [f] = of('5^.', 'modifier-order')
    expect(f.message).toContain('5^.')
    expect(f.message).toContain('5.^')
    expect(f.suggestion).toBe('5.^')
    expect(f.message).toContain('หนังสือต้นฉบับ') // decide against the printed original
  })

  it('reports every swapped box in the bar, one finding each', () => {
    expect(of('1_ 1_ 4_ 3_ 1^_ 2^_', 'modifier-order').map((f) => f.box)).toEqual(['1^_', '2^_'])
  })

  it('stays quiet on notes already in canonical order', () => {
    for (const s of ['5.^', '#4_^', '#.4', '.5 5. 5__ ~5 5~ n5', "1' (5^ 4^) 0_"]) {
      expect(of(s, 'modifier-order')).toEqual([])
    }
  })
})

describe('what R10 does to the other findings', () => {
  it('the five broken spots stop being "unreadable" and their bars now count 3 beats', () => {
    const bars = ['1_ 1_ 1_ 5^.', '1_ .7_ 1_ 2^.', '(5^ #4^_ 4^) 0_', '1_ 1_ 4_ 3_ 1^_ 2^_', '.2 .3_ .#4 .5_']
    for (const bar of bars) {
      const cs = codes(bar, { timeSignature: '3/4' })
      expect(cs).not.toContain('unreadable')
      expect(cs).not.toContain('beats')
      expect(cs).toContain('modifier-order')
    }
  })

  it('อาการ 3 keeps its error — an unmatched ")" is still flagged', () => {
    expect(codes('~6) - 3')).toContain('slur-crosses-bar')
    expect(codes('1_ {1_ .6_ 1_})')).toContain('slur-crosses-bar')
    expect(of('~6) - 3', 'modifier-order')).toEqual([])
  })

  it('genuinely unknown characters are still errors', () => {
    expect(codes('5 x')).toContain('unreadable')
  })
})
