// Front server for the A/B render ONLY (not shipped, not part of the app).
//
// Why it exists: 16 Splendid-Grand samples have a '#' in the filename ("FF A#2.ogg"). Vite's dev
// static middleware does not decode %23, so it answers those requests with index.html — the sampler
// then fails to decode them and the piano silently loses its sharps. Rendered "evidence" made that
// way would be a lie, so we serve /samples/* straight off disk (decoding the path properly) and
// proxy everything else to vite untouched.
//
//   node tools/serve-render.mjs <frontPort> <vitePort>
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONT = Number(process.argv[2] || 5322)
const VITE = Number(process.argv[3] || 5419)
// vite in a worktree often binds IPv6-ONLY ([::1]) — 127.0.0.1 then refuses the connection and you
// silently proxy to some OTHER session's server. Target [::1] explicitly and verify on boot.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const TYPES = { '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.json': 'application/json', '.js': 'text/javascript' }

let served = 0, missed = 0
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${FRONT}`)
  // vite's SPA fallback answers /docs/spikes/*.html with the APP's index.html, so serve the render
  // page off disk. Its <script> stays on vite (bare imports must be resolved by it).
  if (/^\/docs\/spikes\/.+\.(html|js)$/.test(url.pathname)) {
    const f = path.join(ROOT, decodeURIComponent(url.pathname).replace(/^\/+/, ''))
    const ct = f.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8'
    if (fs.existsSync(f)) { res.writeHead(200, { 'content-type': ct }); fs.createReadStream(f).pipe(res); return }
  }
  if (url.pathname.startsWith('/samples/')) {
    // decodeURIComponent turns %23 back into '#' — the whole point of this server
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const file = path.join(ROOT, 'public', rel)
    if (file.startsWith(path.join(ROOT, 'public')) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      served++
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'access-control-allow-origin': '*' })
      fs.createReadStream(file).pipe(res)
      return
    }
    missed++
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('no sample: ' + rel)
    return
  }
  try {
    const up = await fetch(`http://[::1]:${VITE}${req.url}`, { headers: { ...req.headers, host: `[::1]:${VITE}` } })
    const body = Buffer.from(await up.arrayBuffer())
    const h = {}
    up.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding)$/i.test(k)) h[k] = v })
    res.writeHead(up.status, h); res.end(body)
  } catch (e) { res.writeHead(502, { 'content-type': 'text/plain' }); res.end('vite proxy failed: ' + e.message) }
})
server.listen(FRONT, '127.0.0.1', async () => {
  // fail loudly rather than proxy to a stranger: the upstream MUST be this worktree's vite
  const probe = await fetch(`http://[::1]:${VITE}/src/lib/midi.js`).then((r) => r.text()).catch((e) => 'ERR ' + e.message)
  const own = probe.includes('PREECHO_ENSEMBLE_LEADS')
  console.log(`render front server :${FRONT} → vite :${VITE} · upstream is this worktree: ${own ? 'YES' : 'NO — WRONG SERVER'}`)
  if (!own) process.exit(1)
})
process.on('SIGTERM', () => { console.log(`samples served ${served} · missed ${missed}`); server.close() })
