// ใบ v3/pleng#108 — while a phone bar (ฝึกร้อง / แผ่นเพลง at ≤760px) is showing, <html> gets
// `has-dock-bar` + --dock-bar-h (the bar's full height), and styles.css lifts the round scroll
// buttons (pk-scrollnav) to sit fully above the bar. The floating dock (wide screens, แก้ไข)
// publishes neither, so the buttons stay where they were. jsdom has no layout, so each dock's
// size is stubbed.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { measureDockClear } from './dockClear.js'

const VH = 812
let realIH
function dock({ bar = true, top = 0, height = 0, pt = 6, pb = 6 } = {}) {
  const host = document.createElement('div')
  host.className = 'dk-host' + (bar ? ' dk-bar' : '')
  const d = document.createElement('div')
  d.className = 'dk-dock'
  d.style.paddingTop = pt + 'px'
  d.style.paddingBottom = pb + 'px'
  d.getBoundingClientRect = () => ({ top, bottom: top + height, height, left: 0, right: 375, width: height ? 375 : 0 })
  host.appendChild(d)
  document.body.appendChild(host)
  return d
}
const root = () => document.documentElement

beforeEach(() => {
  document.body.innerHTML = ''
  root().classList.remove('has-dock-bar')
  root().style.removeProperty('--dock-bar-h')
  root().style.removeProperty('--dock-clear')
  realIH = window.innerHeight
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: VH })
})
afterEach(() => { Object.defineProperty(window, 'innerHeight', { configurable: true, value: realIH }) })

describe('measureDockClear — phone bar', () => {
  it('a showing bar publishes its full height (incl. home-bar inset) and has-dock-bar', () => {
    // 100px bar whose bottom padding carries a 34px iPhone inset (6 + 34)
    dock({ top: VH - 100, height: 100, pt: 6, pb: 40 })
    measureDockClear()
    expect(root().classList.contains('has-dock-bar')).toBe(true)
    expect(root().style.getPropertyValue('--dock-bar-h')).toBe('100px')
    // the footer band leaves the inset out (its CSS adds env() itself)
    expect(root().style.getPropertyValue('--dock-clear')).toBe('66px')
  })

  it('Studio keeps every mode mounted — the hidden bar is skipped, the showing one is used', () => {
    dock({ top: 0, height: 0 }) // ฝึกร้อง bar hidden by v-show
    const shown = dock({ top: VH - 51, height: 51 }) // แผ่นเพลง bar
    expect(measureDockClear()).toBe(shown)
    expect(root().style.getPropertyValue('--dock-bar-h')).toBe('51px')
  })

  it('the bar going away (mode switch / wider screen) clears it again', () => {
    const d = dock({ top: VH - 100, height: 100 })
    measureDockClear()
    expect(root().classList.contains('has-dock-bar')).toBe(true)
    d.parentElement.remove()
    measureDockClear()
    expect(root().classList.contains('has-dock-bar')).toBe(false)
    expect(root().style.getPropertyValue('--dock-bar-h')).toBe('')
  })
})

describe('measureDockClear — floating dock unchanged (wide screen · แก้ไข)', () => {
  it('a dock that is not a bar publishes no bar height and no class', () => {
    dock({ bar: false, top: VH - 120, height: 100 })
    measureDockClear()
    expect(root().classList.contains('has-dock-bar')).toBe(false)
    expect(root().style.getPropertyValue('--dock-bar-h')).toBe('')
    expect(root().style.getPropertyValue('--dock-clear')).toBe('0px')
  })
})

describe('styles.css lifts the scroll buttons above the phone bar only', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
  it('rule sits inside the ≤760px media query, keyed on has-dock-bar, bar height + gap', () => {
    const m = /@media \(max-width: 760px\) \{\s*html\.has-dock-bar \.pk-scrollnav \{ bottom: calc\(var\(--dock-bar-h, 0px\) \+ 8px\) !important; \}\s*\}/.exec(css)
    expect(m).not.toBeNull()
  })
})
