// SPIKE B ข้อ 3+4 — พิสูจน์ทางสำรอง: ประกอบป้าย "⇧ + 6" จากค่าที่วัดได้ล้วน
// และพิสูจน์ว่ามันไม่ขึ้นกับเลย์เอาต์ (จำลองแป้นไทยด้วย keydown ที่ key เป็นอักษรไทย)
import { WebSocket } from 'ws'
const PORT = process.argv[2] || '9377'
const URL = 'http://127.0.0.1:5350/spike/keymap.html'

const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL)}`, { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl)
let id = 0; const pending = new Map()
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params }))
})
ws.on('message', (d) => {
  const m = JSON.parse(d)
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result) }
})
await new Promise((r) => ws.on('open', r))
await send('Page.enable'); await send('Runtime.enable')
await new Promise((r) => setTimeout(r, 1500))
const evalJs = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value

await evalJs("document.getElementById('probe').focus()")
const press = async (key, code, vk, mod) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod, text: key })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, modifiers: mod })
}
// (ก) ผู้ใช้พิมพ์ ^ สำเร็จบนแป้น US
await press('^', 'Digit6', 54, 8)
// (ข) จำลองแป้นไทย: ปุ่มกายภาพเดียวกันแต่ได้อักษรไทย → ต้องไม่ถูกจำว่าเป็น ^
await press('ู', 'Digit6', 54, 0)
await new Promise((r) => setTimeout(r, 300))

// ประกอบป้ายจาก learned(code+shift) + getLayoutMap(code -> ป้ายบนปุ่มจริง)
const composed = await evalJs(`(async () => {
  const map = await navigator.keyboard.getLayoutMap()
  const L = window.__LEARNED__ || {}
  const out = {}
  for (const [ch, info] of Object.entries(L)) {
    const legend = map.get(info.code)            // ป้ายชั้นล่างของปุ่มกายภาพนั้น
    out[ch] = legend == null ? null : (info.shift ? '⇧ + ' + legend : legend)
  }
  return JSON.stringify({ learned: L, composedLabel: out })
})()`)
console.log('=== ป้ายที่ประกอบได้จากค่าที่วัดจริงล้วน (ไม่มี hardcode ตาราง US) ===')
console.log(JSON.stringify(JSON.parse(composed), null, 2))
ws.close(); process.exit(0)
