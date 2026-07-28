// Verify "หน้าแรก v2 ใหม่" (home-refresh-v2) on a REAL browser + capture before/after PNGs.
// OWN Chromium · OWN debug port (9471, not 9222/9335) · OWN absolute --user-data-dir. Never
// touches P'Aim's browser. Servers: AFTER = :5314 (this branch), BEFORE = :5320 (base be159a3b),
// both PLENG_V2=1 so they mirror the live /v2 deploy.
//
//   node tools/verify-home-refresh.mjs
import { WebSocket } from 'ws'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import os from 'node:os'

const AFTER = 'http://127.0.0.1:5314/v2/#/'
const BEFORE = 'http://127.0.0.1:5320/v2/#/'
const OUT = 'C:/gl/pm-inbox/pleng/home-refresh-shots'
const CDP_PORT = 9471
const PROFILE = path.join(os.tmpdir(), 'chromium-home-refresh-9471')
const CHROMIUM = 'C:/Users/aimkr/AppData/Local/Chromium/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const DESKTOP = { width: 1280, height: 800, mobile: false }
const MOBILE = { width: 390, height: 844, mobile: true }

async function cdpUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl
    } catch { /* not up */ }
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

async function assertBuild() {
  const src = await (await fetch('http://127.0.0.1:5314/v2/src/lib/pwaInstall.js')).text()
  if (!/canShowInstall/.test(src)) throw new Error('AFTER :5314 does not serve the home-refresh pwaInstall — WRONG BUILD')
  const sb = await (await fetch('http://127.0.0.1:5314/v2/src/components/ShellBar.vue')).text()
  if (/VersionSwitch/.test(sb)) throw new Error('AFTER :5314 ShellBar still imports VersionSwitch — WRONG BUILD')
  console.log('anti-placebo ✓ : AFTER serves canShowInstall + ShellBar has no VersionSwitch')
}

// one clean page load with the given device / UA / emulated-media, optional injects, then eval+shot
async function scene(send, { label, url, device, ua, blockManifest, inject, act, waitSel = '.shell-bar' }) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const ev = (m, p) => send(m, p, sessionId)
  try {
    await ev('Page.enable'); await ev('Runtime.enable')
    await ev('Emulation.setDeviceMetricsOverride', { width: device.width, height: device.height, deviceScaleFactor: 2, mobile: device.mobile })
    if (ua) await ev('Emulation.setUserAgentOverride', { userAgent: ua })
    if (blockManifest) {
      // No manifest → Chromium never deems the page installable → it never fires
      // beforeinstallprompt → canInstall stays false. That is the ONLY way to reproduce the iOS
      // "no prompt to replay" reality in this headless Chromium (which otherwise auto-fires it).
      await ev('Network.enable')
      await ev('Network.setBlockedURLs', { urls: ['*webmanifest*', '*manifest.json*', '*site.webmanifest*'] })
    }
    await ev('Page.navigate', { url })
    // wait for the app to mount + (home) the list to render
    let ok = false
    for (let i = 0; i < 40; i++) {
      await sleep(300)
      const r = await ev('Runtime.evaluate', { expression: `!!document.querySelector('${waitSel}')`, returnByValue: true })
      if (r.result?.value) { ok = true; break }
    }
    if (!ok) throw new Error(`${label}: ${waitSel} never appeared`)
    await sleep(500)
    if (inject) { await ev('Runtime.evaluate', { expression: inject, awaitPromise: true }); await sleep(400) }
    let actResult = null
    if (act) {
      const r = await ev('Runtime.evaluate', { expression: act, returnByValue: true, awaitPromise: true })
      actResult = r.result?.value ?? null
      await sleep(400)
    }
    const shot = await ev('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(OUT, `${label}.png`), Buffer.from(shot.data, 'base64'))
    return actResult
  } finally {
    await send('Target.closeTarget', { targetId })
  }
}

// the reactive-state probe used by most scenes — returns the facts the DoD checks
const PROBE = `JSON.stringify({
  betaPill: !!document.querySelector('.ver-switch'),
  createPill: !!document.querySelector('.sb-create'),
  installBtn: (()=>{const b=document.querySelector('.sb-install-btn'); return b ? getComputedStyle(b).display : 'absent';})(),
  standaloneMM: window.matchMedia('(display-mode: standalone)').matches,
  fab: (()=>{const f=document.querySelector('.sb-fab'); if(!f) return null; const cs=getComputedStyle(f); return {label:f.getAttribute('aria-label'), tag:f.tagName, tabbable:f.tabIndex>=0||f.tagName==='A', display:cs.display};})(),
  banner: (()=>{const b=document.querySelector('.install-banner'); if(!b) return null; const cs=getComputedStyle(b); return {display:cs.display, text:b.textContent.replace(/\\s+/g,' ').trim().slice(0,80)};})(),
  sheet: !!document.querySelector('.is-sheet'),
})`

// Real "already installed" path: the appinstalled listener in pwaInstall.js sets isStandalone=true
// + canInstall=false, exactly as when the OS reports the app was installed. (CDP display-mode media
// emulation does NOT flip window.matchMedia in this Chromium, so we drive the real event instead.)
const INJECT_INSTALLED = `(()=>{window.dispatchEvent(new Event('appinstalled')); return true;})()`

const INJECT_PROMPT = `(()=>{const e=new Event('beforeinstallprompt'); e.prompt=()=>{window.__promptCalled=true;}; e.userChoice=Promise.resolve({outcome:'dismissed'}); window.dispatchEvent(e); return true;})()`

async function assertPortFree() {
  try {
    const j = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`, { signal: AbortSignal.timeout(1500) })).json()
    throw new Error(`CDP ${CDP_PORT} already answering (${j.Browser}) — a stale Chromium is alive. Kill it first.`)
  } catch (e) { if (/already answering/.test(e.message)) throw e }
}

await assertPortFree()
await assertBuild()
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(PROFILE, { recursive: true })
const chrome = spawn(CHROMIUM, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--remote-allow-origins=*',
  `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
], { stdio: 'ignore' })

const facts = {}
const { ws, send } = conn(await cdpUrl())
try {
  // ---- BEFORE (base be159a3b) — context for P'Aim ----
  facts.beforeDesktop = JSON.parse(await scene(send, { label: 'before-desktop', url: BEFORE, device: DESKTOP, act: PROBE }))
  facts.beforeMobile = JSON.parse(await scene(send, { label: 'before-mobile', url: BEFORE, device: MOBILE, act: PROBE }))

  // ---- AFTER — plain (no install offered yet) ----
  facts.afterDesktop = JSON.parse(await scene(send, { label: 'after-desktop', url: AFTER, device: DESKTOP, act: PROBE }))
  facts.afterMobile = JSON.parse(await scene(send, { label: 'after-mobile', url: AFTER, device: MOBILE, act: PROBE }))

  // ---- AFTER — install possible (real beforeinstallprompt captured) ----
  facts.afterDesktopInstall = JSON.parse(await scene(send, { label: 'after-desktop-install', url: AFTER, device: DESKTOP, inject: INJECT_PROMPT, act: PROBE }))
  facts.afterMobileInstall = JSON.parse(await scene(send, { label: 'after-mobile-install', url: AFTER, device: MOBILE, inject: INJECT_PROMPT, act: PROBE }))

  // ---- AFTER — desktop install CLICK replays the prompt ----
  facts.installClick = await scene(send, {
    label: 'after-desktop-install-clicked', url: AFTER, device: DESKTOP, inject: INJECT_PROMPT,
    act: `(async()=>{document.querySelector('.sb-install-btn').click(); await new Promise(r=>setTimeout(r,200)); return window.__promptCalled===true;})()`,
  })

  // ---- AFTER — iOS: tap install → instruction SHEET (no dead end). Manifest blocked so no
  //      beforeinstallprompt fires (canInstall stays false), reproducing real iOS Safari. ----
  facts.iosSheet = JSON.parse(await scene(send, {
    label: 'after-mobile-ios-sheet', url: AFTER, device: MOBILE, ua: IPHONE_UA, blockManifest: true,
    act: `(async()=>{const b=document.querySelector('.install-banner .ib-cta'); if(b) b.click(); await new Promise(r=>setTimeout(r,300)); return ${PROBE};})()`,
  }))

  // ---- AFTER — already installed (appinstalled) hides EVERYTHING ----
  facts.standaloneDesktop = JSON.parse(await scene(send, { label: 'after-desktop-standalone', url: AFTER, device: DESKTOP, inject: INJECT_INSTALLED, act: PROBE }))
  facts.standaloneMobile = JSON.parse(await scene(send, { label: 'after-mobile-standalone', url: AFTER, device: MOBILE, inject: INJECT_INSTALLED, act: PROBE }))

  // ---- AFTER — "C" shortcut opens the editor ----
  facts.cShortcut = await scene(send, {
    label: 'after-c-shortcut', url: AFTER, device: DESKTOP,
    act: `(async()=>{const before=location.hash; window.dispatchEvent(new KeyboardEvent('keydown',{key:'c'})); await new Promise(r=>setTimeout(r,300)); return {before, after:location.hash};})()`,
  })

  // ---- AFTER — drawer no longer holds a create action (mobile ☰) ----
  facts.drawerNoCreate = await scene(send, {
    label: 'after-mobile-drawer', url: AFTER, device: MOBILE,
    act: `(async()=>{const burger=document.querySelector('.sb-burger'); if(burger) burger.click(); await new Promise(r=>setTimeout(r,400)); return {create:!!document.querySelector('.sb-drawer-create'), nav:!!document.querySelector('.sb-drawer-nav'), installTool:!!document.querySelector('.ia, .ia-btn, .ia-hint')};})()`,
  })
} finally {
  try { spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* best effort */ }
  chrome.kill(); ws.close()
}

fs.writeFileSync(path.join(OUT, 'facts.json'), JSON.stringify(facts, null, 2))

// ---- verdict ----
const checks = []
const ok = (name, cond) => { checks.push([name, !!cond]); }
ok('BEFORE desktop HAS beta pill', facts.beforeDesktop.betaPill)
ok('AFTER desktop has NO beta pill', !facts.afterDesktop.betaPill)
ok('AFTER mobile has NO beta pill', !facts.afterMobile.betaPill)
ok('AFTER desktop keeps create pill', facts.afterDesktop.createPill)
ok('AFTER mobile FAB exists, is <a>, tabbable, has aria-label', facts.afterMobile.fab && facts.afterMobile.fab.tag === 'A' && facts.afterMobile.fab.tabbable && facts.afterMobile.fab.label)
ok('AFTER mobile FAB visible (display!=none)', facts.afterMobile.fab && facts.afterMobile.fab.display !== 'none')
ok('AFTER desktop install BUTTON visible (this Chromium is installable)', facts.afterDesktopInstall.installBtn === 'flex' || facts.afterDesktopInstall.installBtn === 'inline-flex')
ok('AFTER mobile install BANNER shows (display flex)', facts.afterMobileInstall.banner && facts.afterMobileInstall.banner.display === 'flex')
ok('AFTER install button HIDDEN on mobile compact (banner takes over)', facts.afterMobileInstall.installBtn === 'none')
ok('AFTER desktop banner HIDDEN (button takes over)', facts.afterDesktopInstall.banner && facts.afterDesktopInstall.banner.display === 'none')
ok('AFTER install click replays the prompt', facts.installClick === true)
ok('iOS tap → instruction SHEET opens (no dead end)', facts.iosSheet.sheet === true)
ok('standalone desktop hides install button', facts.standaloneDesktop.installBtn === 'absent' || facts.standaloneDesktop.installBtn === 'none')
ok('standalone mobile hides banner', !facts.standaloneMobile.banner || facts.standaloneMobile.banner.display === 'none')
ok('"C" navigates to #/studio', facts.cShortcut && /studio/.test(facts.cShortcut.after) && !/studio/.test(facts.cShortcut.before))
ok('drawer has NO create action row', facts.drawerNoCreate && facts.drawerNoCreate.create === false && facts.drawerNoCreate.nav === true)

console.log('')
for (const [n, c] of checks) console.log(`${c ? '✓' : '❌'} ${n}`)
const failed = checks.filter(([, c]) => !c)
console.log(`\n${checks.length - failed.length}/${checks.length} passed`)
console.log(`PNGs + facts.json → ${OUT}`)
process.exitCode = failed.length ? 1 : 0
