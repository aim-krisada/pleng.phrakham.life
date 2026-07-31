// DoD verification for the approver "ยังไม่ตรวจ (N)" chip (v1).
// Own headless Chromium (own port + own --user-data-dir) — never touches :9222 / :9335.
// Supabase is mocked at the NETWORK layer (CDP Fetch) so production data is never read or
// written: the songs list, the profile role and the session are all fixtures.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import WebSocket from 'ws'

const CHROMIUM = 'C:\\Users\\aimkr\\AppData\\Local\\Chromium\\Application\\chrome.exe'
const PORT = 9484
const PROFILE = 'C:\\Users\\aimkr\\AppData\\Local\\Temp\\claude\\cdp-unverified-v2'
const APP = 'http://127.0.0.1:5498/'
const SHOTS = 'C:\\gl\\pm-inbox\\pleng\\unverified-v2-shots'
const SUPA_REF = 'vlpuvaofbzdawgjjpgfu'

fs.mkdirSync(SHOTS, { recursive: true })

// ---- fixtures -------------------------------------------------------------
const songs = []
for (let i = 1; i <= 20; i++) {
  songs.push({
    id: 'song-' + i,
    number: i,
    title_th: i === 7 ? 'เพลงชื่อยาวมากเพื่อทดสอบการตัดบรรทัดบนจอแคบ' : 'เพลงทดสอบที่ ' + i,
    title_en: null,
    content: { key: 'C', lines: [] },
    category: i <= 12 ? 'lem-yai' : 'anuchon',
    theme: null,
    verified: i > 14, // 14 unverified (matches the approved mockup's badge count)
    book_refs: [],
    scripture: null,
    review_flags: [],
  })
}
const FAR_FUTURE = 4000000000
const fakeSession = {
  access_token: 'fake.' + Buffer.from(JSON.stringify({ sub: 'u1', role: 'authenticated', exp: FAR_FUTURE })).toString('base64url') + '.sig',
  token_type: 'bearer',
  expires_in: 999999999,
  expires_at: FAR_FUTURE,
  refresh_token: 'fake-refresh',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'pao@example.com', app_metadata: {}, user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
}

// ---- tiny CDP client ------------------------------------------------------
function get(url) {
  return new Promise((res, rej) => {
    http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))) }).on('error', rej)
  })
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map()
    ws.on('message', (m) => {
      const msg = JSON.parse(m)
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id); this.pending.delete(msg.id)
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
      } else if (msg.method) { (this.handlers.get(msg.method) || []).forEach((h) => h(msg.params)) }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  on(method, h) { this.handlers.set(method, [...(this.handlers.get(method) || []), h]) }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception?.description || ''))
    return r.result.value
  }
}

// ---- launch ---------------------------------------------------------------
const proc = spawn(CHROMIUM, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*',
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--disable-extensions', '--hide-scrollbars',
  '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' })

let targets
for (let i = 0; i < 40; i++) { try { targets = await get(`http://127.0.0.1:${PORT}/json/list`); if (targets.some(x=>x.type==='page')) break } catch {} await sleep(300) }
if (!targets?.length) { console.error('no CDP target'); proc.kill(); process.exit(1) }
const cdp = new CDP(new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl, { perMessageDeflate: false, headers: { Origin: 'http://localhost' } }))
await new Promise((r) => cdp.ws.on('open', r))
await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable')

// ---- network mock ---------------------------------------------------------
let role = 'approver'
let unverifiedFlag = true // when false, every song is verified (N = 0 case)
await cdp.send('Fetch.enable', { patterns: [{ urlPattern: `*${SUPA_REF}.supabase.co*` }] })
cdp.on('Fetch.requestPaused', async ({ requestId, request }) => {
  const u = request.url
  const json = (obj) => cdp.send('Fetch.fulfillRequest', {
    requestId, responseCode: 200, body: Buffer.from(JSON.stringify(obj)).toString('base64'),
    responseHeaders: [{ name: 'content-type', value: 'application/json' }, { name: 'access-control-allow-origin', value: '*' }],
  })
  if (request.method === 'OPTIONS') {
    return cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: [
      { name: 'access-control-allow-origin', value: '*' },
      { name: 'access-control-allow-headers', value: '*' },
      { name: 'access-control-allow-methods', value: '*' }] })
  }
  if (u.includes('/rest/v1/profiles')) return json({ role, display_name: 'พี่เปา' })
  if (u.includes('/rest/v1/songs')) {
    return json(unverifiedFlag ? songs : songs.map((s) => ({ ...s, verified: true })))
  }
  if (u.includes('/auth/v1/token')) return json(fakeSession)
  if (u.includes('/auth/v1/user')) return json(fakeSession.user)
  return json([])
})

// ---- helpers --------------------------------------------------------------
async function load({ loggedIn, width = 1280, height = 900 }) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 })
  await cdp.send('Page.navigate', { url: APP + '#/blank-seed' })
  await sleep(600)
  const key = `sb-${SUPA_REF}-auth-token`
  await cdp.eval(loggedIn
    ? `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(fakeSession))}), 1`
    : `localStorage.removeItem(${JSON.stringify(key)}), 1`)
  await cdp.send('Page.navigate', { url: APP })
  await sleep(2500)
}
async function probe() {
  return cdp.eval(`(() => {
    const chip = document.querySelector('.review-chip')
    const r = chip && chip.getBoundingClientRect()
    return {
      chip: !!chip,
      tabsInBar: document.querySelectorAll('.browse-chips [role=tab]').length,
      selected: chip ? chip.getAttribute('aria-selected') : null,
      chipText: chip ? chip.innerText.replace(/\\s+/g,' ').trim() : null,
      count: chip ? (chip.querySelector('.chip-count')||{}).textContent : null,
      labelShown: chip ? getComputedStyle(chip.querySelector('.chip-label')).display !== 'none' : null,
      h: r ? Math.round(r.height) : null,
      right: r ? Math.round(r.right) : null,
      vw: innerWidth,
      docOverflow: document.documentElement.scrollWidth - innerWidth,
      tier: null,
    }
  })()`)
}
async function clickChip() {
  await cdp.eval(`document.querySelector('.review-chip').click(), 1`)
  await sleep(400)
  return cdp.eval(`(() => {
    const rows = [...document.querySelectorAll('.song-row')]
    return {
      heading: (document.querySelector('.level-head h2')||{}).textContent,
      countLabel: (document.querySelector('.level-head .count')||{}).textContent,
      rows: rows.length,
      allPending: rows.every(r => r.querySelector('.badge.pending')),
      anyVerified: rows.some(r => r.querySelector('.badge.ok')),
      firstNo: rows.length ? rows[0].querySelector('.no').textContent.trim() : null,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }
  })()`)
}
async function shot(name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(data, 'base64'))
  return path.join(SHOTS, name)
}

const out = []
const log = (...a) => { const s = a.join(' '); out.push(s); console.log(s) }

// DoD 1 — approver desktop
role = 'approver'; unverifiedFlag = true
await load({ loggedIn: true })
log('DoD1 approver/desktop:', JSON.stringify(await probe()))
log('DoD1 shot (landing):', await shot('01-v2-approver-desktop.png'))
log('DoD1 queue after click:', JSON.stringify(await clickChip()))
log('DoD1 shot (queue):', await shot('01b-v2-approver-queue-desktop.png'))
await load({ loggedIn: true, width: 360, height: 780 })
await clickChip()
log('DoD1 shot (queue 360):', await shot('01c-v2-approver-queue-360.png'))
await load({ loggedIn: true })

// DoD 2 — anon
await load({ loggedIn: false })
log('DoD2 anon/desktop:', JSON.stringify(await probe()))
log('DoD2 route guard (force #/ then look for queue):', await cdp.eval(`!!document.querySelector('.review-chip')`))
log('DoD2 shot:', await shot('02-v2-anon-desktop.png'))

// DoD 2b — logged-in EDITOR (not approver) must also see nothing
role = 'editor'
await load({ loggedIn: true })
log('DoD2b editor(logged-in, not approver):', JSON.stringify(await probe()))
log('DoD2b shot:', await shot('03-v2-editor-desktop.png'))

// DoD 3 — N = 0 hides the whole thing
role = 'approver'; unverifiedFlag = false
await load({ loggedIn: true })
log('DoD3 approver, N=0:', JSON.stringify(await probe()))
log('DoD3 shot:', await shot('04-v2-approver-zero.png'))

// DoD 4 — mark one song verified in the fixture → it leaves the queue and N drops
unverifiedFlag = true
await load({ loggedIn: true })
const before = await probe()
songs.find((s) => s.id === 'song-14').verified = true // simulates pressing "ตรวจแล้ว" on song 14
await cdp.send('Page.navigate', { url: APP }); await sleep(2500)
const after = await probe()
log('DoD4 count before/after marking song-14 verified:', before.count, '->', after.count)
log('DoD4 queue rows after:', JSON.stringify(await clickChip()))
songs.find((s) => s.id === 'song-14').verified = false // restore the fixture (14 was unverified)

// DoD 5 — 360 / 390 widths
for (const w of [320, 360, 390, 412]) {
  await load({ loggedIn: true, width: w, height: 780 })
  const p = await probe()
  log(`DoD5 ${w}px:`, JSON.stringify(p), 'fits:', p.right <= p.vw && p.docOverflow <= 0)
  log(`DoD5 ${w}px queue:`, JSON.stringify(await clickChip()))
  if (w === 360 || w === 390) { await cdp.send('Page.navigate', { url: APP }); await sleep(2000); log(`DoD5 shot:`, await shot(`05-v2-approver-${w}.png`)) }
}
// anon on mobile too
await load({ loggedIn: false, width: 360, height: 780 })
log('DoD2c anon/360:', JSON.stringify(await probe()))
log('DoD2c shot:', await shot('06-v2-anon-360.png'))

fs.writeFileSync(path.join(SHOTS, 'verify-log.txt'), out.join('\n') + '\n')
proc.kill()
process.exit(0)
