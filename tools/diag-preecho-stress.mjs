// READ-ONLY STRESS TEST for the PRE-ECHO fix — "is this a general rule, or a patch for เพลง 33?"
//
// The ornament's pitch comes from the CHORD alone, so any chord edit anywhere can flip a harmless
// ornament into an exact pre-echo of the note the tune is about to sing (that is exactly how เพลง 33
// happened, and why the diagnosis called 8 songs "one chord edit away"). So: take every song that
// hosts an at-risk ornament, and REWRITE EVERY CHORD IN IT, one at a time, into each common quality
// (maj / min / 7 / m7 / maj7 / sus4 / dim / m7b5 / 6 / 9). For every one of those thousands of
// rewritten songs the fix must leave ZERO pre-echo points, and the melody must never move.
//
//   run: node tools/diag-preecho-stress.mjs <songs.json> [--all]
import fs from 'node:fs'
import { perfOf } from './diag-chord-playback.mjs'
import { presetCfg } from '../src/lib/arranger/presets.js'

const LOOK = 2.0, AUD = 0.12
const base = presetCfg('piano-arrangement')
const OFF = { ...base, refereePreEcho: 0 } // the conductor as it was before this fix
const QUALITIES = ['', 'm', '7', 'm7', 'maj7', 'sus4', 'dim', 'm7b5', '6', '9']

// pre-echo points, judged by the DIAGNOSIS's criterion (not the fix's own constants)
function preEchoes(perf) {
  const mel = perf.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  const out = []
  for (const e of perf) {
    if (e.role !== 'emb' || e.gain < AUD) continue
    if (mel.some((m) => e.startBeat >= m.startBeat - 1e-9 && e.startBeat < m.startBeat + m.beats - 1e-9)) continue
    for (const m of mel) {
      if (m.startBeat <= e.startBeat + 1e-9) continue
      if (m.startBeat - e.startBeat > LOOK + 1e-9) break
      const d = Math.abs(m.midi - e.midi)
      if (d % 12 === 0 && d <= 12) { out.push({ beat: e.startBeat, midi: e.midi, d }); break }
    }
  }
  return out
}
const atRisk = (perf) => {
  const mel = perf.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  let n = 0
  for (const e of perf.filter((x) => x.role === 'emb')) {
    const nxt = mel.find((m) => m.startBeat > e.startBeat + 1e-9)
    if (!nxt || nxt.startBeat - e.startBeat > LOOK || e.gain < AUD) continue
    if (mel.some((m) => e.startBeat >= m.startBeat - 1e-9 && e.startBeat < m.startBeat + m.beats - 1e-9)) continue
    n++
  }
  return n
}
const melKey = (perf) => perf.filter((e) => e.role === 'melody').map((e) => `${e.startBeat.toFixed(4)}:${e.midi}`).join('|')

// every chord symbol in a v2/v1 content, with a setter (root kept, quality replaced)
function chordSlots(content) {
  const slots = []
  const walkLines = (lines) => {
    for (const line of lines || []) for (const it of line || []) {
      if (it && typeof it === 'object' && typeof it.chord === 'string' && it.chord) slots.push(it)
    }
  }
  for (const st of content.stanzas || []) walkLines(st.lines)
  if (content.lines) walkLines([content.lines])
  return slots
}
const rootOf = (c) => (c.match(/^[A-G][#b]?/) || [c])[0]

const songs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const all = process.argv.includes('--all')

// 1) the at-risk population (the 8 songs the diagnosis flagged), measured with the fix OFF
const pool = []
for (const s of songs) {
  const c = s.content
  if (!c || !(c.stanzas || c.lines)) continue
  let off
  try { off = perfOf(c, s.id, OFF) } catch { continue }
  const n = atRisk(off.perf)
  if (n) pool.push({ s, risk: n })
}
console.log(`เพลงที่มีประดับ "เสี่ยง" (ก่อนแก้): ${pool.length} เพลง — ${pool.map((p) => `${p.s.number}(${p.risk})`).join(', ')}`)

const targets = all ? songs.filter((s) => s.content && (s.content.stanzas || s.content.lines)) : pool.map((p) => p.s)
console.log(`สแตรสเทสต์: เขียนคอร์ดใหม่ทีละตัว × ${QUALITIES.length} ชนิด บน ${targets.length} เพลง\n`)

let cases = 0, symptomsBefore = 0, symptomsAfter = 0, melMoved = 0
const worst = []
for (const s of targets) {
  const slots0 = chordSlots(s.content)
  const melBase = melKey(perfOf(s.content, s.id, OFF).perf)
  for (let i = 0; i < slots0.length; i++) {
    for (const q of QUALITIES) {
      const c = JSON.parse(JSON.stringify(s.content))
      const slots = chordSlots(c)
      const orig = slots[i].chord
      const next = rootOf(orig) + q
      if (next === orig) continue
      slots[i].chord = next
      let off, on
      try { off = perfOf(c, s.id, OFF); on = perfOf(c, s.id, base) } catch { continue }
      cases++
      const b = preEchoes(off.perf).length
      const a = preEchoes(on.perf).length
      symptomsBefore += b; symptomsAfter += a
      if (melKey(on.perf) !== melBase) melMoved++
      if (a) worst.push(`เพลง ${s.number} คอร์ด #${i} ${orig}→${next}: ยังเหลือ ${a} จุด`)
    }
  }
}
console.log(`เคสทั้งหมด: ${cases}`)
console.log(`อาการ pre-echo รวม — โค้ดเดิม: ${symptomsBefore} จุด   →   โค้ดใหม่: ${symptomsAfter} จุด  (ต้องเป็น 0)`)
console.log(`เคสที่ทำนองขยับ: ${melMoved} (ต้องเป็น 0)`)
for (const w of worst.slice(0, 20)) console.log('  ⛔', w)
console.log(`\nสรุป: ${symptomsAfter === 0 && melMoved === 0 ? 'ผ่าน — ไม่มีการแก้คอร์ดแบบไหนที่ทำให้อาการกลับมา' : '⛔ ไม่ผ่าน'}`)
