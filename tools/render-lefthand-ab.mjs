// อัดไฟล์เสียง "ก่อนแก้ / หลังแก้" ของกฎมือซ้าย 3 ข้อ (พี่เปา 30 ก.ค. 2569) ให้ครูฟังเทียบ
//
// กฎบ้าน: Chromium ของเราเอง · พอร์ตดีบักของเราเอง · --user-data-dir ของเราเอง
// ⛔ ไม่แตะเบราว์เซอร์/เซิร์ฟเวอร์ที่พี่เอมกำลังใช้ (:9222, :9335 และพอร์ตของ session อื่น)
//
//   node node_modules/vite/bin/vite.js --port 5761 --strictPort --host    (อีกหน้าต่างหนึ่ง)
//   node tools/render-lefthand-ab.mjs 5761 <outDir>
import { WebSocket } from 'ws'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'
import os from 'node:os'

const VITE_PORT = Number(process.argv[2] || 5761)
const OUT = process.argv[3] || 'C:/gl/pm-inbox/pleng/audio-before-after/audio'
const SONGS = process.argv[4] || '.scratch/songs.json'
const CDP_PORT = 9433 // ⛔ ไม่ใช่ 9222 (ของพี่เอม) / 9335 (ai-bridge) / พอร์ตของ session อื่น
const PROFILE = path.join(os.tmpdir(), 'chromium-lefthand-ab-9433')
const CHROMIUM = 'C:/Users/aimkr/AppData/Local/Chromium/Application/chrome.exe'
const PAGE = `http://127.0.0.1:${VITE_PORT}/render-ab.html`

// 3 เพลงที่เลือกจากตัวเลขจริง (tools/diag-lefthand-rules.mjs) ไม่ได้เลือกด้วยความรู้สึก
const CLIPS = [
  { number: 758, why: 'ผิดกฎครบทั้ง 3 ข้อหนักที่สุดในเพลงสั้น' },
  { number: 717, why: 'ต่อบรรทัดโดยมีโน้ตลากค้าง 36 จุด — ไว้ทดสอบข้อ 5 ของพี่เปา' },
  { number: 109, why: 'เพลงที่ทำนองลงไปอยู่ในย่านเสียงเบส (เคสยากที่สุด)' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const die = (m) => { console.error('\n⛔ ' + m + '\n'); process.exit(1) }

try { const r = await fetch(PAGE); if (!r.ok) throw new Error(String(r.status)) } catch {
  die(`dev server พอร์ต ${VITE_PORT} ไม่เปิด — เปิดก่อนด้วย:\n   node node_modules/vite/bin/vite.js --port ${VITE_PORT} --strictPort --host`)
}
console.log(`✓ dev server ${VITE_PORT} เปิดอยู่`)

const songs = JSON.parse(fs.readFileSync(SONGS, 'utf8'))
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(PROFILE, { recursive: true })

// จุดรับไฟล์เสียง — หน้าเว็บ POST ไฟล์มาที่นี่ แล้ว node เขียนลงดิสก์
// ⛔ ไม่พึ่งระบบ "ดาวน์โหลด" ของเบราว์เซอร์ เพราะทดลองแล้วมันกลืนไฟล์หายเงียบ ๆ ตรวจไม่ได้ว่าพลาด
const SINK_PORT = 5799
const sink = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return }
  const name = decodeURIComponent((req.url.split('name=')[1] || '').split('&')[0])
  if (req.method !== 'POST' || !name) { res.writeHead(400).end('bad'); return }
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const buf = Buffer.concat(chunks)
    fs.writeFileSync(path.join(OUT, path.basename(name)), buf)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ bytes: buf.length }))
  })
})
await new Promise((r) => sink.listen(SINK_PORT, '127.0.0.1', r))
console.log(`✓ จุดรับไฟล์เสียงพร้อมที่พอร์ต ${SINK_PORT}`)

const child = spawn(CHROMIUM, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`,
  '--remote-allow-origins=*', `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', 'about:blank'], { stdio: 'ignore' })
console.log(`✓ Chromium ของเราเอง pid=${child.pid} port=${CDP_PORT}`)

let ws, id = 0
const pending = new Map()
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, { res, rej })
  ws.send(JSON.stringify(sessionId ? { id: i, method, params, sessionId } : { id: i, method, params }))
})
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).ok) break } catch { /* not up */ } await sleep(500) }
const ver = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()
ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => { ws.onopen = r })
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result) }
}
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, S); await send('Runtime.enable', {}, S)
await send('Page.navigate', { url: PAGE }, S)

let ready = false
for (let i = 0; i < 120; i++) {
  await sleep(500)
  try { const r = await send('Runtime.evaluate', { expression: 'window.abReady === true', returnByValue: true }, S); if (r.result?.value === true) { ready = true; break } } catch { /* still loading */ }
}
if (!ready) { try { child.kill() } catch { /* already gone */ } ; die('หน้า render-ab ไม่พร้อม') }
await send('Runtime.evaluate', { expression: `window.AB_SINK = 'http://127.0.0.1:${SINK_PORT}'`, returnByValue: true }, S)

const results = []
for (const clip of CLIPS) {
  const song = songs.find((s) => s.number === clip.number)
  if (!song) { console.log('  ข้าม — ไม่พบเพลง', clip.number); continue }
  for (const side of ['before', 'after']) {
    const filename = `เพลง${clip.number}-${side === 'before' ? 'ก่อนแก้' : 'หลังแก้'}.mp3`
    const expr = `window.abRender(${JSON.stringify(song)}, ${JSON.stringify(side)}, ${JSON.stringify(filename)})`
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: 900000 }, S)
    if (r.exceptionDetails) { console.log('  ⛔', filename, JSON.stringify(r.exceptionDetails).slice(0, 300)); continue }
    console.log('  ✓', filename, `${r.result.value.seconds.toFixed(1)}s`, `${(r.result.value.bytes / 1048576).toFixed(2)} MB`)
    results.push({ ...r.result.value, number: clip.number, title: song.title_th, why: clip.why })
  }
}
try { child.kill() } catch { /* already gone */ }
sink.close()
fs.writeFileSync(path.join(OUT, 'ผลการอัด.json'), JSON.stringify(results, null, 2), 'utf8')
// ตรวจของจริงบนดิสก์ ไม่ใช่เชื่อว่า "สั่งเขียนแล้ว" — จบเงียบโดยไม่มีไฟล์คือความล้มเหลวที่มองไม่เห็น
const onDisk = fs.readdirSync(OUT).filter((f) => f.endsWith('.mp3'))
console.log(`\n✓ อัดเสียงแล้ว ${results.length} ไฟล์ · บนดิสก์จริง ${onDisk.length} ไฟล์ → ${OUT}`)
for (const f of onDisk) console.log(`   ${(fs.statSync(path.join(OUT, f)).size / 1048576).toFixed(2)} MB  ${f}`)
if (onDisk.length !== results.length) { console.error('⛔ จำนวนไฟล์บนดิสก์ไม่ตรงกับที่อัด'); process.exit(1) }
process.exit(0)
