// DIAGNOSTIC ONLY (read-only · no DB write, no fix) — "the ornament sings the next melody note early".
//
// อาการที่พี่เปาชี้ในเพลง 33: ประดับ (role 'emb' · ส่วนใหญ่คือ sparkle) ลงในช่องว่างก่อนโน้ตทำนอง
// ตัวถัดไป **ด้วยเสียงเดียวกับโน้ตนั้น** และดังเกือบเท่าทำนอง → หูได้ยินเป็น "ทำนองเกินมา 1 ตัว".
// refereeNoClash ปล่อยผ่านเพราะมันเช็คแค่ "ห่างจากหัวโน้ต ≥ 0.4 บีต" ไม่เช็คว่า *เสียงซ้ำ* หรือไม่.
//
// ต่างจาก tools/diag-comp-doubles-melody.mjs (เส้นฐาน 7.3%) ซึ่งนับเฉพาะโน้ตคลอที่ดัง
// **ขณะทำนองกำลังดังอยู่** — ประดับที่ลงในช่วงพัก/ช่องว่างไม่ถูกนับเลย = คนละตัววัด คนละบั๊ก.
//
//   run: node tools/diag-emb-preechoes-melody.mjs <songs.json>
import fs from 'node:fs'
import { perfOf } from './diag-chord-playback.mjs'

const LOOKAHEAD = 2.0 // beats: an ornament this close before an attack is heard as an anacrusis
const AUDIBLE = 0.12 // gain floor: below this it reads as texture, not a note

const songs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
let nSongs = 0, nEmb = 0, nExact = 0, nOctave = 0
const hits = []
const byTs = new Map()

for (const s of songs) {
  const c = s.content
  if (!c || !(c.stanzas || c.lines)) continue
  let r
  try { r = perfOf(c, s.id) } catch { continue }
  nSongs++
  const ts = String(c.timeSignature ?? '4/4')
  if (!byTs.has(ts)) byTs.set(ts, { songs: 0, emb: 0, exact: 0, octave: 0 })
  const t = byTs.get(ts); t.songs++

  const mel = r.perf.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  const emb = r.perf.filter((e) => e.role === 'emb')
  nEmb += emb.length; t.emb += emb.length
  let songExact = 0
  for (const e of emb) {
    // the next melody ATTACK strictly after this ornament
    const nxt = mel.find((m) => m.startBeat > e.startBeat + 1e-9)
    if (!nxt) continue
    const lead = nxt.startBeat - e.startBeat
    if (lead > LOOKAHEAD) continue
    if (e.gain < AUDIBLE) continue
    // is the ornament ALREADY sounding on top of a melody note? then it's the 7.3% case, not ours
    const covered = mel.some((m) => e.startBeat >= m.startBeat - 1e-9 && e.startBeat < m.startBeat + m.beats - 1e-9)
    if (covered) continue
    if (e.midi === nxt.midi) { nExact++; t.exact++; songExact++; hits.push({ n: s.number, title: s.title_th, ts, beat: e.startBeat, midi: e.midi, lead, gain: e.gain, mel: nxt.gain }) }
    else if (((e.midi - nxt.midi) % 12 + 12) % 12 === 0) { nOctave++; t.octave++ }
  }
  if (songExact) { /* counted below */ }
}

const songsHit = new Set(hits.map((h) => h.n))
console.log(`เพลงที่รันได้: ${nSongs}   ประดับ (emb) ทั้งหมด: ${nEmb}`)
console.log(`\n== เกณฑ์: ประดับลงในช่องว่าง ≤${LOOKAHEAD} บีตก่อนหัวโน้ตทำนองตัวถัดไป · gain ≥ ${AUDIBLE} ==`)
console.log(`เสียงเดียวกันเป๊ะ (= อาการเพลง 33): ${nExact} ครั้ง ใน ${songsHit.size} เพลง  (${(songsHit.size / nSongs * 100).toFixed(1)}% ของคลัง)`)
console.log(`ห่างกันคู่แปด (อาการอ่อนกว่า):      ${nOctave} ครั้ง`)

console.log(`\n== แยกตาม time signature ==`)
console.log('ts     เพลง   emb   ซ้ำเป๊ะ  คู่แปด')
for (const [ts, v] of [...byTs].sort((a, b) => b[1].exact - a[1].exact)) {
  console.log(`${ts.padEnd(6)} ${String(v.songs).padStart(4)} ${String(v.emb).padStart(6)} ${String(v.exact).padStart(7)} ${String(v.octave).padStart(7)}`)
}

console.log(`\n== ทุกจุดที่เข้าเกณฑ์ (เรียงตามเพลง) ==`)
for (const h of hits.sort((a, b) => a.n - b.n || a.beat - b.beat)) {
  console.log(`  เพลง ${String(h.n).padStart(3)} ${String(h.title || '').slice(0, 22).padEnd(24)} ${h.ts.padEnd(5)} beat ${h.beat.toFixed(2).padStart(7)}  midi ${h.midi}  นำหน้า ${h.lead.toFixed(2)} บีต  gain ${h.gain.toFixed(3)} / ทำนอง ${h.mel.toFixed(3)}`)
}
