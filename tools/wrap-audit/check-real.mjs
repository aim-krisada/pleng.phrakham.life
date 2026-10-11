// ใบ v3/pleng#110 — does the audit harness lay the words out exactly as the real site does?
// Opens the real ฝึกร้อง page (เนื้อล้วน, ติดกันเป็นวรรค / ตามต้นฉบับ) and the real แผ่นเพลง page for a sample of
// songs, reads every joined line row by row (audit.js), renders the same song in the harness, and compares.
// READ-ONLY: the pages only read songs; nothing is saved.
//
//   node tools/wrap-audit/check-real.mjs --port 5408 --sample 40 [--songs songs.json]
import fs from 'node:fs'
import { chromium } from 'playwright-core'

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d }
const port = arg('port', '5408')
const sample = Number(arg('sample', '30'))
const viewports = arg('widths', '360,390,712').split(',').map(Number)
const songs = JSON.parse(fs.readFileSync(arg('songs', 'songs.json'), 'utf8'))
const SHEET_W = { sing: (vw) => vw - (vw < 760 ? 24 : 32), sheet: (vw) => (vw < 760 ? vw - 58 : vw - 66) }

// song 141 (the one in the ticket), every เล่มอนุชน song with book phrasing in the sample, and an even spread
const pick = []
const s141 = songs.find((s) => s.category === 'lem-yai' && Number(s.number) === 141)
if (s141) pick.push(s141)
const step = Math.max(1, Math.floor(songs.length / sample))
for (let i = 0; i < songs.length && pick.length < sample; i += step) if (!pick.includes(songs[i])) pick.push(songs[i])

const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) })
const harness = await browser.newPage({ viewport: { width: 1200, height: 900 } })
await harness.goto(`http://localhost:${port}/tools/wrap-audit/harness.html`, { waitUntil: 'load' })
await harness.waitForFunction(() => window.harnessReady === true)

let same = 0
let differ = 0
const diffs = []
for (const surface of ['sing', 'sheet']) {
  for (const way of ['join', 'book']) {
    for (const vw of viewports) {
      const ctx = await browser.newContext({ viewport: { width: vw, height: 900 } })
      await ctx.addInitScript((m) => {
        localStorage.setItem('pleng.sheetDisplay', 'lyric')
        localStorage.setItem('pleng.lyricJoin', m)
        localStorage.setItem('pleng.sheetLyricJoin', m)
        localStorage.setItem('pleng.readingFontScale', '1')
      }, way)
      const page = await ctx.newPage()
      for (const song of pick) {
        if (way === 'book' && song.category !== 'anuchon') continue
        await page.goto(`http://localhost:${port}/#/song/${song.id}`, { waitUntil: 'load' })
        await page.waitForFunction(() => document.querySelectorAll('.sheet-scale .song-line-join').length > 0, null, { timeout: 30000 })
        if (surface === 'sheet') {
          // the แผ่นเพลง button: on a page that has only just loaded the first press can be lost, so press until it shows
          for (let i = 0; i < 20; i++) {
            await page.evaluate(() => document.querySelector('button.sb-mode-btn[title^="แผ่นเพลง"]').click())
            await page.waitForTimeout(300)
            if (await page.evaluate(() => { const r = document.querySelector('.sheet-workspace .sheet-root'); return !!r && r.clientWidth > 0 })) break
          }
          // a song whose verses all carry their notes has no joined line on the sheet: do not wait for ever
          await page.waitForFunction(() => document.querySelectorAll('.sheet-workspace .song-line-join').length > 0, null, { timeout: 5000 }).catch(() => {})
        }
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(way === 'book' ? 700 : 300) // the book file arrives a moment later
        if (!(await page.evaluate(() => !!window.wrapAudit))) await page.addScriptTag({ url: '/tools/wrap-audit/audit.js', type: 'module' })
        await page.waitForFunction(() => !!window.wrapAudit)
        const sel = surface === 'sing' ? '.sheet-scale .sheet-root' : '.sheet-workspace .sheet-root'
        let real = await page.evaluate((s) => window.wrapAudit(document.querySelector(s)).layout, sel)
        if (!real.length) { await page.waitForTimeout(1500); real = await page.evaluate((s) => window.wrapAudit(document.querySelector(s)).layout, sel) } // first load still settling
        const mine = (await harness.evaluate(([s, o]) => window.renderAndAudit(s, o), [song, { surface, way, width: SHEET_W[surface](vw), scale: 1, layout: true }])).layout
        // the real page shows lyric set 1 only; the harness renders every set, set 1 first
        const ok = real.length <= mine.length && (real.length > 0 || mine.length === 0) && real.every((l, i) => l === mine[i])
        if (ok) same++
        else { differ++; if (diffs.length < 20) diffs.push({ surface, way, vw, song: `${song.category} ${song.number}`, real: real.slice(0, 40), mine: mine.slice(0, 40) }) }
      }
      await ctx.close()
      console.log(surface, way, vw, 'same', same, 'differ', differ)
    }
  }
}
console.log(JSON.stringify({ songs: pick.length, same, differ }))
if (diffs.length) fs.writeFileSync('check-real-diffs.json', JSON.stringify(diffs, null, 1))
await browser.close()
