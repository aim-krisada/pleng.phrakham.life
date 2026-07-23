// DockKey — the key band must survive a 320px screen (regression guard for the 360px clip).
//
// What broke: `.dk-keyrow` was `flex-wrap: nowrap`, so the 11-key row's MIN-CONTENT width was
// 11 × 30px + 10 × 4px = 370px. That figure landed in the dock's `min-width: min-content`, and
// in CSS min-width beats max-width — so `max-width: min(700px, 100vw - 20px)` could not hold the
// dock inside a 360px screen. The dock rendered 390px wide at left −15, and the two ends of each
// row fell off the screen: `1` `~` `.` `n` were untappable, `1` being the most-typed character in
// the whole library (10,813 uses).
//
// jsdom has no layout, so this is a Tier A contract test on the stylesheet plus the arithmetic
// that produced 370 — the pixel proof is the browser run (docs: 320/360/375/412/1440, 0 clipped).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/components/DockKey.vue'), 'utf8')

// pull one declaration out of a given rule's block
function decl(selector, prop) {
  const rule = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`)
  const block = css.match(rule)?.[1] ?? ''
  return block.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`))?.[1]?.trim()
}

const NARROWEST = 320 // the narrowest screen the app supports
const KEY_MIN = parseInt(decl('.dk-key', 'min-width'), 10)
const GAP = parseInt(decl('.dk-keyrow', 'gap'), 10)
const LONGEST_ROW = 11 // EditorMode PALETTE row 2: . ' _ ^ ( ) { } # b n

describe('DockKey key band — reachable on every supported width', () => {
  it('the longest key row cannot fit unwrapped on the narrowest screen (why wrap is required)', () => {
    const minContent = LONGEST_ROW * KEY_MIN + (LONGEST_ROW - 1) * GAP
    expect(minContent).toBeGreaterThan(NARROWEST)
  })

  it('.dk-keyrow wraps, so min-content never out-votes the dock viewport cap', () => {
    expect(decl('.dk-keyrow', 'flex-wrap')).toBe('wrap')
  })

  it('keys stay at or above the WCAG 2.2 §2.5.8 AA 24px target floor', () => {
    expect(KEY_MIN).toBeGreaterThanOrEqual(24)
  })

  it('no key is hidden behind a scroll gesture — the band never scrolls', () => {
    expect(decl('.dk-keys', 'overflow')).toBeUndefined()
    expect(decl('.dk-keyrow', 'overflow')).toBeUndefined()
  })
})
