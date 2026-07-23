// 🔴4 (พี่เปา, 23 ก.ค.) — the fixed dock covered the last row of the song: 20 note / lyric /
// chord controls answered `elementFromPoint` with the dock, so they could never be tapped.
// The page reserved a hard-coded gap (150px in the editor, 88px under the sheet) while the
// dock's real height depends on the viewport, wrapping, the message row and the user's own
// resize — measured live: 214px at 360w, 222px at 412w.
//
// Fix: DockKey measures itself into `--dock-h` (tallest dock wins, since a page can carry
// more than one) and the content reserves `var(--dock-h)`. These tests keep that contract:
// nobody may go back to a magic number, and the var must be published AND cleaned up.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (...p) => readFileSync(join(process.cwd(), 'src', ...p), 'utf8')
const DOCK = read('components', 'DockKey.vue')
const EDITOR = read('components', 'EditorMode.vue')
const STUDIO = read('views', 'Studio.vue')

describe('the dock publishes the gap the page must reserve (🔴4)', () => {
  it('DockKey measures its own height into --dock-h', () => {
    expect(DOCK).toMatch(/setProperty\('--dock-h'/)
    expect(DOCK).toMatch(/getBoundingClientRect\(\)\.height/)
  })

  it('keeps one entry per dock instance so the TALLEST wins', () => {
    // a plain overwrite let a collapsed 109px dock publish over the 214px one on screen
    expect(DOCK).toMatch(/Math\.max\(0, \.\.\.dockHeights\.values\(\)\)/)
    expect(DOCK).toMatch(/registerDockHeight/)
    expect(DOCK).toMatch(/unregisterDockHeight/)
  })

  it('re-measures on the paths that survive a background tab (not just ResizeObserver)', () => {
    expect(DOCK).toMatch(/addEventListener\('resize', syncDockHeight\)/)
    expect(DOCK).toMatch(/removeEventListener\('resize', syncDockHeight\)/)
    expect(DOCK).toMatch(/setTimeout\(syncDockHeight/)
  })

  it('clears --dock-h when the last dock unmounts', () => {
    expect(DOCK).toMatch(/removeProperty\('--dock-h'\)/)
  })

  it('the editor and the sheet reserve var(--dock-h), not a magic number', () => {
    expect(EDITOR).toMatch(/var\(--dock-h,\s*\d+px\)/)
    expect(EDITOR).not.toMatch(/style="padding-bottom: 150px"/)
    expect(STUDIO).toMatch(/padding-bottom:\s*calc\(var\(--dock-h,\s*\d+px\)/)
  })
})
