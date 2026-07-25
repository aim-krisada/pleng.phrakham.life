// Fermata drift: how far a song's play timeline slips on the BASE branch vs `main`.
//   run: node tools/diag-fermata.mjs <songs.json> <dirBase> <dirMain>
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [songsPath, dA, dB] = process.argv.slice(2)
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))
const load = async (d) => ({
  midi: await import(pathToFileURL(`${d}/src/lib/midi.js`).href),
  model: await import(pathToFileURL(`${d}/src/lib/songModel.js`).href),
})
const A = await load(dA)
const B = await load(dB)
const resolved = (snap, c) => ({ ...c, lines: Array.isArray(c?.lines) && c.lines.length ? c.lines : snap.model.resolveContent(c) })
const notes = (snap, c) => snap.midi.songToNotes(resolved(snap, c))
const total = (l) => l.reduce((t, n) => t + n.beats, 0)

// how many fermata note-boxes the song has, and whether the editable `holds` data exists
function fermataStats(snap, c) {
  const r = resolved(snap, c)
  let marks = 0, withHold = 0
  for (const line of r.lines || []) for (const it of line || []) {
    if (it.type !== 'segment' || !it.note) continue
    const boxes = it.note.trim().split(/\s+/)
    boxes.forEach((box, i) => {
      if (!box.includes('^')) return
      marks++
      const h = it.holds
      if (h && (Array.isArray(h) ? h[i] != null : h[i] != null || h[String(i)] != null)) withHold++
    })
  }
  return { marks, withHold }
}

const rows = []
for (const s of songs) {
  let a, b
  try { a = notes(A, s.content); b = notes(B, s.content) } catch { continue }
  const f = fermataStats(A, s.content)
  const ta = total(a), tb = total(b)
  if (Math.abs(ta - tb) < 1e-9 && f.marks === 0) continue
  // the largest onset gap = how far the two versions are apart at the worst point
  let onA = 0, onB = 0, worst = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    worst = Math.max(worst, Math.abs(onA - onB))
    onA += a[i].beats; onB += b[i].beats
  }
  rows.push({ n: s.number, t: s.title_th, marks: f.marks, holds: f.withHold,
    baseBeats: +ta.toFixed(3), mainBeats: +tb.toFixed(3), drift: +(ta - tb).toFixed(3), worst: +worst.toFixed(3) })
}
rows.sort((x, y) => Math.abs(y.drift) - Math.abs(x.drift))
console.log('num  fermata  holds   base    main    drift   worst-gap  title')
for (const r of rows) {
  console.log(`${String(r.n).padStart(4)}  ${String(r.marks).padStart(4)}  ${String(r.holds).padStart(5)}  ${String(r.baseBeats).padStart(7)} ${String(r.mainBeats).padStart(7)} ${String(r.drift).padStart(7)} ${String(r.worst).padStart(9)}  ${r.t}`)
}
console.log(`\nsongs affected: ${rows.length}`)
console.log(`fermata marks total: ${rows.reduce((s, r) => s + r.marks, 0)} · with an editable hold stored: ${rows.reduce((s, r) => s + r.holds, 0)}`)
