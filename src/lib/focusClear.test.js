// ใบ v3/pleng#111 ข้อ 3 — nothing the user is working on is left under the bottom bar
// (WCAG 2.2 SC 2.4.11 Focus Not Obscured). lib/focusClear.js scrolls the page just enough that a
// focused field — or, in a multi-line field, the caret's line — ends 16px above the bar. jsdom
// has no layout, so the bar's and the field's boxes are stubbed.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isTextField, ownsSpaceKey, obscuredBy, visibleBarTop, keepClear, caretRect, installFocusClear, CLEAR_GAP,
} from './focusClear.js'

const VH = 800
let realIH
function bar({ top = VH - 120, height = 120, flow = false } = {}) {
  const host = document.createElement('div')
  host.className = 'dk-host dk-bar' + (flow ? ' dk-flow' : '')
  const d = document.createElement('div')
  d.className = 'dk-dock'
  d.getBoundingClientRect = () => ({ top, bottom: top + height, height, left: 0, right: 1280, width: 1280 })
  host.appendChild(d)
  document.body.appendChild(host)
  return host
}
function field(tag = 'input', rect = { top: 0, bottom: 40 }, attrs = {}) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.getBoundingClientRect = () => ({ left: 0, right: 200, width: 200, height: rect.bottom - rect.top, ...rect })
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
  realIH = window.innerHeight
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: VH })
  window.scrollBy = vi.fn()
})
afterEach(() => { Object.defineProperty(window, 'innerHeight', { configurable: true, value: realIH }) })

describe('isTextField / ownsSpaceKey', () => {
  it('text-like inputs, textarea and contenteditable are text fields; buttons, ranges, checkboxes are not', () => {
    expect(isTextField(field('input'))).toBe(true)
    expect(isTextField(field('input', undefined, { type: 'search' }))).toBe(true)
    expect(isTextField(field('input', undefined, { type: 'number' }))).toBe(true)
    expect(isTextField(field('textarea'))).toBe(true)
    expect(isTextField(field('div', undefined, { contenteditable: 'true' }))).toBe(true)
    expect(isTextField(field('input', undefined, { type: 'range' }))).toBe(false)
    expect(isTextField(field('input', undefined, { type: 'checkbox' }))).toBe(false)
    expect(isTextField(field('button'))).toBe(false)
    expect(isTextField(field('input', undefined, { readonly: '' }))).toBe(false)
    expect(isTextField(document.body)).toBe(false)
    expect(isTextField(null)).toBe(false)
  })

  it('Space belongs to fields and controls (button, select, slider, menu item…), not to the page body', () => {
    expect(ownsSpaceKey(field('input'))).toBe(true)
    expect(ownsSpaceKey(field('textarea'))).toBe(true)
    expect(ownsSpaceKey(field('button'))).toBe(true)
    expect(ownsSpaceKey(field('select'))).toBe(true)
    expect(ownsSpaceKey(field('input', undefined, { type: 'range' }))).toBe(true)
    expect(ownsSpaceKey(field('span', undefined, { role: 'slider' }))).toBe(true)
    const inBtn = document.createElement('span')
    field('button').appendChild(inBtn)
    expect(ownsSpaceKey(inBtn)).toBe(true) // the icon inside a button
    expect(ownsSpaceKey(document.body)).toBe(false)
    expect(ownsSpaceKey(field('div'))).toBe(false)
  })
})

describe('obscuredBy — how far to scroll so a box ends CLEAR_GAP above the bar', () => {
  it('a box well above the bar: nothing to do', () => {
    expect(obscuredBy({ top: 100, bottom: 140 }, 680)).toBe(0)
  })
  it('a box under / touching the bar: scroll by the overlap + the gap', () => {
    expect(CLEAR_GAP).toBe(16)
    expect(obscuredBy({ top: 660, bottom: 700 }, 680)).toBe(700 - (680 - 16)) // 36
    expect(obscuredBy({ top: 650, bottom: 664 }, 680)).toBe(0) // exactly 16px clear
    expect(obscuredBy({ top: 650, bottom: 665 }, 680)).toBe(1)
  })
  it('a box taller than the free space keeps its top edge below the header', () => {
    expect(obscuredBy({ top: 300, bottom: 1200 }, 680, { minTop: 60 })).toBe(240)
  })
  it('no bar → 0', () => {
    expect(obscuredBy({ top: 700, bottom: 900 }, null)).toBe(0)
  })
})

describe('visibleBarTop — only a fixed, showing bar counts', () => {
  it('finds the showing bar; skips a hidden one (Studio keeps all modes mounted)', () => {
    bar({ top: 0, height: 0 })
    bar({ top: 680, height: 120 })
    expect(visibleBarTop()).toBe(680)
  })
  it('a short-window bar in the page flow (dk-flow) does not cover anything', () => {
    bar({ top: 680, height: 120, flow: true })
    expect(visibleBarTop()).toBeNull()
  })
})

describe('keepClear — tabbing to a field near the bottom', () => {
  it('a field under the bar is scrolled up just enough', () => {
    bar({ top: 680 })
    const el = field('input', { top: 690, bottom: 730 })
    expect(keepClear(el)).toBe(730 - 664)
    expect(window.scrollBy).toHaveBeenCalledWith({ top: 66, left: 0, behavior: 'instant' })
  })
  it('a field already clear is left alone', () => {
    bar({ top: 680 })
    expect(keepClear(field('input', { top: 500, bottom: 540 }))).toBe(0)
    expect(window.scrollBy).not.toHaveBeenCalled()
  })
  it('a control inside the bar itself is never scrolled', () => {
    const host = bar({ top: 680 })
    const b = document.createElement('button')
    b.getBoundingClientRect = () => ({ top: 700, bottom: 748, left: 0, right: 48, width: 48, height: 48 })
    host.firstChild.appendChild(b)
    expect(keepClear(b)).toBe(0)
  })
  it('no bar showing (short window / keyboard up) → nothing to do', () => {
    bar({ top: 680, flow: true })
    expect(keepClear(field('input', { top: 690, bottom: 730 }))).toBe(0)
  })
})

describe('keepClear — typing in a multi-line field follows the CARET line, not the whole box', () => {
  it('a tall textarea whose caret line is clear is not scrolled, even if its bottom is under the bar', () => {
    bar({ top: 680 })
    // 10-line textarea from 500 to 800; caret on line 1 → line at the textarea top
    const ta = field('textarea', { top: 500, bottom: 800 })
    ta.value = 'บรรทัดแรก\nสอง\nสาม'
    ta.setSelectionRange(3, 3)
    const r = caretRect(ta)
    expect(r.top).toBeGreaterThanOrEqual(500)
    expect(r.bottom).toBeLessThan(664)
    expect(keepClear(ta)).toBe(0)
  })

  it('a caret line under the bar scrolls the page up by the overlap', () => {
    bar({ top: 680 })
    const ta = field('textarea', { top: 670, bottom: 900 })
    ta.value = 'x'
    const dy = keepClear(ta)
    const r = caretRect(ta)
    expect(dy).toBe(Math.ceil(r.bottom - 664))
    expect(dy).toBeGreaterThan(0)
  })
})

describe('installFocusClear — wired to focus and to typing', () => {
  it('focus on a hidden-under-the-bar field → scrolled after the browser’s own scroll', async () => {
    bar({ top: 680 })
    const el = field('input', { top: 690, bottom: 730 })
    const off = installFocusClear()
    try {
      el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      expect(window.scrollBy).not.toHaveBeenCalled() // waits one tick
      await new Promise((r) => setTimeout(r, 5))
      expect(window.scrollBy).toHaveBeenCalledWith({ top: 66, left: 0, behavior: 'instant' })
    } finally { off() }
  })

  it('typing in the focused textarea re-checks the caret line', async () => {
    bar({ top: 680 })
    const ta = field('textarea', { top: 670, bottom: 900 })
    const off = installFocusClear()
    try {
      ta.focus()
      await new Promise((r) => setTimeout(r, 5))
      window.scrollBy.mockClear()
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 5))
      expect(window.scrollBy).toHaveBeenCalled()
    } finally { off() }
  })

  it('uninstall stops it', async () => {
    bar({ top: 680 })
    const el = field('input', { top: 690, bottom: 730 })
    installFocusClear()()
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 5))
    expect(window.scrollBy).not.toHaveBeenCalled()
  })
})
