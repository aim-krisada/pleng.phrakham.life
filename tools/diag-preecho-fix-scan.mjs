// READ-ONLY library scan for the PRE-ECHO fix (refereeNoClash pitch test). Runs the real playback
// pipeline twice per song — conductor WITHOUT the pitch test (cfg.refereePreEcho = 0 = the old
// behaviour) vs WITH it (the shipped default) — and reports:
//   1. how many pre-echo points each version leaves (the symptom count, before / after)
//   2. the CONTROL SET: melody / bass / inner events must differ by exactly 0 in every song,
//      and every song with no pre-echo must come out event-for-event identical
//   3. how many ornaments the rule actually silences (the collateral)
// Optional: --variants prints the same counts for other look-ahead / octave settings.
//   run: node tools/diag-preecho-fix-scan.mjs <songs.json> [--variants]
import fs from 'node:fs'
import { perfOf } from './diag-chord-playback.mjs'
import { presetCfg } from '../src/lib/arranger/presets.js'

const AUDIBLE = 0.12 // gain floor: below this an ornament reads as texture, not a note (same as the diagnosis)
const base = presetCfg('piano-arrangement')

// pre-echo points in a rendered performance, using the DIAGNOSIS's criterion (independent of the
// fix's own constants so it can't grade its own homework): an audible ornament in a melodic gap,
// within `look` beats before a melody attack of the same pitch.
function preEchoes(perf, look = 2, octaves = 1) {
  const mel = perf.filter((e) => e.role === 'melody').sort((a, b) => a.startBeat - b.startBeat)
  const out = []
  for (const e of perf) {
    if (e.role !== 'emb' || e.gain < AUDIBLE) continue
    const covered = mel.some((m) => e.startBeat >= m.startBeat - 1e-9 && e.startBeat < m.startBeat + m.beats - 1e-9)
    if (covered) continue
    for (const m of mel) {
      if (m.startBeat <= e.startBeat + 1e-9) continue
      if (m.startBeat - e.startBeat > look + 1e-9) break
      const d = Math.abs(m.midi - e.midi)
      if (d % 12 === 0 && d <= octaves * 12) { out.push({ beat: e.startBeat, midi: e.midi, lead: m.startBeat - e.startBeat, d }); break }
    }
  }
  return out
}

// FULL identity (pitch + onset + length + gain + timeShift) vs MUSICAL identity (which notes sound,
// when). Dropping any event re-rolls the humanize stream for everything AFTER it in the list, so a
// song that loses an ornament keeps every other note but with a hair of different jitter. The two
// keys separate "a note changed" (must never happen) from "the same note breathes differently".
const fullKey = (e) => `${e.role}@${e.startBeat.toFixed(4)}:${e.midi}:${e.beats.toFixed(4)}:${e.gain.toFixed(6)}:${(e.timeShift || 0).toFixed(6)}`
const noteKey = (e) => `${e.role}@${e.startBeat.toFixed(4)}:${e.midi}`
const byRole = (perf, role, key = fullKey) => perf.filter((e) => e.role === role).map(key).sort().join('|')

export function scan(songs, cfgOn = {}, cfgOff = { refereePreEcho: 0 }) {
  const rows = []
  for (const s of songs) {
    const c = s.content
    if (!c || !(c.stanzas || c.lines)) continue
    let off, on
    try {
      off = perfOf(c, s.id, { ...base, ...cfgOff })
      on = perfOf(c, s.id, { ...base, ...cfgOn })
    } catch { continue }
    rows.push({
      n: s.number, title: s.title_th,
      before: preEchoes(off.perf), after: preEchoes(on.perf),
      embBefore: off.perf.filter((e) => e.role === 'emb').length,
      embAfter: on.perf.filter((e) => e.role === 'emb').length,
      melSame: byRole(off.perf, 'melody') === byRole(on.perf, 'melody'),
      bassSame: byRole(off.perf, 'bass') === byRole(on.perf, 'bass'),
      innerSame: byRole(off.perf, 'inner') === byRole(on.perf, 'inner'),
      melNotes: byRole(off.perf, 'melody', noteKey) === byRole(on.perf, 'melody', noteKey),
      bassNotes: byRole(off.perf, 'bass', noteKey) === byRole(on.perf, 'bass', noteKey),
      innerNotes: byRole(off.perf, 'inner', noteKey) === byRole(on.perf, 'inner', noteKey),
      identical: off.perf.map(fullKey).sort().join('|') === on.perf.map(fullKey).sort().join('|'),
    })
  }
  return rows
}

function report(label, rows) {
  const nBefore = rows.reduce((a, r) => a + r.before.length, 0)
  const nAfter = rows.reduce((a, r) => a + r.after.length, 0)
  const songsBefore = rows.filter((r) => r.before.length).length
  const songsAfter = rows.filter((r) => r.after.length).length
  const dropped = rows.reduce((a, r) => a + (r.embBefore - r.embAfter), 0)
  const touched = rows.filter((r) => r.embBefore !== r.embAfter).length
  const melBad = rows.filter((r) => !r.melNotes)
  const bassBad = rows.filter((r) => !r.bassNotes)
  const innerBad = rows.filter((r) => !r.innerNotes)
  const jitterOnly = rows.filter((r) => (!r.melSame || !r.bassSame || !r.innerSame) && r.melNotes && r.bassNotes && r.innerNotes)
  const untouched = rows.filter((r) => r.embBefore === r.embAfter)
  const untouchedChanged = untouched.filter((r) => !r.identical)
  console.log(`\n=== ${label} · ${rows.length} เพลง ===`)
  console.log(`อาการ (pre-echo) ก่อนแก้: ${nBefore} จุด ใน ${songsBefore} เพลง   →   หลังแก้: ${nAfter} จุด ใน ${songsAfter} เพลง`)
  console.log(`ประดับที่ถูกตัดทิ้ง: ${dropped} ตัว (จาก ${rows.reduce((a, r) => a + r.embBefore, 0)}) ใน ${touched} เพลง`)
  console.log(`ชุดควบคุม — โน้ตที่ดัง (เสียง+จังหวะ) เปลี่ยน: melody ${melBad.length} เพลง · bass ${bassBad.length} · inner ${innerBad.length}  (ต้องเป็น 0 ทั้งหมด)`)
  console.log(`ชุดควบคุม — เพลงที่ไม่ถูกตัดประดับเลย ต้องเหมือนเดิมทุก byte: เปลี่ยน ${untouchedChanged.length} จาก ${untouched.length} เพลง (ต้องเป็น 0)`)
  console.log(`(เพลงที่ถูกตัด → humanize ของโน้ตหลังจุดตัด re-roll: โน้ตเดิมทุกตัว ต่างแค่ความดัง/ไทม์มิ่งระดับ jitter = ${jitterOnly.length} เพลง)`)
  if (melBad.length || bassBad.length || innerBad.length) console.log('  ⛔ เพลงที่ผิด:', [...melBad, ...bassBad, ...innerBad].map((r) => r.n).join(', '))
  for (const r of rows.filter((x) => x.before.length || x.after.length)) {
    console.log(`  เพลง ${String(r.n).padStart(3)} ${String(r.title || '').slice(0, 20).padEnd(22)} ก่อน ${r.before.length} → หลัง ${r.after.length}` +
      r.before.map((h) => `   [beat ${h.beat.toFixed(2)} midi ${h.midi} นำหน้า ${h.lead.toFixed(2)} บีต ห่าง ${h.d}]`).join(''))
  }
  return { nBefore, nAfter, dropped, ok: !melBad.length && !bassBad.length && !innerBad.length && !untouchedChanged.length && nAfter === 0 }
}

if (process.argv[1].endsWith('diag-preecho-fix-scan.mjs')) {
  const songs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))

  // (1) the library exactly as it is in production today
  report('คลังจริงวันนี้ (เพลง 33 = E7 ที่พี่เปาแก้ไว้)', scan(songs))

  // (2) the same library with song 33's chord put BACK to the original E — the state that made the
  //     symptom audible. This is the real "ก่อนแก้" and it must go 1 → 0.
  const revert = songs.map((s) => {
    if (s.number !== 33) return s
    const c = JSON.parse(JSON.stringify(s.content))
    const segs = c.stanzas[0].lines[0].filter((it) => it.type === 'segment')
    segs[segs.length - 1].chord = 'E'
    return { ...s, content: c }
  })
  const r2 = report('คลังเดียวกัน แต่คืนคอร์ดเพลง 33 เป็น E (= สภาพที่พี่เปาได้ยินอาการ)', scan(revert))

  if (process.argv.includes('--variants')) {
    for (const v of [{ refereePreEcho: 1 }, { refereePreEcho: 2 }, { refereePreEcho: 4 }, { refereePreEcho: 2, refereePreEchoOctaves: 0 }, { refereePreEcho: 2, refereePreEchoOctaves: 2 }]) {
      report(`variant ${JSON.stringify(v)} (บนคลังที่คืนคอร์ด E)`, scan(revert, v))
    }
  }
  console.log(`\nสรุป: ${r2.ok ? 'ผ่าน — อาการเหลือ 0 และชุดควบคุมไม่ขยับ' : '⛔ ไม่ผ่าน'}`)
}
