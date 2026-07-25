// Show WHERE two code snapshots disagree about a song's play timeline.
//   run: node tools/diag-rhythm-diff.mjs <songs.json> <dirA> <dirB> <number> [labelA labelB]
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [songsPath, dA, dB, num, la = 'A', lb = 'B'] = process.argv.slice(2)
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))
const load = async (d) => ({
  midi: await import(pathToFileURL(`${d}/src/lib/midi.js`).href),
  model: await import(pathToFileURL(`${d}/src/lib/songModel.js`).href),
})
const A = await load(dA)
const B = await load(dB)
const resolved = (snap, c) => ({ ...c, lines: Array.isArray(c?.lines) && c.lines.length ? c.lines : snap.model.resolveContent(c) })
const tl = (snap, c) => {
  let b = 0
  return snap.midi.songToNotes(resolved(snap, c)).map((n) => { const o = b; b += n.beats; return { on: +o.toFixed(4), beats: +n.beats.toFixed(4), midi: n.midi, li: n.li, bi: n.bi, si: n.si } })
}
for (const s of songs.filter((x) => String(x.number) === String(num))) {
  const a = tl(A, s.content)
  const b = tl(B, s.content)
  console.log(`#${s.number} ${s.title_th}  ${la}=${a.length} notes / ${b.length} notes ${lb}`)
  const n = Math.max(a.length, b.length)
  let shown = 0
  for (let i = 0; i < n && shown < 25; i++) {
    const x = a[i], y = b[i]
    if (JSON.stringify(x) === JSON.stringify(y)) continue
    shown++
    console.log(`  [${i}] ${la}: ${JSON.stringify(x)}`)
    console.log(`      ${lb}: ${JSON.stringify(y)}`)
  }
  const sum = (l) => l.reduce((t, n2) => t + n2.beats, 0)
  console.log(`  total beats  ${la}=${sum(a)}  ${lb}=${sum(b)}`)
}
