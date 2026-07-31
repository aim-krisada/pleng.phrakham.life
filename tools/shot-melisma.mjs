// Screenshot song 712 line 3 (li=2) on screen + in print emulation. Own Chromium/port/profile.
// node tools/shot-melisma.mjs <frontPort>   (BASE env overrides)
import { WebSocket } from 'ws'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const FRONT = Number(process.argv[2] || 5471)
const BASE = process.env.BASE || `http://127.0.0.1:${FRONT}`
const ID = process.env.ID || 'ff1997e5-09e5-44a0-9a4d-b47f2c80b037'
const OUT = process.env.OUT || 'C:/gl/pm-inbox/pleng/melisma-shots'
const CDP_PORT = 9472
const PROFILE = path.join(os.tmpdir(), 'chromium-melisma-shot-9472')
const CHROMIUM = 'C:/Users/aimkr/AppData/Local/Chromium/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })

async function cdpUrl() {
  for (let i = 0; i < 60; i++) {
    try { const j = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl } catch {}
    await sleep(500)
  }
  throw new Error('no CDP')
}
function conn(url) {
  const ws = new WebSocket(url, { maxPayload: 256 * 1024 * 1024 })
  let id = 0; const waiting = new Map()
  const ready = new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
  ws.on('message', (raw) => { const m = JSON.parse(raw.toString()); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id) } })
  const send = async (method, params = {}, sessionId) => { await ready; const myId = ++id; return new Promise((res, rej) => { waiting.set(myId, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: myId, method, params, sessionId })) }) }
  return { send }
}
const proc = spawn(CHROMIUM, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--remote-allow-origins=*', `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', '--force-device-scale-factor=2', '--window-size=430,2600', 'about:blank'], { stdio: 'ignore' })

async function shoot(send, sessionId, label, media) {
  const ev = (m, p) => send(m, p, sessionId)
  if (media) await ev('Emulation.setEmulatedMedia', { media })
  await sleep(600)
  const box = (await ev('Runtime.evaluate', { expression: `(() => {
    const l = [...document.querySelectorAll('.song-line')].filter(e=>e.getBoundingClientRect().width>0)[2]
    if(!l) return null; const r = l.getBoundingClientRect()
    return {x:Math.floor(r.left)-6,y:Math.floor(r.top)-6,width:Math.ceil(r.width)+12,height:Math.ceil(r.height)+12,scale:1}
  })()`, returnByValue: true })).result.value
  if (!box) { console.log(label, 'no line'); return }
  const shot = await ev('Page.captureScreenshot', { format: 'png', clip: { ...box }, fromSurface: true, captureBeyondViewport: true })
  const f = path.join(OUT, `712-line3-${label}.png`)
  fs.writeFileSync(f, Buffer.from(shot.data, 'base64'))
  console.log('wrote', f, JSON.stringify(box))
}

async function main() {
  const { send } = conn(await cdpUrl())
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const ev = (m, p) => send(m, p, sessionId)
  await ev('Runtime.enable'); await ev('Page.enable')
  await ev('Page.navigate', { url: `${BASE}/#/song/${ID}` })
  for (let i = 0; i < 60; i++) { await sleep(500); if ((await ev('Runtime.evaluate', { expression: `!!document.querySelector('.song-line')`, returnByValue: true })).result.value) break }
  await sleep(1500)
  await shoot(send, sessionId, 'screen', 'screen')
  await shoot(send, sessionId, 'print', 'print')
  proc.kill()
}
main().catch((e) => { console.error(e); proc.kill(); process.exit(1) })
