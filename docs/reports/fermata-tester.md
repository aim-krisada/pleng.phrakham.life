# fermata-hold — independent TESTER verdict

## RE-VERIFY @ `68b25ca` — default hold changed to a constant 2 beats (P'Aim) → **PASS**

P'Aim changed the fresh-fermata default from bar-fill/2× to a **flat constant 2 beats, always**
(commit `68b25ca` on `fermata-hold`, on top of the `81a3458` I first passed). Re-verified the delta;
the other 8 items still hold (nothing else changed).

**What the change touches** (`git diff 81a3458 68b25ca`): only `notation.js` (`HOLD_DEFAULT = 2`;
`suggestHoldForBar()` now just returns it, bar context ignored, signature kept; unused
`suggestHoldBeats` removed), `midi.js` (comments only), and the two fermata test files.
**`EditorMode.vue`, `NoteBoxes.vue` unchanged in this delta; `DockKey.vue`/`SongSheet.vue`/`NoteRow.vue`
still untouched vs round 30.**

- **Default = 2 everywhere — PASS.** Unit: `suggestHoldForBar` returns `2` for last-in-bar, mid-bar,
  and no-time-signature; `5^` sounds `1 + 2`; mid-bar `5^ 3 1` also `1 + 2` (the following `3` and `1`
  stay 1 each). **Live** (dev server confirmed serving `HOLD_DEFAULT=2`): a mid-bar `5^ 3 1` fermata
  with **no stored hold** (`holds = null`) shows chip **`2`** and badge **`𝄐2`** — under the old logic
  this mid-bar case would have been `𝄐1` (2×), so `𝄐2` proves the constant is position-independent.
  Never `<0.5` (default 2 > 0.5; the `+/-` clamp `HOLD_MIN=0.5` lives in unchanged EditorMode.vue).
- **No regression — PASS.** Live real-pointer `–` moved chip 2→1.5 and badge 𝄐2→𝄐1.5 (0.5 step +
  live badge sync intact); steppers 30px, `hover:none` = true and chip/steppers computed
  visible/clickable. Bar-math drift-fix invariant still unit-tested (`beatCount` ignores the hold).
  Sheet symbol-only + badge `.no-print` + `@media print{.no-print{display:none!important}}` unchanged
  (SongSheet/NoteRow untouched). Stepper/persist/playback wiring is byte-identical to `81a3458`
  (EditorMode.vue unchanged), already proven there.
- **Gates — PASS.** `npx vitest run` → **707 passed**, 67 files; only `notationLint.test.mjs`
  fails (pre-existing `process.exit(0)`, byte-identical to base — not a regression). `npx vite build`
  → OK.

**Verdict: PASS on `68b25ca`.** Safe for PM gate → P'Aim → deploy. (Non-blocking positional note: when
a fermata note sits at the very bottom of a short viewport, the teleported chip can overlap the note
palette and a stepper gets occluded by a toolbar icon — pre-existing in `81a3458`, chip-positioning
code unchanged by this delta; not a constant-2 regression.)

---

*Original verdict below was on `81a3458` (bar-fill default) — superseded by the constant-2 section
above for the default-value items; the structural/gate findings still apply.*

# fermata-hold — independent TESTER verdict (@ 81a3458)

**Gated commit:** `81a3458` (code) + `7c662f1` (tester-notes docs) on branch `fermata-hold`,
worktree `C:/gl/krisada/pleng-fermata`, base = round 30 `2f4177e`.
**Tester:** separate QA session (not the dev). **Env:** real Chrome via claude-in-chrome, dev
server `localhost:5350`. This browser reports **`hover:none` + `pointer:coarse`** (the Surface
scenario) — so every live interaction below is already the hover:none case.

## OVERALL: PASS — safe for PM gate → P'Aim → deploy

All 9 checklist items PASS. No FAIL. Two low-risk caveats where the environment could not drive
the last mile (DB save/reload; sub-760px CSS viewport) — both covered by unit tests + source and
called out below; neither blocks.

---

## Gates
- **`npx vitest run`** → **702 tests passed**, 67 files pass. Only `src/lib/notationLint.test.mjs`
  "fails" (it calls `process.exit(0)`). That file is **NOT** in the fermata diff (byte-identical to
  base `2f4177e`) → fails identically on base → **not a regression**. Confirmed.
- **`npx vite build`** → **OK** (built in ~2s).
- **Diff scope vs round 30** (`git diff 2f4177e HEAD -- src`): only `EditorMode.vue`, `NoteBoxes.vue`,
  `midi.js`, `notation.js` (+ their tests). **`DockKey.vue`, `SongSheet.vue`, `NoteRow.vue` UNTOUCHED.**

---

## Per-item

**1. Default suggest — PASS.**
`suggestHoldForBar(['5^'],0,'4/4') = 3` (bar-fill); mid-bar `['5^','3','1'] = 1` (≈2×); never `<0.5`
(clamped to 0.5) — all in `midi.fermata.test.js`. Live confirmation on a clean 4/4 song:
`fermataSuggested.value === 3` for a lone `5^`.

**2. Edit + persist — PASS.**
Steppers proven with **real pointer clicks** (not synthetic): `–` 2→1.5, `+` 1.5→2→2.5, and later
3.5→4. Serialize round-trip + prune + 0.5-snap proven by `EditorMode.fermata.test.js`
(holds survive load→serialize; orphan boxes pruned; 1.7→1.5).
*Caveat:* full DB save→reload not driven here (studio session has no team auth to persist to
Supabase). The persistence mechanism = the proven serialize path + a plain jsonb store, so this is
low-risk; a real P'Aim save/reload would be the belt-and-suspenders confirmation.

**3. Playback timing (core fix) — PASS.**
`midi.fermata.test.js`: after a bar-fill `5^`, the next note starts at beat 4 (next downbeat, no
drift); `beatCount` ignores the mark AND the hold (bars still sum to the time signature — the drift
fix); hold added ONCE to the note. **MP3 == live**: `audioExport.js` renders from the same pure
`songToNotes` path as playback → deterministic.

**4. Sheet symbol-only — PASS.**
`SongSheet.vue` + `NoteRow.vue` byte-identical to round 30. Live sheet render (floating
"ดูผลทั้งเพลง" + "แผ่นเพลง (ไว้พิมพ์)" view): fermata symbol present (each fermata note = a `.fermata`
span drawn as CSS arc + 3px brand-blue dot), note text nodes are only `5 1 3` — **no hold number, no
`-` stretch, 0 `.note-hold` badges** in the sheet.

**5. Backward-compat — PASS.**
`holds` is additive/optional → no library migration. A `^` note with no stored `holds` still holds
on playback via `holdFor` → suggested default (unit-tested with hold-less songs). The chip/badge
show the suggested value when nothing is stored (`stored ?? suggested` ternary; suggestion computed
live = 3).
*Note:* an existing published song could not be loaded in-session (custom ComboSelect picker + no
library auth), so the "old song shows suggested value" path is proven by logic + live suggestion,
not by opening a real DB song.

**6. Mobile diff = 0 vs round 30 — PASS (with viewport caveat).**
Desktop steppers measured **30×30px** live. The ≤760px bump is `@media (max-width:760px){ .fc-step{
min-width/height: var(--touch-min) }}` with `--touch-min: 44px` — a **width** query, no hover/pointer
gating. `NoteBoxes.vue` change is additive (v-model contract unchanged; badge only renders when
`holdLabels[i] != null`), so non-fermata editing is unchanged.
*Caveat:* `resize_window` did not change the CSS viewport in this browser (innerWidth stayed 1463),
so the 44px bump was verified from source, not exercised live. It's a standard width media query
identical in mechanism to the rest of the editor's responsive rules → low risk.

**7. DockKey untouched — PASS.** `DockKey.vue` absent from the diff vs `2f4177e`.

**8. Badge shows in editor — PASS.**
In edit mode under `hover:none`, both fermata notes show a glanceable corner badge — `𝄐3.5` and
`𝄐1` — `display:flex`, visible **without** opening the chip. Clicking `+` moved the focused note's
chip 3.5→4 **and** its badge live 𝄐3.5→𝄐4, while the other note's `𝄐1` stayed put (per-note).
Hover-safe (visible on this hover:none/pointer:coarse browser).

**9. 🔴 Badge must NOT print — PASS.**
The only DOM elements that contain a hold number are the two `.note-hold` badges (text `𝄐3.5`,
`𝄐1`), and they live **only inside `.note-boxes` (the editor canvas)** — not in the sheet render.
- In the "แผ่นเพลง (ไว้พิมพ์)" print view, body text = `… เพลง 5 1 3 …`; a `\d\.\d` scan returns
  **false** (no `3.5`, no numbers). The sheet render has 0 badges and 0 hold numbers.
- The badge class is `note-hold no-print`; `styles.css:787-796` → `@media print { .no-print {
  display: none !important } }`. So the badges are removed from the printed page.
*Note:* verified via the on-screen print/sheet view + the CSS rule (no physical PDF exported by the
harness). Evidence is conclusive that zero numbers reach paper; a single real Ctrl-P by P'Aim would
be the final belt-and-suspenders.

---

## Mandatory hover:none check (Surface) — PASS
Live browser: `hover:none = true`, `pointer:coarse = true`. Under it, chip computed
`display:flex / visibility:visible / position:fixed`; both steppers `display:flex / visible /
30×30`; the editor badges `display:flex / visible`. Grep confirms **no `@media (hover)` rule targets
`.fermata-chip`, `.fc-step`, `.fc-value`, or `.note-hold`** — all are always-on. The steppers were
successfully clicked with a real pointer in this mode.

## Non-blocking observations (not gate items)
- Clearing a fermata box to empty and re-typing `^` in the **same box** keeps the previously stored
  hold (segment identity persists; `pruneHolds` runs on save). Matches the documented known-limit —
  not a bug.
- Studio's new-song seed carries a `5^` with a stored hold, and a picker "blank" song had no time
  signature; both are harness quirks, not product behavior. The clean 4/4 read (suggestion = 3) is
  authoritative.
