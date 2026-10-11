// ใบ v3/pleng#103 ข้อ 3 — วัดความแม่นของ "เคาะตามจังหวะ" ด้วยคนเคาะจำลอง
//
//   node tools/tap-accuracy.mjs            → the ticket's run: 6 taps, ±60 ms, 300 rounds
//   node tools/tap-accuracy.mjs 8 40 1000  → 8 taps, ±40 ms, 1000 rounds
//
// A simulated singer taps N times exactly on the beat, each tap landing up to JITTER ms early or
// late (uniform). We read the bpm back and record how far off it is. ก่อน = the algorithm that
// shipped with ใบ#102 (frozen copy below, so the "before" column keeps working after the fix);
// หลัง = whatever src/lib/tapTempo.js does today.
//
// Reference numbers (the ticket's case — อนุชน 33 is 3/4 at ♩=108):
//   ♩=108 · 6 taps · ±60 ms · 300 rounds →  ก่อน พลาดเฉลี่ย 2.3 มากสุด 15  ·  หลัง เฉลี่ย 1.3 มากสุด 4-5
// The random seed is fixed so the table is the same on every machine.
import { bpmFromTaps } from '../src/lib/tapTempo.js'

const TAPS = Number(process.argv[2]) || 6
const JITTER = Number(process.argv[3]) || 60
const ROUNDS = Number(process.argv[4]) || 300
const SEED = Number(process.argv[5]) || 103 // = เลขใบงาน
const TEMPOS = [60, 80, 92, 108, 120, 140]

// small deterministic rng so this table never moves
function rng(seed) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- ก่อน: the ใบ#102 algorithm, frozen ------------------------------------------------------
const TOLERANCE = 0.2
const MAX_SPREAD = 0.3
function bpmBefore(run) {
  const gaps = []
  for (let i = 1; i < run.length; i++) gaps.push(run[i] - run[i - 1])
  const s = gaps.slice().sort((a, b) => a - b)
  const mid = s.length % 2 ? s[s.length >> 1] : (s[(s.length >> 1) - 1] + s[s.length >> 1]) / 2
  if (!(mid > 0)) return null
  const kept = gaps.filter((g) => Math.abs(g - mid) <= mid * TOLERANCE)
  if (kept.length < 3) return null
  if ((Math.max(...kept) - Math.min(...kept)) / mid > MAX_SPREAD) return null
  return Math.round(60000 / (kept.reduce((a, b) => a + b, 0) / kept.length))
}

function measure(read) {
  const rows = []
  for (const bpm of TEMPOS) {
    const r = rng(SEED)
    const gap = 60000 / bpm
    let sum = 0
    let max = 0
    let n = 0
    let refused = 0
    for (let k = 0; k < ROUNDS; k++) {
      const run = []
      for (let i = 0; i < TAPS; i++) run.push(1000 + i * gap + (r() * 2 - 1) * JITTER)
      const got = read(run)
      if (got == null) { refused++; continue }
      const err = Math.abs(got - bpm)
      sum += err
      n += 1
      if (err > max) max = err
    }
    rows.push({ bpm, avg: n ? sum / n : NaN, max, refused })
  }
  return rows
}

const before = measure(bpmBefore)
const after = measure((run) => {
  const got = bpmFromTaps(run) // no meter, no song speed → the plain 4/4 reading
  return got.ok ? got.bpm : null
})

console.log(`เคาะ ${TAPS} ครั้ง · เพี้ยน ±${JITTER}ms · ${ROUNDS} รอบ (seed ${SEED})\n`)
console.log('ความเร็วจริง |      ก่อน: เฉลี่ย  มากสุด  ไม่ยอมอ่าน |      หลัง: เฉลี่ย  มากสุด  ไม่ยอมอ่าน')
let worstBefore = 0
let worstAfter = 0
for (let i = 0; i < TEMPOS.length; i++) {
  const b = before[i]
  const a = after[i]
  worstBefore = Math.max(worstBefore, b.max)
  worstAfter = Math.max(worstAfter, a.max)
  const f = (x) => String(x).padStart(6)
  console.log(
    `    ♩=${String(b.bpm).padEnd(4)} | ${f(b.avg.toFixed(2))} ${f(b.max)} ${f(b.refused)}        | ${f(a.avg.toFixed(2))} ${f(a.max)} ${f(a.refused)}`,
  )
}
console.log(`\nพลาดมากสุดตลอดตาราง — ก่อน ${worstBefore} · หลัง ${worstAfter}`)
