import { spawn } from 'node:child_process'
import http from 'node:http'
import WebSocket from 'ws'
const CHROMIUM='C:\Users\aimkr\AppData\Local\Chromium\Application\chrome.exe'
const PORT=9486, PROFILE='C:\Users\aimkr\AppData\Local\Temp\claude\cdp-measure-v2'
const APP='http://127.0.0.1:5498/', REF='vlpuvaofbzdawgjjpgfu'
const get=u=>new Promise((r,j)=>http.get(u,x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>r(JSON.parse(d)))}).on('error',j))
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const proc=spawn(CHROMIUM,['--headless=new',`--remote-debugging-port=${PORT}`,'--remote-allow-origins=*',`--user-data-dir=${PROFILE}`,'--no-first-run','--disable-extensions','--hide-scrollbars','about:blank'],{stdio:'ignore'})
let t;for(let i=0;i<40;i++){try{t=await get(`http://127.0.0.1:${PORT}/json/list`);if(t.some(x=>x.type==='page'))break}catch{}await sleep(300)}
const ws=new WebSocket(t.find(x=>x.type==='page').webSocketDebuggerUrl,{perMessageDeflate:false,headers:{Origin:'http://localhost'}})
await new Promise(r=>ws.on('open',r))
let id=0;const pend=new Map(),hs=new Map()
ws.on('message',m=>{const x=JSON.parse(m);if(x.id&&pend.has(x.id)){const p=pend.get(x.id);pend.delete(x.id);x.error?p.rej(new Error(JSON.stringify(x.error))):p.res(x.result)}else if(x.method)(hs.get(x.method)||[]).forEach(h=>h(x.params))})
const send=(m,p={})=>new Promise((res,rej)=>{const i=++id;pend.set(i,{res,rej});ws.send(JSON.stringify({id:i,method:m,params:p}))})
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value}
await send('Page.enable');await send('Runtime.enable');await send('Network.enable')
const FAR=4000000000
const S={access_token:'a.b.c',token_type:'bearer',expires_in:9e8,expires_at:FAR,refresh_token:'r',user:{id:'u1',aud:'authenticated',role:'authenticated',email:'p@e.com',app_metadata:{},user_metadata:{},created_at:'2024-01-01T00:00:00Z'}}
const songs=Array.from({length:20},(_,k)=>({id:'s'+(k+1),number:k+1,title_th:'เพลง '+(k+1),content:{key:'C'},category:k<12?'lem-yai':'anuchon',verified:k>=14,book_refs:[],review_flags:[]}))
await send('Fetch.enable',{patterns:[{urlPattern:`*${REF}.supabase.co*`}]})
hs.set('Fetch.requestPaused',[async({requestId,request})=>{
  const json=o=>send('Fetch.fulfillRequest',{requestId,responseCode:200,body:Buffer.from(JSON.stringify(o)).toString('base64'),responseHeaders:[{name:'content-type',value:'application/json'},{name:'access-control-allow-origin',value:'*'}]})
  if(request.method==='OPTIONS')return send('Fetch.fulfillRequest',{requestId,responseCode:204,responseHeaders:[{name:'access-control-allow-origin',value:'*'},{name:'access-control-allow-headers',value:'*'},{name:'access-control-allow-methods',value:'*'}]})
  if(request.url.includes('/rest/v1/profiles'))return json({role:'approver',display_name:'พี่เปา'})
  if(request.url.includes('/rest/v1/songs'))return json(songs)
  if(request.url.includes('/auth/v1/token'))return json(S)
  if(request.url.includes('/auth/v1/user'))return json(S.user)
  return json([])}])
for(const w of [320,360,390,412,480,520,600,768]){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:800,deviceScaleFactor:1,mobile:w<500})
  await send('Page.navigate',{url:APP+'#/seed'});await sleep(500)
  await ev(`localStorage.setItem('sb-${REF}-auth-token', ${JSON.stringify(JSON.stringify(S))}),1`)
  await send('Page.navigate',{url:APP});await sleep(2200)
  const r=await ev(`(()=>{const ls=[...document.querySelectorAll('.browse-chips .chip-label')];return {w:innerWidth, tabs:document.querySelectorAll('.browse-chips [role=tab]').length, clipped: ls.filter(l=>l.scrollWidth>l.clientWidth+1).map(l=>l.textContent), shown: ls.map(l=>getComputedStyle(l).display==='none'?'(hidden)':l.textContent), barOverflow: (()=>{const b=document.querySelector('.browse-chips');return b?b.scrollWidth-b.clientWidth:null})()}})()`)
  console.log(JSON.stringify(r))
}
proc.kill();process.exit(0)
