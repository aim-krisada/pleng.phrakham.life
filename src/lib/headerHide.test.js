// ใบ v3/pleng#114 ข้อ 3 — on a phone the site header slides away while scrolling DOWN a song and
// comes back while scrolling UP (NN/g partially persistent header · M3 top app bar). jsdom has
// no scrolling, so window.scrollY is set by hand and a scroll event is fired.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  scrollStep, installHeaderHide, markProgrammaticScroll, headerHidden, HIDDEN_CLASS, HIDE_AFTER, SHOW_AFTER, PHONE_Q,
} from './headerHide.js'

describe('scrollStep — the hide / show rule', () => {
  const H = 120 // header height
  it('near the top of the page the header is always shown', () => {
    expect(scrollStep({ hidden: true, y: 80, lastY: 40, acc: 0, headerH: H })).toEqual({ hidden: false, acc: 0 })
    expect(scrollStep({ hidden: true, y: H, lastY: H + 50, acc: 0, headerH: H }).hidden).toBe(false)
  })
  it('scrolling down past the threshold hides it', () => {
    expect(scrollStep({ hidden: false, y: 400 + HIDE_AFTER, lastY: 400, acc: 0, headerH: H }).hidden).toBe(true)
  })
  it('a tiny move does not (no jitter), but small moves in one direction add up', () => {
    let s = scrollStep({ hidden: false, y: 405, lastY: 400, acc: 0, headerH: H })
    expect(s).toEqual({ hidden: false, acc: 5 })
    s = scrollStep({ hidden: false, y: 410, lastY: 405, acc: s.acc, headerH: H })
    expect(s.hidden).toBe(false)
    s = scrollStep({ hidden: false, y: 415, lastY: 410, acc: s.acc, headerH: H })
    expect(s.hidden).toBe(true)
  })
  it('scrolling up past the threshold brings it back', () => {
    expect(scrollStep({ hidden: true, y: 600, lastY: 600 + SHOW_AFTER, acc: 0, headerH: H }).hidden).toBe(false)
    expect(scrollStep({ hidden: true, y: 596, lastY: 600, acc: 0, headerH: H })).toEqual({ hidden: true, acc: -4 })
  })
  it('turning round starts counting again from 0', () => {
    // 10px down so far, then 5px up: not 5px "down", just 5px up
    expect(scrollStep({ hidden: false, y: 495, lastY: 500, acc: 10, headerH: H })).toEqual({ hidden: false, acc: -5 })
  })
  it('no movement changes nothing', () => {
    expect(scrollStep({ hidden: true, y: 500, lastY: 500, acc: -3, headerH: H })).toEqual({ hidden: true, acc: -3 })
  })
})

describe('installHeaderHide — wired to the page', () => {
  let ctl
  let active = true
  let pinned = false
  const scrollTo = (y) => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: y })
    window.dispatchEvent(new Event('scroll'))
  }
  const hidden = () => document.documentElement.classList.contains(HIDDEN_CLASS)
  beforeEach(() => {
    active = true
    pinned = false
    markProgrammaticScroll(0) // nothing left over from another test
    document.body.innerHTML = '<header class="shell-bar"><button class="in-hdr">เมนู</button></header><main><input class="f" /></main>'
    Object.defineProperty(document.querySelector('.shell-bar'), 'offsetHeight', { configurable: true, value: 120 })
    scrollTo(0)
    ctl = installHeaderHide({ active: () => active, pinned: () => pinned })
  })
  afterEach(() => { ctl.uninstall(); scrollTo(0) })

  const downThenUp = () => {
    for (let y = 0; y <= 600; y += 30) scrollTo(y)
  }

  it('scroll down → hidden (class on <html> + the reactive flag); scroll up → back', () => {
    downThenUp()
    expect(hidden()).toBe(true)
    expect(headerHidden.value).toBe(true)
    scrollTo(590)
    scrollTo(580)
    expect(hidden()).toBe(false)
    expect(headerHidden.value).toBe(false)
  })
  it('back at the top it is always shown', () => {
    downThenUp()
    scrollTo(700) // still going down
    scrollTo(50) // a jump straight to the top
    expect(hidden()).toBe(false)
  })
  it('not on a song page / not a phone (active() false): never hides', () => {
    active = false
    ctl.update()
    downThenUp()
    expect(hidden()).toBe(false)
  })
  it('a menu is open (pinned): it stays, and opening one brings it back', () => {
    downThenUp()
    expect(hidden()).toBe(true)
    pinned = true
    ctl.update()
    expect(hidden()).toBe(false)
    scrollTo(800)
    expect(hidden()).toBe(false)
  })
  it('focus moving into the header (Tab · screen reader) brings it back at once', () => {
    downThenUp()
    expect(hidden()).toBe(true)
    const b = document.querySelector('.in-hdr')
    b.focus()
    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(hidden()).toBe(false)
  })
  it('a scroll the page makes itself (keeping a field in view) is not a scroll up by the user', () => {
    downThenUp()
    expect(hidden()).toBe(true)
    markProgrammaticScroll(1000)
    scrollTo(500) // 100px up — but made by the page
    expect(hidden()).toBe(true)
  })
  it('uninstall shows it again and stops listening', () => {
    downThenUp()
    ctl.uninstall()
    expect(hidden()).toBe(false)
    downThenUp()
    expect(hidden()).toBe(false)
    ctl = installHeaderHide({ active: () => false }) // afterEach uninstalls this one
  })
})

describe('phone only, and the look (stylesheet)', () => {
  it('the rule is for screens narrower than 600px', () => {
    expect(PHONE_Q).toBe('(max-width: 599px)')
  })
  it('hidden = slid up by its own height; no slide when reduced motion is asked for', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8')
    expect(css).toMatch(/html\.hdr-hidden \.shell-bar \{ transform: translateY\(-100%\); \}/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.shell-bar \{ transition: none; \} \}/)
    // the transform exists ONLY while hidden (a transformed header would trap its fixed menus)
    expect(css).not.toMatch(/\.shell-bar \{[^}]*transform: translateY\(0/)
  })
  it('App.vue turns it on for the song pages on a phone, and keeps it while a menu is open', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '../App.vue'), 'utf8')
    expect(app).toMatch(/installHeaderHide\(\{ active: \(\) => isStudio\.value && isPhone\(\), pinned: \(\) => shellMenu\.value != null \}\)/)
  })
})
