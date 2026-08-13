// ใบ #12 — เทียบ "ภาระงาน" ของสองเพลงด้วยตัวเลข (ทำไม 141 เพี้ยน แต่ 1 ไม่เพี้ยน)
//
// เปิดของจริงจาก Supabase แล้วเดินผ่าน seam เดียวกับที่ SongViewer ใช้ตอนกดฟัง:
//   buildPlayNotes → buildChordVoice → arrange()   (คีย์/preset/ลูกเล่น = ค่าเริ่มต้นของหน้าฝึกร้อง)
// จึงได้ตัวเลขที่ตรงกับสิ่งที่คนฟังได้ยินจริง ⛔ ไม่ใช่ตัวเลขจากแผ่นโน้ตดิบ
//
//   run:  node tools/audit-song-load.mjs 1 141      เทียบเฉพาะเพลงที่ระบุ (ละเอียด)
//         node tools/audit-song-load.mjs --ทั้งหมด   ทั้งคลัง เรียงจากหนักสุด (ตารางสรุป)
//
// อ่านอย่างเดียว ใช้กุญแจสาธารณะที่เว็บใช้อยู่แล้ว ⛔ ไม่เขียนฐานข้อมูล
import { buildPlayNotes, buildChordVoice, resolveSections, KEY_MIDI } from '../src/lib/midi.js'
import { resolveContent, resolvePlayOrder } from '../src/lib/songModel.js'
import { arrange } from '../src/lib/arranger/index.js'
import { moduleForInstrument } from '../src/lib/arranger/instruments/index.js'
import { presetCfg, recommendRecipe, songFeatures } from '../src/lib/arranger/presets.js'
import { buildArrangeCfg } from '../src/lib/arranger/techniques.js'

const KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'
const args = process.argv.slice(2)
const ทั้งหมด = args.includes('--ทั้งหมด') || args.includes('--all')
const nums = args.filter((a) => !a.startsWith('--')).map(Number)
const เลือก = nums.length ? nums : [1, 141]
const base = 'https://vlpuvaofbzdawgjjpgfu.supabase.co/rest/v1/songs?select=id,number,title_th,category,content&order=number'
const url = ทั้งหมด ? base : `${base}&number=in.(${เลือก.join(',')})`
const res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`)
const songs = (await res.json()).filter((s) => s.content).sort((a, b) => a.number - b.number)

const rows = []
for (const s of songs) {
  const c = s.content
  if (!c) continue
  const playable = { ...c, lines: resolveContent(c) }
  const order = resolvePlayOrder(c) ?? undefined
  const notes = buildPlayNotes(playable, { order })
  const bpm = Number(c.bpm) || 92
  const spb = 60 / bpm
  const sec = notes.reduce((t, n) => t + n.beats, 0) * spb
  const chords = buildChordVoice(notes)
  // ค่าเริ่มต้นของหน้าฝึกร้อง: เปียโน Grand · เดี่ยว · รวม(ทำนอง+คอร์ด) · สไตล์ตามจังหวะเพลง (styleAuto)
  const recipe = recommendRecipe(songFeatures(c))
  const cfg = { ...buildArrangeCfg(presetCfg(recipe), {}), sparkleLevel: 0.7 }
  const perf = arrange(notes, chords, { arranger: true, voices: 'both', chordGain: 0.09, ...cfg, module: moduleForInstrument('grand') },
    { songId: s.id, pass: 0, timeSignature: c.timeSignature, keyRoot: KEY_MIDI[c.key] ?? 60, sections: resolveSections(playable, notes) })

  // จังหวะที่ถูกนัด: humanize ขยับหัวโน้ตไปเท่าไร และมีช่วงไหนห่างผิดกริดเกิน 10% บ้าง
  const mel = perf.filter((e) => e.role === 'melody')
    .map((e) => ({ grid: e.startBeat * spb, real: e.startBeat * spb + (e.timeShift || 0), shift: (e.timeShift || 0) * 1000 }))
    .sort((a, b) => a.grid - b.grid)
  const shifts = mel.map((m) => m.shift)
  const sd = Math.sqrt(shifts.reduce((a, b) => a + b * b, 0) / shifts.length)
  let offGrid = 0
  for (let i = 1; i < mel.length; i++) {
    const want = mel[i].grid - mel[i - 1].grid
    if (want > 0 && Math.abs(((mel[i].real - mel[i - 1].real) - want) / want) > 0.1) offGrid++
  }

  // เสียงที่ดังพร้อมกัน (ห่าง <30ms) ที่ห่างกันครึ่งเสียง = คู่ที่ฟังแล้ว "กัด" · และ polyphony สูงสุด
  const ev = perf.map((e) => ({ t: e.startBeat * spb + (e.timeShift || 0), m: e.midi })).sort((a, b) => a.t - b.t)
  let semitoneClash = 0
  for (let i = 0; i < ev.length; i++) {
    for (let j = i + 1; j < ev.length && ev[j].t - ev[i].t < 0.03; j++) if (Math.abs(ev[j].m - ev[i].m) === 1) semitoneClash++
  }
  let maxPoly = 0
  const act = []
  for (const e of perf.slice().sort((a, b) => a.startBeat - b.startBeat)) {
    const st = e.startBeat * spb + (e.timeShift || 0)
    while (act.length && act[0] < st) act.shift()
    act.push(st + e.beats * spb)
    act.sort((a, b) => a - b)
    if (act.length > maxPoly) maxPoly = act.length
  }

  const roles = {}
  for (const e of perf) roles[e.role] = (roles[e.role] || 0) + 1
  // ⚠️ เลขเพลงซ้ำข้ามเล่มได้ (เลข 8 มีทั้งใน lem-yai และ anuchon) ⇒ ต้องพิมพ์เล่มคู่กับเลขเสมอ
  // ไม่งั้นตารางจะอ่านเหมือนเป็นเพลงเดียวกัน · ตารางเพลงมีคอลัมน์ duplicate_ok รองรับเรื่องนี้อยู่แล้ว
  rows.push({ num: s.number, เล่ม: s.category || '?', title: s.title_th, ts: c.timeSignature, key: c.key, bpm, recipe,
    strophic: !!order, notes: notes.length, chords: chords.length, sec: +sec.toFixed(1),
    perf: perf.length, perSec: +(perf.length / sec).toFixed(2), roles, sdMs: +sd.toFixed(1),
    offGrid, semitoneClash, maxPoly })
}

// โหมดทั้งคลัง — ตารางสรุปเรียงจากหนักสุด ⇒ ตอบว่า "เพลงไหนกดดันเครื่องมากที่สุด"
// เกณฑ์เรียง = เหตุการณ์เสียงต่อวินาที เพราะนั่นคือของที่ต้องนัดทันภายในระยะเผื่อของตัวจัดคิว
// (ความยาวไม่ทำให้แน่นขึ้น มันแค่เพิ่มโอกาสไปเจอจังหวะที่เครื่องสะดุด — จึงพิมพ์ทั้ง 2 ค่า)
if (ทั้งหมด) {
  const เรียง = [...rows].sort((a, b) => b.perSec - a.perSec)
  console.log(`ตรวจ ${rows.length} เพลงที่เผยแพร่แล้ว · เรียงจากเหตุการณ์เสียงต่อวินาทีมากไปน้อย\n`)
  console.log('  เพลง | เล่ม     | ต่อวิ | เหตุ | ยาว(s) | โน้ต | คอร์ด | พร้อมกัน | กัด |')
  console.log('-------|----------|-------|------|--------|------|-------|----------|-----|-------------------')
  for (const r of เรียง) {
    console.log(
      `  ${String(r.num).padStart(4)} | ${String(r.เล่ม).padEnd(8)} | ${String(r.perSec).padStart(5)} | ${String(r.perf).padStart(4)} | ` +
      `${String(r.sec).padStart(6)} | ${String(r.notes).padStart(4)} | ${String(r.chords).padStart(5)} | ` +
      `${String(r.maxPoly).padStart(8)} | ${String(r.semitoneClash).padStart(3)} | ${r.title}`)
  }
  const p = (k) => [...rows].map((r) => r[k]).sort((a, b) => a - b)
  const q = (a, f) => a[Math.floor(f * (a.length - 1))]
  const ps = p('perSec'), sc = p('sec')
  console.log(`\nเหตุการณ์ต่อวินาที: กลาง ${q(ps, 0.5)} · บนสุด 10% ${q(ps, 0.9)} · สูงสุด ${q(ps, 1)}`)
  console.log(`ความยาว(s):        กลาง ${q(sc, 0.5)} · บนสุด 10% ${q(sc, 0.9)} · สูงสุด ${q(sc, 1)}`)
  const กัด = rows.filter((r) => r.semitoneClash > 0)
  // ⚠️ ตัวเลขนี้เป็น "จุดให้ไปฟัง" ⛔ ไม่ใช่คำตัดสินว่าเพราะหรือไม่เพราะ — โน้ตผ่านที่ห่างครึ่งเสียง
  // จากคอร์ดที่ค้างอยู่ เป็นของปกติในดนตรีจริง · ต้องเปิดฟังเองก่อนถึงจะบอกได้ว่าอันไหนกัดจริง
  const หนักสุด = [...กัด].sort((a, b) => b.semitoneClash - a.semitoneClash).slice(0, 10)
  console.log(`เพลงที่มีคู่เสียงดังพร้อมกันแล้วห่างครึ่งเสียง: ${กัด.length}/${rows.length} เพลง` +
    (กัด.length ? ` · 10 อันดับแรก ⇒ ${หนักสุด.map((r) => `${r.num}/${r.เล่ม}(${r.semitoneClash})`).join(' ')}` : ' ⇒ ไม่มี'))
  process.exit(0)
}

for (const r of rows) {
  console.log(`\n=== เพลง ${r.num} — ${r.title} ===`)
  console.log(`  ${r.ts} · คีย์ ${r.key} · bpm ${r.bpm} · สไตล์ที่เว็บเลือกให้ ${r.recipe} · ร้องซ้ำทุกข้อ ${r.strophic}`)
  console.log(`  โน้ต ${r.notes} · คอร์ด ${r.chords} · ความยาว ${r.sec}s`)
  console.log(`  เหตุการณ์เสียงจริง ${r.perf} (${JSON.stringify(r.roles)}) ⇒ ${r.perSec}/วินาที · เสียงค้างพร้อมกันสูงสุด ${r.maxPoly}`)
  console.log(`  จังหวะ: humanize sd ${r.sdMs}ms · ช่วงที่ห่างผิดกริดเกิน 10% = ${r.offGrid} · คู่เสียงห่างครึ่งเสียง = ${r.semitoneClash}`)
}

if (rows.length === 2) {
  const [b, a] = rows
  const f = (x, y) => `${x} vs ${y} (×${(x / y).toFixed(2)})`
  console.log(`\n=== เพลง ${a.num} เทียบเพลง ${b.num} ===`)
  console.log(`  โน้ต ${f(a.notes, b.notes)} · คอร์ด ${f(a.chords, b.chords)} · ความยาว ${f(a.sec, b.sec)}`)
  console.log(`  เหตุการณ์ทั้งเพลง ${f(a.perf, b.perf)} · ต่อวินาที ${f(a.perSec, b.perSec)}`)
}
