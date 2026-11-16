// หน้าสถิติ (ใบ v3/pleng#163 · #170) — the numbers that come from the team's own data, not Google.
// Pure functions, so the page and the tests count the same way.

export const RANGES = [7, 28, 90]
const DAY = 24 * 60 * 60 * 1000

// "17 ต.ค. ถึง 13 พ.ย. 2569 (28 วัน)" — the last `days` days, today included
export function rangeLabel(days, now = new Date()) {
  const end = new Date(now)
  const start = new Date(now.getTime() - (days - 1) * DAY)
  const short = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  const year = end.toLocaleDateString('th-TH', { year: 'numeric' }).replace(/[^\d]/g, '')
  return `${short(start)} ถึง ${short(end)} ${year} (${days} วัน)`
}

// whole days between a timestamp and now (never negative)
export function daysSince(ts, now = new Date()) {
  const t = new Date(ts).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((now.getTime() - t) / DAY))
}

// stat.09 — งานที่ค้างอยู่ในแต่ละขั้น. Drafts in the trash are not counted (AC 3).
//   draft    : still being typed
//   pending  : sent for review, waiting for an approver
//   approved : approved within the chosen range
//   oldest   : the 3 pending drafts that have waited longest, with how many days
export function draftStats(drafts, days, now = new Date()) {
  const live = (drafts || []).filter((d) => d && !d.deleted_at)
  const since = now.getTime() - days * DAY
  const pending = live.filter((d) => d.status === 'pending')
  const oldest = [...pending]
    .sort((a, b) => String(a.updated_at ?? '').localeCompare(String(b.updated_at ?? '')))
    .slice(0, 3)
    .map((d) => ({ id: d.id, number: d.number, title: d.title_th || '(ไม่มีชื่อ)', days: daysSince(d.updated_at, now) }))
  return {
    draft: live.filter((d) => d.status === 'draft').length,
    pending: pending.length,
    approved: live.filter((d) => d.status === 'approved' && new Date(d.updated_at).getTime() >= since).length,
    oldest,
  }
}
