# P3 — "download real audio" spike (B107)

Spike (branch `b107-p3-download-spike`). **No prod changes** — prototype + recommendation + integration
plan; dev reworks the real code after launch.

**Goal:** the "ดาวน์โหลดเสียง" file should sound like what actually plays (the real samplers + `arrange()`,
3 modes), not the old synth-MIDI. Today `src/lib/audioExport.js` `renderSongToBuffer` still uses the synth
path (`scheduleNote`/`buildChordVoice`), so a download ≠ live.

## TL;DR

- **Root cause of "notes >3s go silent offline":** smplr's `Sampler.start` routes every note through an
  internal `Scheduler` with a **200 ms lookahead**. Notes within `now + 200 ms` are dispatched immediately
  (`source.start(absoluteTime)` — works offline); notes further out are **queued and flushed by a
  `setInterval`**, which **never fires during `OfflineAudioContext.startRendering()`** (offline renders
  synchronously/faster-than-realtime, no timers). So any note past ~200 ms is silent offline.
- **Fix (recommended — Approach 1):** inject a `Scheduler` whose `lookaheadMs ≥ song length`, so **every**
  note falls inside the window and dispatches immediately → captured in the offline render. **Simpler than
  the brief's "pre-decode + hand-schedule AudioBufferSourceNode"** — no manual decoding, keeps smplr's exact
  voicing/envelope/velocity. **Verified working for all instruments, 20–60× faster than realtime.**
- **Prototype** (`docs/spikes/render-real-audio-spike.html`) renders 3 modes to real WAV; the >3s tail note
  is audible in every mode.

## Root cause (reproduced)

Single violin note through the CC0 `Sampler` on an `OfflineAudioContext`:

| render length | note @0.1s | note @3.5s |
|---|---|---|
| 2s / 4s / 6s / 9s | **plays** (peak 0.086) | **silent** (0.000) |

The silence tracks the note's *scheduled time*, not the render length — confirming the 200 ms lookahead
threshold (`LOOKAHEAD_MS_DEFAULT` in smplr), not a buffer/decode issue. `Voice` itself calls
`source.start(startAt)` immediately (offline-safe); it just never runs for notes the scheduler defers.

## Fix — Approach 1: offline render + big-lookahead scheduler ✅ recommended

Inject a wide-lookahead scheduler so smplr dispatches every note immediately:

```js
import { Sampler, Soundfont, Scheduler, pianoToPreset, audioBufferToWav } from 'smplr'

const octx = new OfflineAudioContext(1, Math.ceil((songSec + tail) * sr), sr)
const sched = Scheduler(octx, { lookaheadMs: Math.ceil((songSec + 1) * 1000) }) // cover the whole piece

// GM (steel / string ensemble) — Soundfont respects `scheduler`:
new Soundfont(octx, { instrumentUrl: '/samples/FluidR3_GM/acoustic_guitar_steel-mp3.js', scheduler: sched })
// CC0 leads (violin / cello / nylon) — Sampler + preset:
new Sampler(octx, { preset, scheduler: sched })
// Grand — ⚠️ the SplendidGrandPiano WRAPPER drops `scheduler`; build it as a Sampler via pianoToPreset,
// and pass decayTime/detune/volume or you get a non-finite AudioParam (NaN):
new Sampler(octx, { preset: pianoToPreset({ baseUrl:'/samples/splendid-grand/samples', formats:['ogg'],
  notesToLoad:{ notes: GRAND_NOTES, velocityRange:[41,67] }, decayTime:0.5, detune:0, volume:100 }), scheduler: sched })

await inst.load                 // offline, samples fetched from same-origin /samples/
// schedule all notes with absolute times, then:
const buf = await octx.startRendering()
const wav = audioBufferToWav(buf)   // smplr helper → WAV; or reuse lamejs floatToInt16 → encodePcmToMp3 for MP3
```

### Verified prototype — `docs/spikes/render-real-audio-spike.html`

Amazing Grace, 4 bars (~13.4 s, **final note held 3.9 s → the >3s tail case**), rendered through the real
self-hosted samplers in 3 modes:

| mode | instruments | peak | tail @10–12.5s | offline render | speed |
|---|---|---|---|---|---|
| **เปียโน** | grand melody + chords | 0.230 | 0.026 | 319 ms | **42× realtime** |
| **กีตาร์** | nylon melody + arpeggio | 0.216 | 0.039 | 223 ms | **60×** |
| **รวมวง** | violin melody + cello bass + GM string pad + piano | 0.343 | 0.168 | 618 ms | **22×** |

All: **long tail note audible** (bug fixed), output is a valid **WAV** (RIFF/WAVE, 2.45 MB, plays/downloads),
**zero external requests** (samples from same-origin `/samples/`). The quieter piano/nylon tails are correct —
those instruments naturally decay (piano ~4.2 s, nylon ~2.4 s per `manifest.json` `durationSec`); the ensemble
tail stays strong because the violin sustains ~14 s + the pad. This matches live, so the file ≈ live.

## Approach 2 (fallback): real-time capture via MediaRecorder

Route the same **live** graph → `MediaStreamAudioDestinationNode` → `MediaRecorder` → record in real time →
encode. Pros: literally the live path, so exact by construction, uniform across everything. Cons: **slow
(= song length; ~3 min for a 3-min song)**, needs a real progress bar, and `MediaRecorder` emits webm/opus
(or similar) — not MP3 directly, so a re-encode/transcode is needed for an MP3 download.

**Why Approach 1 wins:** 20–60× faster (seconds, not minutes); deterministic (arguably *more* faithful than a
real-time capture — no timing jitter); same samplers/samples/`arrange()`/effect nodes as live (reverb
`ConvolverNode`, pan, gain all render fine offline; humanize is deterministic from `arrange()`); reuses the
existing MP3 encoder. Keep Approach 2 in the back pocket only if a future *live-only* node appears (none today).

## Integration plan for dev (rework `renderSongToBuffer` + `DownloadTool`, after launch)

1. **Feed `arrange()`**, not the synth. In `renderSongToBuffer`, build events with the SAME
   `arrange(notes, chordEvents, cfg, meta)` live playback uses (`src/lib/arranger/`) so export = live. The
   selected mode (piano/guitar/ensemble) picks the same recipe as `playSong`/`playEnsemble`.
2. **Build the mode's instruments on the offline ctx** each with the big-lookahead `Scheduler` (grand via
   `pianoToPreset`+`Sampler`; GM via `Soundfont`; CC0 via `Sampler`+preset). `await .load` (samples from
   `/samples/`, already on base + CacheStorage-persisted).
3. **Map gains → velocities** the same way as live (`sampler.js` `gainToVelocity`); the **grand must clamp to
   the loaded PP layer `[41,67]`** or the note is silent (same rule as live).
4. **Route all instrument outputs** through the same master/reverb/pan the live arranger uses, so the file
   matches live exactly.
5. **Encode:** `audioBufferToWav` for a lossless WAV, or keep the existing lamejs path
   (`floatToInt16` → `encodePcmToMp3`) for a small MP3 (already has progress + yielding).
6. **`DownloadTool`:** export the current mode; `estimateMp3` already gives the size/length pre-flight. Offline
   render is seconds, so a single "กำลังสร้างไฟล์…" spinner + the existing encode progress is enough.

Effort ≈ one module rewrite (`renderSongToBuffer`), reusing `arrange()` / `sampler.js` / `encodePcmToMp3`.

## Gotchas (so they don't recur)

- `SplendidGrandPiano` (and other preset-wrapper instruments) **drop the `scheduler` option** — build the
  grand as a generic `Sampler` from `pianoToPreset(...)` to inject the scheduler.
- `pianoToPreset` needs `decayTime`/`detune`/`volume` or the `Voice` gets a **non-finite AudioParam (NaN)**.
- Grand velocities must land in `[41,67]` (the one loaded velocity layer) or the note is silent.
- One-shot samples don't loop; very long held notes decay to their natural tail — matches live, not a bug.

## Status
Prototype done + verified; **held here** (dev integrates after launch, non-blocking). Server for P'Aim to
listen: `http://192.168.1.173:8123/render-real-audio-spike.html` (temp; regenerate via the scripts if down).
