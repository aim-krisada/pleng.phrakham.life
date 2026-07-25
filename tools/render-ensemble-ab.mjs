// Drive docs/spikes/ensemble-preecho-render.html to produce the A/B WAVs for P'Aim.
//
// House rules: OWN Chromium instance, OWN debug port, OWN absolute --user-data-dir. Never drives
// P'Aim's browser and never touches a server he is looking at.
//
//   npm run dev -- --port 5321 --host        (in another shell)
//   node tools/render-ensemble-ab.mjs 5321 <outDir>
import { WebSocket } from 'ws'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import os from 'node:os'

const VITE_PORT = Number(process.argv[2] || 5321)
const OUT = process.argv[3] || 'C:/gl/pm-inbox/pleng/audio-2026-07-24-ensemble'
const CDP_PORT = 9417                                     // ⛔ not 9222 (P'Aim's), not any session's
const PROFILE = path.join(os.tmpdir(), 'chromium-ensemble-ab-9417')
const CHROMIUM = 'C:/Users/aimkr/AppData/Local/Chromium/Application/chrome.exe'

// The clips. atBeat = the first measured pre-echo point in that song (docs/reports/ensemble-preecho.md).
// A and B differ ONLY in `pre`.
// atBeat = a beat where the rule ACTUALLY removes an ornament (from the `vetoed events` dump in
// tools/diag-ensemble-preecho.test.mjs) — not merely where one was measured. A window that contains
// no silenced note would make the A/B a placebo.
const CLIPS = [
  { number: 747, lead: 'violin', atBeat: 6, pad: 3, tail: 7 },      // 3.00s @120bpm
  { number: 76, lead: 'violin', atBeat: 21, pad: 3, tail: 7 },      // 17.50s @72bpm
  { number: 118, lead: 'violin', atBeat: 7.25, pad: 3, tail: 7 },   // 5.44s @80bpm
  { number: 730, lead: 'guitar', atBeat: 26.92, pad: 3, tail: 7 },  // 13.46s @120bpm
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function cdpUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)
      const j = await r.json()
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
  const events = []
  const ready = new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString())
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id) }
    else events.push(m)
  })
  const send = async (method, params = {}, sessionId) => {
    await ready
    const myId = ++id
    return new Promise((res, rej) => {
      waiting.set(myId, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)))
      ws.send(JSON.stringify({ id: myId, method, params, sessionId }))
    })
  }
  return { ws, send, ready, events }
}

async function render(c) {
  const { ws, send } = conn(await cdpUrl())
  try {
    const url = `http://127.0.0.1:${VITE_PORT}/docs/spikes/ensemble-preecho-render.html`
      + `?number=${c.number}&lead=${c.lead}&pre=${c.pre}&atBeat=${c.atBeat}&pad=${c.pad}&tail=${c.tail}`
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const ev = (m, p) => send(m, p, sessionId)
    await ev('Runtime.enable')
    await ev('Page.enable')
    await ev('Page.navigate', { url })

    let res = null
    for (let i = 0; i < 600; i++) {                       // up to 5 min per clip
      await sleep(500)
      const r = await ev('Runtime.evaluate', {
        expression: 'window.__RESULT ? JSON.stringify({ok:__RESULT.ok,error:__RESULT.error,number:__RESULT.number,title:__RESULT.title,lead:__RESULT.lead,pre:__RESULT.pre,bpm:__RESULT.bpm,clipSec:__RESULT.clipSec,peak:__RESULT.peak,rms:__RESULT.rms,sampleErrors:__RESULT.sampleErrors,log:__RESULT.log}) : ""',
        returnByValue: true, awaitPromise: true,
      })
      const v = r.result?.value
      if (v) { res = JSON.parse(v); break }
    }
    if (!res) throw new Error(`timed out: #${c.number} ${c.lead} ${c.pre}`)
    if (!res.ok) throw new Error(`render failed: ${res.error}\n${(res.log || []).join('\n')}`)

    // pull the WAV out in chunks (one CDP return value cannot hold a megabyte of base64)
    const { result: lenR } = { result: (await ev('Runtime.evaluate', { expression: 'window.__B64 = window.__RESULT._b64(); window.__B64.length', returnByValue: true, awaitPromise: true })).result }
    const total = lenR.value
    const SIZE = 4 * 1024 * 1024
    let b64 = ''
    for (let i = 0; i * SIZE < total; i++) {
      const r = await ev('Runtime.evaluate', { expression: `window.__B64.slice(${i * SIZE}, ${(i + 1) * SIZE})`, returnByValue: true })
      b64 += r.result.value
    }
    const name = `${c.lead}-${String(c.number).padStart(3, '0')}-${c.pre === 'off' ? 'A' : 'B'}.wav`
    fs.writeFileSync(path.join(OUT, name), Buffer.from(b64, 'base64'))
    await send('Target.closeTarget', { targetId })
    return { ...res, file: name, bytes: Buffer.from(b64, 'base64').length }
  } finally { ws.close() }
}

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(PROFILE, { recursive: true })
const chrome = spawn(CHROMIUM, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--remote-allow-origins=*',
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required', '--mute-audio',
], { stdio: 'ignore' })

const rows = []
try {
  for (const c of CLIPS) for (const pre of ['off', 'all']) {
    const r = await render({ ...c, pre })
    rows.push(r)
    console.log(`${r.file.padEnd(22)} ${r.title} · ${r.clipSec.toFixed(2)}s · peak ${r.peak.toFixed(4)} · rms ${r.rms.toFixed(5)} · sampleErrors ${r.sampleErrors.length} · ${(r.bytes / 1024).toFixed(0)} KB`)
  }
} finally { chrome.kill() }

const bad = rows.filter((r) => r.sampleErrors.length)
const silent = rows.filter((r) => r.peak < 0.01)
console.log(`\nclips: ${rows.length} · with sample errors: ${bad.length} · silent: ${silent.length}`)
if (bad.length) console.log('SAMPLE ERRORS:\n' + bad.map((r) => `  ${r.file}: ${r.sampleErrors.slice(0, 3).join(' | ')}`).join('\n'))
// A vs B must actually DIFFER for the violin/guitar pairs, or the A/B is a placebo.
for (const c of CLIPS) {
  const a = rows.find((r) => r.number === c.number && r.pre === 'off')
  const b = rows.find((r) => r.number === c.number && r.pre === 'all')
  if (a && b) console.log(`#${c.number} ${c.lead}: rms A ${a.rms.toFixed(5)} vs B ${b.rms.toFixed(5)} · ${a.rms === b.rms ? '⚠ IDENTICAL (nothing was silenced in this window)' : 'differ ✓'}`)
}
fs.writeFileSync(path.join(OUT, 'render-log.json'), JSON.stringify(rows, null, 2))
