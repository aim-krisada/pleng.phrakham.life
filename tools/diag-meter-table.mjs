// The stress table PM asked for: for every time signature in the library, what the STANDARD
// says the bar looks like vs what the arranger actually does. Pure, READ-ONLY, no DB.
//   run: node tools/diag-meter-table.mjs <songs.json> <srcDir> [label]
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [songsPath, dir, label = dir] = process.argv.slice(2)
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))
const { metricAccent } = await import(pathToFileURL(`${dir}/src/lib/arranger/dynamics.js`).href)
// the standard lives in the new meter module; when the snapshot predates it, fall back to
// reading the standard from THIS worktree so the "should be" column is always the standard.
const { meterOf, stressAt } = await import(new URL('../src/lib/arranger/meter.js', import.meta.url).href)

// Mirror how the snapshot's OWN index.js feeds the dynamics layer, so the "ที่ arranger ทำจริง"
// column is that snapshot's real behaviour and not this tool's idea of it:
//   - a snapshot WITH arranger/meter.js derives the bar from the meter and passes the meter down
//   - a snapshot WITHOUT it uses the time signature's numerator and passes no meter
let snapMeter = null
try { snapMeter = (await import(pathToFileURL(`${dir}/src/lib/arranger/meter.js`).href)).meterOf } catch { snapMeter = null }
const asArranger = (ts) => (snapMeter
  ? { bpb: snapMeter(ts).barBeats, meter: snapMeter(ts) }
  : { bpb: (parseInt(ts, 10) > 0 ? parseInt(ts, 10) : 4), meter: null })

const counts = {}
for (const s of songs) {
  const ts = s.content?.timeSignature || '(none)'
  counts[ts] = (counts[ts] || 0) + 1
}
// a few signatures the library does NOT have yet, so the rule is checked beyond today's data
const extra = ['9/8', '5/4', '7/8', '2/2']
const list = [...Object.keys(counts).filter((t) => t !== '(none)'), ...extra]

const SYM = { strong: 'S', medium: 'M', weak: 'w', off: '·' }
console.log(`ตารางน้ำหนักจังหวะ — ${label}`)
console.log('(S = ต้นห้อง/หนัก · M = หนักรอง · w = เบา · · = ระหว่างจังหวะ · ต่อ 1 ห้อง ทีละครึ่งจังหวะ)')
console.log('')
console.log('ts     เพลง  ห้อง(ควอเตอร์)          ที่ควรเป็นตามมาตรฐาน            ที่ arranger ทำจริง             ตรงไหม')
for (const ts of list) {
  const m = meterOf(ts)
  const n = counts[ts] || 0
  const steps = []
  for (let b = 0; b < m.barBeats - 1e-9; b += 0.5) steps.push(b)
  const want = steps.map((b) => SYM[stressAt(m, b)]).join(' ')
  // what the arranger produces: run metricAccent over one bar and read the gains back
  const { bpb, meter } = asArranger(ts)
  const evs = steps.map((b) => ({ startBeat: b, gain: 1, role: 'inner' }))
  metricAccent(evs, bpb, meter)
  const got = evs.map((e) => {
    const g = Number(e.gain.toFixed(3))
    return g >= 0.92 ? 'S' : g >= 0.86 ? 'M' : g >= 0.82 ? 'w' : '·'
  }).join(' ')
  const ok = want === got
  console.log(`${ts.padEnd(6)} ${String(n).padStart(4)}  ${String(m.barBeats).padStart(4)} ${m.compound ? '(ผสม)' : '(ธรรมดา)'}`.padEnd(32)
    + want.padEnd(32) + got.padEnd(32) + (ok ? 'ตรง' : '❌'))
}
console.log('')
console.log('หมายเหตุ: 5/4 · 7/8 = จังหวะไม่สม่ำเสมอ มาตรฐานไม่ได้กำหนดการแบ่งกลุ่มตายตัว (3+2 หรือ 2+3)')
console.log('          → เรากำหนดแค่ต้นห้อง ไม่เดาว่าหนักรองอยู่ตรงไหน (ตั้งใจไม่เดา)')
