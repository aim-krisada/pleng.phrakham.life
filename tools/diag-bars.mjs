// ONE bar model, replacing the two that disagreed (the library sweep said 12 songs, the per-bar
// locator said 15, and they overlapped on only 5). Each of the three known causes is a separate,
// switchable rule so the effect of each can be measured on its own instead of all at once.
//
//   run: node tools/diag-bars.mjs <songs.json> [--only=N] [--no-R1] [--no-R2] [--no-R3] [--list]
//
// READ-ONLY: reads a cached snapshot, never the DB, never writes song data.
import { readFileSync } from 'node:fs'
import { beatCount, parseNotes, expectedBeats } from '../src/lib/notation.js'
import { resolveContent } from '../src/lib/songModel.js'

const args = process.argv.slice(2)
const songsPath = args[0]
const only = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1]
// R1 — join a line's trailing part-bar with the next line's leading part-bar when the two make
// exactly one bar. NOT "a line never closes a bar": that was tried and flagged all 168 songs,
// which proves the data's printed lines DO close their last bar (no trailing bar-line item), and
// only SOME of them wrap. So the wrap has to be detected by the halves adding up, not assumed.
const R1 = !args.includes('--no-R1')
const R2 = !args.includes('--no-R2') // a declared ห้องยก, and the song's own first/last bar, may be short
const R3 = !args.includes('--no-R3') // a shared ท่อน must be off in EVERY verse that sings it
const wantList = args.includes('--list')
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))
const rnd = (x) => Math.round(x * 1000) / 1000
const near = (a, b) => Math.abs(a - b) < 1e-6

// Every bar of a song, in the order it is played, each tagged with where it sits on the sheet.
//
// R1 is the rule the two old tools got wrong in opposite ways. A printed line does NOT close a
// bar — the sheet wraps mid-bar constantly, so a bar can begin on one line and finish on the next.
// Splitting the item stream ONLY at bar lines makes wrapped bars whole by construction, instead of
// reporting each half and then trying to stitch them back together with neighbour checks.
export function barsOf(content) {
  const exp = expectedBeats(content.timeSignature)
  const lines = Array.isArray(content.lines) && content.lines.length ? content.lines : resolveContent(content)
  const bars = []
  let cur = null
  const open = (li, line) => ({
    stanza: line._stanza ?? '?', lineNo: (line._stanzaLine ?? li) + 1, li,
    notes: [], beats: 0, pickup: false, barNo: 0,
  })
  const close = () => { if (cur && cur.notes.length) bars.push(cur); cur = null }
  lines.forEach((line, li) => {
    for (const it of line || []) {
      if (!cur) cur = open(li, line)
      if (it.type === 'bar') { close(); continue }
      if (it.type === 'pickup') { cur.pickup = true; continue }
      if (it.type !== 'segment' || !it.note) continue
      cur.notes.push(it.note)
      cur.beats += beatCount(parseNotes(it.note))
    }
    close() // a printed line closes its last bar — the data has no trailing bar-line item
    if (li < lines.length - 1) bars.push({ lineEnd: true })
  })
  close()
  // R1: stitch a wrapped bar back together. Only across a line break, and only when the two parts
  // make exactly one bar — a pair that doesn't add up is a real anomaly and must stay visible.
  const stitched = []
  let prev = null
  let atLineEnd = false
  for (const b of bars) {
    if (b.lineEnd) { atLineEnd = true; continue }
    if (prev) {
      if (R1 && atLineEnd && exp && prev.beats < exp - 1e-6 && near(prev.beats + b.beats, exp)) {
        stitched.push({ ...prev, beats: exp, wrapped: true, notes: [...prev.notes, ...b.notes] })
        prev = null
        atLineEnd = false
        continue
      }
      stitched.push(prev)
    }
    prev = b
    atLineEnd = false
  }
  if (prev) stitched.push(prev)
  bars.length = 0
  bars.push(...stitched)
  // number the bars within their own printed line, which is how the sheet reads
  const perLine = {}
  for (const b of bars) { perLine[b.li] = (perLine[b.li] || 0) + 1; b.barNo = perLine[b.li] }
  for (const b of bars) b.ofBars = perLine[b.li]
  return { bars, exp }
}

// Bars whose written beats don't match the meter.
export function offBarsOf(content) {
  const { bars, exp } = barsOf(content)
  if (!exp || !bars.length) return []
  const judged = bars.map((b, i) => {
    let off = !near(b.beats, exp)
    if (R2 && b.pickup && b.beats < exp) off = false          // declared ห้องยก
    if (R2 && (i === 0 || i === bars.length - 1) && b.beats < exp) off = false // song's own opening/closing bar
    return { ...b, off }
  })
  if (!R3) return judged.filter((b) => b.off)
  // A ท่อน sung by several verses appears once per verse. Keep a bar only when it is off in EVERY
  // occurrence — otherwise one verse's neighbouring context can make a sound bar look broken.
  const tally = new Map()
  for (const b of judged) {
    const k = `${b.stanza}|${b.lineNo}|${b.barNo}`
    const t = tally.get(k) || { off: 0, total: 0, b }
    t.total++
    if (b.off) t.off++
    tally.set(k, t)
  }
  return [...tally.values()].filter((t) => t.off === t.total && t.off > 0).map((t) => t.b)
}

if (songsPath) {
  let n = 0
  const hits = []
  for (const s of songs) {
    if (only && String(s.number) !== String(only)) continue
    const c = s.content || {}
    if (!expectedBeats(c.timeSignature)) continue
    const off = offBarsOf(c)
    if (!off.length) continue
    n++
    hits.push(s.number ?? `id:${s.id}`)
    if (!wantList) continue
    console.log(`\n#${s.number ?? '(ไม่มีเลข)'} ${s.title_th}  [${c.timeSignature} → ห้องละ ${expectedBeats(c.timeSignature)} จังหวะ]  (id ${s.id})`)
    for (const b of off) {
      console.log(`  ท่อน ${b.stanza} · บรรทัดที่ ${b.lineNo} · ห้องที่ ${b.barNo}/${b.ofBars}`)
      console.log(`      ได้ ${rnd(b.beats)} (${b.beats > expectedBeats(c.timeSignature) ? '+' : ''}${rnd(b.beats - expectedBeats(c.timeSignature))})   โน้ตในห้อง: ${b.notes.join('  ')}`)
    }
  }
  if (!wantList) console.log(`R1=${R1} R2=${R2} R3=${R3} → ${n} เพลง: ${hits.join(' ')}`)
}
