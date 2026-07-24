# DS — BI-011: remove a note's arc (tie / slur) — discoverable

## Problem
A user sees an arc over a note (a **tie `~`** = same-pitch sustain, or a **slur/เอื้อน `( )`**
= one syllable across several notes) but cannot find how to take it off. Field report on song
141: pressing `(` at the first note and `)` at the last did **not** remove it.

## Root cause
Real songs store the slur brackets **attached to a digit** (`(3 1)`, `(6_ 7)`, `1)`) and a slur
may **cross segments** (`(3 - 2` then `1) -`). The old toggle (`withToggledBox`) only removed a
**separate** `(` box next to the cursor, so on real data nothing happened, and the toolbar lit no
key on a middle/tail note. The arc was effectively unremovable.

## Design (world-class, G-consulted; touch-first)
Three layers, all driven by one detection (the note's marks), so a lit key, a chip, and a working
removal are the same fact seen three ways.

1. **Active toolbar keys** (shipped base) — when a note is selected, every symbol already on it
   lights (brand fill + `aria-pressed` + "ใส่แล้ว (กดเพื่อเอาออก)"). Standard rich-text toggle
   affordance (Flat.io / Noteflight / Soundslice).

2. **Smart span removal (a)** — a slur/triplet is matched across the **whole line** (attached or
   separate brackets, depth-aware, cross-segment). Selecting **any** note the arc spans (head,
   middle, or tail) lights the `( )` keys, and pressing either — or the chip — removes the **whole**
   group, stripping both ends wherever they live, never leaving a dangling half-bracket. Adding a
   slur is unchanged (`(` then `)`), including "press again to undo a just-inserted bracket".

3. **Active-marks chip (c)** — a `บนโน้ตนี้: [เอื้อน ✕]` row above the key strip. One chip per
   human concept (a slur = one chip, not two brackets); tap ✕ = remove in a single touch. This is
   the phone-first door: no hover, no scanning the key strip. Chip is a 44px touch target.

**Ruled out:** tapping the thin SVG arc directly (Fitts's law — 1–2px path over dense jianpu
numbers is a mis-tap trap on phones; G concurred). Reconsider only for tablet width.

## Behavior table (note selected, on the note layer)
| note has | toolbar keys lit | chip shown | press key / tap ✕ |
|---|---|---|---|
| tie `~` (either tied note) | `~` | โยงเสียง | untie both notes |
| slur `( )` (head/middle/tail) | `( )` | เอื้อน | remove whole slur (both ends) |
| triplet `{ }` (any spanned note) | `{ }` | สามพยางค์ | remove whole triplet |
| `-` hold · `^` · `_` · `.` · `#`/`b`/`n` | that key | its Thai name | toggle it off |

## Engine (single SSOT — `src/lib/songEdit.js`)
- `bracketSpanAt(content, loc, open, close)` → `{open:{si,bi}, close:{si,bi}}` | null — the group
  enclosing the note, line-level, depth-aware.
- `withBracketRemovedAt(content, loc, open, close)` — strip both ends (one or two segments).
- `activeSymbolsAt` (keys) / `activeMarksAt` (chips) — read the note's marks.
- `editorCommands.effectForBox` routes `( ) { }` → remove-whole-group when inside one, else insert.
Brackets bear no syllable slot → verses never ripple on add/remove.

## Verification (live, song 949bc4ba)
- Chip tap on the **tail** note of `(3 1)`: data `(3 1)` → `3 1`, arc SVG paths `1` → `0`.
- `)` key on the **head** of `(1 4)`: `(1 4)` → `1 4`, arc `1` → `0`.
- Non-head notes now light `( )` and show the เอื้อน chip (previously dead).
- Undo restores; 360px: chip is a 44px target, visible, hit-testable.
- 107 unit tests pass (incl. middle-note removal, cross-segment `(3 - 2`|`1) -`, add-path
  preserved). Node engine probe: 16/16 on real attached/separate/cross-segment forms.
