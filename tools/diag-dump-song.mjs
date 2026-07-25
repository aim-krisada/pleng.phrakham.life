// Print the resolved note strings of a song, bar by bar, with each bar's written beats —
// so an off-beat bar can be read against the sheet. READ-ONLY.
//   run: node tools/diag-dump-song.mjs <songs.json> <number> [fromLine] [toLine]
import { readFileSync } from 'node:fs'

const [songsPath, num, from = 0, to = 999] = process.argv.slice(2)
const songs = JSON.parse(readFileSync(songsPath, 'utf8'))
const { resolveContent } = await import(new URL('../src/lib/songModel.js', import.meta.url).href)
const { beatCount, parseNotes } = await import(new URL('../src/lib/notation.js', import.meta.url).href)

for (const s of songs.filter((x) => String(x.number) === String(num))) {
  const c = s.content
  const lines = Array.isArray(c.lines) && c.lines.length ? c.lines : resolveContent(c)
  console.log(`#${s.number} ${s.title_th}  ${c.timeSignature} key=${c.key}  lines=${lines.length}`)
  lines.forEach((line, li) => {
    if (li < Number(from) || li > Number(to)) return
    const parts = []
    let bar = []
    const flush = () => { if (bar.length) parts.push(bar); bar = [] }
    for (const it of line || []) {
      if (it.type === 'bar') { flush(); continue }
      if (it.type === 'segment') bar.push(it)
      else if (it.type) bar.push({ marker: it.type + (it.name ? `:${it.name}` : '') })
    }
    flush()
    const txt = parts.map((segs) => {
      const notes = segs.map((x) => x.marker ? `⟨${x.marker}⟩` : (x.note || '·')).join(' ')
      const beats = segs.reduce((t, x) => t + (x.marker ? 0 : beatCount(parseNotes(x.note || ''))), 0)
      return `[${beats}] ${notes}`
    }).join('  |  ')
    console.log(`  L${li}: ${txt}`)
  })
}
