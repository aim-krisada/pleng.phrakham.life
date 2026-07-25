// Undo / redo history for the inline editor — the SAME behaviour the editor on `main` has had
// all along (EditorMode's B097/B075 history), lifted into a plain module so the inline surface
// reuses it instead of growing a second, subtly different one.
//
// P'Aim: "ควรมีปุ่ม undo redo ด้วย ของเดิมมี พร้อม shortcut key" — this is a REGRESSION fix, so
// the rules below are copied from that implementation deliberately:
//   • a step = a change to the DOCUMENT. Where the cursor sits is VIEW state: it rides along
//     inside a step (so undo puts you back where the edit happened) but never opens one.
//   • bursts coalesce on a 400ms debounce, but the FIRST edit of a burst commits immediately
//     (B075 — พี่เปา: "ย้อนข้ามการแก้ล่าสุด" when the leading edge was missing).
//   • editing after an undo drops the redo tail; the stack is capped at 100 steps.
// The caller owns the document: it hands in snapshots (any JSON-able value) and gets them back.

export const HISTORY_LIMIT = 100
export const BURST_MS = 400

export function createHistory({ limit = HISTORY_LIMIT, burstMs = BURST_MS, now = () => Date.now() } = {}) {
  let entries = [] // { doc: <json string>, view }
  let pos = -1
  let lastCommitAt = -Infinity // when the current burst started (leading-edge rule)

  const key = (doc) => JSON.stringify(doc)
  const at = () => entries[pos] || null

  return {
    get length() { return entries.length },
    get position() { return pos },
    canUndo: () => pos > 0,
    canRedo: () => pos >= 0 && pos < entries.length - 1,

    // The starting point: a freshly loaded song. Clears everything — there is nothing before it.
    reset(doc, view = null) {
      entries = [{ doc: key(doc), view }]
      pos = 0
      lastCommitAt = -Infinity
    },

    // Record an edit. Returns true when it opened a NEW step (a document change outside the
    // burst window), false when it only refreshed the current step (same document = pure
    // navigation, or a keystroke inside the burst).
    record(doc, view = null) {
      const k = key(doc)
      const cur = at()
      if (cur && cur.doc === k) {
        if (cur) cur.view = view // same document → just remember where we are looking
        return false
      }
      const t = now()
      const withinBurst = t - lastCommitAt < burstMs
      if (withinBurst && cur) {
        // coalesce into the step this burst opened, so holding a key is ONE undo
        cur.doc = k
        cur.view = view
        return false
      }
      entries.splice(pos + 1) // editing after an undo drops the redo tail
      entries.push({ doc: k, view })
      if (entries.length > limit) entries.shift()
      pos = entries.length - 1
      lastCommitAt = t
      return true
    },

    // Step back / forward. Returns { doc, view } to apply, or null when there is nothing to do
    // (which is exactly when canUndo/canRedo report false — the buttons must be disabled then,
    // never silently do nothing).
    undo() {
      if (pos <= 0) return null
      pos--
      lastCommitAt = -Infinity // the next edit starts a fresh burst
      const e = entries[pos]
      return { doc: JSON.parse(e.doc), view: e.view }
    },
    redo() {
      if (pos >= entries.length - 1) return null
      pos++
      lastCommitAt = -Infinity
      const e = entries[pos]
      return { doc: JSON.parse(e.doc), view: e.view }
    },
  }
}

// The keyboard contract, unchanged from the editor on `main`:
//   Ctrl/⌘+Z = ย้อน · Ctrl/⌘+Shift+Z = ทำซ้ำ · Ctrl/⌘+Y = ทำซ้ำ
// Returns 'undo' | 'redo' | null so the same rule serves the window listener and the note
// capture field (the shortcut must work while typing — that is where the user IS).
export function undoIntent(e) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null
  const k = (e.key || '').toLowerCase()
  if (k === 'z') return e.shiftKey ? 'redo' : 'undo'
  if (k === 'y') return 'redo'
  return null
}
