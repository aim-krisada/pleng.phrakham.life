// Undo/redo for the inline editor — a REGRESSION fix (the editor on `main` always had it).
// These lock the behaviour copied from that implementation, including the two rules that were
// learned the hard way there: the leading edge of a burst must commit (B075) and pure
// navigation must never open a step (B097).
import { describe, it, expect } from 'vitest'
import { createHistory, undoIntent } from './editHistory.js'

// controllable clock so burst behaviour is tested, not timed
function at(t0 = 0) {
  const clock = { t: t0 }
  return { clock, h: createHistory({ now: () => clock.t }) }
}
const doc = (n) => ({ notes: n })

describe('createHistory', () => {
  it('a fresh song has nothing to undo or redo', () => {
    const { h } = at()
    h.reset(doc('1'))
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
    expect(h.undo()).toBe(null) // and asking anyway is a no-op, not a crash
    expect(h.redo()).toBe(null)
  })

  it('undo returns the exact previous document, redo brings it back', () => {
    const { clock, h } = at()
    h.reset(doc('1'))
    clock.t = 1000
    h.record(doc('12'))
    clock.t = 2000
    h.record(doc('123'))
    expect(h.canUndo()).toBe(true)
    expect(h.undo().doc).toEqual(doc('12'))
    expect(h.undo().doc).toEqual(doc('1'))
    expect(h.canUndo()).toBe(false)
    expect(h.redo().doc).toEqual(doc('12'))
    expect(h.redo().doc).toEqual(doc('123'))
    expect(h.canRedo()).toBe(false)
  })

  it('restores the cursor that belonged to the step (undo lands where the edit was)', () => {
    const { clock, h } = at()
    h.reset(doc('1'), 0)
    clock.t = 1000
    h.record(doc('12'), 4)
    clock.t = 2000
    h.record(doc('123'), 8)
    expect(h.undo()).toEqual({ doc: doc('12'), view: 4 })
  })

  it('the FIRST edit of a burst is its own step (B075 — ย้อนข้ามการแก้ล่าสุด)', () => {
    const { clock, h } = at()
    h.reset(doc('1'))
    clock.t = 1000
    expect(h.record(doc('12'))).toBe(true) // leading edge commits immediately
    clock.t = 1100
    expect(h.record(doc('123'))).toBe(false) // inside the burst → coalesced
    expect(h.undo().doc).toEqual(doc('1')) // the burst is ONE undo, and it goes all the way back
  })

  it('edits separated by a pause are separate steps', () => {
    const { clock, h } = at()
    h.reset(doc('1'))
    clock.t = 1000
    h.record(doc('12'))
    clock.t = 5000
    h.record(doc('123'))
    expect(h.undo().doc).toEqual(doc('12'))
  })

  it('re-recording the SAME document is navigation, not a step', () => {
    const { clock, h } = at()
    h.reset(doc('1'), 0)
    clock.t = 1000
    expect(h.record(doc('1'), 6)).toBe(false)
    expect(h.canUndo()).toBe(false)
    clock.t = 2000
    h.record(doc('12'), 6)
    expect(h.undo().view).toBe(6) // …but where we were looking is remembered
  })

  it('editing after an undo drops the redo tail', () => {
    const { clock, h } = at()
    h.reset(doc('1'))
    clock.t = 1000
    h.record(doc('12'))
    clock.t = 2000
    h.record(doc('123'))
    h.undo()
    expect(h.canRedo()).toBe(true)
    clock.t = 3000
    h.record(doc('12X'))
    expect(h.canRedo()).toBe(false)
    expect(h.undo().doc).toEqual(doc('12'))
  })

  it('undoing to the very start then pressing again changes nothing', () => {
    const { clock, h } = at()
    h.reset(doc('1'))
    clock.t = 1000
    h.record(doc('12'))
    expect(h.undo().doc).toEqual(doc('1'))
    expect(h.undo()).toBe(null)
    expect(h.redo().doc).toEqual(doc('12'))
  })

  it('caps the stack (old steps fall off the bottom, not the top)', () => {
    const { clock, h } = at()
    const small = createHistory({ limit: 3, now: () => clock.t })
    small.reset(doc('a'))
    for (const [i, d] of ['b', 'c', 'd', 'e'].entries()) { clock.t = (i + 1) * 1000; small.record(doc(d)) }
    expect(small.length).toBe(3)
    expect(small.undo().doc).toEqual(doc('d'))
    expect(small.undo().doc).toEqual(doc('c'))
    expect(small.canUndo()).toBe(false)
  })

  it('a restored step is a COPY — mutating it cannot corrupt the history', () => {
    const { clock, h } = at()
    h.reset(doc('1'))
    clock.t = 1000
    h.record(doc('12'))
    const back = h.undo()
    back.doc.notes = 'tampered'
    expect(h.redo().doc).toEqual(doc('12'))
    h.undo()
    expect(h.undo ? true : true).toBe(true)
  })
})

describe('undoIntent — the shortcuts the editor on `main` uses', () => {
  const ev = (o) => ({ ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...o })
  it('Ctrl+Z / ⌘+Z = ย้อน', () => {
    expect(undoIntent(ev({ ctrlKey: true, key: 'z' }))).toBe('undo')
    expect(undoIntent(ev({ metaKey: true, key: 'Z' }))).toBe('undo')
  })
  it('Ctrl+Shift+Z and Ctrl+Y = ทำซ้ำ', () => {
    expect(undoIntent(ev({ ctrlKey: true, shiftKey: true, key: 'z' }))).toBe('redo')
    expect(undoIntent(ev({ ctrlKey: true, key: 'y' }))).toBe('redo')
  })
  it('leaves plain typing alone', () => {
    expect(undoIntent(ev({ key: 'z' }))).toBe(null)
    expect(undoIntent(ev({ ctrlKey: true, altKey: true, key: 'z' }))).toBe(null) // AltGr combos
    expect(undoIntent(ev({ ctrlKey: true, key: 'ArrowLeft' }))).toBe(null)
  })
})
