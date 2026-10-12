// ใบ v3/pleng#112 — the editor's left rail (โครงเพลง · ทำนอง) must be readable to its last row
// ("เพิ่มทำนอง"): since ใบ#111 the bottom bar (with the note keypad, ~170–226px) is fixed over the
// page at every width, and the rail's height ignored it, so its end sat under the bar.
// jsdom has no layout, so the CSS rules are pinned as text (as dockClear.test.js does for
// styles.css) and the header offset is pinned by feeding a known header height in.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('../supabase.js', () => {
  const makeQuery = () => {
    const q = {}
    for (const m of ['select', 'order', 'is', 'not', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) q[m] = () => q
    q.single = () => Promise.resolve({ data: null, error: null })
    q.then = (res) => Promise.resolve({ data: [], error: null }).then(res)
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    },
  }
})

import EditorMode from './EditorMode.vue'

const src = readFileSync(resolve(process.cwd(), 'src/components/EditorMode.vue'), 'utf8')
const css = src.slice(src.indexOf('<style'))
// the body of the first `<selector> {` rule found after `from` (rules here are not nested)
function rule(selector, from = 0) {
  const at = css.indexOf(`${selector} {\n`, from)
  if (at < 0) return null
  return css.slice(at, css.indexOf('\n}', at) + 2)
}
const drawerBlock = css.indexOf('@media (max-width: 900px) {')

describe('ใบ#112 — the rail ends above the bottom bar', () => {
  it('desktop rail: sticks under the measured header and its height leaves room for the bar', () => {
    const r = rule('.rail')
    expect(r).toBeTruthy()
    expect(r).toMatch(/position: sticky;/)
    expect(r).toMatch(/top: var\(--rail-top, 58px\);/)
    // header + 16px gap + the bar's full height (keypad included) come off the window height
    expect(r).toMatch(/max-height: calc\(100dvh - var\(--rail-top, 58px\) - 16px - var\(--dock-bar-h, 0px\)\);/)
    expect(r).toMatch(/overflow: auto;/)
    // a row reached with Tab never lands flush on the rail's own edge
    expect(r).toMatch(/scroll-padding-block: 8px;/)
    // the old rule that ignored the bar is gone
    expect(css).not.toMatch(/max-height: calc\(100dvh - 74px\)/)
  })

  it('drawer (≤900px): stops at the bar\'s top edge instead of running under it', () => {
    expect(drawerBlock).toBeGreaterThan(0)
    const r = rule('  .rail', drawerBlock)
    expect(r).toMatch(/position: fixed;/)
    expect(r).toMatch(/height: calc\(100dvh - var\(--dock-bar-h, 0px\)\);/)
    expect(r).not.toMatch(/height: 100dvh;/)
    // the bar stays above the drawer and its dimmed backdrop (90 > 80 > 75), so neither covers the other
    expect(r).toMatch(/z-index: 80;/)
  })

  it('short window / keyboard up (no fixed bar): the bar variable falls back to 0 → full height', () => {
    // dockClear.js removes --dock-bar-h while the bar is in the page flow or stepped aside, so every
    // use here must carry the 0px fallback, or the whole calc() would be thrown away
    const uses = css.match(/var\(--dock-bar-h[^)]*\)/g) || []
    expect(uses.length).toBeGreaterThanOrEqual(4)
    for (const u of uses) expect(u).toBe('var(--dock-bar-h, 0px)')
  })

  it('the other bottom things in the editor also clear the bar (undo toast · preview window)', () => {
    expect(rule('.undo-snack')).toMatch(/bottom: calc\(var\(--dock-bar-h, 0px\) \+ 56px\);/)
    expect(rule('.ed-float')).toMatch(/max-height: min\(80vh, calc\(100vh - 96px - var\(--dock-bar-h, 0px\)\)\);/)
  })
})

describe('ใบ#112 — the rail pins right under the header, even when the header grows later', () => {
  let realRect
  let realRO
  let roCallbacks
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="shell-title"></div><div id="shell-menus"></div><header class="shell-bar"></header>'
    Element.prototype.scrollIntoView = () => {}
    roCallbacks = []
    realRO = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(cb) { this.cb = cb; roCallbacks.push(cb) }
      observe() {}
      disconnect() {}
    }
    realRect = Element.prototype.getBoundingClientRect
  })

  it('--rail-top follows the header height (83px at 1280 · 105px at 1024 — not the old 58px)', async () => {
    let shell = 64
    Element.prototype.getBoundingClientRect = function () {
      if (this.classList?.contains('shell-bar')) return { height: shell, width: 1280, top: 0, bottom: shell, left: 0, right: 1280 }
      return realRect.call(this)
    }
    try {
      const w = mount(EditorMode, {
        props: { song: null, tier: 'approver', active: true },
        attachTo: document.body,
        global: { stubs: { Icon: true, 'router-link': true, SongSheet: true, StudioDock: true, ComboSelect: true } },
      })
      await nextTick()
      await nextTick()
      expect(w.find('#studioRail').attributes('style')).toContain('--rail-top: 64px')
      // the song's controls land in the header after mount and it wraps taller — no window resize
      shell = 105
      roCallbacks.forEach((cb) => cb([]))
      await nextTick()
      expect(w.find('#studioRail').attributes('style')).toContain('--rail-top: 105px')
      // the sticky edit header pins on the same line
      expect(w.find('.edhead').attributes('style')).toContain('top: 105px')
      w.unmount()
    } finally {
      Element.prototype.getBoundingClientRect = realRect
      globalThis.ResizeObserver = realRO
    }
  })
})
