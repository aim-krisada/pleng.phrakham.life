// ใบ v3/pleng#105 — proof shots: open ฝึกร้อง on the real site, in เนื้อล้วน, once with
// "ตามต้นฉบับ" and once with "ติดกันเป็นวรรคตามทำนอง", and save both pictures per song. A second
// script puts them next to the page of the printed book. Needs `npm run dev` running.
//
//   npm run dev -- --port 5199
//   node tools/bookPhrases/shots.mjs --port 5199 --out tmp105/shots --songs 33,5,11,…
import fs from 'node:fs'
import { chromium } from 'playwright-core'

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d }
const port = arg('port', '5199')
const out = arg('out', 'tmp105/shots')
const ids = JSON.parse(fs.readFileSync(arg('ids', 'tmp105/shot-ids.json'), 'utf8')) // [{number, id}]

fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
for (const mode of ['book', 'join']) {
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1400 }, deviceScaleFactor: 2 })
  await ctx.addInitScript((m) => {
    localStorage.setItem('pleng.sheetDisplay', 'lyric')
    localStorage.setItem('pleng.lyricJoin', m)
  }, mode)
  const page = await ctx.newPage()
  for (const s of ids) {
    await page.goto(`http://localhost:${port}/#/song/${s.id}`, { waitUntil: 'load' })
    await page.waitForSelector('.song-line', { timeout: 30000 })
    await page.waitForTimeout(600)
    const el = await page.$('.sheet-root')
    await el.screenshot({ path: `${out}/${s.number}-${mode}.png` })
    console.log(mode, s.number, 'ok')
  }
  await ctx.close()
}
await browser.close()
