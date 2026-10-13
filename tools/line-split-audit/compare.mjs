// ใบ v3/pleng#116 — compare two runs of render.mjs (before = main, after = this branch) and count the long lines.
//
//   node tools/line-split-audit/compare.mjs --before before.json --after after.json --songs songs.json [--out report.json]
//
// It checks, render by render (song × lyric set × surface × way of writing the words):
//   * a render with no cut in it must be EXACTLY the same markup as before;
//   * a render with a cut must read exactly as before once the cut is taken out (same words, same order);
//   * a cut may only appear where the words alone show (sing-words / sheet-words), never under notes.
// and lists every sheet line that is long by the rule (lib/lyricLineSplit.js), whether it was cut or not.
import fs from 'node:fs'
import { strip, rowsOf } from './rows.js'
import { resolveContent, inLyricSet } from '../../src/lib/songModel.js'
import { lineMeasures, LONG_RATIO } from '../../src/lib/lyricLineSplit.js'

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d }
const before = JSON.parse(fs.readFileSync(arg('before'), 'utf8'))
const after = JSON.parse(fs.readFileSync(arg('after'), 'utf8'))
const songs = JSON.parse(fs.readFileSync(arg('songs'), 'utf8'))
const byId = Object.fromEntries(songs.map((s) => [s.id, s]))
const CUT = /<span class="lyric-cut"[^>]*><\/span>/g
const name = (id) => { const s = byId[id]; return `${s.category} ${s.number} ${s.title_th}` }

const report = { renders: 0, same: 0, cutRenders: 0, problems: [], cutSongs: {}, examples: {} }
for (const key of Object.keys(before)) {
  report.renders++
  const a = after[key]
  if (!a) { report.problems.push(`${key}: missing after`); continue }
  const b = before[key]
  const hasCut = CUT.test(a.html); CUT.lastIndex = 0
  const [id, , surface, way] = key.split('|')
  if (!hasCut) {
    if (a.html === b.html) report.same++
    else report.problems.push(`${key}: no cut, but the markup changed`)
    continue
  }
  report.cutRenders++
  if (!surface.endsWith('-words')) report.problems.push(`${key}: a cut under notes`)
  const flat = (rows) => rows.map((r) => r.replace(/ \/ /g, ' ').replace(/\s+/g, '')).join('\n')
  if (flat(rowsOf(a.html)) !== flat(rowsOf(b.html))) report.problems.push(`${key}: the words changed`)
  const s = (report.cutSongs[name(id)] ||= {})
  s[`${surface}|${way}`] = rowsOf(a.html).filter((r) => r.includes(' / ')).length
  if (!report.examples[name(id)] && surface === 'sing-words' && way === 'join') {
    const ra = rowsOf(a.html); const rb = rowsOf(b.html)
    report.examples[name(id)] = ra.map((r, i) => (r.includes(' / ') ? { before: rb[i], after: r.split(' / ') } : null)).filter(Boolean)
  }
}

// the long lines of the library, by the rule's two measures (bars and letters against the song's median line)
function setContents(content) {
  const ls = content.lyricSets
  if (!Array.isArray(ls) || ls.length < 2 || !Array.isArray(content.arrangement)) return [content]
  return ls.map((_, i) => ({ ...content, arrangement: content.arrangement.filter((e) => inLyricSet(e, i)) }))
}
const longBars = []; const longBoth = []; let lines = 0; const near = []
for (const song of songs) {
  setContents(song.content || {}).forEach((c, ci) => {
    for (const m of lineMeasures(resolveContent(c), c.timeSignature)) {
      if (!m) continue
      lines++
      const row = { song: name(song.id), set: ci, bars: +m.bars.toFixed(2), normalBars: +m.normalBars.toFixed(2), letters: m.letters, normalLetters: m.normalLetters, barRatio: +m.barRatio.toFixed(2), letterRatio: +m.letterRatio.toFixed(2) }
      if (m.barRatio >= 1.4 || m.letterRatio >= 1.4) near.push(row) // the neighbourhood the thresholds were read from
      if (m.barRatio < LONG_RATIO - 1e-9) continue
      longBars.push(row)
      if (m.long) longBoth.push(row)
    }
  })
}
report.library = {
  songs: songs.length, lines,
  linesLongInBars: longBars.length, songsLongInBars: new Set(longBars.map((r) => r.song)).size,
  linesLong: longBoth.length, songsLong: new Set(longBoth.map((r) => r.song)).size,
  longInBarsOnly: longBars.filter((r) => !longBoth.includes(r)),
  long: longBoth,
  near,
}
const lib = report.library
console.log(JSON.stringify({ renders: report.renders, same: report.same, cutRenders: report.cutRenders, problems: report.problems, cutSongs: report.cutSongs }, null, 1))
console.log(`library: ${lib.songs} songs, ${lib.lines} worded sheet lines`)
console.log(`≥ ${LONG_RATIO}× the normal bars: ${lib.linesLongInBars} lines in ${lib.songsLongInBars} songs; long by both measures: ${lib.linesLong} lines in ${lib.songsLong} songs`)
const uniq = (rows) => [...new Map(rows.map((r) => [`${r.song}|${r.barRatio}|${r.letterRatio}`, r])).values()]
console.log('bars-long only (not cut — few letters):'); for (const r of uniq(lib.longInBarsOnly)) console.log(`  ${r.song}: bars ${r.barRatio}× letters ${r.letterRatio}×`)
console.log('long by both:'); for (const r of uniq(lib.long)) console.log(`  ${r.song}: bars ${r.barRatio}× (${r.bars}/${r.normalBars}) letters ${r.letterRatio}× (${r.letters}/${r.normalLetters})`)
if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(report, null, 1))
