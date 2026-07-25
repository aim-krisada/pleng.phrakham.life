// 🖱️👆 Pointer-based drag-to-reorder — one small mechanism for every reorderable list in the
// structure drawer (sections, melody lines, bars). Replaces native HTML5 Drag-and-Drop, which
// NEVER fires on touch devices (mobile was fully broken) and only exposed thin 10px gap drop
// targets that a real drop almost never hit.
//
// How it works: a drag HANDLE (grip / chip, `touch-action:none|pan-y`) calls `start()` on
// pointerdown. We DON'T grab the gesture yet — only once the pointer travels past a small
// threshold do we begin dragging (so a tap still fires the row's click, e.g. select-bar). From
// then on we capture the pointer (moves keep firing off-element), resolve which row the pointer
// is over from the live row rects, and expose it as a FINAL destination index. On pointerup we
// call `onReorder(from, to)` with final indices — exactly what lib/songStructure.js's
// moveVerseBy/moveLineTo/moveBarTo want. Mouse AND touch, zero dependency. The visible ▲▼ / ◀▶
// buttons stay the accessible primary (WCAG 2.5.7 Dragging Movements).
import { ref } from 'vue'

const THRESHOLD = 5 // px the pointer must travel before a press becomes a drag (preserves tap)

export function usePointerReorder({ axis = 'y', getRows, onReorder, onAnnounce } = {}) {
  const fromIndex = ref(-1) // the row being dragged (-1 = idle / not yet past threshold)
  const overIndex = ref(-1) // FINAL destination index the drop would use
  let armed = false // pressed but not yet dragging
  let startX = 0, startY = 0, startIndex = -1
  let pointerId = null
  let handleEl = null

  const midOf = (el) => {
    const r = el.getBoundingClientRect()
    return axis === 'x' ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2
  }

  function resolveDest(coord) {
    const rows = getRows() || []
    if (!rows.length) return startIndex
    let ins = 0 // insertion index = how many row midpoints sit before the pointer
    for (const el of rows) { if (coord > midOf(el)) ins++ }
    const dest = ins > startIndex ? ins - 1 : ins // insertion slot (0..n) → final index
    return Math.max(0, Math.min(rows.length - 1, dest))
  }

  function begin() {
    armed = false
    fromIndex.value = startIndex
    overIndex.value = startIndex
    try { handleEl.setPointerCapture(pointerId) } catch (_) {}
    if (navigator.vibrate) { try { navigator.vibrate(10) } catch (_) {} }
  }

  function onMove(e) {
    if (armed) {
      if (Math.abs(e.clientX - startX) < THRESHOLD && Math.abs(e.clientY - startY) < THRESHOLD) return
      begin()
    }
    if (fromIndex.value < 0) return
    e.preventDefault() // now we own the gesture — no scroll / text-select while dragging
    const dest = resolveDest(axis === 'x' ? e.clientX : e.clientY)
    if (dest !== overIndex.value) {
      overIndex.value = dest
      if (navigator.vibrate) { try { navigator.vibrate(4) } catch (_) {} }
    }
  }
  function onUp() {
    const from = fromIndex.value
    const to = overIndex.value
    const wasDragging = from >= 0
    cleanup()
    if (wasDragging && to >= 0 && to !== from) {
      onReorder(from, to)
      if (onAnnounce) onAnnounce(from, to)
    }
  }
  function cleanup() {
    if (handleEl && pointerId != null) { try { handleEl.releasePointerCapture(pointerId) } catch (_) {} }
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    armed = false; fromIndex.value = -1; overIndex.value = -1; pointerId = null; handleEl = null; startIndex = -1
  }
  function start(e, index) {
    if (e.button != null && e.button !== 0) return // primary button / touch / pen only
    handleEl = e.currentTarget
    pointerId = e.pointerId
    startX = e.clientX; startY = e.clientY; startIndex = index
    armed = true
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // template predicates (functions → no `.value` needed in the template)
  const isDragging = (i) => fromIndex.value === i // the row being carried (dim it)
  const dropAbove = (i) => fromIndex.value >= 0 && overIndex.value === i && overIndex.value <= fromIndex.value && overIndex.value !== fromIndex.value
  const dropBelow = (i) => fromIndex.value >= 0 && overIndex.value === i && overIndex.value > fromIndex.value

  return { fromIndex, overIndex, start, isDragging, dropAbove, dropBelow }
}
