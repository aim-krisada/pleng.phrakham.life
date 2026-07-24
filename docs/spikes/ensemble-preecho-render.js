// Module half of ensemble-preecho-render.html — kept in its own file so VITE transforms it
// (bare imports like '@supabase/supabase-js' only resolve inside a module vite actually serves;
// the HTML itself is served straight off disk by tools/serve-render.mjs, because vite's SPA
// fallback answers /docs/spikes/*.html with the app's index.html instead).
// Only PATH imports here (no bare specifiers): the browser resolves them against the front server,
// which proxies /src/* to vite for transformation. That lets this file itself be served straight off
// disk, sidestepping vite's SPA fallback on /docs/spikes/*.
import { playEnsemble, buildPlayNotes, stopPlayback } from '/src/lib/midi.js'
import { resolveContent } from '/src/lib/songModel.js'

const SB = 'https://vlpuvaofbzdawgjjpgfu.supabase.co'
const SB_KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'
// read-only REST select — the publishable key + RLS allow public read of `songs` and nothing else
const fetchSong = async (number) => {
  const r = await fetch(`${SB}/rest/v1/songs?number=eq.${number}&select=id,number,title_th,content&limit=1`,
    { headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}` } })
  if (!r.ok) throw new Error(`supabase ${r.status}`)
  return (await r.json())[0]
}

const q = new URLSearchParams(location.search)
const NUMBER = Number(q.get('number'))
const LEAD = q.get('lead') || 'violin'
const PRE = q.get('pre') || 'off'          // 'off' = before · 'all' = after
const AT_BEAT = Number(q.get('atBeat') ?? 0)
const PAD = Number(q.get('pad') ?? 3)      // seconds of run-up before the point
const TAIL = Number(q.get('tail') ?? 6)    // seconds after it
const SR = 44100

const logEl = document.getElementById('log')
const lines = []
const log = (m) => { lines.push(m); logEl.textContent = lines.join('\n') }
const fail = (m) => { log('FAIL ' + m); window.__RESULT = { ok: false, error: m, log: lines } }

// ---- honesty guard: a sample that 404s (or that the dev server answers with index.html — the
// `#` in "FF A#2.ogg" truncates the URL at the fragment) must NEVER pass silently, or the audio
// evidence is a lie. Count every bad sample response.
const sampleErrors = []
const realFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || ''
  const res = await realFetch(input, init)
  if (/\/samples\//.test(url)) {
    const ct = res.headers.get('content-type') || ''
    if (!res.ok) sampleErrors.push(`${res.status} ${url}`)
    else if (/text\/html/.test(ct)) sampleErrors.push(`HTML-instead-of-audio ${url}`)
  }
  return res
}
window.addEventListener('unhandledrejection', (e) => log('unhandledrejection: ' + (e.reason?.message || e.reason)))

try {
  const song = await fetchSong(NUMBER)
  if (!song) throw new Error('song ' + NUMBER + ' not found')
  const content = { ...song.content, lines: resolveContent(song.content) }   // exactly what SongViewer passes
  const bpm = Number(song.content?.bpm) || 72
  const notes = buildPlayNotes(content, {})
  const totalBeats = notes.reduce((s, n) => s + n.beats, 0)
  const fullSec = totalBeats * 60 / bpm + 4
  log(`#${song.number} ${song.title_th} · lead=${LEAD} · pre=${PRE} · bpm=${bpm} · ${notes.length} notes · ${fullSec.toFixed(1)}s`)

  // Hand the REAL playEnsemble an OfflineAudioContext — through a thin facade, because playEnsemble
  // does `await ctx.resume()` (an unlock for iOS) and an offline context throws on resume() before
  // rendering starts. The facade forwards every factory method to the real offline context, reports
  // state 'running', and KEEPS startRendering — sampler.js duck-types "offline" on that, and it is
  // what makes it inject the big-lookahead scheduler (without it every note past ~200 ms is silent).
  const octx = new OfflineAudioContext(2, Math.ceil(fullSec * SR), SR)
  const shim = {
    get currentTime() { return octx.currentTime },
    get sampleRate() { return octx.sampleRate },
    get destination() { return octx.destination },
    get listener() { return octx.listener },
    get state() { return 'running' },
    resume: async () => {},
    suspend: async () => {},
    close: async () => {},
    startRendering: () => octx.startRendering(),
    addEventListener() {}, removeEventListener() {},
  }
  for (const k of Object.keys(Object.getPrototypeOf(octx)).concat(
    ['createGain', 'createConvolver', 'createDynamicsCompressor', 'createBufferSource', 'createBuffer',
      'createStereoPanner', 'createBiquadFilter', 'createOscillator', 'createPanner', 'createDelay',
      'createWaveShaper', 'createChannelMerger', 'createChannelSplitter', 'createAnalyser',
      'createPeriodicWave', 'createConstantSource', 'createIIRFilter', 'decodeAudioData'])) {
    if (typeof octx[k] === 'function' && !(k in shim)) shim[k] = octx[k].bind(octx)
  }
  window.AudioContext = function () { return shim }
  window.webkitAudioContext = window.AudioContext

  let loaded = null
  const loadedP = new Promise((r) => { loaded = r })
  // do NOT await: playEnsemble's tail is a realtime wait loop we don't need — the scheduling is
  // synchronous once the samples are in.
  playEnsemble(content, {
    bpm, lead: LEAD, songId: song.id, preEcho: PRE, loop: false,
    onInstrumentPending: ({ loading }) => { if (!loading) loaded() },
  }).catch((e) => log('playEnsemble threw: ' + e.message))

  await loadedP
  await new Promise((r) => setTimeout(r, 250))   // let the synchronous scheduling finish
  log('scheduled · rendering…')
  const buf = await octx.startRendering()
  stopPlayback()

  // crop AFTER rendering, so the crop cannot influence what was scheduled
  const atSec = AT_BEAT > 0 ? AT_BEAT * 60 / bpm : 0
  const from = Math.max(0, Math.floor((atSec - PAD) * SR))
  const to = Math.min(buf.length, Math.ceil((atSec + TAIL) * SR))
  const n = Math.max(1, to - from)
  const chans = [0, 1].map((c) => buf.getChannelData(Math.min(c, buf.numberOfChannels - 1)).slice(from, to))

  let peak = 0, sum = 0
  for (const ch of chans) for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > peak) peak = a; sum += ch[i] * ch[i] }
  const rms = Math.sqrt(sum / (chans.length * n))

  // 16-bit PCM WAV
  const bytes = 44 + n * 2 * 2
  const dv = new DataView(new ArrayBuffer(bytes))
  const ascii = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)) }
  ascii(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); ascii(8, 'WAVE'); ascii(12, 'fmt ')
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true)
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true)
  ascii(36, 'data'); dv.setUint32(40, n * 4, true)
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) {
    const v = Math.max(-1, Math.min(1, chans[c][i] || 0))
    dv.setInt16(44 + (i * 2 + c) * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true)
  }
  const blob = new Blob([dv.buffer], { type: 'audio/wav' })
  document.getElementById('au').src = URL.createObjectURL(blob)

  log(`clip ${(n / SR).toFixed(2)}s · peak ${peak.toFixed(4)} · rms ${rms.toFixed(5)} · sampleErrors ${sampleErrors.length}`)
  if (sampleErrors.length) log('SAMPLE ERRORS:\n  ' + sampleErrors.slice(0, 10).join('\n  '))

  window.__RESULT = {
    ok: true, number: song.number, title: song.title_th, lead: LEAD, pre: PRE, bpm,
    clipSec: n / SR, peak, rms, sampleErrors, log: lines,
    // handed to the driver in chunks (a WAV is too big for one CDP return value)
    bytes: new Uint8Array(dv.buffer).length,
    _b64: () => { let s = ''; const u = new Uint8Array(dv.buffer); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s) },
  }
  window.__CHUNK = (i, size) => window.__RESULT._b64().slice(i * size, (i + 1) * size)
  log('DONE')
} catch (e) { fail(e?.message || String(e)) }
