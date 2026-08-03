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
- **Default** (`suggestHoldForBar` → `HOLD_DEFAULT`, `notation.js`): when a fermata note has no stored hold, the
  default is a **constant 2 beats, always** (P'Aim's decision after trying it live — predictable, NOT a bar-fill,
  regardless of bar position). Still per-note editable: step 0.5, min 0.5, soft ceiling ~2 bars. If a bar needs
  the next note on the downbeat the user just adjusts.
- **Playback** (`midi.js`): the old `d *= 1.75` is gone. A fermata note now sounds `written + holdFor(seg, box)`
  (`holdFor` = stored value, else the suggested default). The hold is added ONCE to the note's duration.
  🔴 Invariant kept: `beatCount`/bar math never sees the hold, so bars still sum to the time signature (the drift
  fix). Deterministic → MP3 export == live.
- **Sheet** (`SongSheet.vue`/`NoteRow.vue`): **unchanged** — the `𝄐` symbol still comes from the `^` in the
  string; `holds` lives out of the string, so the sheet shows the symbol only (no number, no stretch, no `-`).
- **Chip** (`EditorMode.vue` + `NoteBoxes.vue`): shows under a focused note that has `^`; the number reads
  `holds[boxIdx]` (or the suggested default when none is stored); `[–]/[+]` write/persist `holds[boxIdx]` live.
  Backward-compat: an old `^` note shows the suggested value; the first `+/-` materialises it.
- **Glanceable badge** (`NoteBoxes.vue`, EDITOR-ONLY): a tiny `𝄐N` superscript at the top-right of every
  fermata note-box shows the current hold (stored, or suggested when none set) so a whole line's holds read at
  a glance without opening each chip. It updates live as `+/-` change the value. 🔴 It is an authoring aid, NOT
  notation: `.no-print`, rendered only by `NoteBoxes` (the sheet uses `NoteRow`) → it can NEVER reach the
  printed sheet / PDF. The printed sheet stays symbol-only (Gould, *Behind Bars* — fermata duration is
  discretionary, never a written number).
- **Persistence:** `holds` round-trips through the editor's serialize/deserialize; on save, holds are **pruned**
  to boxes that still carry a `^` (so a value orphaned by editing/deleting a note can't linger).

## Files touched
| File | Change |
|---|---|
| `src/lib/notation.js` | pure helpers: `HOLD_STEP/HOLD_MIN/HOLD_DEFAULT`, `snapHalf`, `suggestHoldForBar` (returns the constant default), `noteBoxIndices`, `storedHold` |
| `src/lib/midi.js` | removed `FERMATA_FACTOR`; `buildFermataHolds` + `holdFor`; hold added at the note (not per box); bar math untouched |
| `src/components/EditorMode.vue` | chip wired to real `holds`; auto-suggest; serialize/deserialize + `pruneHolds` |
| `src/components/NoteBoxes.vue` | additive `note-active`/`note-inactive` emits (v-model unchanged) |
| `src/components/SongSheet.vue` | none (symbol already from `^`) |

## Tests / build
- `npx vitest run` → **707 passed**. `src/lib/midi.fermata.test.js` (hold model — stored value, hold-once,
  constant default = 2, bar-count-unchanged), `src/components/EditorMode.fermata.test.js` (holds round-trip +
  prune + snap + editor badge shows default 2 + sheet render has no badge), `src/components/NoteBoxes.test.js`
  (badge renders `𝄐N` / `.no-print` / absent when no labels).
- One pre-existing unrelated suite (`src/lib/notationLint.test.mjs`) "fails" only because it calls
  `process.exit(0)` — identical on the clean base; not this feature.
- `npx vite build` → OK.

## How to reach it (dev server: `npm run dev -- --host --port 5350`)
- Localhost: http://localhost:5350/#/studio · Network: http://192.168.1.124:5350/#/studio
- Studio → **แก้ไข** → focus the note box → type a digit → tap `^` in the palette (row 2) → the `𝄐 – N +` chip
  appears under the note. `+/-` change the hold by 0.5.

## Tester checklist
1. **Default value:** a fresh fermata (`5^`, anywhere in any bar) defaults to **2** in the chip and the `𝄐2`
   badge — a flat constant, NOT a bar-fill. Then `+/-` still adjust by 0.5 (min 0.5).
2. **Edit + persist:** `+/-` change the number by 0.5; reopen the song → the value is retained (holds saved).
3. **Playback timing:** a fermata note sounds `written + hold` (default `written + 2`); bars still count
   correctly (beat status ✓ unchanged by the hold — no drift). MP3 export matches live.
4. **Glanceable badge:** every fermata note in the EDITOR shows a small `𝄐N` at its top-right (stored or
   suggested value); it updates as `+/-` change the value; it appears without opening the chip.
5. **Sheet / PRINT stays symbol-only (critical):** the read-only sheet AND the printed PDF show only the `𝄐`
   symbol — NO number, note not stretched, no `-` added. **Verify the actual print/PDF output, not just the
   DOM** (print the sheet → open the PDF → confirm no digit near any fermata). The badge is `.no-print` and
   lives only in the editor, so it must be absent from every print.
6. **Backward-compat:** an existing `^` song with no `holds` still holds on playback (suggested) and shows a
   suggested value in the chip + badge; nothing else changes.
7. **Mobile diff = 0 vs round 30:** the chip appears ONLY on fermata notes; non-fermata editing is unchanged.
   Steppers 30×30 (≤760px bump to 44). No `@media(hover)` gating — verify controls stay visible on Surface
   (`hover:none` with a mouse).

## Known limits (scope)
- `holds` is keyed by note-box index; inserting/deleting notes can shift indices. Playback applies a hold only to
  a box that still parses to a fermata; serialize prunes orphans; a shifted fermata simply re-suggests. Full
  index-tracking through structural edits is out of this feature's scope.
- Symbol variant (short/normal/long by value) intentionally NOT implemented — default single normal symbol
  (enhancement per brief).
