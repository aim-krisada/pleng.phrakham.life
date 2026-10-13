// ใบ v3/pleng#116 — what every song looks like on every surface, as text, so two versions of SongSheet can be
// compared song by song. READ-ONLY: songs come from a file you fetched with the site's public key (GET only).
//
// For each song × lyric set × surface × way of writing the words, this renders the REAL SongSheet (Vue's own
// server renderer — no browser needed) and keeps:
//   html  the rendered markup with Vue's bookkeeping comments taken out (to prove "exactly as before")
//   rows  each sheet line as the reader reads it, ' / ' where a long line is cut into a new lyric line
//
//   npx vite-node tools/line-split-audit/render.mjs -- --songs songs.json --out after.json
//   (run it once on main and once on the branch, then: node tools/line-split-audit/compare.mjs before.json after.json)
import fs from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import SongSheet from '../../src/components/SongSheet.vue'
import { resolveContent, inLyricSet } from '../../src/lib/songModel.js'
import anuchon from '../../src/data/bookPhrases.anuchon.json'
import { strip, rowsOf } from './rows.js'

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d }
const songs = JSON.parse(fs.readFileSync(arg('songs'), 'utf8'))
const out = arg('out')

// = lib/bookPhrases.js bookPhraseMap (only เล่มอนุชน has book phrasing so far)
function bookMapOf(song) {
  if (song.category !== 'anuchon') return null
  const s = String(song.number == null ? '' : song.number).trim()
  const m = (anuchon.songs || {})[/^\d+$/.test(s) ? String(Number(s)) : s]
  return m && Object.keys(m).length ? m : null
}
function setContents(content) {
  const ls = content.lyricSets
  if (!Array.isArray(ls) || ls.length < 2 || !Array.isArray(content.arrangement)) return [content]
  return ls.map((_, i) => ({ ...content, arrangement: content.arrangement.filter((e) => inLyricSet(e, i)) }))
}
// the props each page hands SongSheet (SongViewer = ฝึกร้อง · Studio = แผ่นเพลง, สมุดเพลง layout)
const SURFACES = {
  'sing-words': { mode: 'lyrics', showChord: false, showNote: false, showLyric: true, interactive: true },
  'sing-notes': { mode: 'full', showChord: true, showNote: true, showLyric: true, interactive: true },
  'sheet-words': { mode: 'lyrics', showChord: false, showNote: false, showLyric: true, songbook: true },
  'sheet-notes': { mode: 'full', showChord: true, showNote: true, showLyric: true, songbook: true },
}
const WAYS = ['split', 'join', 'book']

const result = {}
let n = 0
for (const song of songs) {
  const book = bookMapOf(song)
  const sets = setContents(song.content || {})
  for (let ci = 0; ci < sets.length; ci++) {
    const c = sets[ci]
    const content = { ...c, lines: resolveContent(c) }
    for (const [surface, base] of Object.entries(SURFACES)) {
      for (const way of WAYS) {
        const props = { ...base, content, lyricJoin: way !== 'split', bookPhrases: way === 'book' ? book : null }
        const html = await renderToString(createSSRApp({ render: () => h(SongSheet, props) }))
        result[`${song.id}|${ci}|${surface}|${way}`] = { html: strip(html), rows: rowsOf(html) }
      }
    }
  }
  if (++n % 100 === 0) console.error(`${n} songs`)
}
fs.writeFileSync(out, JSON.stringify(result))
console.error(`done: ${n} songs, ${Object.keys(result).length} renders → ${out}`)
