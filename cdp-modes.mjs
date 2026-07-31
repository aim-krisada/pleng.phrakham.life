const list=await (await fetch('http://127.0.0.1:9377/json/list')).json()
const page=list.find(t=>t.type==='page'); const ws=new WebSocket(page.webSocketDebuggerUrl)
let id=0;const p=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id)}})
await new Promise(r=>ws.addEventListener('open',r))
const send=(m,pa={})=>new Promise(res=>{const i=++id;p.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:pa}))})
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true});return r.result?.result?.value??JSON.stringify(r.result?.exceptionDetails)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
for (const url of ['http://127.0.0.1:5377/#/studio','http://127.0.0.1:5377/#/song/33c26a91-6727-4f98-8d86-17f215a8aecd']) {
  await send('Page.navigate',{url}); await sleep(6000)
  console.log(url.split('#')[1], await ev(`JSON.stringify({modes:document.querySelectorAll('.sb-mode-btn').length,menusW:Math.round((document.querySelector('#shell-menus')||{getBoundingClientRect:()=>({width:0})}).getBoundingClientRect().width),ls:Object.keys(localStorage).filter(k=>/mode/i.test(k)).map(k=>k+'='+localStorage.getItem(k)),sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,compact:document.documentElement.classList.contains('shell-compact')})`))
}
ws.close();process.exit(0)
