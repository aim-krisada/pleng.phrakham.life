import WebSocket from 'ws'
const PORT=9412
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json()
const ws=new WebSocket(t.webSocketDebuggerUrl,{origin:'http://localhost'})
let id=0;const p=new Map()
const send=(m,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method:m,params}))})
const errs=[]
ws.on('message',d=>{const m=JSON.parse(d);if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id)}
 if(m.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(m.params.type))errs.push('CON '+JSON.stringify(m.params.args).slice(0,400))
 if(m.method==='Runtime.exceptionThrown')errs.push('EXC '+JSON.stringify(m.params.exceptionDetails).slice(0,600))})
await new Promise(r=>ws.on('open',r))
await send('Runtime.enable')
await send('Page.navigate',{url:process.argv[2]})
await new Promise(r=>setTimeout(r,4500))
const r=await send('Runtime.evaluate',{expression:`JSON.stringify({mainLen:(document.querySelector('main.container')?.innerHTML||'').length, mainHTML:(document.querySelector('main.container')?.innerHTML||'').slice(0,300)})`,returnByValue:true})
console.log(r.result.value)
console.log('ERRS:\n'+errs.join('\n'))
ws.close();process.exit(0)
