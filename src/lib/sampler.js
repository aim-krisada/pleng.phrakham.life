// B107 — real recorded instruments in the browser. Swaps the triangle oscillator (midi.js) for
// recorded samples so playback sounds like an instrument, while still being driven by the SAME
// note events — so transpose and live editing keep working (a sampler just plays a different MIDI
// number; nothing is pre-rendered). Thin wrapper over `smplr`.
//
// STEP 9 (5-instrument solo): P1 shipped Grand only. Step 9 adds felt (filtered grand), nylon,
// violin, cello, plus steel + string-ensemble accompaniment voices — ALL self-hosted under
// `/samples/` (same-origin, PWA-offline safe · no runtime CDN). See docs/reports/cc-instrument-
// samples.md for the sourcing/licence/mirror plan and public/samples/manifest.json for the layout.
//
// SELF-HOST (offline PWA): `SAMPLE_HOSTS.base` is the ONE knob for where samples come from — the
// same-origin mirror `/samples/`. The P1 CDN default is gone: every instrument (Grand included)
// loads from our own host so the service worker can precache it and playback works offline.
// smplr's own `CacheStorage` persists fetched files across sessions; the SW precache covers the
// FIRST offline launch (never-played). Changing the host = editing SAMPLE_HOSTS only.
//
// SIZE: each instrument loads LAZILY (only when first played) + a single velocity layer / trimmed
// range, so a real session downloads only the 2–4 voices it uses (~2–3 MB each), not the whole
// ~10.6 MB catalog. If the samples aren't loaded (offline / slow / first press) the caller falls
// back to the synth INSTANTLY — the sampler is never on the critical path of "press play → hear".
//
// `smplr` is imported DYNAMICALLY (inside loadInstrument) so it's a lazy chunk, not in the initial
// page bundle — a viewer who never presses play downloads neither smplr nor samples.

// The same-origin mirror root (served from public/samples/ → /samples/ in dev + prod). `grand`
// is kept as an explicit entry so the legacy host-agnostic contract (and its test) still holds;
// production mirrors samples by editing this object only.
export const SAMPLE_HOSTS = {
  base: '/samples/',
  grand: '/samples/splendid-grand/samples',
}

// ---- Instrument registry (step 9) --------------------------------------------------------------
// One entry per registry name → how smplr builds it from the mirror. `kind` picks the loader:
//   'grand'    — SplendidGrandPiano (velocity-layered · felt = same + a low-pass filter node)
//   'soundfont'— smplr Soundfont from a FluidR3_GM per-note mp3.js (steel / string ensemble)
//   'sampler'  — smplr Sampler from a hosted SmplrPreset (per-note ogg · the CC0 leads)
// `makeup` lifts each instrument to a comparable level (Grand's PP layer is soft → ×2.3; the GM /
// CC0 samples are recorded near full level → a gentler lift). Tuned against the OfflineAudioContext
// peak measurement (docs/spikes/instrument-self-host-demo.html) so none is silent or clipping.
const REGISTRY = {
  grand: { kind: 'grand', makeup: 2.3 },
  // felt = the Grand samples through a low-pass (~2 kHz) → soft/intimate. No files of its own.
  // (The per-region lpfCutoffHz preset field is layer-scoped, so we insert a BiquadFilter node on
  // the output instead — the authoritative approach from the cc-samples report §felt.)
  felt: { kind: 'grand', makeup: 2.3, lpfCutoffHz: 2000 },
  nylon: { kind: 'sampler', preset: 'CC0/nylon/preset.json', baseUrl: 'CC0/nylon', makeup: 1.4 },
  cello: { kind: 'sampler', preset: 'CC0/cello/preset.json', baseUrl: 'CC0/cello', makeup: 1.3 },
  violin: { kind: 'sampler', preset: 'CC0/violin/preset.json', baseUrl: 'CC0/violin', makeup: 0.8 },
  // Accompaniment voices (blended, GM is fine) — kept for the future เต็มวง path + offline precache.
  steel: { kind: 'soundfont', instrumentUrl: 'FluidR3_GM/acoustic_guitar_steel-mp3.js', makeup: 1.3 },
  string: { kind: 'soundfont', instrumentUrl: 'FluidR3_GM/string_ensemble_1-mp3.js', makeup: 1.5 },
}
export const SAMPLED_INSTRUMENTS = Object.keys(REGISTRY)

// smplr's Splendid Grand has FIVE contiguous velocity layers. CRITICAL: smplr plays the layer picked
// by the note's velocity and does NOT fall back across layers — firing a velocity OUTSIDE every loaded
// layer plays SILENCE (the P1 "piano mute" bug). P1 loaded ONLY PP, so the comp floor jammed at vel 41
// and anything outside [41,67] went silent. Audio R2 STEP 0 loads ALL layers → their ranges tile
// [1,127] with NO gap, so EVERY MIDI velocity lands in a real recorded layer and the mute bug is
// structurally impossible. PPP reuses the PP files (+ a ~1 kHz low-pass smplr applies) → 0 extra
// download; MP/MF/FF are the new self-hosted files. Loading REAL layers (not one layer scaled by gain)
// is what gives round 2 a true per-velocity timbre to tune, and lets the left hand actually get softer
// (drop into PPP). Ranges mirror smplr src/splendid-grand-piano.ts (the load SSOT).
export const GRAND_VELOCITY_LAYERS = [
  { name: 'PPP', range: [1, 40] },   // reuses PP files + low-pass — 0 extra bytes
  { name: 'PP', range: [41, 67] },
  { name: 'MP', range: [68, 84] },
  { name: 'MF', range: [85, 100] },
  { name: 'FF', range: [101, 127] },
]
// The velocity range we ask smplr to LOAD. [1,127] → every layer whose range overlaps it = all five.
// Kept named GRAND_LAYER for the legacy contract/test; it now means the FULL loaded coverage (was the
// PP-only [41,67]). Because the layers tile [1,127] with no gap, this is also the loaded coverage.
export const GRAND_LAYER = [1, 127]
const GRAND_VEL_RANGE = GRAND_LAYER
// True iff velocity v falls inside one of the LOADED layers (a real sample will sound, not silence).
// With all five loaded this is just [1,127]; kept explicit + layer-aware so the mute invariant stays
// checkable and still holds if we ever load a SUBSET of layers (e.g. drop FF to shrink the cache).
export function velocityInLoadedLayer(v) {
  return GRAND_VELOCITY_LAYERS.some(({ range }) => v >= range[0] && v <= range[1])
}
// The gains playSong actually fires (midi.js): melody, chord bass (chordGain·1.45), chord inner
// (chordGain). Exported so a test can prove EVERY fired velocity lands in a loaded layer —
// the invariant whose absence let P1 ship silent. Keep in sync with midi.js if those change.
export const FIRED_GAINS = { melody: 0.35, chordBass: 0.055 * 1.45, chordInner: 0.055 }
// The gain window our callers pass: chord inner ≈ 0.055 (softest) up to melody ≈ 0.35 (loudest).
const GAIN_MIN = 0.055
const GAIN_MAX = 0.35
// The MIDI range to LOAD Grand samples for. Covers the common bass-root..melody span; notes
// outside it still play (smplr pitch-shifts from the nearest loaded sample), so this only trades a
// little edge fidelity for a smaller download. With the single velocity layer this pins the first
// load to ~2.4 MB (measured) instead of the ~17 MB full-keyboard default.
const GRAND_LO = 40 // E2 (lowest chord bass root)
const GRAND_HI = 84 // C6 (above all but the rare highest melody note)
function midiRange(lo, hi) { const a = []; for (let m = lo; m <= hi; m++) a.push(m); return a }

// Map the arranger's gain window [chord inner ≈ 0.055 .. melody ≈ 0.35] onto a velocity band. STEP 0
// is a NON-REGRESSING foundation: it keeps the melody exactly where P1 had it (top of PP, vel 67 —
// same loudness/timbre) and only drops the softest comp DOWN into PPP (soft + dark low-pass), so the
// left hand can finally get quiet — the one thing the objective asked for. MP/MF/FF are loaded (see
// GRAND_VEL_RANGE) but the DEFAULT band doesn't reach them yet: they are the headroom ROUND 2 dials
// in (raise GRAND_VEL_HI toward MP/MF for a brighter, more present melody; FF for accents), tuning
// by ear with P'Aim. These two constants are round 2's primary per-role knobs. Output is clamped to
// [1,127] and, since the layers tile that range, always lands in a loaded layer (never silent).
export const GRAND_VEL_LO = 24  // softest comp → low PPP (dark, quiet) — was jammed at the PP floor 41
export const GRAND_VEL_HI = 67  // loudest melody → top of PP (unchanged from P1; round 2 raises this)
export function gainToVelocity(gain) {
  const g = Math.max(0.02, Math.min(0.5, gain || 0.3))
  const t = Math.max(0, Math.min(1, (g - GAIN_MIN) / (GAIN_MAX - GAIN_MIN)))
  const v = Math.round(GRAND_VEL_LO + t * (GRAND_VEL_HI - GRAND_VEL_LO))
  return Math.max(1, Math.min(127, v))
}

// Velocity mapping for the NON-layered instruments (Soundfont / Sampler). Those have ONE sample
// per note and scale loudness by velocity (no layer to fall out of), so we spread our gain window
// across a fuller, musical velocity band [FULL_VEL_LO, FULL_VEL_HI]. Same monotonic shape as the
// Grand map (louder gain → higher velocity), so the melody-over-chord balance is preserved; a
// per-instrument makeup gain node then matches the overall level to the Grand.
const FULL_VEL_LO = 46
const FULL_VEL_HI = 110
export function gainToVelocityFull(gain) {
  const g = Math.max(0.02, Math.min(0.5, gain || 0.3))
  const t = Math.max(0, Math.min(1, (g - GAIN_MIN) / (GAIN_MAX - GAIN_MIN)))
  return Math.round(FULL_VEL_LO + t * (FULL_VEL_HI - FULL_VEL_LO))
}

// The usable gain window [chord-inner floor .. melody ceiling]. Anything the arranger's dynamics
// layer (B107 P2 §R2.4) produces MUST be clamped into this before it's fired, so gainToVelocity()
// lands strictly inside the ONE loaded velocity layer (GRAND_LAYER). This is the "velocity-in-
// layer" invariant whose absence made P1 play silence.
export const GAIN_WINDOW = [GAIN_MIN, GAIN_MAX]
export function clampGainToLayer(gain) {
  return Math.max(GAIN_MIN, Math.min(GAIN_MAX, gain || GAIN_MIN))
}

// name -> { instrument, ready, loading:Promise } — one entry per (name, AudioContext).
// Keyed by context because an OfflineAudioContext (MP3) is a different context than the live
// one; we don't want to share decoded buffers across incompatible contexts.
const cache = new Map()
function cacheKey(name, context) {
  if (!cache._ctxIds) cache._ctxIds = new WeakMap()
  let id = cache._ctxIds.get(context)
  if (id == null) { id = cache._nextId = (cache._nextId || 0) + 1; cache._ctxIds.set(context, id) }
  return name + '@' + id
}

// Persistent sample cache (B107). smplr's CacheStorage stores the fetched sample files in the
// browser Cache API, which SURVIVES page reloads / restarts / offline — unlike the plain HTTP
// cache (evictable) or localStorage (5 MB string cap, no binary). So each instrument downloads
// once and every later play (even offline) is instant. The Cache API needs a secure context
// (https or localhost); on a plain-http LAN test URL it's absent, so we fall back to the default
// HTTP storage (still works, just not persisted). Built lazily with smplr.
const CACHE_NAME = 'pleng-samples-v1'
function makeStorage(CacheStorage) {
  try {
    if (typeof caches !== 'undefined' && CacheStorage) return new CacheStorage(CACHE_NAME)
  } catch { /* Cache API blocked → fall through to smplr's default HTTP storage */ }
  return undefined
}

// Build the smplr instrument for a registry name (smplr loaded lazily). onProgress(0..1) fires as
// the samples download so the UI can show a bar (like MP3 export). Returns { instrument, output,
// velMap } — `output` is the makeup gain node (the instrument's single output, re-routed into the
// LAYER-4 mix); `velMap` is the gain→velocity function for this instrument's loader.
async function createInstrument(name, context, onProgress) {
  const entry = REGISTRY[name]
  if (!entry) return null
  const smplr = await import('smplr')
  const { SplendidGrandPiano, Soundfont, Sampler, CacheStorage } = smplr
  const storage = makeStorage(CacheStorage)
  const base = SAMPLE_HOSTS.base
  const onLoadProgress = ({ loaded, total }) => { if (total) onProgress?.(loaded / total) }

  // makeup gain: lift the instrument to a usable level (see REGISTRY.makeup). One gain for all
  // voices → the melody/chord balance (set by velocity) is preserved. Routed as the instrument's
  // destination → context.destination (the scheduler re-points it at the reverb bus, §5).
  const makeup = context.createGain()
  makeup.gain.value = entry.makeup ?? 1

  if (entry.kind === 'grand') {
    // makeup is always the single re-routable output → context.destination. felt = Grand + a
    // low-pass placed BEFORE the makeup (instrument → lpf → makeup), so the makeup node still is
    // the one output the scheduler re-points at the reverb bus.
    makeup.connect(context.destination)
    let dest = makeup
    if (entry.lpfCutoffHz) {
      const lpf = context.createBiquadFilter()
      lpf.type = 'lowpass'
      lpf.frequency.value = entry.lpfCutoffHz
      lpf.connect(makeup)
      dest = lpf
    }
    const opts = {
      baseUrl: SAMPLE_HOSTS.grand, // self-hosted (offline PWA) — same-origin mirror
      formats: ['ogg'],
      notesToLoad: { notes: midiRange(GRAND_LO, GRAND_HI), velocityRange: GRAND_VEL_RANGE },
      destination: dest,
      onLoadProgress,
    }
    if (storage) opts.storage = storage
    return { instrument: new SplendidGrandPiano(context, opts), output: makeup, velMap: gainToVelocity }
  }

  makeup.connect(context.destination)

  if (entry.kind === 'soundfont') {
    const opts = { instrumentUrl: base + entry.instrumentUrl, destination: makeup, onLoadProgress }
    if (storage) opts.storage = storage
    return { instrument: new Soundfont(context, opts), output: makeup, velMap: gainToVelocityFull }
  }

  if (entry.kind === 'sampler') {
    // Fetch the hosted SmplrPreset (per-note ogg map) and point it at the mirror. smplr then loads
    // each region's ogg from `${base}${baseUrl}/<midi>.ogg` (same-origin → SW-precacheable).
    const preset = await (await fetch(base + entry.preset)).json()
    preset.samples = preset.samples || {}
    preset.samples.baseUrl = base + entry.baseUrl
    const opts = { preset, destination: makeup, onLoadProgress }
    if (storage) opts.storage = storage
    return { instrument: new Sampler(context, opts), output: makeup, velMap: gainToVelocityFull }
  }

  return null
}

// Wrap a loaded smplr instrument in the uniform interface midi.js schedules against.
//   fire(midi, startT, dur, gain) — schedule ONE note (sampler pitch-shifts for transpose)
//   releaseAll()                  — stop every sounding/scheduled voice (playback stop)
function wrap(name, inst, output, velMap) {
  const toVel = velMap || gainToVelocity
  // Every smplr start() returns a per-VOICE StopFn. We keep them because inst.stop() on a smplr
  // `Sampler` (nylon/cello/violin) does NOT cancel notes scheduled in the FUTURE — so a mid-play
  // reschedule (change instrument/style) left the old pass's future notes ringing UNDER the new
  // pass = two songs at once (P'Aim's "เสียงซ้อน 2 ชั้น" bug). Calling each voice's StopFn cancels
  // its (future or sounding) BufferSource for real. SplendidGrandPiano.stop() already handles this;
  // doing both is harmless. Cleared on every releaseAll, and stopPlayback() runs before each new
  // play, so the list only ever holds the current play's voices.
  const stoppers = []
  return {
    name,
    output, // the makeup gain — the instrument's single output node (for the LAYER-4 mix)
    fire(midi, startT, dur, gain) {
      const stop = inst.start({ note: Math.round(midi), time: startT, duration: Math.max(0.12, dur), velocity: toVel(gain) })
      if (typeof stop === 'function') stoppers.push(stop)
    },
    releaseAll() {
      stoppers.splice(0).forEach((s) => { try { s() } catch { /* voice already gone */ } })
      try { inst.stop() } catch { /* already stopped */ }
    },
    // Re-route the whole instrument into `node` (reverb/pan bus) instead of context.destination.
    // Idempotent per play: disconnect any prior wiring first so repeated plays don't stack sends.
    setDestination(node) { try { output.disconnect() } catch { /* not connected */ } output.connect(node) },
  }
}

// Return the ready wrapper for (name, context) if its samples are already loaded, else null.
// Synchronous — the caller uses this to decide "sampler now" vs "synth now" without awaiting.
export function getReadyInstrument(name, context) {
  const e = cache.get(cacheKey(name, context))
  return e && e.ready ? e.wrapper : null
}

// Kick off loading (name, context) if not started; resolves to the ready wrapper (or null if
// the instrument is unknown / load failed → caller stays on the synth). Idempotent: repeated
// calls share one load. Preload with this on mount so the instrument is usually ready by first play.
export async function loadInstrument(name, context, { onProgress } = {}) {
  const key = cacheKey(name, context)
  const existing = cache.get(key)
  if (existing) return existing.loading
  const e = { instrument: null, ready: false, wrapper: null, loading: null }
  cache.set(key, e)
  e.loading = createInstrument(name, context, onProgress)
    .then((res) => {
      if (!res) { cache.delete(key); return null } // unknown name → no instrument
      e.instrument = res.instrument
      // smplr instruments expose a `load` promise (Soundfont/Sampler also `.loaded`); await
      // whichever is present so we only mark ready once the samples have actually decoded.
      const loaded = res.instrument.load ?? res.instrument.loaded ?? Promise.resolve()
      return Promise.resolve(loaded).then(() => {
        e.ready = true
        e.wrapper = wrap(name, res.instrument, res.output, res.velMap)
        return e.wrapper
      })
    })
    .catch((err) => { cache.delete(key); throw err }) // failed load → drop so a retry can re-load
  // swallow the rejection on the stored promise so an un-awaited preload can't crash the app;
  // callers that await get the real result/rejection.
  e.loading.catch(() => {})
  return e.loading
}

// True if the given instrument name is a real-sample instrument this module can load (vs the
// built-in 'synth'). Lets the viewer/scheduler treat 'synth' as the always-instant default.
export function isSampledInstrument(name) {
  return Object.prototype.hasOwnProperty.call(REGISTRY, name)
}
