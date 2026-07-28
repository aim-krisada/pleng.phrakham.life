import WebSocket from 'ws'
const PORT = 9412
const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(t.webSocketDebuggerUrl, { origin: 'http://localhost' })
let id = 0; const p = new Map()
const send = (m, params = {}) => new Promise((r) => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params })) })
const logs = []
ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id) }
  if (m.method === 'Runtime.consoleAPICalled' || m.method === 'Log.entryAdded') logs.push(JSON.stringify(m.params).slice(0, 300))
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400)) })
await new Promise((r) => ws.on('open', r))
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
await send('Page.navigate', { url: process.argv[2] })
await new Promise((r) => setTimeout(r, 3000))
const dom = await send('Runtime.evaluate', { expression: `JSON.stringify({chips:[...document.querySelectorAll('.browse-chips .facet-chip')].map(e=>e.textContent.trim()), review:!!document.querySelector('.review-chip'), body:(document.querySelector('.router-view,main,#app')?.innerText||'').slice(0,200)})`, returnByValue: true })
console.log('DOM', dom.result.value)
console.log('LOGS\n' + logs.join('\n'))
ws.close(); process.exit(0)
