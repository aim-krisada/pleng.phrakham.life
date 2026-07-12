// B107 — real recorded instruments in the browser (P1: Grand piano; strings/presets follow
// in P2). Swaps the triangle oscillator (midi.js) for recorded samples so playback sounds
// like an instrument, while still being driven by the SAME note events — so transpose and
// live editing keep working (a sampler just plays a different MIDI number; nothing is
// pre-rendered). Thin wrapper over `smplr`.
//
// HOST-AGNOSTIC: `SAMPLE_HOSTS` is the ONE place that decides where sample files come from.
// P1 points at the upstream CDN to ship + measure real mobile load; production must later
// MIRROR the files to a host we control (do NOT self-host in the repo — it bloats every
// clone/worktree). Changing the host = editing this object only.
//
// SIZE: SplendidGrandPiano's default loads all 5 velocity layers (~17 MB). We restrict to a
// single layer + the used note range via `notesToLoad` so first-load is ~3 MB, cached after.
// If the samples aren't loaded (offline / slow / first press), the caller falls back to the
// synth INSTANTLY — the sampler is never on the critical path of "press play → hear sound".
//
// `smplr` itself is imported DYNAMICALLY (inside loadInstrument) so it's a lazy chunk, not in
// the initial page bundle — a viewer who never presses play downloads neither smplr nor samples.

// One knob for where samples are served. `undefined` baseUrl = smplr's own hosted set
// (its GitHub Pages, Public-Domain Splendid Grand). Mirror to our own host for production.
export const SAMPLE_HOSTS = {
  grand: undefined, // smplr default (Public Domain / Akai Splendid Grand)
}

// The velocity layer to load (smplr layers: PPP[1-40] PP[41-67] MP[68-84] MF[85-100] FF[101-127]).
// MP = a natural mezzo tone — clear and easy to sing along to (Grand = default, per P'Aim).
// Loading ONE layer keeps the download small; per-note dynamics still ride on `velocity`.
const GRAND_VEL_RANGE = [68, 84]
// The MIDI range to LOAD samples for. Covers the common bass-root..melody span; notes outside
// it still play (smplr pitch-shifts from the nearest loaded sample), so this only trades a
// little edge fidelity for a smaller download. With the single velocity layer this pins the
// first load to ~3 MB (measured) instead of the ~17 MB full-keyboard default.
const GRAND_LO = 40 // E2 (lowest chord bass root)
const GRAND_HI = 84 // C6 (above all but the rare highest melody note)
function midiRange(lo, hi) { const a = []; for (let m = lo; m <= hi; m++) a.push(m); return a }

// Map our synth-scale gain (melody ≈ 0.35, chord voices ≈ 0.055–0.08) to a MIDI velocity
// (0–127). Same curve the B106 demo proved by ear: melody lands ~116, chords ~33–40, so the
// pad stays well under the tune. Since only ONE velocity layer is loaded, velocity here just
// scales loudness (it doesn't switch timbre) — which is exactly the balance we want.
export function gainToVelocity(gain) {
  return Math.max(6, Math.min(122, Math.round((gain || 0.3) * 280) + 18))
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
// cache (evictable) or localStorage (5 MB string cap, no binary). So the ~3 MB downloads once
// and every later play (even offline) is instant. The Cache API needs a secure context
// (https or localhost); on a plain-http LAN test URL it's absent, so we fall back to the
// default HTTP storage (still works, just not persisted). Built lazily with smplr.
const CACHE_NAME = 'pleng-samples-v1'
function makeStorage(CacheStorage) {
  try {
    if (typeof caches !== 'undefined' && CacheStorage) return new CacheStorage(CACHE_NAME)
  } catch { /* Cache API blocked → fall through to smplr's default HTTP storage */ }
  return undefined
}

// Build the smplr instrument for a registry name (smplr loaded lazily). Only 'grand' in P1.
// onProgress(0..1) fires as the samples download so the UI can show a bar (like MP3 export).
async function createInstrument(name, context, onProgress) {
  if (name === 'grand') {
    const { SplendidGrandPiano, CacheStorage } = await import('smplr')
    const opts = {
      notesToLoad: { notes: midiRange(GRAND_LO, GRAND_HI), velocityRange: GRAND_VEL_RANGE },
      onLoadProgress: ({ loaded, total }) => { if (total) onProgress?.(loaded / total) },
    }
    const storage = makeStorage(CacheStorage)
    if (storage) opts.storage = storage // persist samples across sessions / offline
    // Only override the sample host when we actually have one — passing baseUrl:undefined
    // clobbers smplr's own default and breaks its URL builder. To mirror to our own host for
    // production, set SAMPLE_HOSTS.grand (that's the single host-agnostic knob).
    if (SAMPLE_HOSTS.grand) opts.baseUrl = SAMPLE_HOSTS.grand
    return new SplendidGrandPiano(context, opts)
  }
  return null
}

// Wrap a loaded smplr instrument in the uniform interface midi.js schedules against.
//   fire(midi, startT, dur, gain) — schedule ONE note (sampler pitch-shifts for transpose)
//   releaseAll()                  — stop every sounding/scheduled voice (playback stop)
function wrap(name, inst) {
  return {
    name,
    output: inst.output,
    fire(midi, startT, dur, gain) {
      inst.start({ note: Math.round(midi), time: startT, duration: Math.max(0.12, dur), velocity: gainToVelocity(gain) })
    },
    releaseAll() { try { inst.stop() } catch { /* already stopped */ } },
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
// calls share one load. Preload with this on mount so 'grand' is usually ready by first play.
export async function loadInstrument(name, context, { onProgress } = {}) {
  const key = cacheKey(name, context)
  const existing = cache.get(key)
  if (existing) return existing.loading
  const e = { instrument: null, ready: false, wrapper: null, loading: null }
  cache.set(key, e)
  e.loading = createInstrument(name, context, onProgress)
    .then((inst) => {
      if (!inst) { cache.delete(key); return null } // unknown name → no instrument
      e.instrument = inst
      return inst.load.then(() => { e.ready = true; e.wrapper = wrap(name, inst); return e.wrapper })
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
  return name === 'grand'
}
