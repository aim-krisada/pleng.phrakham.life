// SPIKE B — ขับ Chromium ของตัวเองผ่าน CDP (own port 9377 · own user-data-dir)
// node spike/cdp-probe.mjs <cdp-port> <url>
import { WebSocket } from 'ws'

const PORT = process.argv[2] || '9377'
const URL = process.argv[3] || 'http://127.0.0.1:5350/spike/keymap.html'

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })).json()
const ws = new WebSocket(targets.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id
  pending.set(n, { res, rej })
  ws.send(JSON.stringify({ id: n, method, params }))
})
ws.on('message', (d) => {
  const m = JSON.parse(d)
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id)
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)
  }
})
await new Promise((r) => ws.on('open', r))
await send('Page.enable')
await send('Runtime.enable')
await new Promise((r) => setTimeout(r, 1500))

const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  return r.result?.value
}

// 1-3: layout map
console.log('=== getLayoutMap ===')
console.log(JSON.stringify(await evalJs('JSON.stringify(window.__SPIKE__ ?? null)'), null, 2))

// 4: ทางสำรอง — ยิง keydown จริงผ่าน CDP (nativeVirtualKeyCode + modifier Shift)
await evalJs("document.getElementById('probe').focus()")
const KEYS = [
  { key: '^', code: 'Digit6', vk: 54, mod: 8 },
  { key: '_', code: 'Minus', vk: 189, mod: 8 },
  { key: '~', code: 'Backquote', vk: 192, mod: 8 },
  { key: '(', code: 'Digit9', vk: 57, mod: 8 },
  { key: '#', code: 'Digit3', vk: 51, mod: 8 },
  { key: "'", code: 'Quote', vk: 222, mod: 0 },
  { key: ',', code: 'Comma', vk: 188, mod: 0 },
]
for (const k of KEYS) {
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk,
    nativeVirtualKeyCode: k.vk, modifiers: k.mod, text: k.key,
  })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, modifiers: k.mod })
}
await new Promise((r) => setTimeout(r, 300))
console.log('=== learned from real keydown ===')
console.log(await evalJs('JSON.stringify(window.__LEARNED__ ?? null)'))
ws.close()
process.exit(0)
