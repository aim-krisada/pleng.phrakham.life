// Evidence renders for "717 multi-lyric on /v2" (the lyric-set tabs + set filtering).
//
// Renders the REAL SongViewer (demo-v2-lyricsets.html) at desktop and 360px, clicks the
// SECOND tab for real, and MEASURES rather than eyeballs:
//   · every tab's right edge ≤ the strip's right edge  (no horizontal overflow at 360)
//   · document.scrollWidth ≤ viewport width            (the page never scrolls sideways)
//   · each tab's rendered height ≥ 44px on a coarse pointer
//   · the words on the sheet belong to the ACTIVE set only, and the shared (no-`set`)
//     refrain shows under both — read from the DOM after a real click
//
// House rules (C:\gl\CLAUDE.md §4): OWN Chromium, OWN debug port, OWN absolute
// --user-data-dir. Never touches P'Aim's browser (:9222) or any server he is looking at.
//
//   npx vite --port 5397 --host
//   node tools/render-v2-lyricsets.mjs 5397 <outDir>
import { WebSocket } from 'ws'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import os from 'node:os'

const FRONT = Number(process.argv[2] || 5397)
const OUT = process.argv[3] || 'C:/gl/pm-inbox/pleng/evidence/2026-07-26-v2-lyricsets'
const CDP_PORT = 9341 // ⛔ not 9222 (P'Aim's), not 9335 (ai-bridge), not another session's
const PROFILE = path.join(os.tmpdir(), 'chromium-v2-lyricsets-9341')
const CHROMIUM = 'C:/Users/aimkr/AppData/Local/Chromium/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWS = [
  { label: 'desktop', width: 1280, height: 900, dsf: 1, mobile: false },
  { label: '360', width: 360, height: 780, dsf: 2, mobile: true },
  { label: '320', width: 320, height: 720, dsf: 2, mobile: true },
]

async function cdpUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl
    } catch { /* not up yet */ }
    await sleep(500)
  }
  throw new Error('Chromium did not expose CDP')
}

function conn(url) {
  const ws = new WebSocket(url, { maxPayload: 512 * 1024 * 1024 })
  let id = 0
  const waiting = new Map()
  const ready = new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString())
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id) }
  })
  const send = async (method, params = {}, sessionId) => {
    await ready
    const myId = ++id
    return new Promise((res, rej) => {
      waiting.set(myId, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)))
      ws.send(JSON.stringify({ id: myId, method, params, sessionId }))
    })
  }
  return { ws, send }
}

// anti-placebo: prove the server really serves THIS branch's set-aware viewer
async function assertBuild() {
  const src = await (await fetch(`http://127.0.0.1:${FRONT}/src/components/SongViewer.vue`)).text()
  if (!/lyric-set-tabs/.test(src) || !/resolveContent\(props\.song\.content, setOpt\.value\)/.test(src))
    throw new Error(`front :${FRONT} serves a SongViewer with no lyric-set code — WRONG BUILD`)
  const model = await (await fetch(`http://127.0.0.1:${FRONT}/src/lib/songModel.js`)).text()
  if (!/lyricSetFilter/.test(model)) throw new Error(`front :${FRONT} serves an old songModel — WRONG BUILD`)
  console.log(`front :${FRONT} serves the set-aware viewer + model ✓`)
}

// what the page reports about itself — measured, not guessed
const PROBE = `(() => {
  const strip = document.querySelector('.lyric-set-tabs')
  const tabs = [...document.querySelectorAll('.lset-tab')]
  const sr = strip ? strip.getBoundingClientRect() : null
  const words = [...document.querySelectorAll('.sheet-scale')]
    .map(e => e.innerText).join(' ')
  return {
    tabCount: tabs.length,
    stripRight: sr ? +sr.right.toFixed(2) : null,
    stripLeft: sr ? +sr.left.toFixed(2) : null,
    stripHeight: sr ? +sr.height.toFixed(2) : null,
    tabs: tabs.map(t => {
      const r = t.getBoundingClientRect()
      return {
        text: t.textContent.trim(),
        left: +r.left.toFixed(2), right: +r.right.toFixed(2), top: +r.top.toFixed(2),
        width: +r.width.toFixed(2), height: +r.height.toFixed(2),
        active: t.classList.contains('active'),
        ariaSelected: t.getAttribute('aria-selected'),
        tabIndex: t.getAttribute('tabindex'),
      }
    }),
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    coarse: window.matchMedia('(pointer: coarse)').matches,
    hasSetOne: /หนึ่ง1/.test(words),
    hasSetTwo: /สอง1/.test(words),
    hasShared: /รับ1/.test(words),
    verseHeadings: [...document.querySelectorAll('.sheet-scale')]
      .map(e => (e.innerText.match(/ข้อ \\d+/g) || []).join(',')).join('|'),
    printTitle: (document.querySelector('.lead-title') || {}).textContent || '',
  }
})()`

async function shoot(ev, file) {
  const { data } = await ev('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64'))
  return file
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true })
  await assertBuild()
  fs.rmSync(PROFILE, { recursive: true, force: true })
  const child = spawn(CHROMIUM, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${PROFILE}`, // ABSOLUTE — relative is an error
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    'about:blank',
  ], { stdio: 'ignore', detached: false })

  const report = []
  const { ws, send } = conn(await cdpUrl())
  try {
    for (const v of VIEWS) {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
      const ev = (m, p) => send(m, p, sessionId)
      await ev('Runtime.enable'); await ev('Page.enable'); await ev('Emulation.enable').catch(() => {})
      await ev('Emulation.setDeviceMetricsOverride', {
        width: v.width, height: v.height, deviceScaleFactor: v.dsf, mobile: v.mobile,
      })
      // pointer:coarse — a phone, so the 44px touch-target rule is the one under test
      if (v.mobile) await ev('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' })
      await ev('Page.navigate', { url: `http://127.0.0.1:${FRONT}/demo-v2-lyricsets.html` })
      await sleep(2500)

      const probe = async () => JSON.parse((await ev('Runtime.evaluate', {
        expression: `JSON.stringify(${PROBE})`, returnByValue: true,
      })).result.value)

      const set1 = await probe()
      const png1 = await shoot(ev, `v2-lyricsets-${v.label}-set1.png`)

      // click the SECOND tab for real, then re-measure after Vue flushes
      await ev('Runtime.evaluate', { expression: `document.querySelectorAll('.lset-tab')[1].click()` })
      await sleep(500)
      const set2 = await probe()
      const png2 = await shoot(ev, `v2-lyricsets-${v.label}-set2.png`)

      // the back-compat control: the SAME page with an ordinary song (no lyricSets)
      await ev('Page.navigate', { url: `http://127.0.0.1:${FRONT}/demo-v2-lyricsets.html?song=plain` })
      await sleep(2000)
      const plain = await probe()
      const png3 = await shoot(ev, `v2-lyricsets-${v.label}-plain.png`)

      report.push({ view: v, set1, set2, plain, png: [png1, png2, png3] })
      await send('Target.closeTarget', { targetId })
    }
  } finally {
    ws.close()
    try { child.kill() } catch { /* already gone */ }
  }

  // ---- verdict, computed from the measurements ------------------------------------------
  const fails = []
  const ok = (cond, msg) => { if (!cond) fails.push(msg) }
  for (const r of report) {
    const w = r.view.label
    ok(r.set1.tabCount === 2, `${w}: expected 2 tabs, got ${r.set1.tabCount}`)
    // no horizontal overflow — every tab inside the strip, page never scrolls sideways
    for (const t of r.set1.tabs) {
      ok(t.right <= r.set1.stripRight + 0.5, `${w}: tab "${t.text}" right ${t.right} > strip right ${r.set1.stripRight}`)
      ok(t.left >= r.set1.stripLeft - 0.5, `${w}: tab "${t.text}" left ${t.left} < strip left ${r.set1.stripLeft}`)
      ok(t.right <= r.set1.innerWidth + 0.5, `${w}: tab "${t.text}" right ${t.right} > viewport ${r.set1.innerWidth}`)
    }
    ok(r.set1.docScrollWidth <= r.set1.innerWidth + 1, `${w}: page scrolls sideways (${r.set1.docScrollWidth} > ${r.set1.innerWidth})`)
    // touch target
    if (r.view.mobile) {
      ok(r.set1.coarse, `${w}: expected pointer:coarse under mobile emulation`)
      for (const t of r.set1.tabs) ok(t.height >= 44, `${w}: tab "${t.text}" is ${t.height}px tall (<44)`)
    }
    // set filtering, measured off the real sheet
    ok(r.set1.hasSetOne && !r.set1.hasSetTwo, `${w}: set 1 sheet shows the wrong words (one=${r.set1.hasSetOne} two=${r.set1.hasSetTwo})`)
    ok(r.set2.hasSetTwo && !r.set2.hasSetOne, `${w}: after the click set 2's sheet is wrong (one=${r.set2.hasSetOne} two=${r.set2.hasSetTwo})`)
    ok(r.set1.hasShared && r.set2.hasShared, `${w}: the shared (no-set) refrain is missing from a set`)
    ok(r.set1.tabs[0].active && !r.set1.tabs[1].active, `${w}: first tab not active on load`)
    ok(r.set2.tabs[1].active && !r.set2.tabs[0].active, `${w}: clicking tab 2 did not activate it`)
    ok(r.set2.tabs[1].tabIndex === '0' && r.set2.tabs[0].tabIndex === '-1', `${w}: roving tabindex not applied after switch`)
    // print heading names the set
    ok(/เนื้อร้องชุดที่หนึ่ง/.test(r.set1.printTitle), `${w}: heading does not name set 1 (${r.set1.printTitle})`)
    ok(/เนื้อร้องชุดที่สอง/.test(r.set2.printTitle), `${w}: heading does not name set 2 (${r.set2.printTitle})`)
    // BACK-COMPAT control: an ordinary song has no tabs, no set suffix, no sideways scroll
    ok(r.plain.tabCount === 0, `${w}: an ordinary song grew ${r.plain.tabCount} lyric-set tabs`)
    ok(!/ — /.test(r.plain.printTitle), `${w}: an ordinary song's heading got a set suffix (${r.plain.printTitle})`)
    ok(r.plain.docScrollWidth <= r.plain.innerWidth + 1, `${w}: ordinary song scrolls sideways`)
  }

  const out = {
    front: FRONT, cdpPort: CDP_PORT, when: new Date().toISOString(),
    verdict: fails.length ? 'FAIL' : 'PASS',
    failures: fails,
    measurements: report,
  }
  fs.writeFileSync(path.join(OUT, 'v2-lyricsets-measure.json'), JSON.stringify(out, null, 2))
  for (const r of report) {
    const t = r.set1.tabs
    console.log(`${r.view.label.padEnd(8)} w=${r.set1.innerWidth} coarse=${r.set1.coarse} scrollW=${r.set1.docScrollWidth} ` +
      `strip=[${r.set1.stripLeft},${r.set1.stripRight}] h=${r.set1.stripHeight} ` +
      `tabs=${t.map((x) => `${x.width}x${x.height}@y${x.top}`).join(' ')} plainTabs=${r.plain.tabCount}`)
  }
  console.log(`\n${out.verdict}${fails.length ? ':\n - ' + fails.join('\n - ') : ' — every measured check held'}`)
  process.exit(fails.length ? 1 : 0)
}

run().catch((e) => { console.error(e); process.exit(2) })
