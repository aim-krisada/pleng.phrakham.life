// DIAGNOSTIC ONLY — the AT-RISK population: audible ornaments that land in a melodic gap just
// before a melody attack. Pitch is chosen by the CHORD alone, so any chord edit can flip one of
// these into an exact duplicate of the coming note (the เพลง 33 symptom).
import fs from 'node:fs'
import { perfOf } from './diag-chord-playback.mjs'
const LOOK = 2.0, AUD = 0.12
const songs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
let n=0, risk=0, exact=0, semitone=0, tone=0, oct=0
const riskSongs=new Set(), clashSongs=new Set()
for (const s of songs) {
  if (!s.content?.stanzas && !s.content?.lines) continue
  let r; try { r = perfOf(s.content, s.id) } catch { continue }
  n++
  const mel = r.perf.filter(e=>e.role==='melody').sort((a,b)=>a.startBeat-b.startBeat)
  for (const e of r.perf.filter(e=>e.role==='emb')) {
    const nxt = mel.find(m=>m.startBeat > e.startBeat+1e-9); if (!nxt) continue
    if (nxt.startBeat-e.startBeat > LOOK || e.gain < AUD) continue
    if (mel.some(m=>e.startBeat>=m.startBeat-1e-9 && e.startBeat<m.startBeat+m.beats-1e-9)) continue
    risk++; riskSongs.add(s.number)
    const d = Math.abs(e.midi-nxt.midi), pc = ((e.midi-nxt.midi)%12+12)%12
    if (d===0) exact++
    else if (pc===0) oct++
    else if (d%12===1||d%12===11) { semitone++; clashSongs.add(s.number) }
    else if (d%12===2||d%12===10) tone++
  }
}
console.log(`เพลง ${n}`)
console.log(`ประดับที่ "เสี่ยง" (ดังพอ + ลงในช่องว่าง ≤${LOOK} บีตก่อนหัวโน้ตทำนอง): ${risk} จุด ใน ${riskSongs.size} เพลง (${(riskSongs.size/n*100).toFixed(1)}%)`)
console.log(`  ในนั้น: ซ้ำเป๊ะ ${exact} · คู่แปด ${oct} · ห่างครึ่งเสียง ${semitone} (กัดกัน) · ห่างหนึ่งเสียง ${tone}`)
console.log(`เพลงที่มีประดับกัดครึ่งเสียงกับโน้ตที่กำลังจะร้อง: ${clashSongs.size} เพลง — ${[...clashSongs].sort((a,b)=>a-b).join(', ')}`)
