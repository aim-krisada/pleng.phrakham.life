// ใบ v3/pleng#113 — how the bottom bar lays out its rows (DockKey.vue measures, this decides).
//
// The bar has an optional seek slider (ฝึกร้อง) and a group of buttons. Three layouts:
//   'one'   — ONE row: the seek slider + time on the left, the whole button group on the right.
//             Only when the slider still gets at least SEEK_MIN px (Apple HIG: a slider must be
//             long enough to scrub precisely) without shrinking any button or gap.
//   'stack' — the seek slider on its own row, the buttons in one row under it (the old layout).
//   'stack2'— as 'stack', but the buttons did not fit one row either (a phone): two button rows.
// A bar with no seek slider (แผ่นเพลง · แก้ไข) is 'stack' (one button row) or 'stack2'.
// The choice depends only on widths that do not change with the layout itself, so it never
// flips back and forth: the room in the bar, the button group, and the seek cell's fixed parts
// (time label, gaps, padding — everything except the slider and a label that may shrink).
export const SEEK_MIN = 240 // px — the shortest the seek slider may be on a one-row bar
export const ONE_ROW_GAP = 16 // px — between the seek cell and the button group (DockKey .dk-one)

/**
 * @param {object} m
 * @param {number} m.avail      width inside the bar's centred column
 * @param {number} m.buttons    the button group on one line: every cell + the 8px gaps between
 * @param {boolean} m.hasSeek   the bar has a seek slider
 * @param {number} [m.seekFixed] the seek cell's width that is not the slider (time, gaps, padding)
 * @param {number} [m.seekMin]  shortest slider allowed (default SEEK_MIN)
 * @param {number} [m.gap]      space between the seek cell and the buttons (default ONE_ROW_GAP)
 * @returns {'one'|'stack'|'stack2'|null} null = not laid out yet (hidden page · test DOM)
 */
export function barLayout({ avail, buttons, hasSeek, seekFixed = 0, seekMin = SEEK_MIN, gap = ONE_ROW_GAP }) {
  if (!(avail > 0)) return null
  if (buttons > avail + 0.5) return 'stack2'
  if (!hasSeek) return 'stack'
  return avail - buttons - gap >= seekMin + seekFixed - 0.5 ? 'one' : 'stack'
}

/** The narrowest bar column that fits one row (for reports and tests). */
export function oneRowMinWidth({ buttons, seekFixed = 0, seekMin = SEEK_MIN, gap = ONE_ROW_GAP }) {
  return Math.ceil(buttons + gap + seekMin + seekFixed)
}
