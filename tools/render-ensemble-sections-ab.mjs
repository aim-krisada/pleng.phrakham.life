// Render the ท่อน (section) A/B for P'Aim: the SAME song, โหมดรวมวง, เปียโนนำ, once through the
// shipped code and once through the fix. Both sides run the REAL playEnsemble on an
// OfflineAudioContext with the real samples (docs/spikes/ensemble-preecho-render.*).
//
// "Before" is not a flag — it is the shipped code, checked out in its own worktree and served by
// its own vite. So the two sides cannot silently be the same build (the trap that produced a fake
// A/B on 24 ก.ค.): each front server is probed and must report the expected number of
// resolveSections(content, notes) call sites — 1 = before (playSong only) · 2 = after (playEnsemble
// too). A mismatch aborts instead of writing evidence.
//
// House rules: OWN Chromium, OWN debug port, OWN absolute --user-data-dir. Never touches P'Aim's
// browser or any server he is looking at.
//
//   worktree A (base commit):  npx vite --port 5441 --host   +  node tools/serve-render.mjs 5443 5441
//   worktree B (this branch):  npx vite --port 5442 --host   +  node tools/serve-render.mjs 5444 5442
//   node tools/render-ensemble-sections-ab.mjs 5443 5444 <outDir>
import { WebSocket } from 'ws'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import os from 'node:os'

const FRONT_BEFORE = Number(process.argv[2] || 5443)
const FRONT_AFTER = Number(process.argv[3] || 5444)
const OUT = process.argv[4] || 'C:/gl/pm-inbox/pleng/audio-2026-07-24-ensemble-sections'
const CDP_PORT = 9419                                     // ⛔ not 9222 (P'Aim's), not another session's
const PROFILE = path.join(os.tmpdir(), 'chromium-ensemble-sections-9419')
const CHROMIUM = 'C:/Users/aimkr/AppData/Local/Chromium/Application/chrome.exe'

// Two songs the ensemble used to play with NO sections at all. Windows chosen from the RESOLVED
// section map so each clip spans several วรรค — a clip inside one วรรค would sound the same either
// way and the A/B would be a placebo.
const CLIPS = [
  { number: 90, lead: 'piano', atBeat: 0, pad: 0, tail: 30 },   // 110bpm · 6 วรรค, chorus/verse alternating
  { number: 106, lead: 'piano', atBeat: 32, pad: 12, tail: 18 }, // 112bpm · เต็ม→เบา→เต็ม across beat 32
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

// anti-placebo: prove which build each front server is actually serving
async function assertBuild(port, expected, label) {
  const src = await (await fetch(`http://127.0.0.1:${port}/src/lib/midi.js`)).text()
  // the CALL SITES only — `export function resolveSections(content, notes)` matches too, and both
  // builds have that one.
  const n = (src.match(/const sections = resolveSections\(content, notes\)/g) || []).length
  if (n !== expected) throw new Error(`front :${port} (${label}) has ${n} resolveSections call sites, expected ${expected} — WRONG BUILD`)
  console.log(`front :${port} = ${label} (resolveSections call sites: ${n}) ✓`)
}

async function render(front, side, c) {
  const { ws, send } = conn(await cdpUrl())
  try {
    const url = `http://127.0.0.1:${front}/docs/spikes/ensemble-preecho-render.html`
      + `?number=${c.number}&lead=${c.lead}&pre=off&atBeat=${c.atBeat}&pad=${c.pad}&tail=${c.tail}`
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const ev = (m, p) => send(m, p, sessionId)
    await ev('Runtime.enable'); await ev('Page.enable')
    await ev('Page.navigate', { url })

    let res = null
    for (let i = 0; i < 600; i++) {
      await sleep(500)
      const r = await ev('Runtime.evaluate', {
        expression: 'window.__RESULT ? JSON.stringify({ok:__RESULT.ok,error:__RESULT.error,number:__RESULT.number,title:__RESULT.title,lead:__RESULT.lead,bpm:__RESULT.bpm,clipSec:__RESULT.clipSec,peak:__RESULT.peak,rms:__RESULT.rms,sampleErrors:__RESULT.sampleErrors,log:__RESULT.log}) : ""',
        returnByValue: true, awaitPromise: true,
      })
      if (r.result?.value) { res = JSON.parse(r.result.value); break }
    }
    if (!res) throw new Error(`timed out: #${c.number} ${side}`)
    if (!res.ok) throw new Error(`render failed: ${res.error}\n${(res.log || []).join('\n')}`)

    const total = (await ev('Runtime.evaluate', { expression: 'window.__B64 = window.__RESULT._b64(); window.__B64.length', returnByValue: true, awaitPromise: true })).result.value
    const SIZE = 4 * 1024 * 1024
    let b64 = ''
    for (let i = 0; i * SIZE < total; i++) {
      b64 += (await ev('Runtime.evaluate', { expression: `window.__B64.slice(${i * SIZE}, ${(i + 1) * SIZE})`, returnByValue: true })).result.value
    }
    const buf = Buffer.from(b64, 'base64')
    const name = `${String(c.number).padStart(3, '0')}-${side}.wav`
    fs.writeFileSync(path.join(OUT, name), buf)
    await send('Target.closeTarget', { targetId })
    return { ...res, side, file: name, bytes: buf.length, sha: buf.length }
  } finally { ws.close() }
}

await assertBuild(FRONT_BEFORE, 1, 'BEFORE (shipped)')
await assertBuild(FRONT_AFTER, 2, 'AFTER (fix)')

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(PROFILE, { recursive: true })
const chrome = spawn(CHROMIUM, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--remote-allow-origins=*',
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required', '--mute-audio',
], { stdio: 'ignore' })

const rows = []
try {
  for (const c of CLIPS) {
    for (const [side, front] of [['A-ก่อนแก้', FRONT_BEFORE], ['B-หลังแก้', FRONT_AFTER]]) {
      const r = await render(front, side, c)
      rows.push(r)
      console.log(`${r.file.padEnd(22)} ${r.title} · ${r.clipSec.toFixed(2)}s · peak ${r.peak.toFixed(4)} · rms ${r.rms.toFixed(5)} · sampleErrors ${r.sampleErrors.length} · ${(r.bytes / 1024).toFixed(0)} KB`)
    }
  }
} finally { chrome.kill() }

const bad = rows.filter((r) => r.sampleErrors.length)
const silent = rows.filter((r) => r.peak < 0.01)
console.log(`\nclips: ${rows.length} · with sample errors: ${bad.length} · silent: ${silent.length}`)
if (bad.length) console.log('SAMPLE ERRORS:\n' + bad.map((r) => `  ${r.file}: ${r.sampleErrors.slice(0, 3).join(' | ')}`).join('\n'))
for (const c of CLIPS) {
  const a = rows.find((r) => r.number === c.number && r.side.startsWith('A'))
  const b = rows.find((r) => r.number === c.number && r.side.startsWith('B'))
  if (a && b) console.log(`#${c.number}: rms A ${a.rms.toFixed(5)} vs B ${b.rms.toFixed(5)} · peak A ${a.peak.toFixed(4)} vs B ${b.peak.toFixed(4)} · ${a.rms === b.rms ? '⚠ IDENTICAL — placebo' : 'differ ✓'}`)
}
fs.writeFileSync(path.join(OUT, 'render-log.json'), JSON.stringify(rows, null, 2))
