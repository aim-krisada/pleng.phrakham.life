// หน้าสถิติ — Google numbers (ใบ v3/pleng#164 stat.03 ภาพรวม). The ga-stats Edge Function hands back
// compact rows ([[...dims], number]); these pure functions turn them into what a card shows.

// The day the counter went live on pleng.phrakham.life (PR 124, 16 พ.ย. 2569). Days before it are
// "ยังไม่ได้เริ่มนับ" — never drawn as 0 people (stat.03 AC 7).
export const COUNTING_SINCE = '20261116'

const TZ = 'Asia/Bangkok'
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: TZ }).replace(/-/g, '')
const DAY = 86400000

// the last `days` dates, oldest first, as GA writes them (YYYYMMDD in Thai time)
export function dayList(days, now = new Date()) {
  return Array.from({ length: days }, (_, i) => ymd(new Date(now.getTime() - (days - 1 - i) * DAY)))
}
const weekday = (s) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))).getUTCDay()
export const isWeekend = (s) => [0, 6].includes(weekday(s))

const sumWhere = (rows, pred) => (rows || []).reduce((t, [d, n]) => (pred(d) ? t + n : t), 0)
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : null)

// the 4 parts of the day, by hour (0–23, Thai time — the GA property's own time zone)
export const DAY_PARTS = [
  ['เช้า', (h) => h >= 6 && h < 12],
  ['บ่าย', (h) => h >= 12 && h < 18],
  ['เย็น', (h) => h >= 18 && h < 22],
  ['ดึก', (h) => h >= 22 || h < 6],
]

export function overview(bundle, days, now = new Date()) {
  const r = bundle?.reports || {}
  const users = sumWhere(r.totals, (d) => d[d.length - 1] === 'cur')
  const prevUsers = sumWhere(r.totals, (d) => d[d.length - 1] === 'prev')
  const mode = (m, range) => sumWhere(r.totalsByMode, (d) => d[0] === m && d[d.length - 1] === range)
  const share = (range) => pct(mode('app', range), mode('app', range) + mode('web', range))

  const byDay = {}
  for (const [[date, m], n] of r.daily || []) {
    byDay[date] = byDay[date] || { web: 0, app: 0 }
    byDay[date][m === 'app' ? 'app' : 'web'] += n
  }
  const bars = dayList(days, now).map((date) => {
    const started = date >= COUNTING_SINCE
    const v = byDay[date] || { web: 0, app: 0 }
    return { date, started, weekend: isWeekend(date), web: started ? v.web : 0, app: started ? v.app : 0 }
  })
  const counted = bars.filter((b) => b.started)
  const avg = (list) => (list.length ? Math.round(list.reduce((t, b) => t + b.web + b.app, 0) / list.length) : null)

  const hourTotals = DAY_PARTS.map(([name, inPart]) => [name, sumWhere(r.hours, (d) => inPart(Number(d[0])))])
  const hoursAll = hourTotals.reduce((t, [, n]) => t + n, 0)
  const busiest = hoursAll ? hourTotals.reduce((a, b) => (b[1] > a[1] ? b : a))[0] : null

  // the previous range is only comparable when the counter was already running for all of it
  const prevStart = ymd(new Date(now.getTime() - (2 * days - 1) * DAY))
  const prevComparable = prevStart >= COUNTING_SINCE

  return {
    users,
    prevUsers,
    change: prevComparable ? pct(users - prevUsers, prevUsers) : null,
    appShare: share('cur'),
    prevAppShare: prevComparable ? share('prev') : null,
    bars,
    max: Math.max(1, ...bars.map((b) => b.web + b.app)),
    weekdayAvg: avg(counted.filter((b) => !b.weekend)),
    weekendAvg: avg(counted.filter((b) => b.weekend)),
    notStartedDays: bars.length - counted.length,
    dayParts: hourTotals.map(([name, n]) => ({ name, share: pct(n, hoursAll) })),
    busiest,
  }
}

// what the page says when the function did not answer (stat.02 AC 5 — never a 0 instead)
export function gaErrorText(status) {
  if (status === 503 || status === 404) return 'ยังไม่ได้เชื่อมตัวเลขจาก Google ⇒ ตัวเลขชุดนี้จะขึ้นเมื่อเชื่อมเสร็จ'
  return 'ดึงตัวเลขจาก Google ไม่ได้ ลองใหม่ภายหลัง'
}
