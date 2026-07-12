# Tester gate — B107 Phase 1 (real Grand piano + wait-then-play + persistent cache)

**Branch tested:** `b107-instrument-playback` (@ `a00e552`)
**Tester branch:** `b107-p1-tester` · **worktree:** `pleng-t-b107` · dev server `:5312` (localhost, secure context)
**Verdict: 🔴 FAIL — release-blocking.** The core feature (real Grand piano playback) produces **complete silence**. Everything around it (fence, tests, lazy chunk, loading-UX plumbing, persistent cache, synth/MP3, chord-balance fix) is sound. One targeted fix + re-gate.

> ⚠️ synth→piano change and the plain/literal (no-arranger) sound are the intended feature — **not** flagged as regressions.

---

## 🔴 BLOCKER — grand piano plays SILENCE (velocity-layer mismatch)

**What the user gets:** press ▶ → loading pill fills to 100% → playback "runs" → **no sound at all** (and no synth either).

**Root cause (verified):** `sampler.js` loads a **single velocity layer** `GRAND_VEL_RANGE = [68,84]` (MP) — only the 30 `Mp *.ogg` files. But `playSong` (midi.js) fires notes at velocities that fall **outside** that layer, and smplr's `SplendidGrandPiano` does **not** fall back to the loaded layer — it finds no sample buffer and plays nothing.

| voice | gain fired | `gainToVelocity` | loaded layer [68,84]? | result |
|---|---|---|---|---|
| melody | 0.35 | **116** | ✗ (FF) | 🔇 silent |
| chord bass | 0.0798 | **40** | ✗ (PP) | 🔇 silent |
| chord upper | 0.055 | **33** | ✗ (PPP) | 🔇 silent |

**Evidence (real browser, secure context localhost):**
- **Velocity sweep** on the exact loaded piano (`velocityRange:[68,84]`), analyser peak amplitude on note D4:
  `v33=0 · v40=0 · v55=0 · v67=0 · v68=0.118 · v76=0.166 · v84=0.196 · v85=0.021 · v100=0 · v116=0 · v127=0` → **only 68–84 audible.**
- **Real `playSong` path**, master-output analyser (probe validated: a control oscillator on the same context read **0.297**): grand-piano melody → **master peak `0.0000`**, `osc(synth fallback)=0`, no errors. Pure silence, not synth.
- Only `Mp`-layer files are in Cache Storage (30 × `…/samples/Mp *.ogg`) — confirms just one layer is downloaded.

**Why tests stayed green:** `sampler.test.js` only asserts `gainToVelocity` math (melody >100, chord <45). It never checks that those velocities map to a **loaded** sample layer — so the unit test passes while the feature is dead. (Suggest a test/assert that fired velocities ⊆ loaded layer, or an audible-output check.)

**Fix direction (SA/dev's call — not prescribing):** make the fired velocities and the loaded layer(s) agree — e.g. load the velocity layer(s) that `gainToVelocity` actually emits, load the full velocity range, or map/clamp fired velocities into the single loaded MP layer. Then re-gate.

---

## Gate checks

### 1. Fence + lazy chunk — ✅ PASS
- Code diff sits within the audio/sampler fence: `src/lib/sampler.js` (new), `src/lib/midi.js`, `src/lib/audioExport.js`, `src/components/SongViewer.vue`, + tests (`sampler.test.js` new, `midi.chords.test.js`, `SongViewer.play.test.js`) + docs. No stray edits. `package.json` adds `smplr@^1.0.0`.
- **Lazy chunk confirmed:** `index.html` eagerly loads **only** the main entry `index-CMDThu6x.js`. The smplr library body (HttpStorage / `splendid-grand-piano`) is isolated in lazy chunk `index-BseCOH4y.js` (27.8 kB), **not** referenced by `index.html` → downloaded only when a play triggers `import('smplr')`. A viewer who never presses play fetches neither smplr nor samples.

### 2. Tests + build — ✅ PASS
- `npx vitest run`: **436/436 tests pass** (48 files). The only "failed suite" is the known **notationLint quirk** (`notationLint.test.mjs` calls `process.exit(0)` — it reports `fail=0`, i.e. passed). `sampler.test.js` 5/5 green.
- `npm run build`: passes (the pre-existing 500 kB chunk-size advisory + font-resolve notices are unchanged/unrelated).

### 3. Tier-B (real browser, editor-anon harness driving the real `playSong` code)
> Editor note: the **editor** page's play calls `playSong` with **no instrument** → it uses the synth, so it does **not** exercise the piano. The grand piano is wired only into `SongViewer` (login-gated). I drove the real production `playSong(…, instrument:'grand')` code path via a harness page served from my worktree, instrumenting the AudioContext to measure actual output. Timbre/loudness *judgement* still needs a human ear on live (see notes).

- **LOADING UX (wait-then-play + progress, no synth during load)** — ⚠️ **plumbing PASS / payoff FAIL.** First play: `onInstrumentPending` fires `loading:true` with progress climbing 0→1.0 over ~1.1 s (30 steps = 30 files), then `loading:false`; `osc(synth)=0` throughout (no synth stand-in during the wait); no console errors. **But** the piano that follows is silent (blocker).
- **BY EAR — real piano correct / literal / balance** — 🔴 **FAIL (silence).** Cannot be heard. *Literal/plain playback is confirmed at the data level:* melody MIDI = exact scale degrees `[60,62,64,67,65,64,65,64,62,60]` (no passing tones / arpeggios / added rhythm); chords = `buildChordVoice` voice-led output (upper voices in the 48–67 window, low bass, no doubled root, gliding). No arranger. But inaudible on the piano.
- **CHORD-BALANCE fix ("chords too loud")** — ✅ works on the path that sounds (synth/MP3): offline render RMS **melody 0.183 vs chords 0.082 ≈ −7 dB** under the melody, per design. Moot on the silent piano.
- **PERSIST CACHE (secure context)** — ✅ **PASS.** After first load, Cache Storage `pleng-samples-v1` holds **30** sample entries. After a **page reload**, warm play = **0 network fetches** to `smpldsnds.github.io` (all served from cache), load finished in **298 ms** (vs ~1123 ms cold). Persistence across reload confirmed on **localhost**. *(Over the http LAN IP the Cache API is absent and it falls back to non-persistent — must be confirmed on live https by P'Aim/Pao.)*
- **CANCEL mid-load** — 🟡 **mechanism OK, window not observable here.** Code path is correct (post-load `myFlag.stopped` check returns before scheduling; `stopPlay` clears the pill). On stop I observed `osc=0` (no synth burst), no error, no hang. Loads complete in <200 ms from HTTP cache on this machine, so I couldn't hold a long-enough wait to watch a live cancel — the real window exists on a **cold mobile** first load (seconds). For P'Aim/Pao to confirm on live.
- **MOBILE 375px** — 🟡 the loading state machine runs at any viewport; the actual `.inst-loading` pill lives in login-gated `SongViewer` (has `@media(max-width:480px)` rules) → visual check **for P'Aim/Pao on live**.
- **REGRESSION**
  - **MP3 export (synth)** — ✅ PASS. Offline render audible on all modes (melody peak 0.348 / chords 0.279 / both 0.618), correct balance. MP3 stays synth (piano-in-MP3 = P3, expected).
  - **play / stop / resume / mode switch / transpose mid-play** — control flow intact (re-schedule paths fire), but piano audio is silent, so these can't be by-ear confirmed until the blocker is fixed.

### 4. PASS/FAIL summary
| check | result |
|---|---|
| Fence + lazy chunk | ✅ PASS |
| vitest + build | ✅ PASS |
| Loading UX plumbing (progress, wait, no synth-during-load, no errors) | ✅ PASS |
| **Real piano actually plays (by ear)** | 🔴 **FAIL — silence** |
| Literal/plain playback (data level) | ✅ confirmed |
| Chord-balance fix (synth/MP3 path) | ✅ PASS |
| Persistent cache (localhost, 0-network warm reload) | ✅ PASS |
| Cancel mid-load | 🟡 mechanism OK (live cold-load window → P'Aim/Pao) |
| Mobile 375px pill | 🟡 login-gated → P'Aim/Pao on live |
| MP3 export | ✅ PASS |
| **Overall gate** | 🔴 **FAIL** |

---

## For P'Aim / Pao (needs logged-in SongViewer on live)
Once the velocity/layer fix lands: confirm on the real app that (a) the Grand piano is **audible** and sounds like a piano, (b) notes play **plainly** with no embellishment (Pao's note-check sound), (c) melody leads and chords don't drown it, (d) on a **cold mobile** load the pill counts up and พัก cancels, (e) persistent cache on **https** (0 re-download after reload).

## How to reproduce the blocker
Serve the branch (`npm run dev`), open a page that runs `playSong(content, { instrument:'grand', voices:'melody' })`, and tap the master output with an `AnalyserNode` → peak stays `0`. Or: load `SplendidGrandPiano` with `notesToLoad.velocityRange:[68,84]` and `start({note, velocity:116})` → silent; `velocity:76` → audible.
