// ใบ v3/pleng#111 — nothing the user is working on may sit under the bottom bar
// (WCAG 2.2 SC 2.4.11 Focus Not Obscured).
//
// Two layers:
//   1. CSS (technique C43, styles.css): while a fixed bar is showing, <html> gets `has-dock-bar`
//      + --dock-bar-h (lib/dockClear.js, re-measured by App.vue's ResizeObserver), and
//      `scroll-padding-bottom` = bar height + a gap. The browser then keeps a field it scrolls
//      to on focus, and anything scrolled into view, above the bar.
//   2. Script (this file): a check after every focus, and — inside a multi-line field — after
//      every keystroke/click, that the focused thing (or the caret's line in a <textarea>) ends
//      at least CLEAR_GAP px above the bar's top edge. If not, the page is scrolled up by exactly
//      the missing amount. This covers what scroll-padding does not: a browser that ignores it on
//      focus, and the caret moving to a new line while typing.
//
// The same file also holds the "is this a text field?" test, shared by the bar (it steps aside
// while the on-screen keyboard is up) and the ฝึกร้อง Space shortcut (Space never toggles play
// while typing).

/** The bar that can cover the page: fixed (not the short-window in-flow version), showing. */
export const BAR_SEL = '.dk-host.dk-bar:not(.dk-flow) > .dk-dock'
/** px kept free between the focused thing and the bar's top edge */
export const CLEAR_GAP = 16

const TEXT_TYPES = new Set([
  'text', 'search', 'email', 'url', 'tel', 'password', 'number',
  'date', 'time', 'datetime-local', 'month', 'week',
])

/** true when typing into `el` would bring up the on-screen keyboard (text input · textarea · contenteditable) */
export function isTextField(el) {
  if (!el || el.nodeType !== 1) return false
  if (el.closest?.('[contenteditable]:not([contenteditable="false"])')) return true
  if (el.disabled || el.readOnly) return false
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName !== 'INPUT') return false
  return TEXT_TYPES.has((el.getAttribute('type') || 'text').toLowerCase())
}

// controls that already do something with Space themselves (press a button, tick a box, open a
// select, move a slider…). A page-wide Space shortcut must leave these alone.
const OWNS_SPACE = [
  'button', 'select', 'summary', 'input', 'textarea', 'a[href]',
  '[role="button"]', '[role="checkbox"]', '[role="switch"]', '[role="radio"]', '[role="slider"]',
  '[role="menuitem"]', '[role="menuitemradio"]', '[role="menuitemcheckbox"]', '[role="option"]',
  '[role="tab"]', '[role="combobox"]', '[role="textbox"]',
].join(',')
/** true when Space pressed on `el` belongs to `el` (typing, or activating a control) */
export function ownsSpaceKey(el) {
  if (!el || el.nodeType !== 1) return false
  return isTextField(el) || !!el.closest?.(OWNS_SPACE)
}

/** top edge (viewport px) of the fixed bar that is showing, or null when there is none */
export function visibleBarTop(doc = document) {
  for (const el of doc.querySelectorAll(BAR_SEL)) {
    const r = el.getBoundingClientRect()
    if (r.height > 0) return r.top
  }
  return null
}

/** bottom edge of the sticky site header — scrolling up must not push the field under it */
export function headerBottom(doc = document) {
  const h = doc.querySelector('.shell-bar')
  const b = h ? h.getBoundingClientRect().bottom : 0
  return b > 0 ? b : 0
}

/**
 * How far (px) the page must scroll UP so `rect` ends CLEAR_GAP above the bar.
 * 0 when it is already clear (or there is no bar). Never scrolls the top of `rect` above
 * `minTop` (the header): a box taller than the free space keeps its top edge in view.
 */
export function obscuredBy(rect, barTop, { gap = CLEAR_GAP, minTop = 0 } = {}) {
  if (barTop == null || !rect) return 0
  const over = rect.bottom - (barTop - gap)
  if (over <= 0) return 0
  const room = rect.top - minTop
  return Math.max(0, Math.ceil(Math.min(over, room)))
}

/**
 * Where the caret's line is inside a <textarea>, in viewport px ({ top, bottom }).
 * Copies the textarea's text up to the caret into a hidden twin with the same box and font
 * and reads where the next character lands (the usual "mirror" technique).
 */
export function caretRect(ta, doc = document, win = window) {
  const r = ta.getBoundingClientRect()
  const cs = win.getComputedStyle(ta)
  const twin = doc.createElement('div')
  for (const p of [
    'boxSizing', 'width', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontStyle', 'fontVariant', 'fontWeight',
    'fontSize', 'lineHeight', 'fontFamily', 'letterSpacing', 'wordSpacing', 'textIndent', 'textTransform', 'tabSize',
  ]) twin.style[p] = cs[p]
  Object.assign(twin.style, {
    position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', height: 'auto',
    whiteSpace: 'pre-wrap', overflowWrap: 'break-word', overflow: 'hidden',
  })
  const pos = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : ta.value.length
  twin.textContent = ta.value.slice(0, pos)
  const mark = doc.createElement('span')
  mark.textContent = ta.value.slice(pos, pos + 1) || '.'
  twin.appendChild(mark)
  doc.body.appendChild(twin)
  const lh = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) || 16) * 1.5
  const y = mark.offsetTop + (parseFloat(cs.borderTopWidth) || 0) - ta.scrollTop
  twin.remove()
  const top = Math.min(Math.max(r.top + y, r.top), r.bottom)
  return { top, bottom: Math.min(top + lh, r.bottom), left: r.left, right: r.right, height: lh }
}

/** the box that must stay visible for a focused element: the caret line in a textarea, else the element */
export function focusRect(el, doc = document, win = window) {
  if (el.tagName === 'TEXTAREA') return caretRect(el, doc, win)
  return el.getBoundingClientRect()
}

/**
 * Scroll the page just enough that `el` (or its caret line) is fully above the bar.
 * Returns the px scrolled (0 = nothing to do). Things inside the bar itself are skipped.
 */
export function keepClear(el, doc = document, win = window) {
  if (!el || el.nodeType !== 1 || el === doc.body || el.closest?.('.dk-host')) return 0
  const top = visibleBarTop(doc)
  if (top == null) return 0
  const dy = obscuredBy(focusRect(el, doc, win), top, { minTop: headerBottom(doc) })
  // instant, not the page's smooth scrolling: the field must be in view now, and a check that
  // runs again mid-animation (the next keystroke) would otherwise scroll a second time
  if (dy > 0) win.scrollBy({ top: dy, left: 0, behavior: 'instant' })
  return dy
}

/**
 * Wire it up once for the whole app (App.vue). Returns an uninstall function.
 * Runs a tick after the event so the browser's own focus scroll (which honours
 * scroll-padding) happens first — the script only tops up what is still missing.
 */
export function installFocusClear(doc = document, win = window) {
  let t = null
  const later = (el) => {
    clearTimeout(t)
    t = setTimeout(() => keepClear(el, doc, win), 0)
  }
  const onFocus = (e) => later(e.target)
  // inside a multi-line field the caret can move to a new line without a new focus event
  const onCaret = (e) => { if (e.target?.tagName === 'TEXTAREA' && e.target === doc.activeElement) later(e.target) }
  doc.addEventListener('focusin', onFocus)
  for (const ev of ['input', 'keyup', 'click']) doc.addEventListener(ev, onCaret)
  return () => {
    clearTimeout(t)
    doc.removeEventListener('focusin', onFocus)
    for (const ev of ['input', 'keyup', 'click']) doc.removeEventListener(ev, onCaret)
  }
}
