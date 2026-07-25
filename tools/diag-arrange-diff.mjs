// Closing proof for the meter fix: run the WHOLE arranger over every song in two code
// snapshots and report which songs' performances changed. Songs already on a correct meter
// (4/4, 8/4) must come out byte-identical; only the meters that were wrong may move.
// READ-ONLY — no DB writes, no song data touched.
//   run: node tools/diag-arrange-diff.mjs <songs.json> <dirBefore> <dirAfter>
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [songsPath, dA, dB] = process.argv.slice(2)
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))

const load = async (d) => ({
  midi: await import(pathToFileURL(`${d}/src/lib/midi.js`).href),
  model: await import(pathToFileURL(`${d}/src/lib/songModel.js`).href),
  arr: await import(pathToFileURL(`${d}/src/lib/arranger/index.js`).href),
  mods: await import(pathToFileURL(`${d}/src/lib/arranger/instruments/index.js`).href),
})
const A = await load(dA)
const B = await load(dB)

// The exact call playSong makes, minus the audio: same notes, same chord voice, same defaults.
function perform(S, content, songId) {
  const lines = Array.isArray(content?.lines) && content.lines.length ? content.lines : S.model.resolveContent(content)
  const res = { ...content, lines }
  const order = S.model.resolvePlayOrder(content) ?? undefined
  const notes = S.midi.buildPlayNotes(res, { order })
  if (!notes.length) return []
  const chords = S.midi.buildChordVoice(notes)
  const sections = S.midi.resolveSections(res, notes)
  const module = S.mods.moduleForInstrument('grand')
  const perf = S.arr.arrange(notes, chords, { arranger: true, voices: 'both', module }, {
    songId, pass: 0, timeSignature: content.timeSignature, keyRoot: 60, sections,
  })
  return perf.map((e) => [e.role, Math.round(e.startBeat * 1000) / 1000, e.midi,
    Math.round((e.gain ?? 0) * 10000) / 10000, Math.round((e.timeShift ?? 0) * 10000) / 10000])
}

const changed = []
const same = []
const failed = []
for (const s of songs) {
  const ts = s.content?.timeSignature || '(none)'
  let a, b
  try { a = perform(A, s.content, `song-${s.number}`); b = perform(B, s.content, `song-${s.number}`) }
  catch (e) { failed.push({ n: s.number, ts, e: String(e && e.message).slice(0, 80) }); continue }
  const rec = { n: s.number, t: s.title_th, ts, events: a.length }
  if (JSON.stringify(a) === JSON.stringify(b)) same.push(rec)
  else {
    let diffs = 0
    for (let i = 0; i < Math.max(a.length, b.length); i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) diffs++
    changed.push({ ...rec, diffs, countChanged: a.length !== b.length })
  }
}

const byTs = (rows) => rows.reduce((m, r) => { (m[r.ts] = m[r.ts] || []).push(r); return m }, {})
console.log(`เพลงทั้งหมด ${songs.length} · เปลี่ยน ${changed.length} · เหมือนเดิมเป๊ะ ${same.length} · รันไม่ผ่าน ${failed.length}`)
console.log('')
console.log('── เปลี่ยน (แยกตาม time signature) ──')
for (const [ts, rows] of Object.entries(byTs(changed))) {
  console.log(`  ${ts.padEnd(6)} ${String(rows.length).padStart(3)} เพลง · จำนวนโน้ตเปลี่ยนด้วย ${rows.filter((r) => r.countChanged).length} เพลง`)
}
console.log('')
console.log('── เหมือนเดิมเป๊ะ (แยกตาม time signature) ──')
for (const [ts, rows] of Object.entries(byTs(same))) console.log(`  ${ts.padEnd(6)} ${String(rows.length).padStart(3)} เพลง`)
if (failed.length) { console.log(''); console.log('── รันไม่ผ่าน ──'); for (const f of failed) console.log(`  #${f.n} [${f.ts}] ${f.e}`) }
console.log('')
console.log('รายชื่อเพลงที่เปลี่ยน:')
for (const r of changed) console.log(`  #${String(r.n).padStart(4)} [${r.ts.padEnd(4)}] ${r.diffs}/${r.events} เหตุการณ์ต่าง  ${r.t}`)

// ── the three sets PM asked for: split the result by WHY a song might move ──
// (appended so the same run answers "did anything that was already right break?")
const { meterOf: meterOf2, barOffsetFor: barOffsetFor2 } = await import(new URL('../src/lib/arranger/meter.js', import.meta.url).href)
const bucket = { pickup: { moved: 0, same: 0 }, full: { moved: 0, same: 0 }, compound: { moved: 0, same: 0 } }
const movedSet = new Set(changed.map((r) => String(r.n)))
for (const s of songs) {
  const c = s.content || {}
  const ts = c.timeSignature
  const m = meterOf2(ts)
  if (!m.known) continue
  const lines = Array.isArray(c.lines) && c.lines.length ? c.lines : B.model.resolveContent(c)
  const notes = B.midi.buildPlayNotes({ ...c, lines }, { order: B.model.resolvePlayOrder(c) ?? undefined })
  if (!notes.length) continue
  const off = barOffsetFor2(notes, m)
  const moved = movedSet.has(String(s.number)) ? 'moved' : 'same'
  bucket[off > 0 ? 'pickup' : 'full'][moved]++
  if (m.compound || parseInt(ts, 10) !== m.barBeats) bucket.compound[moved]++
}
console.log('')
console.log('── 3 ชุดตามเกณฑ์ปิดงาน ──')
console.log(`  เปิดเต็มห้อง (ต้องไม่เปลี่ยนเลย) : เปลี่ยน ${bucket.full.moved} · เหมือนเดิม ${bucket.full.same}`)
console.log(`  เปิดด้วยห้องยก                   : เปลี่ยน ${bucket.pickup.moved} · เหมือนเดิม ${bucket.pickup.same}`)
console.log(`  จังหวะผสม/ห้องยาวผิด             : เปลี่ยน ${bucket.compound.moved} · เหมือนเดิม ${bucket.compound.same}`)
const ts34 = changed.filter((r) => r.ts === '3/4')
console.log(`  เพลง 3/4 ที่เปลี่ยน               : ${ts34.length} เพลง ${ts34.length ? '✅' : '❌ ยังไม่เจอครบ'}`)
