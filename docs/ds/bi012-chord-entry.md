# BI-012 — Chord entry: click-above-note + continuous keyboard (design spec)

**Phase 1 (design + G). NOT built yet — awaiting PM gate.**
Base: `integration/editor-fix-batch @717fb7a` (tip live /v2). Branch `bi012-chord-entry`.
G transcript (evidence): `C:\gl\.aibridge\transcripts\pleng-bi012-chord-entry-2026-07-24-G-20260724-225531.md`
and `…-225637.md` (follow-up).

## What P'Aim asked (his words)
> "การใส่คอร์ดอยากให้เป็นการเลือกเมื่อเลือกจากด้านบนโน้ตได้ไหม แทนการกดจาก button ข้างล่าง · ถ้าจะใช้ keyboard ก็น่าจะใช้ได้ต่อเนื่อง"

1. Enter a chord **right above the note** (click/tap the chord zone) instead of the bottom-toolbar button.
2. **Continuous keyboard** — type → advance → type the next, whole song without the mouse.

## ⚠️ Key finding — most of this ALREADY EXISTS (this is REFINE, not rebuild)

The live /v2 editor (`SongViewer.vue`) already has an **at-cursor chord popup** that opens over the
selected note and supports the full MuseScore-style keyboard run. It was already built + G-reviewed.

| Capability | Status | Where |
|---|---|---|
| Popup appears **on/above the selected note** (not the far toolbar) | ✅ exists | `sv-chordpop`, SongViewer.vue:2501-2549; positioned by `chordPopStyle`/`noteRect` :1032 |
| Type a chord, free-text, tolerant | ✅ exists | `chordDraft` + `isValidChord` (chords.js) |
| **Space = commit + advance to next note + reopen** (continuous run) | ✅ exists | `onChordKey`/`chordNextNote` :980,1006 |
| Enter = commit + close · Esc = cancel + keep · Ctrl+Space = next bar | ✅ exists | `onChordKey` :1006-1026 |
| Pre-fill existing chord + select-all so typing overwrites | ✅ exists | `openChordPopup` :952 |
| Parse-on-commit with red error on junk (never erases input) | ✅ exists | `commitChordPopup` :970 |
| Mobile: popup clamped above the on-screen keyboard; ≥24px trash delete | ✅ exists | `chordPopStyle` :1032 / `deleteChordFromPopup` |
| Quick-pick chord chips (key-diatonic first) | ✅ exists | `chordOpts` grid :2538 |

**So the keyboard-continuous ask (#2) is essentially already delivered** — via the `c` key. The reason
P'Aim asked for it is the real problem: **he did not know it exists.** That is a *discoverability*
gap (G follow-up, point B), not a missing feature.

### The genuine gaps (what's actually missing)
- **G1 — no CLICK/TAP path to open it above the note.** The popup opens ONLY via the `c` key
  (SongViewer.vue:512, gated on note-layer). Clicking the chord zone above a note does nothing
  chord-specific — in edit mode a note/word tap runs `onSeek`→`selectUnit` (selects for note editing),
  and the `.chord` span (SongSheet.vue:598) has **no click handler and ~zero width when empty**, so
  there is nothing to click above a chord-less note. **This is P'Aim's literal ask #1.**
- **G2 — no visible affordance** that a chord can go above a note, and no signal that the continuous
  run exists. Chord-less notes show nothing above them; the `c`/Space flow is invisible.
- **G3 — desktop and touch use the SAME chromed dialog.** G (point C) + our own octave-keyboard
  precedent say: desktop = lean inline caret (keyboard power path), touch = the chip picker. Today
  both show the full dialog (chips + error + trash) regardless of device.
- **G4 — redundant third surface.** The bottom `NoteInputBar` "คอร์ด ▾" popup (NoteInputBar.vue:113,
  152) still exists — the "button ข้างล่าง" P'Aim wants to move away from.

## Evidence from G (world-class patterns, cited)
- **Inline caret anchored to the note** (MuseScore Ctrl+K, Dorico Shift+Q, Flat.io) — floating input
  at top-center of the notehead; raw ASCII while typing, pretty glyphs on commit. Dorico fixes the
  caret's Y to the staff baseline so it doesn't "jump" note-to-note.
- **Keys** (MuseScore): Space = commit+next note · `;` = next beat · Tab = next measure ·
  Shift+Space = back · Esc = cancel+exit. G's MuseScore bindings match the real handbook (checked).
- **Minimal model for NON-experts** (G follow-up A, decisive): **Space = commit+next note** (primary),
  **Enter = commit+exit**, **Tab = commit+next note** (matches web-form muscle memory), **Shift+Tab =
  previous note**, **Esc = cancel+exit**. Don't expose beat/measure jumps to beginners.
- **Autocomplete**: pro apps do **parse-on-commit, no blocking dropdown**; show a subtle ghost preview
  of the parsed chord. Never block typing with rigid validation.
- **Re-edit**: click a placed chord → it becomes an input pre-filled + text-selected; typing overwrites.
- **Touch** (Flat.io / Noteflight / iReal Pro): different UI on touch — a fixed chord picker/palette,
  because soft keyboards lack Space/Tab fluidity. **Two surfaces gated by device = standard, not an
  anti-pattern.**
- **a11y**: textbox/combobox + an `aria-live` region announcing the anchor on each advance
  ("คอร์ดบนโน้ต X ห้อง Y").

## Proposed design (grounded on the real components)

**Frame: keep the existing engine + at-cursor popup; add the click path, the affordance, and split
the surface by device.** No new chord model, no new parser.

### D1 — Click/tap the chord zone above a note opens entry there  *(P'Aim ask #1)*
- `SongSheet.vue`: in `interactive` (edit) mode, make the chord slot above each note a real tap target
  even when empty — a min-height, full-note-width `.chord` zone. Emit a new event
  `@chordedit="{ li, si }"` on click of that zone (distinct from `seek`, which stays note-selection).
- `SongViewer.vue`: `@chordedit` → select that note + `openChordPopup()` (reuses everything). The
  popup already positions itself over `noteRect`.
- Empty slot shows a faint ghost affordance in edit mode (e.g. a dotted underline / "＋" on
  hover-desktop, always-faint on touch) so the click target is discoverable (covers G2).

### D2 — Discoverability of the continuous run  *(G point B)*
- First-run micro-hint under the caret: "เว้นวรรค = โน้ตถัดไป" for the first few opens, then fade
  (reuse the existing `hintNonce` mechanism already wired to NoteInputBar).
- Optional: faint ghost outline on the **next** note's chord slot while the caret is open, showing
  where Space will jump.

### D3 — Desktop = lean inline caret · Touch = chip picker  *(G point C + octave-keyboard precedent)*
- Make `sv-chordpop` adaptive:
  - **Desktop / physical keyboard:** input only + a subtle **ghost parse-preview** badge (type
    `F#m7b5` → preview `F♯m7♭5`). Hide the chip grid (redundant with typing). Lean caret, minimal chrome.
  - **Touch:** keep the chip grid + trash, and add a prominent **"โน้ตถัดไป ►"** advance button inside
    the popup (soft keyboards lack easy Space).
  - Detect with the pointer/hover capability check already used in the editor (⚠️ Surface = touch+mouse;
    verify computed `matchMedia`/pointer on a real browser per memory `feedback_verify_hover_on_real_browser`).

### D4 — Keyboard model (adopt G's non-expert set)
- Add **Tab / Shift+Tab** = commit+next / previous note (alongside existing Space / Shift+Space).
  Keep Enter=commit+exit, Esc=cancel. Keep Ctrl+Space=next bar as a power extra (not surfaced to
  beginners). One-line change in `onChordKey` (:1006).

### D5 — Parse preview + a11y polish
- Ghost preview badge as user types (D3 desktop). Keep parse-on-commit + red error (already there).
- Add an `aria-live` region announcing the anchor note/bar on each advance.

### D6 — The bottom "คอร์ด ▾" dock button (NoteInputBar)
- **Recommendation: keep it this iteration** (harmless, still a discoverable entry) and revisit
  removal after P'Aim tries the inline path. Removing it is separable scope. *(Product-scope call for
  PM/P'Aim — flagged, not assumed.)*

## Scope of Phase 2 build (if PM approves)
1. `SongSheet.vue` — clickable/affordable chord slot above each note in edit mode → `@chordedit`.
2. `SongViewer.vue` — wire `@chordedit`; adaptive desktop-caret vs touch-chips; ghost parse preview;
   Tab/Shift+Tab; first-run hint; `aria-live`.
3. Engine (`withChord`, `isValidChord`) — untouched.
4. `Guide.vue` — document the new click + keyboard flow (SOP §4.1, user-visible change).
5. Tests + real-browser verify at 360/412/desktop widths; verify pointer detection on a mouse+touch
   device.

## Open question for PM/P'Aim (preference, not correctness)
- D6: remove the redundant bottom "คอร์ด ▾" once inline ships, or keep both? (Recommend keep now.)
