// Module half of editor-scope-render.html. Served BY VITE (bare imports are resolved for us —
// the '#' sample fix landed in vite.config.js, so no side-car front server is needed any more).
//
// The whole point: press the buttons a person presses. We mount the real SongViewer, click the
// real dock ▶ or the real .sv-play-btn, and record what the audio engine actually produced.
import { createApp, h, ref } from 'vue'
import SongViewer from '/src/components/SongViewer.vue'
import { stopPlayback, buildPlayNotes } from '/src/lib/midi.js'
import { resolveContent, resolvePlayOrder } from '/src/lib/songModel.js'
import { setEnsembleMode, setLeadInstrument, setSoundMode, setPlayStyle } from '/src/store.js'

const SB = 'https://vlpuvaofbzdawgjjpgfu.supabase.co'
const SB_KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'
const fetchSong = async (number) => {
  const r = await fetch(`${SB}/rest/v1/songs?number=eq.${number}&select=id,number,title_th,content&limit=1`,
    { headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}` } })
  if (!r.ok) throw new Error(`supabase ${r.status}`)
  return (await r.json())[0]
}

const q = new URLSearchParams(location.search)
const NUMBER = Number(q.get('number') || 141)
// listen-section = ฝึกร้อง with only that ท่อน ticked in the dock · edit-section / edit-line = the
// pencil's own buttons. listen-section vs edit-section is the A/B; running listen-section twice
// (mode=listen-section&control=1) is the determinism control that makes the A/B mean anything.
const MODE = q.get('mode') || 'edit-line'
const LI = Number(q.get('li') ?? 0)
const SR = 44100

const logEl = document.getElementById('log')
const lines = []
const log = (m) => { lines.push(m); logEl.textContent = lines.join('\n') }
const fail = (m) => { log('FAIL ' + m); window.__RESULT = { ok: false, error: m, log: lines } }

// ---- honesty guard: a sample answered with 404 or with index.html must never pass silently, or
// the audio evidence is a lie (the '#'-in-filename trap). Count every bad sample response.
const sampleErrors = []
let sampleFetches = 0
let lastSampleAt = 0
const realFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || ''
  const isSample = /\/samples\//.test(url)
  if (isSample) { sampleFetches++; lastSampleAt = Date.now() }
  const res = await realFetch(input, init)
  if (isSample) {
    lastSampleAt = Date.now()
    const ct = res.headers.get('content-type') || ''
    if (!res.ok) sampleErrors.push(`${res.status} ${url}`)
    else if (/text\/html/.test(ct)) sampleErrors.push(`HTML-instead-of-audio ${url}`)
  }
  return res
}
window.addEventListener('unhandledrejection', (e) => log('unhandledrejection: ' + (e.reason?.message || e.reason)))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// NEVER requestAnimationFrame here: a CDP-created / backgrounded tab reports visibilityState
// 'hidden' and rAF simply never fires, so the render hangs forever with no error. Timers do fire.
const nextFrame = () => sleep(60)

try {
  // smplr keeps decoded samples in CacheStorage, which SURVIVES a page load. A second clip would
  // then never touch window.fetch and the sampleErrors guard would silently measure nothing. Start
  // every render from a cold cache so "sampleErrors 0" is a claim about THIS clip.
  for (const k of await caches.keys()) await caches.delete(k)

  const song = await fetchSong(NUMBER)
  if (!song) throw new Error('song ' + NUMBER + ' not found')
  const bpm = Number(song.content?.bpm) || 92
  const resolved = resolveContent(song.content)
  // the room is sized for the WHOLE song in EVERY mode — a scope must never get a shorter room
  // than the reference render, or the comparison would be measuring the room and not the sound.
  // Beats come from the same buildPlayNotes the engine schedules from, in the same strophic order.
  const forNotes = { ...song.content, lines: resolved }
  const fullNotes = buildPlayNotes(forNotes, { order: resolvePlayOrder(song.content) ?? undefined })
  const totalBeats = fullNotes.reduce((s, n) => s + (n.beats || 0), 0)
  const fullSec = Math.max(20, (totalBeats * 60) / bpm) + 6
  log(`#${song.number} ${song.title_th} · mode=${MODE} · li=${LI} · bpm=${bpm} · ${resolved.length} display lines · room ${fullSec.toFixed(1)}s${q.get('control') ? ' · CONTROL run' : ''}`)
  resolved.forEach((l, i) => {
    const sec = l.find?.((it) => it.type === 'section')
    if (sec) log(`   li ${i}: ท่อน "${sec.name}"`)
  })

  // ---- the offline room, behind a facade (playSong does `await ctx.resume()`, which an offline
  // context rejects; and sampler.js needs `startRendering` present to inject its big lookahead).
  const octx = new OfflineAudioContext(2, Math.ceil(fullSec * SR), SR)
  const shim = {
    get currentTime() { return octx.currentTime },
    get sampleRate() { return octx.sampleRate },
    get destination() { return octx.destination },
    get listener() { return octx.listener },
    get state() { return 'running' },
    resume: async () => {}, suspend: async () => {}, close: async () => {},
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

  // เปียโนเสียงทอง, solo, melody, the default บรรเลง recipe — pinned so a stale localStorage in the
  // render profile cannot change what is being evidenced (P'Aim: the golden piano must not move).
  setEnsembleMode('solo'); setLeadInstrument('grand'); setSoundMode('melody'); setPlayStyle('arrangement')

  // ---- mount the REAL reading surface with the REAL song
  const viewer = ref(null)
  createApp({
    setup: () => () => h(SongViewer, { ref: viewer, song, tier: 'guest' }),
  }).mount('#stage')
  await nextFrame(); await sleep(300)

  const press = async (el, what) => {
    if (!el) throw new Error('button not found: ' + what)
    el.click()
    log(`pressed: ${what} ("${(el.textContent || el.getAttribute('aria-label') || '').trim()}")`)
    await nextFrame()
  }
  const playBtn = (label) => [...document.querySelectorAll('#stage .sv-play-btn')]
    .find((b) => (b.textContent || '').includes(label))

  // the ท่อน the cursor's line belongs to — the two sides of the A/B must aim at the SAME one
  const secOfLine = (() => {
    let cur = null
    for (let i = 0; i <= LI && i < resolved.length; i++) {
      const s = resolved[i].find?.((it) => it.type === 'section')
      if (s) cur = s.name
    }
    return cur
  })()

  if (MODE === 'listen-section') {
    // โหมดฟัง — tick ONLY this ท่อน in the dock's เลือกท่อน panel, then press the dock's ▶.
    // Every step is a real click on the real control, exactly as a singer does it.
    await press(document.querySelector('#stage .st-seltrig'), 'dock เลือกท่อน')
    const allBtns = [...document.querySelectorAll('#stage .st-ssallbtn')]
    await press(allBtns.find((b) => b.textContent.includes('ไม่เลือก')), 'ไม่เลือก (clear)')
    const row = [...document.querySelectorAll('#stage .st-ssrow')]
      .find((b) => (b.querySelector('.st-ssname')?.textContent || '').trim() === secOfLine)
    await press(row, `ท่อน "${secOfLine}"`)
    await press(document.querySelector('#stage .st-seltrig'), 'close เลือกท่อน')
    await press(document.querySelector('#stage button[aria-label="เล่น"]'), 'dock ▶')
  } else if (MODE === 'listen-whole') {
    await press(document.querySelector('#stage button[aria-label="เล่น"]'), 'dock ▶')
  } else {
    viewer.value.toggleEdit() // ✏️ — the FAB; toggleEdit is what its @click calls
    await nextFrame(); await sleep(50)
    if (!document.querySelector('#stage .sv-play-btn')) throw new Error('the pencil shows no play buttons')
    if (MODE !== 'edit-whole') {
      viewer.value.selectUnit(LI, 0, 0, 'note') // put the cursor on the line under test
      await nextFrame()
    }
    if (MODE === 'edit-whole') await press(playBtn('ทั้งเพลง'), 'pencil ▶ ทั้งเพลง')
    else if (MODE === 'edit-section') await press(playBtn('ท่อนนี้'), 'pencil ▶ ท่อนนี้')
    else await press(playBtn('บรรทัดนี้'), 'pencil ▶ บรรทัดนี้')
    const now = document.querySelector('#stage .sv-play-now')
    log(`on-screen label: ${now ? now.textContent.trim() : '(none)'}`)
  }

  // wait for the sampler download to settle (a quiet period with no new /samples/ request), then a
  // beat for the synchronous scheduling that follows it
  // wall-clock bounded, not iteration bounded — a throttled tab stretches every setTimeout, and an
  // iteration count would then mean something completely different from what it reads like.
  const deadline = Date.now() + 180000
  while (Date.now() < deadline) {
    await sleep(500)
    if (sampleFetches > 0 && Date.now() - lastSampleAt > 1500) break
  }
  if (!sampleFetches) throw new Error('no sample was ever requested — the golden piano never loaded')
  await sleep(400)
  log(`samples fetched: ${sampleFetches} · sampleErrors ${sampleErrors.length} · rendering…`)
  const buf = await octx.startRendering()
  stopPlayback()

  // crop to the sounding part (after rendering, so the crop cannot change what was scheduled)
  const ch0 = buf.getChannelData(0)
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0
  const THRESH = 1e-4
  let last = 0
  for (let i = 0; i < ch0.length; i++) if (Math.abs(ch0[i]) > THRESH || Math.abs(ch1[i]) > THRESH) last = i
  const n = Math.max(1, Math.min(ch0.length, last + Math.floor(0.4 * SR)))

  let peak = 0, sum = 0
  for (const ch of [ch0, ch1]) for (let i = 0; i < n; i++) { const a = Math.abs(ch[i]); if (a > peak) peak = a; sum += ch[i] * ch[i] }
  const rms = Math.sqrt(sum / (2 * n))

  // 16-bit PCM WAV
  const bytes = 44 + n * 2 * 2
  const dv = new DataView(new ArrayBuffer(bytes))
  const ascii = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)) }
  ascii(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); ascii(8, 'WAVE'); ascii(12, 'fmt ')
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true)
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true)
  ascii(36, 'data'); dv.setUint32(40, n * 4, true)
  for (let i = 0; i < n; i++) {
    for (const [c, ch] of [[0, ch0], [1, ch1]]) {
      const v = Math.max(-1, Math.min(1, ch[i] || 0))
      dv.setInt16(44 + (i * 2 + c) * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true)
    }
  }
  const u8 = new Uint8Array(dv.buffer)
  const digest = await crypto.subtle.digest('SHA-256', u8.slice(44)) // audio payload only
  const sha = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  document.getElementById('au').src = URL.createObjectURL(new Blob([dv.buffer], { type: 'audio/wav' }))

  log(`clip ${(n / SR).toFixed(2)}s · peak ${peak.toFixed(4)} · rms ${rms.toFixed(5)} · sha256 ${sha.slice(0, 16)}…`)
  if (sampleErrors.length) log('SAMPLE ERRORS:\n  ' + sampleErrors.slice(0, 10).join('\n  '))

  window.__RESULT = {
    ok: true, number: song.number, title: song.title_th, mode: MODE, li: LI, bpm,
    clipSec: n / SR, peak, rms, sha, sampleErrors, log: lines, bytes: u8.length,
    _b64: () => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s) },
  }
  log('DONE')
} catch (e) { fail(e?.stack || e?.message || String(e)) }
