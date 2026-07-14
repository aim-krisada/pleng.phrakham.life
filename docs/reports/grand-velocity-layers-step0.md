# Audio Round 2 · STEP 0 — self-host the FULL Grand velocity-layer set

**Branch:** `claude/gallant-maxwell-ad4aa5` (fork of `studio-shell-redesign`, merge-base `cc28589`) ·
**สาย:** Dev/Infra (เสียง) · **ห้าม merge/deploy เอง — PM gate**

## Objective (P'Aim 14 ก.ค.)
P1 self-hosted only the Grand's **PP** velocity layer, so the arranger's comp floor jammed at vel 41
(`GRAND_LAYER [41,67]`) — the **left hand couldn't get softer**. smplr's Splendid Grand has FIVE
velocity layers. STEP 0 = **download the missing ones (PPP/MP/MF/FF), self-host them, wire smplr to
load all**, so round 2 can tune per-role volume + timbre **จากของจริง** (real recorded layers, not one
layer scaled by gain).

## What shipped

### 1. Layers self-hosted (Public Domain — Splendid Grand)
Downloaded from smplr's own PD sample host (`smpldsnds.github.io`, redistributable per
`cc-instrument-samples.md`) into `public/samples/splendid-grand/samples/` — same-origin, offline-safe,
**no runtime CDN**. Reproducible via `tools/fetch-grand-layers.mjs` (+ `prepare-samples.mjs` updated
for a from-scratch build). Filenames are smplr's exact strings (incl. the MF layer's mixed `MF`/`Mf`
casing the case-sensitive host requires).

| Layer | Velocity | Files (notes 40–84) | Size | Note |
|---|---|---|---|---|
| **PPP** | 1–40 | 0 new | **0 MB** | **reuses the PP files** + a ~1 kHz low-pass smplr applies |
| PP | 41–67 | 30 (already shipped) | 2.4 MB | — |
| **MP** | 68–84 | 30 new | **3.39 MB** | `Mp <note>` |
| **MF** | 85–100 | 30 new | **3.67 MB** | `MF`/`Mf <note>` |
| **FF** | 101–127 | 30 new | **3.50 MB** | `FF <note>` |
| **Grand total** | | **120 files** | **12.92 MB** | was 2.4 MB (PP only) |

### 2. smplr wired to load all layers + velocity map (`src/lib/sampler.js`)
- `GRAND_LAYER` → **[1,127]** (loads every layer). `GRAND_VELOCITY_LAYERS` mirrors smplr's five layer
  ranges. They **tile 1–127 with no gap** → any velocity lands in a real recorded layer.
- `gainToVelocity` band = **[GRAND_VEL_LO 24, GRAND_VEL_HI 67]** — **non-regressing STEP 0**: melody
  stays exactly at P1's level (top of PP, vel 67) and **only the soft comp drops into PPP** (vel 24 —
  soft + dark), so the left hand finally gets quiet. `GRAND_VEL_LO/HI` are **round 2's per-role knobs**.

### 3. Velocity-in-layer guard (task #3 — kills the P1 mute bug at the root)
- `velocityInLoadedLayer(v)` — true iff `v` is inside a loaded layer. With all five loaded this is
  `[1,127]`; kept layer-aware so it still holds if we ever load a subset (e.g. drop FF to shrink cache).
- `src/lib/sampler.test.js` (+6 tests): asserts the layers **cover 1..127 contiguously (no gap/overlap)**,
  every velocity 1..127 is in a loaded layer, every fired gain maps in-layer, and the soft comp now
  maps **below the old PP floor (41)**. Full suite green: **sampler 13/13 · arranger 54/54**.

## PWA cache impact (task #4)
- Grand: **2.4 → 12.92 MB** (+10.52). Catalog `manifest.json` totalMB **10.63 → 21.19**, precache
  **115 → 205** entries. **Trim held at notes 40–84** (E2–C6, the P1 range) — the minimum sensible span
  (bass root → high melody); smplr pitch-shifts outside it.
- **Lazy-loaded per instrument**: a piano-only session (round 2's focus) downloads **only the 12.92 MB
  Grand**, not the whole catalog. Cache-API-persisted after first play.
- **Round-2 lever if leaner is wanted:** dropping **FF** (−3.50 MB → Grand 9.4 MB) is safe as long as
  the velocity band caps at ≤100 — `velocityInLoadedLayer` + the contiguity test enforce it. PPP is
  already free.

## Verify (offline · `docs/spikes/verify-grand-layers.html` — OfflineAudioContext)
Rendered from the in-app `/samples/` mirror (served by a worktree vite):

```
LAYER SWEEP (one note per layer, midi 60):
  PPP vel  20  peak 0.0124   PP vel 55  peak 0.0835   MP vel 76  peak 0.1516
  MF  vel  92  peak 0.2281   FF vel 115 peak 0.3571
ARRANGER FIRED GAINS (via gainToVelocity):
  melody     0.3500 → vel 67  peak 0.1239   (= P1, unchanged)
  chordBass  0.0798 → vel 28  peak 0.0243   (PPP — softer)
  chordInner 0.0550 → vel 24  peak 0.0178   (PPP — softer/darker)
monotonic PPP→FF peak rises: YES ✓   ·   external (cross-origin) requests: NONE ✓
```
- Every layer **plays (peak>0), none clips (peak<1)**, offline (zero external requests).
- **Monotonic peak rise PPP→FF** proves the five layers are **distinct real recordings** (louder +
  brighter), not one layer scaled — the real-timbre foundation round 2 needs.
- Melody peak **0.124 = P1** (non-regressing); comp now genuinely soft (PPP).

## Round-2 handoff (foundation is ready — creative tuning is P'Aim ↔ SA)
The layers are loaded, mute-proof, and verified. Round 2's per-role tuning knobs:
- **`GRAND_VEL_HI` (67)** — raise toward MP/MF for a brighter, more present melody; FF for accents.
- **`GRAND_VEL_LO` (24)** — how soft the comp floor goes (PPP).
- **`makeup` (2.3, in REGISTRY)** — overall Grand level; re-tune by ear if the band widens (a louder
  band + 2.3 could get hot — the per-note render stays <1, but full-mix loudness is a by-ear call).
- Per-role separation (bass vs inner vs melody on different layers) is the natural next step and is
  what the loaded layers unlock.

## Files
- `public/samples/splendid-grand/samples/` — +90 ogg (MP/MF/FF) · `public/samples/manifest.json`
- `src/lib/sampler.js` · `src/lib/sampler.test.js`
- `tools/fetch-grand-layers.mjs` (new · direct-to-public runner) · `tools/prepare-samples.mjs` ·
  `tools/assemble-samples-repo.mjs` (SSOT kept in sync)
- `docs/spikes/verify-grand-layers.html` (verify harness · smplr.mjs regenerated, not committed)
