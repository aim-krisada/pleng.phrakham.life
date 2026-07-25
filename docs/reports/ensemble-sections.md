# โหมดรวมวง กับ ท่อน (sections) — the second divergent path

**Ask (PM 24 ก.ค.):** another lane reported, outside its own brief, that `playEnsemble` calls
`sectionBeatRanges` directly instead of `resolveSections`, and that 26/170 songs therefore play the
ensemble with `section = []`. Verify the number independently, fix it in ONE place shared by both
playback paths, prove the songs that were fine did not move, and render before/after audio.

## 1. The claim, re-measured

Confirmed — and incomplete. Scanned all 170 songs by running the REAL `playEnsemble` against a fake
`AudioContext` + fake instruments (`tools/diag-ensemble-sections.test.mjs`), content resolved exactly
as `SongViewer.vue:166` resolves it:

| labelled ท่อน found by `sectionBeatRanges` | songs | what the ensemble did |
|---|---|---|
| 0 | **26** | `sections = []` → `levelAt()` → `'chorus'` everywhere |
| 1 | **30** | one section covering the song, `hasRefrain` false → `'chorus'` everywhere |
| ≥ 2 | **114** | real labels, unchanged by the fix |

The reported 26 is exactly right for "no sections at all". But a song with a SINGLE `ร้อง 1` label is
in the identical acoustic state — one range, level `'chorus'`, no contrast — so the set the fix moves
is **56, and the control set is 114, not 144**. All 56 are v2 songs whose printed arrangement carries
0 or 1 section marker.

Two things the listener hears from that:
1. `ENS.sectionGain` is pinned at `1.0` — the verse→chorus swell never happens.
2. the violin countermelody is gated on `levelAt(...) === 'chorus'` → it plays the whole song.

`playSong` and the MP3 export never had this: they call `resolveSections`, which resolves v2 content
AND falls back to melody-shape phrases (golden-piano §3b).

## 2. The fix

Two lines, both in `src/lib/midi.js`, no copied logic:

1. `playEnsemble` calls **`resolveSections(content, notes)`** — the same function the solo path and
   the export call. One resolver, three callers.
2. `phraseSectionsFromMelody` splits its `level` tag from its `isRefrain` tag.

(2) is not cosmetic. Swapping in `resolveSections` alone measured **51 of the 56 songs coming out
entirely `'verse'`** — the whole song at 0.7 gain with the countermelody silenced end to end (#741:
30 violin events → 0). That trades flat-at-full for flat-at-soft, and contradicts the invariant
`sectionBeatRanges` already encodes ("no refrain detectable → everything `'chorus'`, เต็มวง อย่าจืด").
Cause: `level` was tied to the strict refrain test (density ≥ 1.5× the song's median), which almost
no phrase clears. So:

- `isRefrain` — "is this the hook?" — keeps the 1.5× bar. Only the arranger reads it.
- `level` — "how full does the ensemble play here?" — splits at the **median** phrase density. The
  ensemble is its only reader (`midi.js` `levelAt`; `sectionDynamics` keys off section *name*).

At the median there is always at least one fuller วรรค, and a one-phrase song stays `'chorus'` =
exactly what it played before it had sections at all.

## 3. Control sets (event-level, not "should be fine")

| control | method | result |
|---|---|---|
| 114 songs with ≥2 labelled ท่อน | every `.fire()` from the real `playEnsemble`, 3 leads, before vs after | **byte-identical, 0 differences** |
| the solo path (`level` is shared code) | every `.fire()` from the real `playSong` — 170 songs × 2 instruments × 3 styles = 1,020 runs, **452,508 scheduled notes** | **byte-identical, 0 differences** |

Of the 56 affected: **32** now carry both levels; **24** (mostly one-phrase songs) still play flat at
full — no density contrast exists in them to derive, and they are byte-identical to before.
Library-wide violin events on the affected set: 1,924 → 1,725 (piano lead).

## 4. Audio evidence

`C:\gl\pm-inbox\pleng\audio-2026-07-24-ensemble-sections\` — #90 and #106, โหมดรวมวง เปียโนนำ, 30 s
each, rendered through the real `playEnsemble` on an `OfflineAudioContext` with the real samples.

"Before" is the **shipped code in its own worktree behind its own vite** — not a flag inside one
build — and the driver probes each front server and aborts unless it is serving the expected build
(`tools/render-ensemble-sections-ab.mjs`). `sampleErrors = 0` on all four, none silent, A ≠ B.

Per-section RMS, B ÷ A — the difference is localised, not a global volume drop:

| song | วรรค the model calls `chorus` | วรรค the model calls `verse` |
|---|---|---|
| #90 | 1.000 | **0.790** |
| #106 | 1.000 / 0.995 | **0.820** |

(0.79/0.82 rather than 0.70 because the reverb tail of the preceding fuller วรรค rings into the
softer one — the dry gain step is exactly 0.7.)

## 5. Regression guard

`src/lib/midi.ensemble-sections.test.mjs` — 10 tests on a fixture whose labels yield no sections,
against a labelled twin that plays the same notes under one flat all-chorus map (so the two runs
differ ONLY in the section map, humanize stream included). Verified red on revert:

- undo the resolver swap → 3 tests fail (melody, bass, countermelody).
- undo the `level`/`isRefrain` split → 5 tests fail.

## 6. Not proven / left open

- **Nobody has listened yet.** The A/B is rendered but unheard; whether phrase-level dynamics are
  musically better than the flat full sound is P'Aim's ear, not a number.
- **163 of 170 songs still have no verse level from their LABELS.** Only 7 songs have a detectable
  refrain (`hasRefrain`), so most of the 114 "control" songs also play flat at full — the same on the
  solo path, so it is not a divergence and was out of this brief's scope. It is the bigger dynamics
  question underneath this bug.
- The 24 affected songs that stay all-chorus get no dynamics from this fix.
- The median split is a *derived* contrast, not the composer's; a real `verse`/`รับ` tag in the data
  would beat it. The parser/data lane owns that.
- Verified in Node against the real scheduler, not on a phone or in a live browser session.
