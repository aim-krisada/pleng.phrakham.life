const list=await (await fetch('http://127.0.0.1:9377/json/list')).json()
const page=list.find(t=>t.type==='page'); const ws=new WebSocket(page.webSocketDebuggerUrl)
let id=0;const p=new Map();const logs=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id)}
 if(m.method==='Runtime.consoleAPICalled'){const a=(m.params.args||[]).map(x=>String(x.value??x.description??'')).join(' ');logs.push(m.params.type+': '+a.slice(0,160))}})
await new Promise(r=>ws.addEventListener('open',r))
const send=(m,pa={})=>new Promise(res=>{const i=++id;p.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:pa}))})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
await send('Page.navigate',{url:'http://127.0.0.1:5377/#/song/33c26a91-6727-4f98-8d86-17f215a8aecd'})
await sleep(7000)
console.log(logs.filter(l=>/warn|error|Teleport|target/i.test(l)).slice(0,10).join('\n') || '(no warnings)')
ws.close();process.exit(0)
