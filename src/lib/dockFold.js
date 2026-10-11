// ใบ v3/pleng#109 — the phone bar's ONE button row: which buttons fold into the ⚙ panel.
//
// On the bar (≤760px, ฝึกร้อง · แผ่นเพลง) every button sits in a single centred group under the
// seek bar. When the group is wider than the bar, buttons move into ⚙ one at a time from the END
// of the row (the dock's long-standing overflow rule: the tail folds first, before Aa and ⚙ —
// docs/ds/dockkey-library.md §cap). Some buttons never fold:
//   ⚙ (it holds the folded ones) · เล่น/หยุด · anything the page marked `permanent` (Aa, ความเร็ว)
//   · full-width bands and the timeline (they are not in the button row at all).

export const canFold = (it) => !!it && !it.permanent && !['gear', 'play', 'keys', 'timeline'].includes(it.kind)

// items  : the row in display order
// widthOf: (item) => its width in px (measured, or a best guess for one not on screen yet)
// avail  : the row's usable width in px
// gap    : the space between two buttons in px
// → ids to fold, tail first. Empty when the whole row fits (or nothing can fold).
export function planFold(items, widthOf, avail, gap = 0) {
  if (!items.length || !(avail > 0)) return []
  let total = items.reduce((s, it) => s + widthOf(it), 0) + gap * (items.length - 1)
  const out = []
  for (let i = items.length - 1; i >= 0 && total > avail + 0.5; i--) {
    const it = items[i]
    if (!canFold(it)) continue
    total -= widthOf(it) + gap
    out.push(it.id)
  }
  return out
}
