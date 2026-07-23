// B123 — the page carried a horizontal scrollbar on every desktop below ~1395px of viewport
// (1366 by 43px · 1280 by 129px · 1200 by 209px · 1024 by 308px). The header wants a fixed
// ~1394px: it is `flex-wrap: nowrap` and every child is `flex: 0 1 auto` with `min-width: auto`,
// so nothing in it can shrink — and its compact layout only switched on at a GUESSED 992px.
//
// The fix moves that decision from a magic number to a measurement (ShellBar.syncShellFit).
// These tests keep it that way: no width constant may come back, the compact rules must stay
// class-driven, and the measurement must keep the listeners that make it survive a cold load.
//
// Live evidence (own browser, fresh load per width, song page with the mode switch in the bar):
//   360 / 412 / 1024 / 1200 → compact · 1280 / 1366 → tight (nav + modes still inline)
//   1440 / 1920 → full · scrollWidth == clientWidth at ALL of them.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (...p) => readFileSync(join(process.cwd(), 'src', ...p), 'utf8')
const BAR = read('components', 'ShellBar.vue')
const CSS = read('styles.css')

describe('shell bar collapses on MEASURED fit, not a guessed width (B123)', () => {
  it('decides from the bar\'s own scrollWidth vs clientWidth', () => {
    expect(BAR).toMatch(/bar\.scrollWidth/)
    expect(BAR).toMatch(/bar\.clientWidth/)
  })

  it('has no width breakpoint left driving the collapse', () => {
    // the old `matchMedia('(min-width: 992px)')` is gone, and no px constant replaced it
    expect(BAR).not.toMatch(/matchMedia/)
    expect(BAR).not.toMatch(/innerWidth\s*[<>]/)
    expect(BAR).not.toMatch(/\b99[12](\.98)?\b/)
  })

  it('steps through cheapest-first levels, ending at the app\'s own compact layout', () => {
    expect(BAR).toMatch(/LEVELS\s*=\s*\['',\s*'shell-tight',\s*'shell-compact'\]/)
  })

  it('the compact rules are class-driven (so the measurement can switch them at any width)', () => {
    expect(CSS).toMatch(/:root\.shell-compact \.shell-bar/)
    expect(CSS).toMatch(/:root\.shell-compact \.sb-burger \{ display: inline-flex/)
    expect(CSS).toMatch(/:root\.shell-tight \.sb-brand-text \{ display: none/)
    // the collapse must NOT be locked behind the old media query any more (the string still
    // appears in the comment that records what this replaced — match an OPENING RULE only)
    expect(CSS).not.toMatch(/@media \(max-width: 991\.98px\)\s*\{/)
  })

  it('never hides the overflow instead of fixing it', () => {
    expect(BAR).not.toMatch(/overflow-x:\s*hidden/)
    expect(CSS).not.toMatch(/\.shell-bar[^}]*overflow-x:\s*hidden/)
  })

  it('does not gate any of it on hover/pointer media (a mouse laptop reports hover:none)', () => {
    const tight = CSS.slice(CSS.indexOf(':root.shell-tight'), CSS.indexOf(':root.shell-compact'))
    expect(tight).not.toMatch(/@media \(hover/)
    expect(BAR).not.toMatch(/hover:\s*hover/)
  })

  it('re-measures on the paths that survive a cold load and a background tab', () => {
    expect(BAR).toMatch(/addEventListener\('resize', syncShellFit\)/)
    expect(BAR).toMatch(/removeEventListener\('resize', syncShellFit\)/)
    expect(BAR).toMatch(/new ResizeObserver\(syncShellFit\)/)
    expect(BAR).toMatch(/fonts\?\.ready\?\.then\(syncShellFit\)/)
    expect(BAR).toMatch(/setTimeout\(syncShellFit/)
  })

  it('cleans up its classes and observers on unmount', () => {
    expect(BAR).toMatch(/fitRo\?\.disconnect\(\)/)
    expect(BAR).toMatch(/classList\.remove\('shell-compact'\)/)
  })
})
