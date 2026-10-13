// ใบ v3/pleng#120 — a button that takes focus because it was just tapped must stay under the finger.
// On a 360px phone the edit header's ▲ took focus on the press, the "keep the focused thing clear of
// the bar" check then scrolled the page by up to 38px — the button moved out from under the finger
// between the press and the release. Fails on the old code (it scrolled the tapped button too).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installFocusClear } from './focusClear.js'

const VH = 780
let realIH
function bar(top = VH - 115) {
  const host = document.createElement('div')
  host.className = 'dk-host dk-bar'
  const d = document.createElement('div')
  d.className = 'dk-dock'
  d.getBoundingClientRect = () => ({ top, bottom: VH, height: VH - top, left: 0, right: 360, width: 360 })
  host.appendChild(d)
  document.body.appendChild(host)
}
function el(tag, rect, attrs = {}) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  e.getBoundingClientRect = () => ({ left: 100, right: 144, width: 44, height: rect.bottom - rect.top, ...rect })
  document.body.appendChild(e)
  return e
}
const tick = () => new Promise((r) => setTimeout(r, 5))
// what a finger does: pointerdown → mousedown → (focus moves) → mouseup → click
function tapFocus(target) {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  target.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

beforeEach(() => {
  document.body.innerHTML = ''
  realIH = window.innerHeight
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: VH })
  window.scrollBy = vi.fn()
})
afterEach(() => { Object.defineProperty(window, 'innerHeight', { configurable: true, value: realIH }) })

describe('a tapped button stays where the finger is', () => {
  it('▲ tapped just above the bar (where the check would lift it 38px): the page does not move', async () => {
    bar()
    const up = el('button', { top: 640, bottom: 684 }, { 'aria-label': 'ย้ายบรรทัดขึ้น' })
    const off = installFocusClear()
    try {
      tapFocus(up)
      await tick()
      expect(window.scrollBy).not.toHaveBeenCalled()
    } finally { off() }
  })

  it('the press lands on the icon inside the button (a span): still left alone', async () => {
    bar()
    const up = el('button', { top: 640, bottom: 684 })
    const icon = document.createElement('span')
    up.appendChild(icon)
    const off = installFocusClear()
    try {
      icon.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      up.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await tick()
      expect(window.scrollBy).not.toHaveBeenCalled()
    } finally { off() }
  })

  it('the same button reached with Tab (no press): still lifted clear of the bar, as before (WCAG 2.4.11)', async () => {
    bar()
    const up = el('button', { top: 640, bottom: 684 })
    const off = installFocusClear()
    try {
      up.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await tick()
      expect(window.scrollBy).toHaveBeenCalledWith({ top: 35, left: 0, behavior: 'instant' })
    } finally { off() }
  })

  it('a tapped TEXT field is still lifted (the keypad comes up after the tap and may cover it)', async () => {
    bar()
    const note = el('input', { top: 640, bottom: 684 }, { class: 'note-box' })
    const off = installFocusClear()
    try {
      tapFocus(note)
      await tick()
      expect(window.scrollBy).toHaveBeenCalled()
    } finally { off() }
  })

  it('a press long ago does not count: focus moved later by the keyboard is checked', async () => {
    bar()
    const up = el('button', { top: 640, bottom: 684 })
    const off = installFocusClear()
    const now = Date.now()
    const spy = vi.spyOn(Date, 'now')
    try {
      spy.mockReturnValue(now)
      up.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      spy.mockReturnValue(now + 5000)
      up.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      await tick()
      expect(window.scrollBy).toHaveBeenCalled()
    } finally { spy.mockRestore(); off() }
  })
})
