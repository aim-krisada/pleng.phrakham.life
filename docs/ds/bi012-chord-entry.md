# BI-012 — Chord entry: click-above-note + continuous keyboard (design spec)

**Phase 1 (design + G). NOT built yet — awaiting PM gate.**
Base: `integration/editor-fix-batch @717fb7a` (tip live /v2). Branch `bi012-chord-entry`.
G transcripts (evidence, 3 rounds):
`C:\gl\.aibridge\transcripts\pleng-bi012-chord-entry-2026-07-24-G-20260724-225531.md` (patterns),
`…-225637.md` (non-expert model), `…-230249.md` (autocomplete vs continuous-advance).

> **P'Aim priority (via PM):** *"การแก้คอร์ด ผมว่าจะง่ายกว่าถ้าสามารถใช้ keyboard ได้ต่อเนื่อง"* —
> the **keyboard-continuous run is THE heart of BI-012**, not a secondary option. The chip popup
> is the mobile/touch fallback. §"Keyboard-continuous flow" below is the centrepiece of this gate.

## ★ Keyboard-continuous flow — THE core (nail this)

**Goal: chord the whole song in one run, hands never leave the keyboard.**

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  focus chord slot above a note   (click the slot ▸ OR press c)         │
  │        │                                                               │
  │        ▼                                                               │
  │  ┌───────────────┐   type G / Am / F#m7 / G/B                          │
  │  │  [ F#m7|    ]  │ ◀─ inline caret ON the note, existing chord         │
  │  │   ᶠ♯ᵐ⁷  ⎵→     │    pre-filled + selected (type overwrites)          │
  │  └───────────────┘   live parse-preview pill (F♯m⁷) · NO dropdown      │
  │        │                                                               │
  │   press SPACE  ── commit + jump to NEXT note's chord slot, re-open ────┐│
  │        │                                                              ││
  │        └──────────── repeat across bars & lines, no mouse ────────────┘│
  │                                                                        │
  │   Enter = commit + exit   ·   Esc = cancel + back to the note          │
  │   Shift+Space / Shift+Tab = previous note   ·   Ctrl+Space = next bar  │
  └──────────────────────────────────────────────────────────────────────┘
```

### Key map (adopt G's non-expert set — confirmed 3 rounds, matches MuseScore 4)
| Key | Action |
|---|---|
| **Space** | commit current text (valid **or** invalid) → **advance to next note** + re-open ← *primary run key* |
| **Tab** | same as Space (commit + next note) — matches web-form muscle memory |
| **Enter** | commit + **exit** chord mode (end of a line/song) |
| **Shift+Space** / **Shift+Tab** | commit + **previous** note |
| **Ctrl+Space** | commit + **next bar's** first note (power extra, not surfaced to beginners) |
| **Esc** | cancel the typed edit (keep existing chord) + return focus to the note |
| letters/digits/`#`/`b`/`/` | type the chord; existing chord pre-filled + select-all so typing overwrites |

### Autocomplete / validate — decided by G round 3 (with app evidence)
- **NO blocking dropdown.** MuseScore & Dorico use a pure text popover + parse-on-commit; Flat.io's
  suggestion popover is non-blocking and **Space still commits raw text + advances** (never "pick from
  menu"). Chords are 1–4 chars, so a dropdown adds noise, not speed, and would fight the Space run.
- **Live INLINE parse-preview instead:** a small non-interactive pill under the caret shows how the
  text parses (`F#m7` → `F♯m⁷`) — instant reassurance for beginners, zero keystroke ambiguity.
- **Invalid text = SOFT-MARK, never hard-block** *(this CHANGES current behavior — see G-gap below).*
  On Space, advance anyway; mark the typo (red / dotted underline) so the user keeps flowing and
  fixes it on the way back. Pros (MuseScore/Dorico) never trap you on a bad symbol.
  - ⚠️ **Current code hard-blocks:** `commitChordPopup` refuses invalid text and holds the popup open
    (SongViewer.vue:970-976, `chordBad`). That traps the run on one typo — the opposite of the flow
    P'Aim wants. **Refinement: Space advances on invalid too; only VALID chords are written to the
    model** (audio safely ignores unparseable symbols — `parseChord` returns null), the invalid note
    is left visibly marked "needs chord" rather than trapping the caret.

### Re-editing an existing chord (same flow, backwards-compatible)
Click a placed chord (or land on it via Space/Shift+Space) → caret opens pre-filled + text-selected;
type to overwrite, Space to move on. Already how `openChordPopup` pre-fills (`chordAtCursor` :939).

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

## Scope of Phase 2 build (if PM approves) — ordered by P'Aim's priority
1. **★ Keyboard-continuous run (the core):** in `SongViewer.vue` `onChordKey` (:1006) — add
   **Tab/Shift+Tab** (= next/prev note); make **Space advance on invalid too** (soft-mark, stop
   trapping — the key behavior change); add a **live inline parse-preview pill**; add an `aria-live`
   announcing the anchor on each advance. Space/Enter/Esc/Ctrl+Space already correct.
2. **Click/tap to enter the run:** `SongSheet.vue` — clickable/affordable chord slot above each note
   in edit mode (real hit-area even when empty) → new `@chordedit={li,si}` → `openChordPopup`.
3. **Discoverability:** faint affordance above chord-less notes + first-run "Space = โน้ตถัดไป" hint
   (reuse `hintNonce`).
4. **Desktop lean-caret vs touch chip-picker** split of `sv-chordpop` (pointer/hover detection;
   verify on real mouse+touch device).
5. **Engine** (`withChord`, `isValidChord`) — untouched; only the *commit gate* in the popup changes
   (write valid only; advance regardless).
6. `Guide.vue` — document the click + keyboard flow (SOP §4.1, user-visible change).
7. Tests + real-browser verify at 360/412/desktop widths.

## Open question for PM/P'Aim (preference, not correctness)
- D6: remove the redundant bottom "คอร์ด ▾" once inline ships, or keep both? (Recommend keep now.)
