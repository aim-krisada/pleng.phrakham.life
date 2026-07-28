import WebSocket from 'ws'
const PORT=9412
const t=await(await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`,{method:'PUT'})).json()
const ws=new WebSocket(t.webSocketDebuggerUrl,{origin:'http://localhost'})
let id=0;const p=new Map()
const send=(m,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method:m,params}))})
ws.on('message',d=>{const m=JSON.parse(d);if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id)}})
await new Promise(r=>ws.on('open',r))
await send('Page.navigate',{url:process.argv[2]})
await new Promise(r=>setTimeout(r,4000))
const r=await send('Runtime.evaluate',{expression:`(()=>{const sl=document.querySelector('#app>div>div')||document.querySelector('main');const search=document.querySelector('.song-search');const loading=[...document.querySelectorAll('p')].map(e=>e.textContent).filter(Boolean);return JSON.stringify({hasSearch:!!search, pCount:document.querySelectorAll('p').length, texts:loading.slice(0,6), appHTML:(document.querySelector('#app').innerHTML.match(/song-search|browse-chips|กำลังโหลด|router-view/g)||[])})})()`,returnByValue:true})
console.log(r.result.value)
ws.close();process.exit(0)
