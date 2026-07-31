// Measure the width chain + tie-overlay for song 712 on /v2 (own Chromium, own port/profile).
// node tools/diag-melisma-rects.mjs <frontPort> [songNumber]
import { WebSocket } from 'ws'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

const FRONT = Number(process.argv[2] || 5471)
const NUMBER = Number(process.argv[3] || 712)
const CDP_PORT = 9471
const PROFILE = path.join(os.tmpdir(), 'chromium-melisma-9471')
const CHROMIUM = 'C:/Users/aimkr/AppData/Local/Chromium/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function cdpUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl
    } catch {}
    await sleep(500)
  }
  throw new Error('Chromium did not expose CDP')
}
function conn(url) {
  const ws = new WebSocket(url, { maxPayload: 256 * 1024 * 1024 })
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

const proc = spawn(CHROMIUM, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--remote-allow-origins=*',
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  `--window-size=${process.env.WIN || '1200,2400'}`, 'about:blank',
], { stdio: 'ignore' })

async function main() {
  const { send } = conn(await cdpUrl())
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const ev = (m, p) => send(m, p, sessionId)
  await ev('Runtime.enable'); await ev('Page.enable')
  const evalx = async (expression) =>
    (await ev('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value

  const id = process.argv[4] || 'ff1997e5-09e5-44a0-9a4d-b47f2c80b037'
  const BASE = process.env.BASE || `http://127.0.0.1:${FRONT}`
  // 2) navigate to the song
  await ev('Page.navigate', { url: `${BASE}/#/song/${id}` })
  for (let i = 0; i < 60; i++) {
    await sleep(500)
    if (await evalx(`!!document.querySelector('.song-line')`)) break
  }
  await sleep(1200) // let measureTies settle

  const report = await evalx(`(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    const rect = (el) => el ? (() => { const r = el.getBoundingClientRect(); return {w:+r.width.toFixed(1),h:+r.height.toFixed(1),l:+r.left.toFixed(1),t:+r.top.toFixed(1)} })() : null
    // only VISIBLE song-lines (hidden lyric-set copies have rect 0)
    const allLines = [...document.querySelectorAll('.song-line')]
    const lines = allLines.filter(vis).map((l) => {
      const li = l.dataset.li
      const overlay = l.querySelector('svg.tie-overlay')
      const paths = overlay ? overlay.querySelectorAll('path').length : 0
      const segs = [...l.querySelectorAll('.segment[data-seg]')].map(s=>s.dataset.seg)
      return { li, ...rect(l), overlay: !!overlay, paths, segs }
    })
    // focus: the visible line containing segment "2-2" (712 line3 bar2), notes idx2=5 idx3=3
    const seg22 = [...document.querySelectorAll('.segment[data-seg="2-2"]')].filter(vis)[0]
    let focus = null
    if (seg22) {
      const line = seg22.closest('.song-line')
      const n2 = seg22.querySelector('.nt[data-idx="2"]')
      const n3 = seg22.querySelector('.nt[data-idx="3"]')
      const overlay = line.querySelector('svg.tie-overlay')
      focus = {
        segText: seg22.querySelector('.note-row')?.textContent?.trim().slice(0,40),
        n2: rect(n2), n3: rect(n3),
        n2num: n2?.querySelector('.num')?.textContent,
        n3num: n3?.querySelector('.num')?.textContent,
        lineOverlay: !!overlay,
        paths: overlay ? [...overlay.querySelectorAll('path')].map(p=>p.getAttribute('d').slice(0,60)) : [],
        viewBox: overlay?.getAttribute('viewBox'),
      }
    }
    return {
      overlaysTotal: document.querySelectorAll('svg.tie-overlay').length,
      visibleLineCount: lines.length,
      lines, focus,
    }
  })()`)
  console.log(JSON.stringify(report, null, 2))
  proc.kill()
}
main().catch((e) => { console.error(e); proc.kill(); process.exit(1) })
