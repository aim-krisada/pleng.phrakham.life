// ใบ v3/pleng#102 ข้อ 7 — "เสียงที่เล่น ตรงกับเลขความเร็วที่ตั้งไว้ไหม"
//
// ตั้งเลขความเร็วหนึ่งค่า แล้ววัดว่าเพลงกินเวลาจริงเท่าไร เทียบกับเวลาที่ควรเป็นถ้าถือไม้นับจังหวะนับไปด้วย
// แล้วแยกให้เห็นว่าเวลาที่ต่างกันมาจากอะไรบ้าง
//
//   run:  node tools/measure-tempo.mjs anuchon 33            วัดด้วยความเร็วที่เก็บไว้ในคลัง
//         node tools/measure-tempo.mjs anuchon 33 --bpm 80   วัดด้วยความเร็วที่เราตั้งเอง
//         node tools/measure-tempo.mjs anuchon 33 --plain    ปิดลูกเล่นของเปียโนแล้ววัดใหม่
//
// เดินผ่าน seam เดียวกับตอนกดฟังในหน้าฝึกร้อง (resolveContent → resolvePlayOrder → buildPlayNotes →
// arrange) ⇒ เลขที่ได้คือเวลาที่เครื่องนัดเสียงจริง ⛔ ไม่ใช่เลขจากแผ่นโน้ตดิบ
//
// ⚠️ ขอบเขตของเครื่องมือนี้: มันวัด "เวลาที่เครื่องนัดให้เสียงดัง" (startBeat × วินาทีต่อจังหวะ +
// การขยับของลูกเล่น) ⛔ ไม่ได้อัดเสียงออกมาจับเวลาด้วยนาฬิกาจับเวลา — เพราะการนัดเสียงของ Web Audio
// อิงนาฬิกาของการ์ดเสียงซึ่งเที่ยงระดับตัวอย่างเสียง เวลาที่นัดไว้จึงคือเวลาที่ได้ยินจริง
// ⭐ อ่านอย่างเดียว ใช้กุญแจสาธารณะที่เว็บใช้อยู่แล้ว ⛔ ไม่เขียนฐานข้อมูล
import { buildPlayNotes, buildChordVoice, resolveSections, sectionBeatRanges, KEY_MIDI } from '../src/lib/midi.js'
import { resolveContent, resolvePlayOrder } from '../src/lib/songModel.js'
import { parseNotes, beatCount, expectedBeats } from '../src/lib/notation.js'
import { arrange } from '../src/lib/arranger/index.js'
import { moduleForInstrument } from '../src/lib/arranger/instruments/index.js'
import { presetCfg, recommendRecipe, songFeatures } from '../src/lib/arranger/presets.js'
import { buildArrangeCfg } from '../src/lib/arranger/techniques.js'

const KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'
const args = process.argv.slice(2)
const bpmArg = (() => { const i = args.indexOf('--bpm'); return i >= 0 ? Number(args[i + 1]) : null })()
const plain = args.includes('--ตรงโน้ต') || args.includes('--plain') // ปิดลูกเล่นของเปียโน
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--bpm')
const เล่ม = pos[0]
const เลข = Number(pos[1])
const ใช้ได้ = !!เล่ม && Number.isFinite(เลข)
if (!ใช้ได้) {
  console.error('⛔ ต้องบอกเล่มกับเลขเพลง เช่น  node tools/measure-tempo.mjs anuchon 33 --bpm 80')
  process.exitCode = 1
}

const url = `https://vlpuvaofbzdawgjjpgfu.supabase.co/rest/v1/songs?select=id,number,title_th,category,content&category=eq.${encodeURIComponent(เล่ม)}&number=eq.${เลข}`
const res = ใช้ได้ ? await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }) : null
if (res && !res.ok) {
  // ⛔ ห้าม `throw` ที่ระดับบนสุดของ ESM — node บน Windows กลบข้อความจริงแล้วคืน exit code ขยะ
  console.error(`⛔ ดึงเพลงจาก Supabase ไม่สำเร็จ — ${res.status}: ${(await res.text()).slice(0, 300)}`)
  process.exitCode = 1
}
const rows = res?.ok ? await res.json() : []
const s = rows.find((r) => r.content)
// ⭐ ป้อนของว่าง ต้องดัง ⛔ ไม่ใช่เงียบแล้วจบแบบสำเร็จ
if (ใช้ได้ && !s) {
  console.error(`⛔ ไม่เจอเพลงที่มีเนื้อ: ${เล่ม} ${เลข} — ยังไม่ได้วัดอะไรเลย ⛔ อย่าอ่านว่าปกติดี`)
  process.exitCode = 1
}

// ลอก ^ (เครื่องหมายหยุดค้าง) ออกจากสำเนาของเนื้อเพลง เพื่อหา "จังหวะตามค่าโน้ตล้วน ๆ"
// ⇒ ส่วนต่างระหว่างของจริงกับของที่ลอกแล้ว = เวลาที่หยุดค้างกินไป เป๊ะ ๆ ไม่ต้องเดา
function stripFermata(lines) {
  return (lines || []).map((line) => {
    const out = line.map((it) => (it?.type === 'segment' && it.note ? { ...it, note: String(it.note).replace(/\^/g, ''), holds: undefined } : it))
    if (line._key) out._key = line._key
    if (line._ts) out._ts = line._ts
    return out
  })
}

if (s) {
  const c = s.content
  const lines = resolveContent(c)
  const playable = { ...c, lines }
  const order = resolvePlayOrder(c) ?? undefined
  const notes = buildPlayNotes(playable, { order })
  const bare = buildPlayNotes({ ...c, lines: stripFermata(lines) }, { order })
  const bpm = bpmArg || Number(c.bpm) || 92
  const spb = 60 / bpm
  const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}`
  const n2 = (x) => x.toFixed(2)

  // ---- ห้องในแผ่นโน้ตครบจังหวะไหม (ถ้าไม่ครบ เวลาที่ "ควรเป็น" ก็เพี้ยนตั้งแต่ต้นทาง) ----
  const perBar = expectedBeats(c.timeSignature) ?? 4
  let bars = 0
  const barsOff = []
  for (const line of lines) {
    let cur = 0, has = false
    const flush = () => {
      if (has) { bars++; if (Math.abs(cur - perBar) > 1e-6) barsOff.push(+cur.toFixed(3)) }
      cur = 0; has = false
    }
    for (const it of line) {
      if (it.type === 'bar') { flush(); continue }
      if (it.type !== 'segment' || !it.note) continue
      cur += beatCount(parseNotes(it.note)); has = true
    }
    flush()
  }

  // ---- เวลา ----
  const writtenBeats = bare.reduce((t, n) => t + n.beats, 0) // ตามค่าโน้ต ตามลำดับที่เล่นจริง
  const playedBeats = notes.reduce((t, n) => t + n.beats, 0) // ที่เครื่องกางจริง (รวมหยุดค้าง)
  const fermataNotes = notes.filter((n) => n.fermata)
  const wantSec = writtenBeats * spb
  const gridSec = playedBeats * spb
  const fermataSec = gridSec - wantSec

  // ---- ลูกเล่นของเปียโน: ขยับหัวโน้ตกี่วินาที และเสียงสุดท้ายจบช้ากว่าจังหวะสุดท้ายแค่ไหน ----
  const chords = buildChordVoice(notes)
  const recipe = recommendRecipe(songFeatures(c))
  const cfg = { ...buildArrangeCfg(presetCfg(recipe), {}), sparkleLevel: 0.7 }
  const perf = arrange(notes, chords, { arranger: !plain, voices: 'both', chordGain: 0.055, ...cfg, module: moduleForInstrument('grand') },
    { songId: s.id, pass: 0, timeSignature: c.timeSignature, keyRoot: KEY_MIDI[c.key] ?? 60, sections: resolveSections(playable, notes) })
  const mel = perf.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  const soundEnd = Math.max(...perf.map((e) => e.startBeat * spb + (e.timeShift || 0) + e.beats * spb))
  const shifts = mel.map((e) => (e.timeShift || 0))
  const worstShift = shifts.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0)
  const breaths = mel.filter((e) => (e.timeShift || 0) > 0.02)

  // ---- สะสมผิดไหม: หัวโน้ตที่ n ห่างจากจังหวะที่ไม้นับจังหวะเคาะเท่าไร ----
  // นี่คือข้อสงสัยของคนใช้ ("ตรง 5 คำแรก แล้วเร็วไปจนหลุด") ⇒ ถ้าความผิดสะสม ตัวเลขนี้จะโตขึ้นเรื่อย ๆ
  const drift = mel.map((e) => Math.abs(e.timeShift || 0))
  const maxDrift = Math.max(...drift)
  const lateDrift = Math.max(...drift.slice(Math.floor(drift.length / 2))) // ครึ่งหลังของเพลง

  console.log(`เพลง: ${s.category} ${s.number} — ${s.title_th}`)
  console.log(`คีย์ ${c.key} · เลขประจำจังหวะ ${c.timeSignature} (${perBar} จังหวะ/ห้อง) · ความเร็วที่ตั้ง ♩=${bpm}${bpmArg ? ' (ตั้งเอง)' : ' (ของคลัง)'}${plain ? ' · ปิดลูกเล่น' : ''}`)
  console.log(`แผ่นโน้ตมี ${bars} ห้อง · เล่นจริงตามลำดับท่อน ${n2(writtenBeats / perBar)} ห้อง (${order ? 'มีท่อนซ้ำ' : 'ไล่ครั้งเดียว'})`)
  // ⚠️ ห้องที่ถูกตัดกลางเพื่อขึ้นบรรทัดใหม่ ก็โผล่ในรายการนี้ด้วย ⇒ อ่านเป็น "จุดที่ควรไปดูด้วยตา"
  // ⛔ ไม่ใช่ "ผิดแน่นอน" · ถ้าสองท่อนรวมกันได้พอดีห้องเต็ม แปลว่าเป็นห้องที่ตัดข้ามบรรทัด ไม่ใช่ห้องเพี้ยน
  if (barsOff.length) console.log(`⚠️ ห้องที่จังหวะไม่เต็ม ${barsOff.length} ห้อง (รวมห้องที่ตัดข้ามบรรทัดด้วย) — ค่าที่เจอ: ${[...new Set(barsOff)].join(', ')}`)
  console.log('')
  console.log(`เวลาที่ควรเป็น (จังหวะตามค่าโน้ต ÷ ความเร็ว) : ${fmt(wantSec)}  (${n2(wantSec)} วินาที · ${n2(writtenBeats)} จังหวะ)`)
  console.log(`เวลาที่เล่นจริง                              : ${fmt(gridSec)}  (${n2(gridSec)} วินาที · ${n2(playedBeats)} จังหวะ)`)
  console.log(`ต่างกัน                                      : ${fermataSec >= 0 ? '+' : ''}${n2(fermataSec)} วินาที  (${fermataSec >= 0 ? '+' : ''}${(wantSec ? (fermataSec / wantSec) * 100 : 0).toFixed(2)} %)`)
  console.log('')
  console.log('เวลาที่ต่างมาจากอะไร')
  console.log(`  · เครื่องหมายหยุดค้าง (𝄐) ${fermataNotes.length} ตัว        → ${fermataSec >= 0 ? '+' : ''}${n2(fermataSec)} วินาที`)
  console.log(`  · ช่วงหายใจก่อนขึ้นท่อนใหม่ ${breaths.length} จุด          → ขยับหัวโน้ตมากสุด ${n2(Math.max(0, ...breaths.map((e) => e.timeShift)))} วินาที (ยืมมาจากจังหวะข้างเคียง ไม่ต่อท้ายเพลง)`)
  console.log(`  · ลูกเล่นของเปียโน (ยืดโน้ตท้ายท่อน)        → เสียงสุดท้ายดังจบที่ ${n2(soundEnd)} วินาที = ${soundEnd >= gridSec ? '+' : ''}${n2(soundEnd - gridSec)} วินาที หลังจังหวะสุดท้าย`)
  console.log('')
  console.log('ความผิดสะสมไหม (ถ้าสะสม ครึ่งหลังต้องมากกว่าครึ่งแรกชัด ๆ)')
  console.log(`  · หัวโน้ตห่างจากจังหวะของไม้นับจังหวะ มากสุดทั้งเพลง ${n2(maxDrift)} วินาที · เฉพาะครึ่งหลัง ${n2(lateDrift)} วินาที`)
  console.log(`  · ค่าที่ขยับมากที่สุด ${n2(worstShift)} วินาที`)
  console.log(`  ⇒ ทุกหัวโน้ตถูกนัดจาก "จังหวะที่เท่าไร × วินาทีต่อจังหวะ" ใหม่ทุกตัว ไม่ได้บวกต่อจากตัวก่อน`)
  console.log(`     ความผิดจึงไม่สะสม ไม่ว่าเพลงจะยาวแค่ไหน`)
}
