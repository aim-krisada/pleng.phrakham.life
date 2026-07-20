# fermata-hold — full-stack build report (M2 complete)

**Branch:** `fermata-hold` (base = round 30 `2f4177e`) · **owner:** full-stack session · for the TESTER + PM gate.
Feature: the fermata `𝄐` hold is now an **editable, per-note value** that drives BOTH playback and (via the
existing symbol) the sheet — replacing the old fixed `×1.75` that could not be edited and drifted the next bar.

## What P'Aim approved (look — already reviewed twice)
Minimalist chip under the focused fermata note: **`𝄐  [ – ]  N  [ + ]`**. Steppers 30×30px (match `.ed-mini`).
No `ค้าง` label / no `▶ฟัง` / no meter / no `↺แนะนำ`. Milestone 2 = the same look, now wired to real logic.

## How it works (data → playback → sheet)
- **Data model:** each segment may carry `holds: { boxIdx: beats }` — ABSOLUTE beats to ADD, out of the note
  string (so `5^` never collides with the next note). `holds[i]` is the single source read by playback and used
  by the editor. Additive/optional; v1 and old v2 songs without it are unaffected — no library migration.
- **Auto-suggest default** (`suggestHoldForBar`, `notation.js`): when a fermata note has no stored hold →
  **fill to the end of its bar** (`expected − beatsBefore − base`) so the next note lands on the next downbeat;
  **fallback ~2× the written note** when the fermata is NOT the last note of the bar. Step 0.5, min 0.5, soft
  ceiling ~2 bars. Snapped to the 0.5 grid.
- **Playback** (`midi.js`): the old `d *= 1.75` is gone. A fermata note now sounds `written + holdFor(seg, box)`
  (`holdFor` = stored value, else the suggested default). The hold is added ONCE to the note's duration.
  🔴 Invariant kept: `beatCount`/bar math never sees the hold, so bars still sum to the time signature (the drift
  fix). Deterministic → MP3 export == live.
- **Sheet** (`SongSheet.vue`/`NoteRow.vue`): **unchanged** — the `𝄐` symbol still comes from the `^` in the
  string; `holds` lives out of the string, so the sheet shows the symbol only (no number, no stretch, no `-`).
- **Chip** (`EditorMode.vue` + `NoteBoxes.vue`): shows under a focused note that has `^`; the number reads
  `holds[boxIdx]` (or the suggested default when none is stored); `[–]/[+]` write/persist `holds[boxIdx]` live.
  Backward-compat: an old `^` note shows the suggested value; the first `+/-` materialises it.
- **Persistence:** `holds` round-trips through the editor's serialize/deserialize; on save, holds are **pruned**
  to boxes that still carry a `^` (so a value orphaned by editing/deleting a note can't linger).

## Files touched
| File | Change |
|---|---|
| `src/lib/notation.js` | pure helpers: `HOLD_STEP/HOLD_MIN`, `snapHalf`, `suggestHoldBeats`, `suggestHoldForBar`, `noteBoxIndices`, `storedHold` |
| `src/lib/midi.js` | removed `FERMATA_FACTOR`; `buildFermataHolds` + `holdFor`; hold added at the note (not per box); bar math untouched |
| `src/components/EditorMode.vue` | chip wired to real `holds`; auto-suggest; serialize/deserialize + `pruneHolds` |
| `src/components/NoteBoxes.vue` | additive `note-active`/`note-inactive` emits (v-model unchanged) |
| `src/components/SongSheet.vue` | none (symbol already from `^`) |

## Tests / build
- `npx vitest run` → **702 passed**. New: `src/lib/midi.fermata.test.js` (rewritten for the hold model — stored
  value, hold-once, bar-fill suggest, mid-bar 2× fallback, min-0.5, bar-count-unchanged) and
  `src/components/EditorMode.fermata.test.js` (holds round-trip + prune + snap).
- One pre-existing unrelated suite (`src/lib/notationLint.test.mjs`) "fails" only because it calls
  `process.exit(0)` — identical on the clean base; not this feature.
- `npx vite build` → OK.

## How to reach it (dev server: `npm run dev -- --host --port 5350`)
- Localhost: http://localhost:5350/#/studio · Network: http://192.168.1.124:5350/#/studio
- Studio → **แก้ไข** → focus the note box → type a digit → tap `^` in the palette (row 2) → the `𝄐 – N +` chip
  appears under the note. `+/-` change the hold by 0.5.

## Tester checklist
1. **Default suggest:** a lone `5^` in a 4/4 bar shows **3** (fills the bar). A `5^` mid-bar (`5^ 3 1`) shows a
   `~2×` value. Value never < 0.5.
2. **Edit + persist:** `+/-` change the number by 0.5; reopen the song → the value is retained (holds saved).
3. **Playback timing:** the note after a bar-fill fermata starts on the **next bar's downbeat** (no drift); bars
   still count correctly (beat status ✓ unchanged by the hold). MP3 export matches live.
4. **Sheet:** the printed/preview sheet shows only the `𝄐` symbol — no number, note not stretched, no `-` added.
5. **Backward-compat:** an existing `^` song with no `holds` still holds on playback (suggested) and shows a
   suggested value in the chip; nothing else changes.
6. **Mobile diff = 0 vs round 30:** the chip appears ONLY on fermata notes; non-fermata editing is unchanged.
   Steppers 30×30 (≤760px bump to 44). No `@media(hover)` gating — verify controls stay visible on Surface
   (`hover:none` with a mouse).

## Known limits (scope)
- `holds` is keyed by note-box index; inserting/deleting notes can shift indices. Playback applies a hold only to
  a box that still parses to a fermata; serialize prunes orphans; a shifted fermata simply re-suggests. Full
  index-tracking through structural edits is out of this feature's scope.
- Symbol variant (short/normal/long by value) intentionally NOT implemented — default single normal symbol
  (enhancement per brief).
