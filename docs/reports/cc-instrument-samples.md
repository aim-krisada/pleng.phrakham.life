# CC instrument samples — sourcing for P2 curated orchestration (B107)

Research/sourcing session (branch `cc-samples-research`). **No prod-src changes** (dev integrates via
`src/lib/sampler.js`). Goal: source the best **redistributable** (CC0 / Public-Domain / CC-BY /
CC-Sampling+) samples for the P2 orchestration presets, verify each license permits **hosting +
redistribution**, and — per P'Aim's **PWA / offline** requirement — actually **download, self-host,
and offline-cache** them (NO runtime CDN). Anything "free but no redistribution" (Spitfire LABS /
Pianobook / Philharmonia) is **out**.

Grand piano was already sourced in P1 (Splendid Grand, Public Domain).

> **Two rounds.** Round 1 (below, "Per-instrument recommendations") = license research per instrument.
> Round 2 (this section) = the **PWA self-host build**: mirror everything to our own host, trim, and
> **verify it plays offline**. Round 2 is the authoritative plan; Round 1 is the sourcing evidence.

---

## TL;DR — verified PWA self-host plan

**All instruments now self-hosted + verified — no external CDN.** Built with `smplr` (already shipped;
no new dependency). A reproducible script (`tools/prepare-samples.mjs`) rebuilds the whole mirror
(~11.8 MB) from the redistributable sources.

- **⚠️ Offline gap found:** BOTH the P1 Grand (`smpldsnds.github.io`) and any GM instrument
  (`gleitz.github.io`) load from **external CDNs at runtime** — so a PWA would break offline. **Every
  sample must be mirrored to our host + precached by the service worker.** This is the core of Round 2.
- **The mirror (built + measured, `tools/prepare-samples.mjs`):**
  - **Grand piano** (P1) — mirror the Splendid Grand PP layer (notes 40–84), 30 ogg files, **2.4 MB**, Public Domain.
  - **Felt** — reuse the Grand + an output low-pass filter, **0 extra bytes**, no new license.
  - **Nylon guitar / Steel guitar / Violin / Cello / String ensemble / Warm pad** — mirror the
    **FluidR3_GM** per-note mp3 (CC-BY 3.0), trimmed to C2–F#6, **~1.2–1.9 MB each, 9.6 MB total**.
- **Verified 2026-07-12** (harness `docs/spikes/instrument-self-host-demo.html`, served locally, loaded
  from our host): all 8 instruments render through OfflineAudioContext with healthy peaks
  (**0.05–0.11, none silent, none clipping**) and **zero external network requests**. smplr-parse OK 6/6.
- **✅ CC0 quality upgrade DONE (P'Aim chose quality over GM for the 3 solo leads — Round 3 below):**
  **Violin = VSCO2 CE**, **Cello = Bigcat**, **Nylon = FreePats** — all CC0, downloaded, converted to
  per-note ogg, level-matched, self-hosted, and A/B-verified against GM. **Kept as GM:** steel guitar +
  string ensemble/pad (blended, GM is fine). Felt = filtered Grand. Grand = PD.
- **Attribution:** the CC0 leads need **none**. Only the remaining GM instruments (steel + string ensemble)
  need **one line** — *FluidR3_GM soundfont © Frank Wen, CC-BY 3.0*.

**Ruled out (do NOT host):** Philharmonia (forbids serving samples "as is"), VSCO2 **Pro/Standard** (paid
Kontakt EULA), Pianobook / Spitfire LABS / felt-piano packs (no redistribution), SSO (non-commercial +
retired license). **No CC0/CC-BY felt piano exists** (re-verified 2025-26) → felt = filtered Grand.

---

## Round 2 — PWA self-host build (done + verified)

### What was built
`tools/prepare-samples.mjs` (committed) downloads, trims, and lays out the full mirror. Re-runnable, no
npm deps, **no binaries in git** (regenerated on demand — keeps clones lean, per `sampler.js`'s own rule):

```
node tools/prepare-samples.mjs ./samples-mirror
# → samples-mirror/FluidR3_GM/<patch>-mp3.js   (6 GM instruments, CC-BY 3.0, trimmed C2–F#6)
# → samples-mirror/splendid-grand/samples/*.ogg (Grand PP layer 40–84, Public Domain)
```

### Sizes (measured)

| Instrument | Source (mirrored) | License | Format | Size |
|---|---|---|---|---|
| Grand piano | Splendid Grand PP layer, 40–84 (30 files) | Public Domain | ogg | **2.4 MB** |
| Felt | = Grand + output low-pass | — | — | **0** |
| Nylon guitar | FluidR3_GM `acoustic_guitar_nylon` | CC-BY 3.0 | mp3 (55 notes) | 1.19 MB |
| Steel guitar | FluidR3_GM `acoustic_guitar_steel` | CC-BY 3.0 | mp3 (55 notes) | 1.30 MB |
| Violin | FluidR3_GM `violin` | CC-BY 3.0 | mp3 (55 notes) | 1.88 MB |
| Cello | FluidR3_GM `cello` | CC-BY 3.0 | mp3 (55 notes) | 1.88 MB |
| String ensemble | FluidR3_GM `string_ensemble_1` | CC-BY 3.0 | mp3 (55 notes) | 1.88 MB |
| Warm pad (bonus) | FluidR3_GM `pad_2_warm` | CC-BY 3.0 | mp3 (55 notes) | 1.87 MB |
| **Total catalog** | | | | **≈ 11.8 MB** |

Trimming the GM patches from 88→55 notes (C2–F#6, smplr pitch-shifts beyond) cut them ~35% (15 MB → 9.6 MB)
with no audible loss — matching the P1 Grand's "loaded range only" philosophy. Everything loads **lazily
per-instrument** and is Cache-API-persisted, so a real preset touches only the 2–4 instruments it uses.

### Verified audio (offline, from our host)

Harness: `docs/spikes/instrument-self-host-demo.html`, served over local http, all assets under our origin.
Each instrument was rendered through an `OfflineAudioContext` (same method as the B107 tester) — peak/rms:

```
grand   0.113 · felt 0.113 · nylon 0.090 · steel 0.092
violin  0.073 · cello 0.061 · string_ensemble 0.054 · warm_pad 0.061
```

All non-silent, none clipping. `performance.getEntriesByType('resource')` → **zero external requests**
(no gleitz/smpldsnds). smplr parsed all 6 GM files after fixing a trailing-comma issue (see gotcha below).

### Offline caching strategy (for dev to wire)

1. **Mirror host.** *(Decided: in-app `public/samples/`, served same-origin — see "Final assembly" below.
   This section's original weighing of separate-repo vs in-app is kept for context.)* The two options were
   a separate `pleng-samples` GitHub-Pages repo (leaner app repo, but cross-origin/Pages/token) vs the app's
   own `public/samples/` (same-origin, simplest offline, ~10.6 MB of binaries in git). **P'Aim chose in-app.**
2. **Point smplr at it.** In `src/lib/sampler.js`, set `SAMPLE_HOSTS.grand` to the mirror's Splendid path
   and add each GM instrument as a `Soundfont` with `instrumentUrl: <mirror>/FluidR3_GM/<patch>-mp3.js`.
3. **Precache for offline.** Add the sample URLs to the PWA service-worker precache manifest (or warm the
   smplr `CacheStorage` on first run). smplr's `CacheStorage` already persists across sessions on
   https/localhost — combine it with an SW `install`-time precache so the first *offline* launch also works.
4. **Felt** = build the Grand instrument and insert a `BiquadFilter` (lowpass ~2 kHz) on its output
   (the per-region `lpfCutoffHz` preset field is layer-scoped and not exposed as a top-level option — use a
   filter node). No new samples.

### smplr integration sketch (dev)

```js
// GM instrument from our mirror (offline-safe):
const violin = new Soundfont(ctx, { instrumentUrl: `${MIRROR}/FluidR3_GM/violin-mp3.js`, storage })
// Grand from our mirror (already the P1 shape, just a self-hosted baseUrl):
const grand = new SplendidGrandPiano(ctx, {
  baseUrl: `${MIRROR}/splendid-grand/samples`, formats: ['ogg'],
  notesToLoad: { notes: GRAND_NOTES /* 40..84 */, velocityRange: [41, 67] }, storage,
})
```

### Gotcha (documented so it doesn't recur)
smplr's `midiJsToJson` slices a soundfont `.js` from the `=` to the **last comma** and appends `"}"`, so
the file **must keep a trailing comma after the final note** (the gleitz originals do). A naïve trim that
drops it makes smplr cut into the last note's base64 → *"Unterminated string in JSON."*
`tools/prepare-samples.mjs` preserves the trailing comma (and a unit-style parse check confirms 6/6).

---

## Round 3 — CC0 quality upgrade for the 3 solo leads (done + verified)

P'Aim chose the CC0 recordings over GM for the exposed solo instruments (better tone for melody), and
GM for the blended ones. Built with `tools/prepare-samples-cc0.mjs` (committed; needs **ffmpeg** +
**7-Zip**). It downloads the CC0 sources, converts each sampled note to per-note **ogg** (mono + makeup
gain), and writes a smplr **`SmplrPreset`** per instrument. Re-runnable; no binaries in git.

```
FFMPEG=<ffmpeg> SEVENZIP=<7z> node tools/prepare-samples-cc0.mjs ./samples-mirror/CC0
# → samples-mirror/CC0/{nylon,cello,violin}/<midi>.ogg + preset.json   (ogg named by MIDI number)
```

### Sources + build (all CC0 — no attribution)

| Lead | Source | Sampled | Interval | ogg | Size | Makeup |
|---|---|---|---|---|---|---|
| **Nylon guitar** | FreePats Spanish Classical (SFZ+FLAC) | 48 notes, G1–C6 | every semitone | 48 | **1.69 MB** | 0 dB (already hot) |
| **Cello** | Bigcat cello, `sus` `mf` take-d | 17 notes, C1–C5 | minor 3rds | 17 | **0.95 MB** | +10 dB |
| **Violin** | VSCO2 CE Solo Violin, Arco Vib `f` | 15 notes, G3–C7 | ~maj/min 3rds | 15 | **2.45 MB** | +9 dB |
| **CC0 total** | | | | 80 | **≈ 5.1 MB** | |

Design notes: (1) **ogg named by MIDI number** (`60.ogg`) to keep `#`/spaces out of URLs. (2) Regions
**tile** the sparse pitches (cello/violin are sampled in 3rds) so every played note maps to the nearest
sample and pitch-shifts — full keyboard coverage from few samples. (3) **Makeup gain** lifts each raw
recording to the GM/Grand level (measured `volumedetect`: nylon already ~−0.2 dB, cello ~−13 dB, violin
`f` ~−10 dB) with an `alimiter` clip-guard; dev can also do this as a per-instrument gain node instead of
baking it. (4) Violin uses the **`f`** dynamic (clearer for a lead than the soft `p`, which rendered
near-silent). (5) Sustained string samples don't loop — fine for melodic phrases; very long held notes
decay to the sample's natural tail.

### Verified A/B (offline, from our host — `docs/spikes/instrument-self-host-demo.html`)

Each lead has a GM (🅰️) vs CC0 (🅱️) row; OfflineAudioContext peaks after level-matching:

```
nylon:  GM 0.090  ·  CC0 0.109        cello:  GM 0.061  ·  CC0 0.055
violin: GM 0.073  ·  CC0 0.121        (grand 0.113 · felt 0.113 · steel 0.092 · string 0.054)
```

All non-silent, none clipping, **zero external requests**. P'Aim listens live and picks per instrument;
the demo has ▶ buttons for each.

### Final ship set + total size

| Instrument | Source | License | Size |
|---|---|---|---|
| Grand piano | Splendid (mirror) | PD | 2.4 MB |
| Felt | = Grand + low-pass | — | 0 |
| Nylon guitar | **FreePats CC0** | CC0 | 1.69 MB |
| Cello | **Bigcat CC0** | CC0 | 0.95 MB |
| Violin | **VSCO2 CE CC0** | CC0 | 2.45 MB |
| Steel guitar | FluidR3_GM (mirror, trimmed) | CC-BY 3.0 | 1.30 MB |
| String ensemble | FluidR3_GM (mirror, trimmed) | CC-BY 3.0 | 1.88 MB |
| **Total catalog** | | | **≈ 10.7 MB** |

(Loaded lazily per-preset + Cache-API-persisted; a real session downloads only the 2–4 instruments its
preset uses.) Attribution needed: **one line** for the two GM instruments (FluidR3, CC-BY 3.0); the CC0
leads, Grand, and felt need none.

### Final assembly → in-app `public/samples/` + offline verify

**Host decision (P'Aim, final):** ship the samples **in-app** under `public/samples/`, served same-origin
at `https://pleng.phrakham.life/samples/...`. One repo, no external Pages/token/CDN — the simplest, most
self-contained offline PWA. Cost: the app repo carries ~10.6 MB of binaries, committed **intentionally**
as a required PWA asset (like fonts/images), with `public/samples/.gitattributes` = `* -text -diff` so
they ship byte-for-byte. (The earlier separate-repo plan — `aim-krisada/pleng-samples` — is **abandoned**;
see note below.)

`tools/assemble-samples-repo.mjs` assembles the built mirror into `public/samples/` and writes a
**`manifest.json`** (per-instrument loader/license + a flat same-origin `precache` list, `/samples/...`)
and a `README.md`:

```
node tools/prepare-samples.mjs ./samples-mirror
FFMPEG=<ffmpeg> SEVENZIP=<7z> node tools/prepare-samples-cc0.mjs ./samples-mirror/CC0
node tools/assemble-samples-repo.mjs ./samples-mirror ./public/samples
# → public/samples/{splendid-grand, FluidR3_GM (steel+string only), CC0/{nylon,cello,violin}} + manifest.json + README.md + .gitattributes
```

**Verified in-app (2026-07-12, branch `b107-samples-in-public`):** served `public/` at root (as vite
does), all **115 precache URLs resolve 200 at same-origin `/samples/...`** (0 bad), and every ship
instrument loads + plays via smplr from `/samples/` — grand 0.113 · felt 0.113 · steel 0.092 ·
string 0.054 · nylon 0.109 · cello 0.055 · violin 0.121, **external requests NONE**. Total **10.63 MB**.

**Integration for dev (step 9):** point `src/lib/sampler.js` `SAMPLE_HOSTS` at **`/samples/`** (same-origin),
add the Soundfont/Sampler branches (steel/string via `Soundfont instrumentUrl` = `/samples/FluidR3_GM/...`,
CC0 leads via `Sampler` preset with `samples.baseUrl` = `/samples/CC0/<id>`, felt via Grand + low-pass),
and feed `manifest.json`'s `precache` list to the PWA service worker so the first offline launch is fully
covered. Wrap all in smplr `CacheStorage` for cross-session persist.

> **Abandoned separate-repo attempt (kept for the record):** an earlier round pushed the same catalog to a
> dedicated repo `aim-krisada/pleng-samples` (commit `cf97199`, verified 115/115 on raw GitHub). P'Aim then
> chose the in-app `public/samples/` approach instead, so that repo + its `GITHUB_TOKEN_PLENG_SAMPLES` token
> + `.nojekyll` are no longer used (repo left in place, not deleted). Lesson: for a self-contained offline
> PWA, in-app `public/` beats a separate host — a separate repo only keeps the app repo lean, a minor
> optimization not worth the cross-origin/Pages/token complexity.

### CC0 integration sketch (dev)

```js
// CC0 lead via the generic Sampler + a hosted preset (per-note ogg):
const preset = await (await fetch(`${MIRROR}/CC0/violin/preset.json`)).json()
preset.samples.baseUrl = `${MIRROR}/CC0/violin`   // the mirror host
const violin = new Sampler(ctx, { preset, storage })   // storage = smplr CacheStorage for offline
```

---

## How it integrates with our sampler (`smplr` 1.0.0, already installed)

`smplr` exposes three relevant paths — verified locally against the installed package:

| Path | What it is | Use for | License of default samples |
|---|---|---|---|
| **`Soundfont`** | GM soundfont player. Loads per-note mp3/ogg from `gleitz.github.io/midi-js-soundfonts`, kits **`FluidR3_GM`** or **`MusyngKite`**. Host-overridable via `instrumentUrl`. | Tier 1 quick win — all 5 new instruments. | FluidR3_GM = **CC-BY 3.0** · MusyngKite = **CC-BY-SA 3.0** |
| **`Sampler`** (preset) | Generic multisample player. You give it a `SmplrPreset` JSON (`samples.baseUrl` + `groups[].regions[]` mapping `sample`→`keyRange`/`pitch`) and your own hosted ogg/mp3/wav. | Tier 2 quality — self-hosted CC0 samples. | whatever you host |
| **`Versilian`** (VCSL) | Built-in VCSL subset (183 instruments). | ❌ **Not useful** — its chordophones are only harps / pianos / harpsichords / strumstick / psaltery. **No violin, cello, or guitar.** | CC0 |

Both `Soundfont` and `Sampler` accept the same `CacheStorage` persistence + `baseUrl`/host override we
already use for the Grand piano (`src/lib/sampler.js`). So a new instrument = one more branch in
`createInstrument()` + one more entry in `SAMPLE_HOSTS`; the caching, host-agnostic mirroring, and lazy
loading all come for free. (Cache API persistence needs https/localhost, same caveat as today.)

**GM patch names available** (both kits, verified via `getSoundfontNames()`): `acoustic_guitar_nylon`,
`acoustic_guitar_steel`, `violin`, `cello`, `contrabass`, `string_ensemble_1`, `string_ensemble_2`,
`pad_2_warm`, `pad_5_bowed`, `pizzicato_strings`, `tremolo_strings`. Felt piano is **not** a GM patch.

---

## Per-instrument recommendations

### 1. Felt piano (soft, intimate)
| # | Option | License | Host/redist? | Size / format | Integration | Notes |
|---|---|---|---|---|---|---|
| ⭐ | **Filter the Splendid Grand we already host** | Public Domain (AKAI, 2000) | ✅ already ours | **0 new bytes** | Play softest velocity layer + low-pass (~roll off >2–3 kHz) + soften attack. The Splendid repo already synthesizes its quietest layer via filter cutoff — proven on these exact samples. | Best pick. No new license/download. Not "real" felt but convincingly muted/intimate at low velocity. |
| B | **FreePats "Upright Piano KW"** | **CC0 1.0** | ✅ yes | ~SFZ+FLAC/WAV, **2 velocity layers**, chromatic | `Sampler` preset, host our ogg conversion | Closest real CC0 timbre to soft/muted — a domestic close-mic'd upright. Only 2 vel layers. Use if P'Aim wants a *distinct* voice from the grand. |
| — | VCSL Keys uprights / VSCO2 CE piano | CC0 | ✅ yes | WAV | `Sampler` | Usable CC0 uprights but not specifically felt; redundant with the grand. |

**❌ Blocked (great sound, wrong license):** Pianobook "Kawai Felt" (Pianobook EULA — no redistribution),
Spitfire LABS "Originals Felt Piano" (Spitfire EULA — no redistribution), Felt & Fog / Winterfelt (custom
free EULAs, no redistribution grant).

### 2. Nylon-string (classical) guitar — fingerpicked arpeggio
| # | Option | License | Host/redist? | Size / format | Integration | Notes |
|---|---|---|---|---|---|---|
| ⭐ | **FreePats "Acoustic Guitar" (nylon-string)** — https://freepats.zenvoid.org/Guitar/acoustic-guitar.html | **CC0 1.0** | ✅ unrestricted | **4.5 MiB** SFZ+FLAC (also WAV 6.9/19 MiB, SF2) | `Sampler` preset (convert FLAC→ogg, one file/note from the SFZ map) | Cleanest license of all candidates, exactly the right instrument. Real nylon, AKG Perception 120, noise-filtered. **Recommend as primary nylon.** |
| B | **GM `acoustic_guitar_nylon` (FluidR3_GM)** | CC-BY 3.0 | ✅ with attribution | **1.84 MB** mp3 | `Soundfont` — zero build step | Tier-1 quick win. Decent, less nuanced than FreePats for fingerpicking. |

### 3. Acoustic steel-string guitar — strumming / melody
| # | Option | License | Host/redist? | Size / format | Integration | Notes |
|---|---|---|---|---|---|---|
| ⭐ | **GM `acoustic_guitar_steel` (FluidR3_GM)** | CC-BY 3.0 | ✅ with attribution | **1.98 MB** mp3 | `Soundfont` | **Recommended** to avoid GPL obligations (see below). Serviceable for strum/melody backing. |
| B | **FreePats "Steel-String Acoustic Guitar"** — https://freepats.zenvoid.org/Guitar/steel-acoustic-guitar.html | **GPLv3+** (with sample exception) | ⚠️ yes, with GPL obligations | 13 MiB SFZ+WAV (2.7 MiB "small") | `Sampler` preset | Real steel (from FlameStudios "FS Seagull"). ⚠️ The special exception only frees *compositions* — redistributing the raw sample set still carries full GPLv3 (ship license, keep free/whole, no added restrictions). Heavier obligation than CC-BY. **Flag for P'Aim** — prefer the GM patch unless quality demands otherwise. |

### 4. Violin (expressive, legato)
| # | Option | License | Host/redist? | Size / format | Integration | Notes |
|---|---|---|---|---|---|---|
| ⭐ | **VSCO2 Community Edition — Solo Violin** — https://versilian-studios.com/vsco-community/ | **CC0** | ✅ unrestricted | WAV 44.1 kHz (raw-WAV distribution on GitHub); needs slice + ogg convert | `Sampler` preset | Best quality-vs-license: genuine CC0, no attribution, real chamber violin. Requires one-time offline prep. |
| B | **University of Iowa MIS — Violin** — https://theremin.music.uiowa.edu/mis.html | "public domain … any projects, without restrictions" (⚠️ grants *use*, doesn't literally say *redistribute*) | ✅ but slightly ambiguous | AIFF, chromatic at pp/mf/ff; delivered as long scale recordings you must **slice yourself** | `Sampler` preset | Excellent anechoic recording (very dry). Most work to prep. Use if VSCO2 solo violin is insufficient. |
| C | **GM `violin` (FluidR3_GM)** | CC-BY 3.0 | ✅ with attribution | **2.87 MB** mp3 | `Soundfont` | Tier-1 quick win, but GM solo strings are the cheesiest — fine as a filler, upgrade for exposed melody. |

### 5. Cello (warm low bass, sustained)
| # | Option | License | Host/redist? | Size / format | Integration | Notes |
|---|---|---|---|---|---|---|
| ⭐ | **Bigcat Cello (Karoryfer × bigcat)** — https://sfzinstruments.github.io/strings/bigcat_cello/ | **CC0-1.0** | ✅ unrestricted | SFZ + WAV → ogg | `Sampler` preset | **New 2025-26 find.** A *dedicated* solo cello (not an orchestral slice) → better tone/consistency for exposed melody. CC0, cleanest license. A/B against VSCO2. |
| B | **University of Iowa MIS — Cello** — https://theremin.music.uiowa.edu/mis.html | public-domain-like (see violin caveat) | ✅ but slightly ambiguous | AIFF, pp/mf/ff chromatic scales → slice | `Sampler` preset | True **solo cello**, top recording quality. Needs slicing. |
| B | **VSCO2 CE — Cello** | CC0 | ✅ unrestricted | WAV | `Sampler` preset | ⚠️ CE confirmed has a **Cello *Section*** patch; a dedicated *solo* cello is **unverified** — check the pack list before relying on it. Section works well as warm sustained pad. |
| C | **GM `cello` (FluidR3_GM)** | CC-BY 3.0 | ✅ with attribution | **3.0 MB** mp3 | `Soundfont` | Tier-1 quick win. |
| — | SSO solo cello | CC-Sampling+ 1.0 | ⚠️ non-commercial verbatim only + **retired license** | SFZ+WAV | `Sampler` | Has a true solo cello + "All Strings" pad, but license is awkward. **Avoid** for license hygiene. |

### 6. String pad / string ensemble (ambient sustained chords)
| # | Option | License | Host/redist? | Size / format | Integration | Notes |
|---|---|---|---|---|---|---|
| ⭐ | **GM `string_ensemble_1` (FluidR3_GM)** | CC-BY 3.0 | ✅ with attribution | **2.8 MB** mp3 | `Soundfont` | Ensemble/pad is exactly where GM sounds *fine* (blended, not exposed). Also `pad_2_warm` (2.9 MB) for a softer synth-string pad. **Recommended.** |
| B | **VSCO2 CE — Violin/Viola/Cello Section patches** | CC0 | ✅ unrestricted | WAV | `Sampler` preset (layer the sections) | Real-ensemble CC0 upgrade if the GM pad feels synthetic. |

---

## Total hosting-size estimate

Everything loads **lazily, per-instrument, only when a preset actually uses it** (same as the Grand
today) and is Cache-API-persisted after first play — so this is *catalog* size, not per-page-load.

| Instrument | Tier-1 (GM, FluidR3 mp3) | Tier-2 (self-hosted CC0, 1 vel layer ogg) |
|---|---|---|
| Grand piano (existing) | — (Splendid, ~3.23 MB) | — |
| Felt piano | 0 (reuse grand + filter) | ~1–2 MB (FreePats Upright KW) |
| Nylon guitar | 1.84 MB | ~2–3 MB (FreePats CC0) |
| Steel guitar | 1.98 MB | — (keep GM) |
| Violin | 2.87 MB | ~2–3 MB (VSCO2 CE) |
| Cello | 3.0 MB | ~2–3 MB (Iowa / VSCO2) |
| String ensemble/pad | 2.8 MB | ~2–3 MB (VSCO2 sections) |
| **New-instrument subtotal** | **≈ 12.5 MB** (5 GM instruments) | **≈ 10–14 MB** |
| **+ existing Grand** | ~3.23 MB | ~3.23 MB |

Converting Tier-2 to a single velocity layer + our loaded note-range (as we already do for the Grand)
keeps each self-hosted instrument in the ~2–3 MB band, matching the Grand. **Tier-1 all-GM ≈ 15.7 MB total
catalog; a typical preset touches only 2–4 of these**, so a real session downloads far less.

---

## Attribution list (for a site credits/`/about` line)

- **FluidR3_GM soundfont** — © Frank Wen, **CC-BY 3.0**. Required if any Tier-1 GM instrument ships.
  (The rendered web package via gleitz/midi-js-soundfonts is relabeled CC-BY 3.0.)
- **MusyngKite** — **CC-BY-SA 3.0** (only if we choose this kit over FluidR3; the ShareAlike copyleft is
  the reason to prefer FluidR3_GM instead).
- **FreePats** nylon guitar & Upright Piano KW — **CC0**, no attribution required (courtesy credit optional).
- **VSCO2 Community Edition** (Versilian Studios) — **CC0**, no attribution required.
- **University of Iowa Electronic Music Studios / MIS** — public-domain grant, no attribution required
  (courtesy credit recommended given the ambiguity).
- **Splendid Grand Piano** (existing) — Public Domain (AKAI), no attribution required.

Net: if we go **Tier-1**, the whole app needs **one** attribution line (FluidR3, CC-BY 3.0). Every Tier-2
CC0 swap *removes* attribution burden rather than adding it.

---

## Risk flags for P'Aim / SA

- **Philharmonia Orchestra** — ❌ do not use. License: samples "must not be sold or made available 'as is'
  (as samples or as a sampler instrument)" — hosting the raw notes is exactly what's forbidden.
- **VSCO2 Pro / Standard** — ❌ paid Kontakt EULA, **not** CC0. Only the free **Community Edition** is safe.
- **Pianobook / Spitfire LABS / Winterfelt felt pianos** — ❌ free-to-use but redistribution not granted.
- **SSO (Sonatina Symphonic Orchestra)** — ⚠️ CC-Sampling+ 1.0: verbatim redistribution is **non-commercial
  only**, and CC **retired** this license in 2011. pleng is a free church resource (non-commercial fits), but
  recommend avoiding it purely for license hygiene when CC0 alternatives exist.
- **FreePats steel guitar** — ⚠️ GPLv3 (+ composition exception). Redistributing the sample *set* still
  carries GPL obligations. Prefer the CC-BY GM steel patch unless quality demands the real recording.
- **University of Iowa MIS** — ⚠️ grant says "use … without restrictions" but doesn't literally spell out
  "redistribute/re-host." Very low risk (SSO itself redistributes Iowa samples), but not a named
  redistribution license. Prefer CC0 VSCO2 when zero ambiguity is wanted.
- **VSCO2 CE solo cello** — ⚠️ a Cello *Section* patch is confirmed; a dedicated *solo* cello is not.
  Verify against the actual pack list before designing a solo-cello preset (Iowa MIS is the safe solo-cello source).
- **Cache API persistence** — needs https/localhost (already true for the Grand); on plain-http LAN test URLs
  samples still play but don't persist. No new risk, just the existing caveat.

---

## Sources
- smplr — https://github.com/danigb/smplr · gleitz/midi-js-soundfonts — https://github.com/gleitz/midi-js-soundfonts
- FreePats — https://freepats.zenvoid.org/Guitar/acoustic-guitar.html · https://freepats.zenvoid.org/Guitar/steel-acoustic-guitar.html · https://freepats.zenvoid.org/Piano/
- VSCO2 Community Edition — https://versilian-studios.com/vsco-community/ · VCSL — https://github.com/sgossner/VCSL
- University of Iowa MIS — https://theremin.music.uiowa.edu/mis.html
- Sonatina Symphonic Orchestra — https://github.com/peastman/sso · CC Sampling+ 1.0 — https://creativecommons.org/licenses/sampling+/1.0/
- Philharmonia — https://philharmonia.co.uk/resources/sound-samples/
- Splendid Grand Piano — https://github.com/sfzinstruments/SplendidGrandPiano
- SFZ Instruments (CC0/CC-BY catalog) — https://sfzinstruments.github.io · Bigcat Cello — https://sfzinstruments.github.io/strings/bigcat_cello/
- smplr sample host (per-note ogg, mirrorable) — https://smpldsnds.github.io · FluidR3_GM — https://gleitz.github.io/midi-js-soundfonts
