// Minimal CDP screenshot driver (raw ws · no puppeteer). §4 isolation: own Chromium+port.
// usage: node shot.mjs <url> <out.png> <width> <height> [clickSelector] [waitMs]
import WebSocket from 'ws'
import { writeFileSync } from 'fs'

const [, , url, out, w = '1280', h = '900', clickSel = '', waitMs = '1800'] = process.argv
const PORT = 9412

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
const wsUrl = list.webSocketDebuggerUrl
const ws = new WebSocket(wsUrl, { origin: 'http://localhost' })
let id = 0
const pending = new Map()
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })

ws.on('message', (d) => {
  const m = JSON.parse(d)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
})
await new Promise((r) => ws.on('open', r))

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: +w, height: +h, deviceScaleFactor: 2, mobile: +w < 500,
})
await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, +waitMs))

if (clickSel) {
  const js = `(()=>{const el=[...document.querySelectorAll('${clickSel.split("'").join("\\'")}')].find(e=>e.offsetParent!==null)||document.querySelector('${clickSel.split("'").join("\\'")}');if(el){el.click();return true}return false})()`
  const r = await send('Runtime.evaluate', { expression: js, returnByValue: true })
  console.log('click', clickSel, '=>', r.result && r.result.value)
  await new Promise((r) => setTimeout(r, 700))
}

const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true })
writeFileSync(out, Buffer.from(data, 'base64'))
console.log('saved', out)
ws.close()
process.exit(0)
