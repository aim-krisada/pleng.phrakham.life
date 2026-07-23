// How much of the page bottom the on-screen keyboard is covering — the ONE place that answers
// it, so the note toolbar, the dock and anything else that hangs off the bottom agree.
//
// พี่เอม, Galaxy Fold 6 / Samsung Browser (23 ก.ค.): the note toolbar came up HALF under the
// keyboard — its bottom row of buttons unreachable. The old maths measured the gap as
// `window.innerHeight - vv.height - vv.offsetTop`, but `position: fixed` is laid out against the
// LAYOUT viewport (the initial containing block), and `window.innerHeight` is not always that
// same box: browser bottom chrome (Samsung's URL strip), a horizontal scrollbar and pinch-zoom
// all move them apart, and the difference is exactly how far the bar sank behind the keyboard.
//
// The standard answer is the visual viewport: the keyboard is whatever sits between the bottom
// of the visual viewport and the bottom of the layout viewport.
//
//     inset = layoutViewportHeight − (visualViewport.offsetTop + visualViewport.height)
//
// `document.documentElement.clientHeight` IS the layout viewport (the fixed-position containing
// block), which is what makes the two ends of the subtraction comparable. Nothing here assumes a
// keyboard height: a Thai keyboard, an English one, a number pad, a floating/split keyboard and
// a folded-vs-unfolded Fold all just report a different visual viewport, and the answer follows.
// Browsers that shrink the layout viewport instead (the keyboard "resizes" the page) report
// clientHeight already reduced → inset 0, which is also correct: `bottom: 0` is above the
// keyboard there.

/**
 * Pure so it can be tested against every reported-geometry shape (see the unit tests).
 * @returns {number} px of the layout viewport covered at the bottom, never negative.
 */
export function computeKeyboardInset({ layoutHeight, vvHeight, vvOffsetTop = 0 }) {
  if (!layoutHeight || !vvHeight) return 0 // no visualViewport support → assume nothing is covered
  const covered = layoutHeight - (vvOffsetTop + vvHeight)
  if (!Number.isFinite(covered) || covered <= 0) return 0
  // sub-pixel noise (zoom / device pixel ratio) must not read as a keyboard
  return covered < 1 ? 0 : Math.round(covered)
}

/**
 * The layout viewport — the box `position: fixed` is laid out in. `clientHeight` is the right
 * answer in a browser; it is 0 in jsdom (no layout), where `innerHeight` is the only number
 * there is, so fall back to it rather than reporting "no viewport".
 */
export function layoutViewportHeight() {
  if (typeof document === 'undefined') return 0
  return document.documentElement.clientHeight || window.innerHeight || 0
}

export function readKeyboardInset() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  const vv = window.visualViewport
  if (!vv) return 0
  return computeKeyboardInset({
    layoutHeight: layoutViewportHeight(),
    vvHeight: vv.height,
    vvOffsetTop: vv.offsetTop,
  })
}

/**
 * Is the keyboard (or another bottom overlay) actually up? Proportional to the viewport, never a
 * fixed px guess: a number pad is much shorter than a Thai keyboard, and a folded Fold 6 screen
 * is much shorter than an unfolded one — a hard threshold gets one of those wrong.
 */
export function keyboardIsUp(inset = readKeyboardInset(), layoutHeight = null) {
  const h = layoutHeight || layoutViewportHeight()
  if (!h) return false
  return inset > h * 0.15
}

// ---- shared live value ------------------------------------------------------------------
// One set of listeners for the whole app; every subscriber gets the same number, and the same
// number is published as `--kb-inset` for anything that would rather stay in CSS.
const subs = new Set()
let current = -1 // -1 = never published, so the FIRST publish always writes --kb-inset (even 0)
let started = false

function publish() {
  const next = readKeyboardInset()
  if (next === current) return
  current = next
  document.documentElement.style.setProperty('--kb-inset', `${current}px`)
  for (const fn of subs) fn(current)
}

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  const vv = window.visualViewport
  // `scroll` matters as much as `resize`: pinch-zoom and the keyboard sliding in both move the
  // visual viewport WITHOUT resizing it, and `orientationchange` / fold both land as a resize.
  vv?.addEventListener('resize', publish)
  vv?.addEventListener('scroll', publish)
  window.addEventListener('resize', publish)
  window.addEventListener('orientationchange', publish)
  publish()
}

/** Subscribe to the live inset. Returns an unsubscribe fn; fires once immediately. */
export function onKeyboardInset(fn) {
  start()
  subs.add(fn)
  fn(Math.max(0, current))
  return () => subs.delete(fn)
}
