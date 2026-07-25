// Closing numbers for the pickup fix, computed in ONE pass keyed by song id.
//
// An earlier attempt cross-referenced the two sides by song NUMBER and produced numbers that
// contradicted each other: 29 songs in the library have no number, so every one of them collapsed
// onto the same key and read as "changed" together. Nothing here matches by number.
//   run: node tools/diag-pickup-buckets.mjs <songs.json> <dirBefore> <dirAfter>
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
const { meterOf, barOffsetFor } = await import(new URL('../src/lib/arranger/meter.js', import.meta.url).href)

function perform(S, content, songId) {
  const lines = Array.isArray(content?.lines) && content.lines.length ? content.lines : S.model.resolveContent(content)
  const res = { ...content, lines }
  const order = S.model.resolvePlayOrder(content) ?? undefined
  const notes = S.midi.buildPlayNotes(res, { order })
  if (!notes.length) return { notes, perf: null }
  const perf = S.arr.arrange(notes, S.midi.buildChordVoice(notes),
    { arranger: true, voices: 'both', module: S.mods.moduleForInstrument('grand') },
    { songId, pass: 0, timeSignature: content.timeSignature, keyRoot: 60, sections: S.midi.resolveSections(res, notes) })
  return { notes, perf: perf.map((e) => [e.role, Math.round(e.startBeat * 1000) / 1000, e.midi, Math.round((e.gain ?? 0) * 10000) / 10000]) }
}

const rows = []
for (const s of songs) {
  const c = s.content || {}
  const m = meterOf(c.timeSignature)
  const id = `song-${s.id}`
  let a, b
  try { a = perform(A, c, id); b = perform(B, c, id) } catch { continue }
  if (!b.perf) continue
  rows.push({
    id: s.id, n: s.number, t: s.title_th, ts: c.timeSignature,
    pickup: barOffsetFor(b.notes, m),
    barWasWrong: m.known && parseInt(c.timeSignature, 10) !== m.barBeats,
    moved: JSON.stringify(a.perf) !== JSON.stringify(b.perf),
  })
}

const tally = (pred) => {
  const sel = rows.filter(pred)
  return `เปลี่ยน ${sel.filter((r) => r.moved).length} · เหมือนเดิม ${sel.filter((r) => !r.moved).length}`
}
console.log(`วัด ${rows.length} เพลง (จับคู่ด้วย id ไม่ใช่เลขเพลง)`)
console.log('')
console.log(`  เปิดเต็มห้อง (ต้องไม่เปลี่ยนเลย) : ${tally((r) => !r.pickup)}`)
console.log(`  เปิดด้วยห้องยก                   : ${tally((r) => r.pickup > 0)}`)
console.log(`  ห้องยาวผิด (จังหวะผสม / 3-2)      : ${tally((r) => r.barWasWrong)}`)
console.log(`  เพลง 3/4                         : ${tally((r) => r.ts === '3/4')}`)
console.log(`  เพลง 4/4                         : ${tally((r) => r.ts === '4/4')}`)
const bad = rows.filter((r) => !r.pickup && r.moved)
if (bad.length) {
  console.log('')
  console.log(`⚠️ เพลงเปิดเต็มห้องที่เปลี่ยน (ไม่ควรมี) ${bad.length} เพลง:`)
  for (const r of bad.slice(0, 20)) console.log(`   #${r.n} [${r.ts}] ${r.t}`)
}
