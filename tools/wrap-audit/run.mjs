// ใบ v3/pleng#110 — measured proof that a joined line never breaks inside a word.
//
// For every published song, in both joined ways (ติดกันเป็นวรรค = join · ตามต้นฉบับ = book), at several screen
// widths and reading sizes, this renders the real SongSheet in headless Chromium (harness.html) and finds every
// place the browser broke a line. Each break must sit at a word end as Intl.Segmenter('th') reads the line, or
// at a real space. It also counts a วรรค that fits the line but was split anyway (ใบ#104), and letters that
// run past the edge.
//
// READ-ONLY: the song list is fetched with the site's public key (GET only). Nothing is ever written.
//
//   npm i playwright-core --no-save
//   npx vite --port 5408 --strictPort
//   node tools/wrap-audit/run.mjs --port 5408 --out wrap-audit.json [--surfaces sing,sheet,print] [--scales 0.8,1,2.2] [--limit 20]
//   CHROMIUM=<path to chrome.exe> if playwright's own browser is not installed
import fs from 'node:fs'
import { chromium } from 'playwright-core'

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d }
const port = arg('port', '5408')
const out = arg('out', '')
const scales = arg('scales', '1').split(',').map(Number)
const viewports = arg('widths', '360,375,390,712').split(',').map(Number)
const ways = arg('ways', 'join,book').split(',')
const surfaces = arg('surfaces', 'sing,sheet').split(',')
const limit = Number(arg('limit', '0'))
const songsFile = arg('songs', '')

// the sheet's own width on each page, measured on the real site (sheet-root clientWidth):
// ฝึกร้อง = the screen less 12px each side (16px from 760px up); แผ่นเพลง = the card, 29px each side (33 at 712)
// print = แผ่นเพลง on A4 paper: 210mm less the 16mm margins each side = 178mm = 673px, always at the 1rem size
const SHEET_W = { sing: (vw) => vw - (vw < 760 ? 24 : 32), sheet: (vw) => (vw < 760 ? vw - 58 : vw - 66), print: () => 673 }

async function loadSongs() {
  if (songsFile) return JSON.parse(fs.readFileSync(songsFile, 'utf8'))
  const src = fs.readFileSync(new URL('../../src/supabase.js', import.meta.url), 'utf8')
  const url = src.match(/SUPABASE_URL = '([^']+)'/)[1]
  const key = src.match(/SUPABASE_KEY = '([^']+)'/)[1]
  const r = await fetch(`${url}/rest/v1/songs?select=id,number,title_th,content,category&deleted_at=is.null&limit=2000`, { headers: { apikey: key } })
  if (!r.ok) throw new Error(`song list: HTTP ${r.status}`)
  return r.json()
}

let songs = await loadSongs()
songs.sort((a, b) => String(a.category).localeCompare(String(b.category)) || Number(a.number) - Number(b.number))
if (limit) songs = songs.slice(0, limit)

const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) })
let page = null
let media = 'screen'
async function openHarness() {
  page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  await page.goto(`http://localhost:${port}/tools/wrap-audit/harness.html`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.harnessReady === true)
  await page.emulateMedia({ media })
}
await openHarness()
// One song, one way, one size. A song whose page never settles (it happens on the full notation sheet, on main
// too) is given up after a while and counted as a time-out, on a fresh page, so one song cannot stop the run.
const RENDER_TIMEOUT_MS = Number(arg('timeout', '20000'))
async function renderOne(song, o) {
  const run = page.evaluate(([s, x]) => window.renderAndAudit(s, x), [song, o])
  let timer
  const late = new Promise((resolve) => { timer = setTimeout(() => resolve(null), RENDER_TIMEOUT_MS) })
  const r = await Promise.race([run, late])
  clearTimeout(timer)
  if (r) return r
  run.catch(() => {})
  await page.close().catch(() => {})
  await openHarness()
  return null
}

const total = { songs: songs.length, renders: 0, songsWithBook: 0, lines: 0, breaks: 0, atWord: 0, atSpaceOnly: 0, bad: 0, fitSplit: 0, overflow: 0, timeouts: 0 }
const byConfig = {}
const examples = []
const withBook = new Set()
const t0 = Date.now()
for (const surface of surfaces) {
  media = surface === 'print' ? 'print' : 'screen'
  await page.emulateMedia({ media })
  for (const way of ways) {
    for (const vw of surface === 'print' ? ['A4'] : viewports) {
      for (const scale of surface === 'print' ? [1] : scales) {
        const cfg = `${surface}/${way}/${vw}${surface === 'print' ? '' : 'px'}/x${scale}`
        const c = (byConfig[cfg] = { renders: 0, lines: 0, breaks: 0, bad: 0, fitSplit: 0, overflow: 0, timeouts: 0 })
        for (const song of songs) {
          if (way === 'book' && song.category !== 'anuchon') continue // only เล่มอนุชน has the book's phrasing
          const r = await renderOne(song, { surface, way, width: SHEET_W[surface](vw), scale })
          if (!r) { c.timeouts++; if (examples.length < 400) examples.push({ cfg, kind: 'timeout', song: `${song.category} ${song.number} ${song.title_th}` }); continue }
          if (way === 'book' && r.book) withBook.add(song.id)
          c.renders += r.sets
          c.lines += r.lines
          c.breaks += r.breaks
          c.bad += r.bad.length
          c.fitSplit += r.fitSplit.length
          c.overflow += r.overflow.length
          total.atWord += r.atWord
          total.atSpaceOnly += r.atSpaceOnly
          for (const [kind, list] of [['bad', r.bad], ['fitSplit', r.fitSplit], ['overflow', r.overflow]]) {
            for (const x of list.slice(0, 3)) if (examples.length < 400) examples.push({ cfg, kind, song: `${song.category} ${song.number} ${song.title_th}`, at: x })
          }
        }
        for (const k of ['renders', 'lines', 'breaks', 'bad', 'fitSplit', 'overflow', 'timeouts']) total[k] += c[k]
        console.log(cfg.padEnd(26), JSON.stringify(c))
      }
    }
  }
}
total.songsWithBook = withBook.size
total.seconds = Math.round((Date.now() - t0) / 1000)
console.log('TOTAL', JSON.stringify(total))
if (out) fs.writeFileSync(out, JSON.stringify({ total, byConfig, examples }, null, 1))
await browser.close()
