// 🔴2 (พี่เปา, 23 ก.ค.) — on a 360/412 phone the ✏️ / "เสร็จการแก้ไข" buttons sat at
// x≈627, off-screen: you could enter edit mode but never leave it.
//
// Root cause (reproduced live at :5375 — document 772px wide inside a 360px viewport):
// the tie/slur overlay baked its MEASURED width/height into the svg's width/height
// ATTRIBUTES. A re-measure can lag behind the layout (and never arrives at all in a
// background/emulated tab, where neither the ResizeObserver nor rAF runs), so a
// desktop-measured 760px box stayed inside a 336px line — and an absolutely positioned
// box still counts as scrollable overflow, which drags every position:fixed control
// out past the viewport with it.
//
// The fix is structural: the overlay is sized from the LINE in CSS, so it can never be
// wider than the line whatever the measure timing. These tests keep it that way — the
// measured numbers may only live in `viewBox`, which has no layout effect.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = readFileSync(join(process.cwd(), 'src', 'components', 'SongSheet.vue'), 'utf8')

// the <svg class="tie-overlay"> element as written in the template
const overlayTag = SRC.slice(SRC.indexOf('class="tie-overlay"')).split('>')[0]
// the .tie-overlay rule in the scoped <style>
const overlayCss = SRC.slice(SRC.indexOf('.tie-overlay {')).split('}')[0]

describe('tie/slur overlay can never widen the page (🔴2 mobile)', () => {
  it('does not bind a measured px width/height onto the svg attributes', () => {
    expect(overlayTag).not.toMatch(/:width=/)
    expect(overlayTag).not.toMatch(/:height=/)
    expect(overlayTag).not.toMatch(/\bwidth="\d/)
    expect(overlayTag).not.toMatch(/\bheight="\d/)
  })

  it('keeps the measured size in viewBox only (no layout effect)', () => {
    expect(overlayTag).toMatch(/:viewBox=/)
    expect(overlayTag).toMatch(/preserveAspectRatio="none"/)
  })

  it('sizes the overlay box from the line itself, in CSS', () => {
    expect(overlayCss).toMatch(/position:\s*absolute/)
    expect(overlayCss).toMatch(/inset:\s*0/)
    expect(overlayCss).toMatch(/width:\s*100%/)
    expect(overlayCss).toMatch(/height:\s*100%/)
  })

  it('re-measures on the events a phone actually fires (rotate / tab return)', () => {
    for (const ev of ['resize', 'orientationchange', 'visibilitychange']) {
      expect(SRC).toMatch(new RegExp(`addEventListener\\('${ev}'`))
      expect(SRC, `${ev} listener is never removed`).toMatch(
        new RegExp(`removeEventListener\\('${ev}'`),
      )
    }
  })
})
