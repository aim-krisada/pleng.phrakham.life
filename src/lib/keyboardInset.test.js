// The note toolbar came up HALF under the on-screen keyboard on พี่เอม's Galaxy Fold 6
// (Samsung Browser, 23 ก.ค.) — the bottom row of buttons could not be tapped.
//
// The gap must be measured between the VISUAL viewport (what you can see; the keyboard eats
// its bottom) and the LAYOUT viewport (`document.documentElement.clientHeight` — the box a
// `position: fixed` toolbar is laid out in). `window.innerHeight` is NOT that box on every
// browser, and the difference is exactly how far the bar sank.
//
// Each case below is a real reported-geometry shape, not a guessed keyboard height — no test
// here asserts "a keyboard is N pixels tall", which is the assumption that cannot hold across
// Thai / English / number keypads and folded vs unfolded screens.
import { describe, it, expect } from 'vitest'
import { computeKeyboardInset, keyboardIsUp } from './keyboardInset.js'

describe('computeKeyboardInset', () => {
  it('no keyboard → nothing is covered', () => {
    expect(computeKeyboardInset({ layoutHeight: 915, vvHeight: 915, vvOffsetTop: 0 })).toBe(0)
  })

  it('keyboard over a page the browser did NOT resize → the covered strip', () => {
    // layout viewport stays 915; the visual viewport shrinks to what is still visible
    expect(computeKeyboardInset({ layoutHeight: 915, vvHeight: 555, vvOffsetTop: 0 })).toBe(360)
  })

  it('browser resizes the page instead → 0 (bottom:0 is already above the keyboard)', () => {
    expect(computeKeyboardInset({ layoutHeight: 555, vvHeight: 555, vvOffsetTop: 0 })).toBe(0)
  })

  it('counts the visual viewport OFFSET, not just its height (pinch-zoom / scrolled)', () => {
    // the same 360px keyboard, but the visual viewport has been pushed down 120px
    expect(computeKeyboardInset({ layoutHeight: 915, vvHeight: 435, vvOffsetTop: 120 })).toBe(360)
  })

  it('is independent of the keyboard LAYOUT — a short number pad reads just as truly', () => {
    const numberPad = computeKeyboardInset({ layoutHeight: 915, vvHeight: 675, vvOffsetTop: 0 })
    const thai = computeKeyboardInset({ layoutHeight: 915, vvHeight: 515, vvOffsetTop: 0 })
    expect(numberPad).toBe(240)
    expect(thai).toBe(400)
  })

  it('works folded and unfolded (no fixed px assumption anywhere)', () => {
    expect(computeKeyboardInset({ layoutHeight: 780, vvHeight: 480, vvOffsetTop: 0 })).toBe(300)
    expect(computeKeyboardInset({ layoutHeight: 1560, vvHeight: 1160, vvOffsetTop: 0 })).toBe(400)
  })

  it('never returns a negative or a sub-pixel gap', () => {
    expect(computeKeyboardInset({ layoutHeight: 800, vvHeight: 812, vvOffsetTop: 0 })).toBe(0)
    expect(computeKeyboardInset({ layoutHeight: 800.4, vvHeight: 800, vvOffsetTop: 0 })).toBe(0)
  })

  it('no visualViewport support → 0 (never pushes the bar off on its own guess)', () => {
    expect(computeKeyboardInset({ layoutHeight: 915, vvHeight: 0, vvOffsetTop: 0 })).toBe(0)
    expect(computeKeyboardInset({ layoutHeight: 0, vvHeight: 0 })).toBe(0)
  })
})

describe('keyboardIsUp — proportional, never a fixed px threshold', () => {
  it('sees a short number pad on a small folded screen', () => {
    // 240px would fail the old `> 150`-style guess on some devices; as a share of a 780px
    // folded screen it is unmistakably a keyboard
    expect(keyboardIsUp(240, 780)).toBe(true)
  })

  it('ignores a small bottom shift (address bar collapsing, not a keyboard)', () => {
    expect(keyboardIsUp(56, 915)).toBe(false)
  })

  it('scales with an unfolded screen', () => {
    expect(keyboardIsUp(400, 1560)).toBe(true)
    expect(keyboardIsUp(120, 1560)).toBe(false)
  })

  it('nothing covered → down', () => {
    expect(keyboardIsUp(0, 915)).toBe(false)
  })
})
