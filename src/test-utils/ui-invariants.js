// ui-invariants — the ONE reusable QA helper the tester (and any spec) uses to enforce
// `docs/ui-standards.md` mechanically, so a regression turns `npm test` red instead of
// slipping past to P'Aim. Component-agnostic on purpose: DockKey (ฝึกร้อง/แผ่นเพลง/แก้ไข)
// and any future popup/overlay reuse the same functions by passing their own root element
// + optional selectors.
//
// TWO TIERS — because vitest runs in **jsdom**, which has NO layout engine
// (getBoundingClientRect / clientWidth / scrollWidth all report 0):
//   TIER A — structure/behavior, fully trustworthy in jsdom:
//     axe a11y (role/name/label/aria) · single-popup-open · no-caret-on-triggers ·
//     Esc-closes · aria-live presence.
//   TIER B — pixel geometry, needs a REAL browser (vitest browser mode / Playwright /
//     the browser-MCP at 3 breakpoints): no-scroll · target-size ≥44px · colour contrast.
//     The Tier-B functions here run the SAME assertion in either place; in jsdom they
//     short-circuit via `hasLayout()` so a spec can `it.skipIf(!hasLayout())` instead of
//     silently "passing" a check the environment cannot perform. Never treat a Tier-B
//     green in jsdom as proof — that is the exact trap that kept deferring these to P'Aim.
import axe from 'axe-core'

// ---------------------------------------------------------------------------
// TIER A — a11y (axe-core)
// ---------------------------------------------------------------------------

// WCAG A/AA tags only (matches ui-standards §1.1). `color-contrast` is a WCAG rule but
// needs real rendering, so it is disabled here and asserted in Tier B / the browser.
// Page-level rules (region/landmark/document-title) are NOT in these tags, so mounting a
// bare component doesn't trip them.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Run axe on an element (or wrapper) and return the violations array.
 * @param {Element|{element:Element}} target  a DOM element or a @vue/test-utils wrapper
 * @param {object} [opts]
 * @param {string[]} [opts.tags]        override the WCAG tag set
 * @param {object}   [opts.rules]       axe rule overrides, merged over the defaults
 * @param {boolean}  [opts.contrast]    include color-contrast (only meaningful in a real browser)
 */
export async function axeViolations(target, opts = {}) {
  const el = target?.element ?? target
  const rules = { 'color-contrast': { enabled: !!opts.contrast }, ...(opts.rules || {}) }
  const res = await axe.run(el, {
    runOnly: { type: 'tag', values: opts.tags || WCAG_TAGS },
    rules,
    resultTypes: ['violations'], // skip pass/incomplete bookkeeping → faster
  })
  return res.violations
}

/** Assert axe finds zero violations; throws with a readable summary listing each. */
export async function expectNoAxeViolations(target, opts = {}) {
  const v = await axeViolations(target, opts)
  if (v.length) {
    const lines = v.map(
      (r) => `  • [${r.impact}] ${r.id}: ${r.help}\n      ${r.nodes.map((n) => n.target.join(' ')).join('\n      ')}`,
    )
    throw new Error(`axe found ${v.length} a11y violation(s):\n${lines.join('\n')}`)
  }
}

// ---------------------------------------------------------------------------
// TIER A — popup / trigger invariants (ui-standards §2)
// ---------------------------------------------------------------------------

// What counts as "a control that opens a popup": ARIA says so via aria-expanded /
// aria-haspopup. This is how the no-caret rule stays component-agnostic.
const TRIGGER_SEL = '[aria-expanded],[aria-haspopup]'
// A down-caret next to such a trigger is redundant (ui-standards §2 · checklist B9).
const CARET_SEL = '.dk-caret,[data-caret],.caret'

const root = (t) => t?.element ?? t

/**
 * ui-standards §2 / checklist B9: a button that already opens a popup must NOT also show a
 * down-caret (▾). Returns the offending triggers (empty array = clean).
 */
export function caretOnTriggerViolations(target, { triggerSel = TRIGGER_SEL, caretSel = CARET_SEL } = {}) {
  const el = root(target)
  return [...el.querySelectorAll(triggerSel)]
    .filter((t) => t.querySelector(caretSel))
    .map((t) => t.getAttribute('aria-label') || t.textContent.trim() || t.className)
}

/**
 * ui-standards §2 "เปิดทีละ 1": at most one popup may be open at once.
 * @returns {Element[]} the currently-open popups (assert length ≤ 1)
 */
export function openPopups(target, popupSel = '.dk-pop') {
  return [...root(target).querySelectorAll(popupSel)].filter(isVisible)
}

/** ui-standards §2: no popup header should carry usage/how-to prose (minimalist). */
export function popupHeaderProse(target, { popupSel = '.dk-pop', headerSel = '.dk-ptitle,.dk-pop-title,header' } = {}) {
  const hits = []
  for (const pop of root(target).querySelectorAll(popupSel)) {
    const h = pop.querySelector(headerSel)
    const txt = h?.textContent?.trim()
    if (txt) hits.push(txt)
  }
  return hits
}

// ---------------------------------------------------------------------------
// TIER A — keyboard / focus
// ---------------------------------------------------------------------------

/** Dispatch a real KeyboardEvent (bubbling) on el (default document) — e.g. pressKey(el,'Escape'). */
export function pressKey(el, key, type = 'keydown') {
  const target = root(el) || document
  const ev = new window.KeyboardEvent(type, { key, bubbles: true, cancelable: true })
  target.dispatchEvent(ev)
  return ev
}

/** Convenience: press Escape (the standard "close popup" key, WCAG 2.5 / APG dialog). */
export const pressEscape = (el = document) => pressKey(el, 'Escape')

/** All natively focusable/reachable controls under root, in DOM order. */
export function focusables(target) {
  const SEL = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  return [...root(target).querySelectorAll(SEL)].filter(isVisible)
}

// ---------------------------------------------------------------------------
// TIER B — pixel geometry (needs a REAL browser; see file header)
// ---------------------------------------------------------------------------

/**
 * Does the current environment actually lay elements out? jsdom does not, so every Tier-B
 * check must gate on this. Pass a mounted element you KNOW is non-empty.
 */
export function hasLayout(sampleEl = document.body) {
  const el = root(sampleEl)
  return !!el && (el.getClientRects().length > 0 || el.clientWidth > 0 || el.offsetWidth > 0)
}

/**
 * ui-standards §2 "ห้าม scroll": an element must fit its content with no scrollable overflow.
 * @returns {{available:boolean, overflowX:number, overflowY:number, ok:boolean}}
 *          available=false in jsdom → the spec should skip, not pass.
 */
export function noScroll(target, tol = 1) {
  const el = root(target)
  if (!hasLayout(el)) return { available: false, overflowX: 0, overflowY: 0, ok: false }
  const overflowX = el.scrollWidth - el.clientWidth
  const overflowY = el.scrollHeight - el.clientHeight
  return { available: true, overflowX, overflowY, ok: overflowX <= tol && overflowY <= tol }
}

/**
 * WCAG 2.5.8 / ui-standards §1 (project target 44px): interactive targets must be ≥ min px.
 * @returns {{available:boolean, small:{label:string,w:number,h:number}[]}}  small=[] is a pass.
 */
export function smallTargets(
  target,
  { min = 44, sel = 'button,a,[role="button"],input[type="range"],[tabindex]:not([tabindex="-1"])' } = {},
) {
  const el = root(target)
  if (!hasLayout(el)) return { available: false, small: [] }
  const small = []
  for (const node of el.querySelectorAll(sel)) {
    if (!isVisible(node)) continue
    const r = node.getBoundingClientRect()
    if (r.width < min || r.height < min) {
      small.push({ label: node.getAttribute('aria-label') || node.textContent.trim() || node.className, w: Math.round(r.width), h: Math.round(r.height) })
    }
  }
  return { available: true, small }
}

// ---------------------------------------------------------------------------
// shared
// ---------------------------------------------------------------------------

// Best-effort visibility. In jsdom offsetParent/rects are null, so treat "not explicitly
// hidden" as visible (Tier-A checks care about presence, not paint); in a real browser the
// rect/offsetParent test is exact.
export function isVisible(node) {
  if (!node) return false
  if (node.hidden) return false
  const cs = node.ownerDocument?.defaultView?.getComputedStyle?.(node)
  if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false
  if (hasLayout(node)) return node.getClientRects().length > 0
  return true // jsdom: no layout — presence is enough for Tier-A
}
