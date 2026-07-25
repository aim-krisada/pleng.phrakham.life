// Evidence renders for "ฟังตอนแก้" (PM 24 ก.ค.) — drives docs/spikes/editor-scope-render.html.
//
// Four renders of ONE real song, each a clean page load, each pressing a REAL button:
//   listen-section   โหมดฟัง — tick only that ท่อน in the dock, press the dock's ▶
//   listen-section-2 the SAME thing again — the determinism CONTROL
//   edit-section     the pencil's ▶ ท่อนนี้   (cursor on --li)
//   edit-line        the pencil's ▶ บรรทัดนี้ (cursor on --li)  ← the headline: the แก้→ฟัง loop
//
// The gate: listen-section and edit-section must have the SAME sha256 of the audio payload. If the
// editor had grown its own audio path — a different instrument, a different arranger recipe, a
// missing sparkle rule — they could not be bit-identical. The control run is what makes that claim
// mean anything: if the two listen renders already differ, the A/B proves nothing and we say so
// rather than reporting a pass. Any sampleErrors > 0 fails the run (a sample answered with
// index.html would make the clip a lie).
//
// House rules: OWN Chromium, OWN debug port, OWN absolute --user-data-dir. Never touches P'Aim's
// browser or any server he is looking at.
//
//   npx vite --port 5494 --host
//   node tools/render-editor-scope.mjs 5494 <outDir> [songNumber] [li]
import { WebSocket } from 'ws'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import os from 'node:os'

const FRONT = Number(process.argv[2] || 5494)
const OUT = process.argv[3] || 'C:/gl/pm-inbox/pleng/audio-2026-07-24-editor-playback'
const NUMBER = Number(process.argv[4] || 141)
const LI = Number(process.argv[5] ?? 1)
const CDP_PORT = 9493 // ⛔ not 9222 (P'Aim's), not another session's
const PROFILE = path.join(os.tmpdir(), 'chromium-editor-scope-9493')
const CHROMIUM = 'C:/Users/aimkr/AppData/Local/Chromium/Application/chrome.exe'

// [label, query mode, extra query] — the label is what the file and the report are named by
const MODES = [
  ['listen-section', 'listen-section', ''],
  ['listen-section-control', 'listen-section', '&control=1'],
  ['edit-section', 'edit-section', ''],
  ['edit-line', 'edit-line', ''],
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

// anti-placebo: prove the server really is serving THIS branch's editor transport
async function assertBuild() {
  const src = await (await fetch(`http://127.0.0.1:${FRONT}/src/components/SongViewer.vue`)).text()
  const n = (src.match(/sv-play-btn/g) || []).length
  if (!n) throw new Error(`front :${FRONT} serves a SongViewer with no edit transport — WRONG BUILD`)
  console.log(`front :${FRONT} serves the editor transport (sv-play-btn ×${n}) ✓`)
}

async function render(label, mode, extra) {
  const { ws, send } = conn(await cdpUrl())
  try {
    const url = `http://127.0.0.1:${FRONT}/docs/spikes/editor-scope-render.html`
      + `?number=${NUMBER}&mode=${mode}&li=${LI}${extra}`
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const ev = (m, p) => send(m, p, sessionId)
    await ev('Runtime.enable'); await ev('Page.enable')
    await ev('Page.navigate', { url })

    let res = null
    for (let i = 0; i < 1400; i++) {
      await sleep(500)
      const r = await ev('Runtime.evaluate', {
        expression: 'window.__RESULT ? JSON.stringify({ok:__RESULT.ok,error:__RESULT.error,number:__RESULT.number,title:__RESULT.title,mode:__RESULT.mode,li:__RESULT.li,bpm:__RESULT.bpm,clipSec:__RESULT.clipSec,peak:__RESULT.peak,rms:__RESULT.rms,sha:__RESULT.sha,sampleErrors:__RESULT.sampleErrors,log:__RESULT.log}) : ""',
        returnByValue: true, awaitPromise: true,
      })
      if (r.result?.value) { res = JSON.parse(r.result.value); break }
    }
    if (!res) throw new Error(`timed out: ${label}`)
    if (!res.ok) throw new Error(`render failed (${label}): ${res.error}\n${(res.log || []).join('\n')}`)

    const total = (await ev('Runtime.evaluate', { expression: 'window.__B64 = window.__RESULT._b64(); window.__B64.length', returnByValue: true, awaitPromise: true })).result.value
    const SIZE = 4 * 1024 * 1024
    let b64 = ''
    for (let i = 0; i * SIZE < total; i++) {
      b64 += (await ev('Runtime.evaluate', { expression: `window.__B64.slice(${i * SIZE}, ${(i + 1) * SIZE})`, returnByValue: true })).result.value
    }
    const buf = Buffer.from(b64, 'base64')
    const name = `${String(NUMBER).padStart(3, '0')}-${label}.wav`
    fs.writeFileSync(path.join(OUT, name), buf)
    fs.writeFileSync(path.join(OUT, `${String(NUMBER).padStart(3, '0')}-${label}.log.txt`), (res.log || []).join('\n'))
    await send('Target.closeTarget', { targetId })
    return { ...res, label, file: name, bytes: buf.length }
  } finally { ws.close() }
}

// A Chromium already on our debug port is almost always OUR OWN leftover from a killed run. It
// answers CDP happily, so a new spawn would exit on the locked profile and we would silently drive
// the STALE browser — with the old flags and the old page state. That is how a "hang" that was
// really timer throttling survived a flag fix. Refuse to start instead of producing false evidence.
async function assertPortFree() {
  try {
    const j = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`, { signal: AbortSignal.timeout(2000) })).json()
    throw new Error(
      `CDP port ${CDP_PORT} is already answering (${j.Browser}) — a stale render Chromium is still alive.\n` +
      `Kill it first:  powershell "Get-CimInstance Win32_Process -Filter \\"Name='chrome.exe'\\" | ? { $_.CommandLine -like '*${CDP_PORT}*' } | % { taskkill /PID $_.ProcessId /T /F }"`,
    )
  } catch (e) {
    if (/already answering/.test(e.message)) throw e // our own refusal — not a connection failure
  }
}

await assertPortFree()
await assertBuild()
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(PROFILE, { recursive: true })
const chrome = spawn(CHROMIUM, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--remote-allow-origins=*',
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required', '--mute-audio',
  // a CDP-created target is treated as a background tab: setTimeout is throttled to ~1 Hz, which
  // turns the page's own polling into a 10-minute crawl and looks exactly like a hang.
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
], { stdio: 'ignore' })

const rows = []
try {
  for (const [label, mode, extra] of MODES) {
    const r = await render(label, mode, extra)
    rows.push(r)
    console.log(`${r.file.padEnd(34)} ${r.clipSec.toFixed(2)}s · peak ${r.peak.toFixed(4)} · rms ${r.rms.toFixed(5)} · sampleErrors ${r.sampleErrors.length} · sha ${r.sha.slice(0, 16)}`)
  }
} finally {
  // chrome.kill() only reaches the launcher — the browser process tree survives and keeps the CDP
  // port, which is the stale-browser trap above. Take the whole tree down.
  try { spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* best effort */ }
  chrome.kill()
}

fs.writeFileSync(path.join(OUT, 'render-log.json'), JSON.stringify(rows, null, 2))

const bad = rows.filter((r) => r.sampleErrors.length)
const silent = rows.filter((r) => r.peak < 0.01)
const listen = rows.find((r) => r.label === 'listen-section')
const control = rows.find((r) => r.label === 'listen-section-control')
const editSec = rows.find((r) => r.label === 'edit-section')
const deterministic = listen && control && listen.sha === control.sha
const same = listen && editSec && listen.sha === editSec.sha

console.log('')
console.log(`sample errors      : ${bad.length} ${bad.length ? '❌' : '✓'}`)
console.log(`silent clips       : ${silent.length} ${silent.length ? '❌' : '✓'}`)
console.log(`render determinism : ${deterministic ? 'same input → same bytes ✓' : '❌ NOT deterministic — the A/B below proves nothing'}`)
console.log(`โหมดฟัง ≡ ตัวแก้    : ${same ? 'BIT-IDENTICAL ✓' : '❌ DIFFERENT — the editor is a second audio path'}`)
for (const r of rows) console.log(`   ${r.label.padEnd(24)} ${r.clipSec.toFixed(2)}s  sha ${r.sha.slice(0, 24)}`)
if (bad.length) console.log(['SAMPLE ERRORS:', ...bad.map((r) => `  ${r.file}: ${r.sampleErrors.slice(0, 3).join(' | ')}`)].join('\n'))
process.exitCode = bad.length || silent.length || !deterministic || !same ? 1 : 0
