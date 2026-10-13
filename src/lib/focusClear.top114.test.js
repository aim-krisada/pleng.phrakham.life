// ใบ v3/pleng#114 ข้อ 6 — with the phone header sliding away and the ท่อน header pinned at the top,
// a field reached with Tab (or Shift+Tab, going up) must not stop UNDER them either (WCAG 2.2
// SC 2.4.11). jsdom has no layout: the boxes are stubbed.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { keepClear, topCover, headerBottom, TOP_GAP } from './focusClear.js'
import { measureDockClear } from './dockClear.js'
import * as hh from './headerHide.js'

const VH = 800
let realIH
const box = (el, r) => { el.getBoundingClientRect = () => ({ left: 0, right: 375, width: 375, height: r.bottom - r.top, ...r }) }
function header(bottom = 120) {
  const h = document.createElement('header')
  h.className = 'shell-bar'
  box(h, { top: bottom - 120, bottom })
  document.body.appendChild(h)
  return h
}
function cshead({ top = 120, height = 50, pinAt = top } = {}) {
  const c = document.createElement('div')
  c.className = 'cshead'
  c.style.position = 'sticky'
  c.style.top = pinAt + 'px'
  box(c, { top, bottom: top + height })
  document.body.appendChild(c)
  return c
}
function field(r) {
  const el = document.createElement('input')
  box(el, r)
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
  document.documentElement.classList.remove('hdr-hidden')
  realIH = window.innerHeight
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: VH })
  window.scrollBy = vi.fn()
  hh.markProgrammaticScroll(0) // no "the page scrolled itself" left over from another test
})
afterEach(() => {
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: realIH })
  document.documentElement.classList.remove('hdr-hidden')
})

describe('topCover — what is pinned at the top right now', () => {
  it('header + the pinned ท่อน header under it', () => {
    header(120)
    cshead({ top: 120 })
    expect(topCover(field({ top: 400, bottom: 440 }))).toBe(170)
  })
  it('header slid away (phone): only the ท่อน header, now pinned at 0', () => {
    const h = header(120)
    document.documentElement.classList.add('hdr-hidden')
    box(h, { top: -120, bottom: 0 })
    cshead({ top: 0 })
    expect(headerBottom()).toBe(0)
    expect(topCover(field({ top: 400, bottom: 440 }))).toBe(50)
  })
  it('a ท่อน header still lower in the page (not pinned yet) covers nothing', () => {
    header(120)
    cshead({ top: 300, pinAt: 120 })
    expect(topCover(field({ top: 150, bottom: 190 }))).toBe(120)
  })
  it('a control inside the ท่อน header is not covered by it', () => {
    header(120)
    const c = cshead({ top: 120 })
    const b = document.createElement('button')
    c.appendChild(b)
    expect(topCover(b)).toBe(120)
  })
})

describe('keepClear — a field under the top headers is scrolled into view below them', () => {
  it('Shift+Tab onto a field hidden under the ท่อน header → scroll back just enough', () => {
    header(120)
    cshead({ top: 120 })
    const el = field({ top: 140, bottom: 180 })
    const dy = keepClear(el)
    expect(dy).toBe(140 - 170 - TOP_GAP)
    expect(window.scrollBy).toHaveBeenCalledWith({ top: dy, left: 0, behavior: 'instant' })
  })
  it('a field already below them is left alone', () => {
    header(120)
    cshead({ top: 120 })
    expect(keepClear(field({ top: 300, bottom: 340 }))).toBe(0)
    expect(window.scrollBy).not.toHaveBeenCalled()
  })
  it('the scroll it makes is marked as the page’s own, so the phone header does not come back for it', () => {
    let hidden = true
    document.body.innerHTML = ''
    header(120)
    cshead({ top: 0 })
    document.documentElement.classList.add('hdr-hidden')
    box(document.querySelector('.shell-bar'), { top: -120, bottom: 0 })
    Object.defineProperty(document.querySelector('.shell-bar'), 'offsetHeight', { configurable: true, value: 120 })
    const setY = (y) => { Object.defineProperty(window, 'scrollY', { configurable: true, value: y }); window.dispatchEvent(new Event('scroll')) }
    setY(1000)
    const ctl = hh.installHeaderHide({ active: () => true })
    for (let y = 1000; y <= 1300; y += 30) setY(y)
    hidden = hh.headerHidden.value
    expect(hidden).toBe(true)
    const el = field({ top: 10, bottom: 50 }) // under the ท่อน header (0–50)
    const dy = keepClear(el)
    expect(dy).toBeLessThan(0)
    setY(1300 + dy) // the browser carries out keepClear's scroll
    expect(hh.headerHidden.value).toBe(true)
    ctl.uninstall()
    setY(0)
  })
  it('something in a fixed layer (popover · floating window) is never scrolled for', () => {
    header(120)
    const layer = document.createElement('div')
    layer.style.position = 'fixed'
    const el = document.createElement('input')
    box(el, { top: 20, bottom: 60 })
    layer.appendChild(el)
    document.body.appendChild(layer)
    expect(keepClear(el)).toBe(0)
  })
})

// ใบ#114 ข้อ 1 — the keypad lifted on top of a phone's keyboard still covers the page: its height is
// still published as --dock-bar-h (scroll-padding-bottom), although it no longer touches the bottom.
describe('measureDockClear — a bar lifted above the phone keyboard still counts', () => {
  it('lifted (dk-lift): --dock-bar-h = its height', () => {
    const host = document.createElement('div')
    host.className = 'dk-host dk-bar dk-keysonly dk-lift'
    const d = document.createElement('div')
    d.className = 'dk-dock'
    box(d, { top: 300, bottom: 410 })
    host.appendChild(d)
    document.body.appendChild(host)
    measureDockClear()
    expect(document.documentElement.style.getPropertyValue('--dock-bar-h')).toBe('110px')
    expect(document.documentElement.classList.contains('has-dock-bar')).toBe(true)
  })
  it('not lifted and not at the bottom (e.g. scrolled in a short window): does not count', () => {
    const host = document.createElement('div')
    host.className = 'dk-host dk-bar'
    const d = document.createElement('div')
    d.className = 'dk-dock'
    box(d, { top: 300, bottom: 410 })
    host.appendChild(d)
    document.body.appendChild(host)
    measureDockClear()
    expect(document.documentElement.classList.contains('has-dock-bar')).toBe(false)
  })
})
