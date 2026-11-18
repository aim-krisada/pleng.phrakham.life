// หน้าสถิติ — Google numbers (ใบ v3/pleng#164 stat.03 ภาพรวม). The ga-stats Edge Function hands back
// compact rows ([[...dims], number]); these pure functions turn them into what a card shows.

import { thaiProvince } from './thaiProvinces.js'
import { songLangs } from './songModel.js'

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

// Dates under the daily chart. Every day for 7 days, every 7th for 28, every 15th for 90 — counted back
// from today so the newest bar always carries its date. The month name goes on the first label and
// wherever the month turns, so a short label ("16") still says which month it is.
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
export function dayTicks(dates) {
  const n = dates.length
  const step = n <= 7 ? 1 : n <= 31 ? 7 : 15
  const idx = []
  for (let i = n - 1; i >= 0; i -= step) idx.unshift(i)
  let lastMonth = null
  return idx.map((i) => {
    const m = +dates[i].slice(4, 6)
    const label = m === lastMonth ? String(+dates[i].slice(6)) : `${+dates[i].slice(6)} ${TH_MONTHS[m - 1]}`
    lastMonth = m
    return { i, label, at: ((i + 0.5) / n) * 100 }
  })
}

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
    // only 'web' / 'app': Google also returns "(not set)" for the same visitor's events that carry no
    // display_mode (session_start, user_engagement …) — adding those counted one person twice
    // (16 พ.ย. 2569: 1 คนใน 28 วัน but "เฉลี่ยวันละ 2 คน"). Every visit sends a page_view with the mode.
    if (m !== 'web' && m !== 'app') continue
    byDay[date] = byDay[date] || { web: 0, app: 0 }
    byDay[date][m] += n
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
    prevComparable,
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

// ════════════════════════════════════════════════════════════════════════════════════════════
// The other cards (ใบ v3/pleng#165–#174). `songs` = Map id → song row ({ number, title_th, category,
// content, deleted_at }), filled by the page from the catalog; a song missing from it was removed.
// ════════════════════════════════════════════════════════════════════════════════════════════
export const LOW_BASE = 30 // under this, a percentage says more about chance than about people
const isRange = (d, r) => d[d.length - 1] === r
const share = (n, base) => (base > 0 ? Math.round((n * 100) / base) : 0)
const tally = (pairs) => {
  const m = new Map()
  for (const [k, n] of pairs) m.set(k, (m.get(k) || 0) + n)
  return m
}
const byCount = (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))
const cleanTerm = (t) => String(t || '').trim().replace(/\s+/g, ' ').toLowerCase()
const realValue = (v) => !!v && v !== '(not set)'

export function songIdFromPath(path) {
  const m = /^\/song\/([^/?#]+)/.exec(String(path || ''))
  return m ? decodeURIComponent(m[1]) : null
}
const songRow = (songs, id) => songs?.get(String(id)) || null
const removed = (s) => !s || !!s.deleted_at

// opens per song id for one range
function opensBySong(bundle, range = 'cur') {
  return tally(
    (bundle?.reports?.songs || [])
      .filter(([d]) => isRange(d, range))
      .map(([d, n]) => [songIdFromPath(d[0]), n])
      .filter(([id]) => id),
  )
}
export function songIds(bundle) {
  return [...new Set([...opensBySong(bundle).keys(), ...opensBySong(bundle, 'prev').keys(),
    ...(bundle?.reports?.keyChanges || []).map(([d]) => d[0]),
    ...(bundle?.reports?.deadEnds || []).map(([d]) => d[1])].filter(realValue))]
}

// stat.04 — 20 เพลงที่เปิดมากที่สุด; ใหม่ = not in the top 20 of the range before (only when it was counted)
export function topSongs(bundle, songs, { prevComparable = false, limit = 20 } = {}) {
  const top = [...opensBySong(bundle)].sort(byCount).slice(0, limit)
  const prevTop = new Set([...opensBySong(bundle, 'prev')].sort(byCount).slice(0, limit).map(([id]) => id))
  return top.map(([id, opens]) => {
    const s = songRow(songs, id)
    return { id, opens, song: s, removed: removed(s), isNew: prevComparable && !prevTop.has(id) }
  })
}

// stat.05 — จังหวัด (ต่างประเทศ and ไม่ทราบ are always shown when present, never cut)
export function regions(bundle, limit = 10) {
  const m = tally(
    (bundle?.reports?.regions || []).map(([[country, region], n]) => [
      !realValue(country) ? 'ไม่ทราบ' : country !== 'Thailand' ? 'ต่างประเทศ' : !realValue(region) ? 'ไม่ทราบ' : thaiProvince(region),
      n,
    ]),
  )
  const total = [...m.values()].reduce((a, b) => a + b, 0)
  const named = [...m].filter(([k]) => k !== 'ต่างประเทศ' && k !== 'ไม่ทราบ').sort(byCount).slice(0, limit)
  const tail = ['ต่างประเทศ', 'ไม่ทราบ'].filter((k) => m.get(k)).map((k) => [k, m.get(k)])
  return { total, rows: [...named, ...tail].map(([name, n]) => ({ name, n, pct: share(n, total) })) }
}

// stat.05 — ช่องทาง. "(not set)" is ไม่ทราบ — never folded into พิมพ์ที่อยู่เข้ามาเอง (AC 3)
export const SOURCE_ORDER = ['LINE', 'Facebook', 'ค้นจาก Google', 'พิมพ์ที่อยู่เข้ามาเอง', 'อื่น ๆ', 'ไม่ทราบ']
export function sourceName(source, medium) {
  const s = String(source || '').toLowerCase()
  if (!realValue(s)) return 'ไม่ทราบ'
  if (s.includes('line')) return 'LINE'
  if (s.includes('facebook') || s === 'fb' || s.endsWith('.fb.com')) return 'Facebook'
  if (s.includes('google') && medium === 'organic') return 'ค้นจาก Google'
  if (s === '(direct)') return 'พิมพ์ที่อยู่เข้ามาเอง'
  return 'อื่น ๆ'
}
export function sources(bundle) {
  const m = tally((bundle?.reports?.sources || []).map(([[src, med], n]) => [sourceName(src, med), n]))
  const total = [...m.values()].reduce((a, b) => a + b, 0)
  return { total, rows: SOURCE_ORDER.filter((k) => m.get(k)).map((name) => ({ name, n: m.get(name), pct: share(m.get(name), total) })) }
}

// searches: term → { searches, found, notFound }
function searchTable(bundle) {
  const t = new Map()
  for (const [[term, found], n] of bundle?.reports?.searches || []) {
    const k = cleanTerm(term)
    if (!realValue(k)) continue
    const r = t.get(k) || { term: k, searches: 0, found: 0, notFound: 0 }
    r.searches += n
    if (found === 'no') r.notFound += n
    else r.found += n
    t.set(k, r)
  }
  return t
}
// stat.06 — คำที่ค้นแล้วไม่เจอ
export function notFound(bundle, limit = 10) {
  const t = [...searchTable(bundle).values()]
  return {
    anySearch: t.length > 0,
    rows: t.filter((r) => r.notFound > 0).sort((a, b) => b.notFound - a.notFound || a.term.localeCompare(b.term)).slice(0, limit),
  }
}
// stat.08 — ค้นเจอแต่ไม่มีใครกด (3 searches or more), with the first song the search shows
export function foundNoPick(bundle, firstSong, limit = 10) {
  const picks = tally((bundle?.reports?.searchPicks || []).map(([[term], n]) => [cleanTerm(term), n]))
  return [...searchTable(bundle).values()]
    .filter((r) => r.found >= 3 && !picks.get(r.term))
    .sort((a, b) => b.found - a.found || a.term.localeCompare(b.term))
    .slice(0, limit)
    .map((r) => ({ term: r.term, searches: r.found, first: firstSong ? firstSong(r.term) : null }))
}

// stat.07 — เปิดบ่อยแต่ยังต้องแก้: no melody numbers or no chords; removed songs are left out (AC 4)
export function needsFix(bundle, songs, parts, limit = 10) {
  return [...opensBySong(bundle)]
    .sort(byCount)
    .map(([id, opens]) => ({ id, opens, song: songRow(songs, id) }))
    .filter((r) => !removed(r.song))
    .map((r) => {
      const p = parts(r.song.content)
      return { ...r, missing: [!p.notes && 'โน้ตตัวเลข', !p.chords && 'คอร์ด'].filter(Boolean) }
    })
    .filter((r) => r.missing.length)
    .slice(0, limit)
}
// stat.07 — เปลี่ยนคีย์บ่อย. key_change goes once per open for each key tried, so one open that tried 2 keys
// counts 2 — close enough to rank songs by.
export function keyChanges(bundle, songs, limit = 5) {
  const per = new Map()
  for (const [[id, to], n] of bundle?.reports?.keyChanges || []) {
    if (!realValue(id) || !realValue(to)) continue
    const r = per.get(id) || { id, n: 0, to: new Map() }
    r.n += n
    r.to.set(to, (r.to.get(to) || 0) + n)
    per.set(id, r)
  }
  return [...per.values()]
    .map((r) => ({ ...r, song: songRow(songs, r.id) }))
    .filter((r) => !removed(r.song))
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((r) => ({ id: r.id, n: r.n, song: r.song, setKey: r.song.content?.key || '', topTo: [...r.to].sort(byCount)[0][0] }))
}

// stat.10 — ฟีเจอร์: % of song opens; ข้ามท่อน only over songs that have more than one ท่อน (AC 3)
export const FEATURE_NAMES = {
  sheet: 'ฝึกร้องกับแผ่นเพลง',
  play: 'กดเล่นเสียง',
  tempo: 'ปรับความเร็ว',
  section: 'ข้ามท่อน',
  key: 'เปลี่ยนคีย์',
  chord_system: 'สลับคอร์ดกับโน้ตตัวเลข',
  print: 'พิมพ์',
  lang_en: 'เปิดเนื้ออังกฤษ',
  lang_zh: 'เปิดเนื้อจีน',
}
const hasSections = (s) => Array.isArray(s?.content?.arrangement) && s.content.arrangement.length > 1
// English / Chinese can only be switched on in a song that has it, so that is the base (พี่เอม 18 พ.ย. 2569)
const hasLang = (s, l) => !!s?.content && songLangs(s.content).includes(l)
export function features(bundle, songs) {
  let all = 0
  let sectioned = 0
  const withLang = { lang_en: 0, lang_zh: 0 }
  for (const [id, n] of opensBySong(bundle)) {
    all += n
    const s = songRow(songs, id)
    if (hasSections(s)) sectioned += n
    if (hasLang(s, 'en')) withLang.lang_en += n
    if (hasLang(s, 'zh')) withLang.lang_zh += n
  }
  const used = tally((bundle?.reports?.features || []).map(([[f], n]) => [f, n]))
  return Object.entries(FEATURE_NAMES)
    .map(([key, name]) => {
      const base = key === 'section' ? sectioned : key in withLang ? withLang[key] : all
      const n = used.get(key) || 0
      return { key, name, n, base, pct: Math.min(100, share(n, base)), low: base < LOW_BASE }
    })
    .sort((a, b) => b.pct - a.pct || b.n - a.n)
}

// stat.11 — ทางตัน
export const DEAD_END_NAMES = { sing_no_notes: 'เปิดฝึกร้อง แต่เพลงไม่มีโน้ต', sheet_no_chords: 'เปิดแผ่นเพลง แต่เพลงไม่มีคอร์ด' }
export function deadEnds(bundle, songs, limit = 5) {
  const rows = (bundle?.reports?.deadEnds || []).filter(([[kind]]) => DEAD_END_NAMES[kind])
  const kinds = tally(rows.map(([[kind], n]) => [kind, n]))
  const perSong = new Map()
  for (const [[kind, id], n] of rows) {
    if (!realValue(id)) continue
    const r = perSong.get(id) || { id, n: 0, kinds: new Set() }
    r.n += n
    r.kinds.add(kind)
    perSong.set(id, r)
  }
  return {
    total: [...kinds.values()].reduce((a, b) => a + b, 0),
    kinds: Object.entries(DEAD_END_NAMES).map(([key, name]) => ({ key, name, n: kinds.get(key) || 0 })),
    songs: [...perSong.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, limit)
      .map((r) => ({ id: r.id, n: r.n, song: songRow(songs, r.id), kinds: [...r.kinds].map((k) => DEAD_END_NAMES[k]) })),
  }
}

// stat.12 — มาถึงเพลงทางไหน
export const OPEN_FROM_NAMES = {
  number: 'พิมพ์เลขเพลง',
  text: 'พิมพ์ชื่อหรือเนื้อร้อง',
  book: 'เลือกจากเล่ม',
  fav: 'เพลงที่ชอบ',
  link: 'เปิดลิงก์ที่มีคนส่งมา',
  other: 'อื่น ๆ',
}
export function openFrom(bundle) {
  const m = tally((bundle?.reports?.openFrom || []).filter(([[k]]) => OPEN_FROM_NAMES[k]).map(([[k], n]) => [k, n]))
  const total = [...m.values()].reduce((a, b) => a + b, 0)
  return {
    total,
    low: total < LOW_BASE,
    rows: Object.entries(OPEN_FROM_NAMES)
      .map(([key, name]) => ({ key, name, n: m.get(key) || 0, pct: share(m.get(key) || 0, total) }))
      .filter((r) => r.n || r.key !== 'other'),
  }
}

// stat.13 — เครื่องที่ใช้: device and phone system, each split web / app
const DEVICE_NAMES = { mobile: 'มือถือ', tablet: 'แท็บเล็ต', desktop: 'คอม' }
const osName = (os) => (/^ios$|ipados/i.test(os) ? 'ไอโฟน ไอแพด' : /android/i.test(os) ? 'แอนดรอยด์' : 'อื่น ๆ')
export function devices(bundle) {
  const rows = (bundle?.reports?.devices || []).filter(([d]) => d[2] === 'web' || d[2] === 'app')
  const total = rows.reduce((t, [, n]) => t + n, 0)
  const split = (nameOf, order) => {
    const m = new Map()
    for (const [d, n] of rows) {
      const k = nameOf(d)
      const r = m.get(k) || { name: k, n: 0, web: 0, app: 0 }
      r.n += n
      r[d[2]] += n
      m.set(k, r)
    }
    return order.filter((k) => m.get(k)).map((k) => ({ ...m.get(k), pct: share(m.get(k).n, total), appPct: share(m.get(k).app, m.get(k).n) }))
  }
  return {
    total,
    low: total < LOW_BASE,
    devices: split((d) => DEVICE_NAMES[d[0]] || 'อื่น ๆ', ['มือถือ', 'แท็บเล็ต', 'คอม', 'อื่น ๆ']),
    systems: split((d) => osName(d[1]), ['ไอโฟน ไอแพด', 'แอนดรอยด์', 'อื่น ๆ']),
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// พี่เอม 18 พ.ย. 2569 — "พี่เปาชอบมาก ... ทำให้ดีกว่านี้อีกได้ไหม". New counts (lib/analytics.js trackAction,
// noteVisit, lang_* / font_*), the songs behind them, one line of advice per section, and a short summary
// to send on. All of it reads the reports the page already gets; `featureSongs` (which song a star or an
// English switch was for) arrives only once the updated ga-stats is pasted into Supabase — until then
// those lists are simply left out.
// ════════════════════════════════════════════════════════════════════════════════════════════
export const ACTION_NAMES = {
  star: 'กดดาวเก็บเพลงไว้',
  fav_send: 'ส่งรายการเพลงที่ชอบให้คนอื่น',
  fav_take: 'กดเก็บรายการที่คนอื่นส่งมา',
  share_song: 'ส่งลิงก์เพลง',
  share_site: 'ส่งลิงก์เว็บ',
  font_up: 'ขยายตัวหนังสือ',
  font_down: 'ลดตัวหนังสือ',
}
const featureCounts = (bundle) => tally((bundle?.reports?.features || []).map(([[f], n]) => [f, n]))

export function actions(bundle) {
  const m = featureCounts(bundle)
  const rows = Object.entries(ACTION_NAMES).map(([key, name]) => ({ key, name, n: m.get(key) || 0 }))
  return { total: rows.reduce((t, r) => t + r.n, 0), rows }
}

// new or coming back — once a day per device (analytics.noteVisit)
export function visitors(bundle) {
  const m = featureCounts(bundle)
  const fresh = m.get('visit_new') || 0
  const back = m.get('visit_back') || 0
  return { fresh, back, total: fresh + back, backPct: share(back, fresh + back), low: fresh + back < LOW_BASE }
}

// which songs got the most stars / English / Chinese — needs the featureSongs report
export function featureSongs(bundle, songs, feature, limit = 5) {
  const rows = bundle?.reports?.featureSongs
  if (!rows) return null
  return [...tally(rows.filter(([[f, id]]) => f === feature && realValue(id)).map(([[, id], n]) => [id, n]))]
    .sort(byCount)
    .map(([id, n]) => ({ id, n, song: songRow(songs, id) }))
    .filter((r) => !removed(r.song))
    .slice(0, limit)
}

const nameOf = (s) => (s ? `${s.number != null ? s.number + '. ' : ''}${s.title_th || ''}` : '')

// one line per section: what the numbers say and what to do about it. null = nothing worth saying yet.
export function advice({ ov, cards, work }) {
  const out = { overview: null, songs: null, app: null, more: null }
  if (ov) {
    if (ov.change != null && ov.change >= 10) out.overview = `คนใช้มากขึ้น ${ov.change}% ⇒ ช่องทางที่คนมาถึงเว็บมากที่สุด คือที่ควรส่งลิงก์ต่อ`
    else if (ov.change != null && ov.change <= -10) out.overview = `คนใช้น้อยลง ${-ov.change}% ⇒ ลองส่งลิงก์เพลงที่ร้องสัปดาห์นี้ในกลุ่มไลน์ของโบสถ์`
    else if (ov.busiest) out.overview = `คนใช้มากที่สุดช่วง${ov.busiest} ⇒ ถ้าจะลงเพลงใหม่ ลงให้เสร็จก่อนช่วงนี้`
  }
  if (!out.songs && work && work.pending > 0 && !cards) out.songs = `มีงานรอตรวจ ${work.pending} เพลง ⇒ ตรวจให้เสร็จก่อนพิมพ์เพลงใหม่`
  if (cards) {
    const nf = cards.notFound?.rows?.[0]
    const fix = cards.fix?.[0]
    if (nf && nf.notFound >= 2) out.songs = `คนค้น "${nf.term}" แล้วไม่เจอ ${nf.notFound} ครั้ง ⇒ เพิ่มเพลงนี้ หรือใส่ชื่ออื่นของเพลงให้ค้นเจอ`
    else if (fix) out.songs = `เพลง ${nameOf(fix.song)} คนเปิดบ่อย แต่ยังไม่มี${fix.missing.join('และ')} ⇒ ทำเพลงนี้ก่อน`
    else if (work && work.pending > 0) out.songs = `มีงานรอตรวจ ${work.pending} เพลง ⇒ ตรวจให้เสร็จก่อนพิมพ์เพลงใหม่`

    const dead = cards.dead?.songs?.[0]
    const usable = (cards.features || []).filter((f) => !f.low && !['lang_en', 'lang_zh'].includes(f.key))
    const least = usable.length ? usable[usable.length - 1] : null
    if (dead && dead.n >= 3) out.app = `เพลง ${nameOf(dead.song)} มีคนเปิดแล้วติด ${dead.n} ครั้ง (${dead.kinds.join(' · ')}) ⇒ เติมเพลงนี้ก่อน`
    else if (least && least.pct < 5) out.app = `ปุ่ม "${least.name}" แทบไม่มีคนใช้ (${least.pct}%) ⇒ อาจหายาก หรือไม่มีใครต้องการ`
    else if (cards.from && !cards.from.low) {
      const top = [...cards.from.rows].sort((a, b) => b.pct - a.pct)[0]
      if (top) out.app = `คนหาเพลงด้วยวิธี "${top.name}" มากที่สุด (${top.pct}%) ⇒ ทางนี้ต้องใช้ง่ายที่สุด`
    }

    const v = cards.visitors
    const en = (cards.features || []).find((f) => f.key === 'lang_en')
    if (v && !v.low) out.more = `คนที่กลับมาใช้ซ้ำ ${v.backPct}% ⇒ ${v.backPct >= 50 ? 'คนใช้ประจำมีมาก ของใหม่ควรบอกผ่านหน้าเว็บ' : 'คนใหม่ยังมาก ทำให้คนใหม่หาเพลงแรกเจอง่าย ๆ'}`
    else if (en && !en.low) out.more = `เพลงที่มีเนื้ออังกฤษ คนเปิดอังกฤษ ${en.pct}% ⇒ ${en.pct >= 10 ? 'คุ้มที่จะทำเล่มอื่นเป็นอังกฤษต่อ' : 'ยังไม่ต้องรีบทำเล่มอื่นเป็นอังกฤษ'}`
  }
  return out
}

// a few lines to paste into LINE for พี่เปา — the same numbers as the page, nothing new
export function summaryText({ days, label, ov, cards, work, tips }) {
  const lines = [`สรุปการใช้เว็บเพลง ${label || days + ' วัน'}`]
  if (ov) {
    const chg = ov.change != null ? ` (${ov.change >= 0 ? '+' : ''}${ov.change}% จากช่วงก่อน)` : ''
    lines.push(`- คนใช้ ${ov.users.toLocaleString('th-TH')} คน${chg} · เปิดจากแอป ${ov.appShare ?? 0}%`)
  }
  if (cards?.top?.length) lines.push(`- เพลงที่เปิดมากสุด: ${cards.top.slice(0, 3).map((r) => nameOf(r.song) || 'เพลงที่ลบแล้ว').join(' · ')}`)
  if (cards?.notFound?.rows?.length) lines.push(`- คำที่ค้นแล้วไม่เจอ: ${cards.notFound.rows.slice(0, 3).map((r) => `"${r.term}"`).join(' · ')}`)
  if (cards?.visitors?.total) lines.push(`- เครื่องใหม่ ${cards.visitors.fresh} เครื่อง · กลับมาใช้ซ้ำ ${cards.visitors.back} ครั้ง`)
  if (cards?.actions?.total) {
    const a = Object.fromEntries(cards.actions.rows.map((r) => [r.key, r.n]))
    lines.push(`- กดดาว ${a.star} ครั้ง · ส่งลิงก์เพลง ${a.share_song} ครั้ง · ส่งรายการเพลง ${a.fav_send} ครั้ง`)
  }
  if (work) lines.push(`- งานค้าง: ร่าง ${work.draft} · รอตรวจ ${work.pending}`)
  const t = Object.values(tips || {}).filter(Boolean)
  if (t.length) lines.push('ควรทำต่อ:', ...t.map((x) => '- ' + x))
  return lines.join('\n')
}
