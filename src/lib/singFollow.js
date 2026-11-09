// ใบ v3/pleng#148 — karaoke in the sheet windows of แก้ไข (พี่เปา 4 พ.ย. 2569: "กดเล่น แล้ว karaoke วิ่งใน
// แผ่นเพลงตรงนั้นเลย เหมือนหน้าฝึกร้อง"). ฟังทั้งเพลง lights the word being sung on the sheet beside the
// editor (wide screen) or in the floating ดูผลทั้งเพลง window, and that window — never the editor page,
// which stays where the person editing left it (พี่เปา 2026-07-27) — scrolls to keep the word in view.

// someone scrolling the sheet by hand is reading elsewhere: leave it alone this long (ฝึกร้อง's pause)
export const SING_HANDS_OFF_MS = 3500

// the element of the word sounding now: the exact syllable, else its segment (lyrics only / v1) —
// the same order ฝึกร้อง looks them up in (SongViewer.scrollToPlaying)
export function singTarget(box, seg, syl) {
  if (!box) return null
  const sel = syl
    ? `[data-syl="${syl.li}-${syl.si}-${syl.syk}"]`
    : seg
      ? `[data-seg="${seg.li}-${seg.si}"]`
      : null
  if (!sel) return null
  return box.querySelector(sel) ||
    (syl ? box.querySelector(`[data-alt-syl="${syl.li}-${syl.si}-${syl.syk}"]`) : null) || // ใบ v1#158 — Thai off
    (syl && seg ? box.querySelector(`[data-seg="${seg.li}-${seg.si}"]`) : null)
}

// bring el into the scrolling box when it is outside it: a third of the way down, so the lines coming
// next stay readable. A word already in view does not move the box.
export function keepInBox(box, el) {
  if (!box || !el) return false
  const br = box.getBoundingClientRect()
  const er = el.getBoundingClientRect()
  if (er.top >= br.top && er.bottom <= br.bottom) return false
  const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  box.scrollTo({ top: box.scrollTop + er.top - br.top - box.clientHeight / 3, behavior: smooth ? 'smooth' : 'auto' })
  return true
}
