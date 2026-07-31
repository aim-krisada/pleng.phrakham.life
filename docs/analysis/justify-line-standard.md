# Line layout to the engraving standard — horizontal justification & bars-per-line

Design analysis for the ฝึกร้อง (reading) sheet render. **Analysis only — no code changed.**

Problem from P'Aim: on wide screens the lines end at ragged, uneven right edges
("ห้องมันตกยาวไม่เท่ากัน"). He wants the display to follow the professional engraving
standard: **notes stay a fixed size** (already decided — do NOT rescale notes per song),
lines should be **justified to fill the width like MuseScore**, and the number of
**bars-per-line / line breaks** should follow a proper standard too.

---

## 1. What "standard" means here

Professional engravers (MuseScore, LilyPond, and the rules in Elaine Gould's *Behind
Bars*) all build a line ("system") in three moves:

1. **Every note gets a natural width from its DURATION, not equal spacing.** A half note
   is given more horizontal room than an eighth. MuseScore's *Spacing ratio* default is
   **1.5** — "each note value takes 1.5 times as much space as the next shorter value" (a
   half = 1.5× a quarter). LilyPond phrases the same rule as: *"doubling a duration adds
   `spacing-increment` of space to the note,"* where `spacing-increment` defaults to about
   **1.2 staff-spaces** (≈ one notehead). This is the core of "looks engraved": spacing is
   **duration-proportional**, floored by a **minimum note distance** so the shortest notes
   never collide.
   Sources:
   [MuseScore — Systems & horizontal spacing](https://handbook.musescore.org/formatting/systems-and-horizontal-spacing),
   [MuseScore — Score size and spacing](https://handbook.musescore.org/formatting/score-size-and-spacing),
   [LilyPond — Horizontal spacing overview](https://lilypond.org/doc/v2.24/Documentation/notation/horizontal-spacing-overview).

2. **Measures-per-system is decided by fit, then the line is JUSTIFIED.** MuseScore:
   *"the minimum width required for each measure is calculated, then the number of measures
   that can fit on a system is worked out, and then the contents of those measures are
   spread out to fill the horizontal space… similar to 'fully justified' in a word
   processor."* So the right edge is flush **by stretching the springs between notes**, not
   by resizing notes. Note size is constant; the **gaps** grow.

3. **Do NOT over-stretch a short last line.** MuseScore's *Last system fill threshold*:
   if the natural width of the final (short) system is below a percentage of the page
   width, it is **left ragged, not justified** — otherwise a half-empty last line would
   stretch two bars across the whole page and look absurd. (The commonly-cited default is
   ~30%; the exact number isn't printed on the current handbook page, but the *rule* — "a
   too-short last line is not stretched" — is the standard.)

**Direct answer to the bars-per-line question P'Aim asked:**

> Does the standard normalize bars-per-line, or keep the musical phrase and just justify?

The standard does **NOT** force a fixed count like "always 4 bars per line." It packs
**as many whole measures as naturally fit** the available width, then justifies that line.
Bars-per-line therefore varies with content (dense bars → fewer per line) — and that is
correct and professional. What makes it look even is that **every line is flush on both
margins**, not that every line holds the same number of bars.

There is a second, human layer on top: engravers also break lines at **musical phrase
ends** where possible (a breath, a cadence), even nudging a bar up or down to make a phrase
sit on one line. Our songs already carry that intent — **the authored line = the phrase.**
So the ideal for pleng is a hybrid: **keep the author's phrase as the line (don't reflow
bars across phrases), and justify each phrase-line to the right margin.** That gives P'Aim
the even right edge he wants *and* preserves the musical phrasing the songbook was written
with.

---

## 2. Current gap — why our lines are ragged

Our render has all the natural-width machinery but **no justification step**, and it also
does not space by duration.

**How a line is built (authored, not reflowed across lines):**

- `resolveContent` (`src/lib/songModel.js:107`) expands each stanza line into one flat
  array; SongSheet maps **one authored line → one `.song-line`**
  (`src/components/SongSheet.vue:68` `renderLines`, template `:394`).
- Line breaks are therefore **AUTHORED** — fixed in the song data per phrase — **not
  computed.** Bars **cannot** reflow across authored lines; each authored line is a fixed
  set of bars. (Within one line, whole bars may *wrap* to a second visual row when the
  screen is narrow — `.song-line { display:flex; flex-wrap:wrap }` at
  `src/styles.css:596`, comment "wrap at bar boundaries instead of a horizontal scroll
  bar" — but on a wide screen the whole phrase sits on one row.)

**Why the right edge is ragged (three stacked causes):**

1. **No line justification.** `.song-line` is `display:flex; flex-wrap:wrap` with
   `align-items:flex-start` and **no `justify-content`** (`src/styles.css:596-602`). Bars
   pack left-to-right; whatever is left over is empty space on the right. Nothing stretches
   the line to the margin, so each phrase stops wherever its content ends → uneven right
   edges. This is the primary cause.

2. **Segments have natural, content-driven widths with a FIXED gap.** `.segment` is
   `display:inline-block; margin-right:6px` (`src/styles.css:607`) and `.bar-group` is
   `inline-flex` (`:604`). A segment's width is the widest of its chord / note-row / lyric.
   The inter-segment and inter-bar spacing is a constant 6px + bar-line margins — it does
   **not** grow to fill the line, and it is **not** proportional to note duration.

3. **The only "spread" we do is INSIDE a segment, not across the line.** Two rules use
   `justify-content: space-around` to spread children across the segment's own width:
   - the note row: `.song-line .segment .note .note-row { display:flex; width:100%;
     justify-content:space-around }` (`src/styles.css:627`).
   - the syllables: `.lyric-syl { display:flex; width:100%; justify-content:space-around }`
     (`src/components/SongSheet.vue:515`).
   These keep each **word under its note within one segment**, but a segment's width is set
   by its own content (usually the widest lyric), so the spread only redistributes *inside*
   that box. It never fills the **line**. So even with these, the line as a whole is ragged.

**Net:** authored phrase = fixed bars per line (good, keeps phrasing); but the line is
packed-left with natural widths and never justified → ragged right edge on wide screens,
and spacing is equal-ish rather than duration-proportional.

---

## 3. Implementation options (ranked)

All options must preserve the one hard invariant: **the note row and the lyric row of a
segment must stretch TOGETHER**, so a syllable stays directly under its note. Today that
coupling exists only *inside* a segment (both use `width:100%` + `space-around` on the same
segment box). Any justification must keep note-column and word-column locked at the same
x-positions.

### Option A — CSS-only: justify the line by growing the gaps (flex `justify-content` / `gap`) ★ recommended first step

Make `.song-line` distribute its free space between bars/segments instead of leaving it on
the right.

- **How to stretch:** change `.song-line` from packed-left to
  `justify-content: space-between` (or give segments/bar-groups `flex-grow`). The bars/
  segments keep their **natural, fixed-note-size widths**; only the **gaps between them**
  grow to reach the right margin. Note size never changes.
- **Word-under-note stays intact:** we are only changing the space *between* segments. Each
  segment keeps its internal `width:100%` note+lyric spread untouched, so every syllable
  stays under its note. This is the big safety win of the CSS approach — the coupling we
  already rely on is not disturbed.
- **Skip stretching a short last line:** `justify-content: space-between` naturally leaves
  a *single* short line packed-left only if it has one item; with several bars it would
  still spread. To honour the "don't over-stretch short lines" rule we add a threshold: mark
  a line whose natural width is below ~N% of the container (measured once, a small JS read
  or a container-query heuristic) and give those lines `justify-content:flex-start`. Mirrors
  MuseScore's *last system fill threshold*.
- **Bars per line:** unchanged — we keep authored phrase lines. No reflow, no phrasing risk.
- **Files:** `src/styles.css` (`.song-line`, maybe `.bar-group`/`.segment` flex), and a
  tiny flag in `src/components/SongSheet.vue` if we want the last-line threshold.
- **Effort:** low (hours). **Risk:** low–medium. Two things to watch: (a) `space-between`
  with `flex-wrap` spreads **each visual row** including a wrapped remainder — on narrow
  screens the last wrapped row of a phrase could over-space; the threshold flag handles it.
  (b) It equalises gaps rather than making them **duration-proportional** — it fixes
  "ragged right edge" (P'Aim's actual complaint) but is not yet full engraving spacing.

### Option B — CSS justify + duration-weighted segments (`flex-grow` from beat count)

Option A, but instead of equal gaps, give each segment a `flex-grow` proportional to its
**beat length** so longer notes get more room — the MuseScore *spacing ratio* / LilyPond
*spacing-increment* idea, done in CSS.

- **How to stretch:** we already compute duration via `beatCount(parseNotes(seg.note))`
  (`src/lib/notation.js:89`, already imported in SongSheet at `:4`). Emit a per-segment
  `--beat` and set `flex-grow: var(--beat)` (or a `1 + ratio*log2(beat)` mapping to mirror
  the 1.5 ratio). Free space is then distributed **in proportion to duration**, so a
  half-note segment opens up more than an eighth — engraved look, fixed note size.
- **Word-under-note:** still safe — the segment box grows, and its internal `width:100%`
  note+lyric spread re-centres both rows to the new width together. Coupling preserved.
- **Short last line:** same threshold flag as A.
- **Bars per line:** unchanged (authored phrases).
- **Files:** `SongSheet.vue` (compute `--beat` per segment in `renderLines`), `styles.css`
  (`flex-grow`), notation.js already provides `beatCount`.
- **Effort:** low–medium. **Risk:** medium — flex-grow distributes only the **surplus**, so
  the visual ratio between notes is "min width + proportional surplus," an approximation of
  true spring spacing, not exact. Good enough to look professional; not LilyPond-exact.

### Option C — Measured JS justification (spring model, true engraving spacing)

Compute each note's target x with a real spring model (natural width from duration, floored
by a minimum note distance, then stretch springs to fill the line width; leave short last
line unstretched) and position notes + syllables to those x's.

- **How to stretch:** JS measures each segment's minimum width, assigns duration-based
  springs, solves for the line width, writes explicit widths/positions. This is what
  MuseScore/LilyPond actually do.
- **Word-under-note:** we would have to position the lyric row to the **same** solved x's
  as the note row — more work, and it must be redone on resize / transpose / font-swap.
- **Short last line:** trivial to implement exactly (compare natural width to threshold).
- **Bars per line:** could optionally reflow bars to fill lines — but we should **not**, to
  protect authored phrasing (see §1 and §5).
- **Files:** `SongSheet.vue` (a real measure+layout pass, akin to the existing
  `measureTies` machinery at `:228`), `styles.css`, possibly `notation.js` (spring helper).
- **Effort:** high. **Risk:** high — a second measured layout system running alongside the
  tie/slur/beam overlays that **already measure note positions** (see §4). Every stretch we
  impose changes those measured x's; we'd be fighting our own overlays. Overkill for the
  stated problem.

**Ranking:** **A first** (kills the ragged edge, lowest risk, preserves everything), then
**B** if P'Aim wants the true "longer note = more room" engraving feel. **C only** if we
later want print-grade LilyPond-exact spacing — not needed now.

---

## 4. Recommended approach + step plan

**Recommend Option A now, with a clear upgrade path to B.** It directly fixes the complaint
("ragged, uneven right edges"), keeps notes a fixed size, keeps authored phrase lines (no
phrasing risk), and — crucially — does **not** disturb the measured overlays.

**Why not reflow bars / normalize bars-per-line:** the authored line already encodes the
musical phrase (`resolveContent` → one line per stanza line). Reflowing bars to equalise
counts would break phrasing and the author's intent, and the standard doesn't require it
(§1). Keep phrase = line; just justify it.

**Concrete, verifiable steps:**

1. **Baseline capture.** On a wide screen, screenshot 2–3 songs (a dense one and a sparse
   one) and note the ragged right edges. Keep as before/after evidence.
2. **Justify the line (A).** In `src/styles.css:596`, add `justify-content: space-between`
   to `.song-line` (and verify `.bar-group`/`.segment` still behave). Verify: bars now
   reach the right margin; **words still sit under their notes** (inspect a segment — the
   internal `width:100%` spread is untouched).
3. **Short-line threshold.** Add a per-line flag in `SongSheet.vue` `renderLines`
   (`:68`): measure or estimate the line's natural width; if below ~30% of the container,
   emit a class that sets `justify-content:flex-start` so short/last lines stay ragged (the
   MuseScore *last system fill threshold* rule). Verify a short final phrase is NOT
   stretched across the page.
4. **Regression-check the measured overlays** (see risks below). Verify ties, cross-bar
   arcs, slurs and beams still land on the notes after justification — they re-measure on
   resize, so trigger a resize and a print preview.
5. **(Optional) Upgrade to B.** Emit `--beat` per segment from
   `beatCount(parseNotes(seg.note))` and set `flex-grow: var(--beat)` so spacing becomes
   duration-proportional. Re-run step 4.
6. **Print check.** Because the same component prints the A4 sheet, verify justification
   also looks right on paper (and that the short-line rule prevents an over-stretched last
   line on the page). Get P'Aim to print a real PDF (per project convention — DOM checks
   only prove code loaded).

**What could go wrong (must verify, not assume):**

- **The measured overlays re-measure positions and could break.** SongSheet draws
  **cross-bar ties**, **cross-segment slurs**, and NoteRow draws **beams** by measuring
  live note `getBoundingClientRect()` and painting SVG/бars over them:
  `measureTies()` (`SongSheet.vue:228-335`, e.g. reads `.nt` centres at `:266-269`),
  `slurSpans` overlay (`:287-331`), and NoteRow `applyBeam`/`applyArc`
  (`NoteRow.vue:155-172`, `:94-104`). **Stretching the line moves every note's x**, so all
  of these must re-measure *after* the new layout settles. Good news: they already listen to
  `ResizeObserver` + `window.resize` + `fonts.ready` + `beforeprint`
  (`SongSheet.vue:347-368`, `NoteRow.vue:174-185`), so a CSS-only stretch that changes on
  the same layout pass should trigger a re-measure — **but this must be verified**, because
  the overlays measure *once after layout*; if flex justification settles in the same frame
  it's fine, if it settles late the arcs could sit on stale x's until a resize. Test: load,
  don't touch, confirm arcs are correct; then resize and confirm they stay correct.
- **Wrapped rows on narrow screens.** With `flex-wrap`, `space-between` justifies **each
  visual row**; a phrase that wraps to two rows would spread the short remainder row. The
  short-line threshold (step 3) should also catch a wrapped remainder, or scope
  justification to wide viewports only.
- **Single-segment or lyrics-only lines.** `space-between` on a one-item line does nothing
  (correct). Lyrics-only songbook lines (`.song-line-lyrics`) should be excluded from
  justification (they read as prose, not measures).
- **`space-between` vs `space-around` edge gaps.** `space-between` puts zero space at the
  two ends (bars flush to both margins) — usually what we want for a justified system. If
  the first bar should hug the left and the last the right, `space-between` is correct;
  don't use `space-around` at line level (it would inset both ends).

---

## 5. Open questions for P'Aim

1. **Stretch every line, or leave short lines natural?** The engraving standard leaves a
   too-short last/short line ragged (MuseScore's *last system fill threshold*). Recommend we
   follow it: justify full lines, leave a short final phrase alone. Agree?
   (If P'Aim wants *every* line flush even when short, we drop the threshold — but a 2-bar
   phrase stretched across a wide page looks odd.)
2. **Keep phrase-based line breaks, or normalize bars-per-line?** Recommend keeping the
   **authored phrase as the line** and only justifying it — this preserves the musical
   phrasing the songbook was written with and matches the standard (which packs "as many as
   fit," not a fixed count). Confirm we should NOT reflow bars across phrase lines.
3. **Equal-gap justification now, or duration-proportional spacing?** Option A (equal gaps)
   fixes the ragged edge immediately and is lowest-risk. Option B adds "longer note = more
   room" (the true engraved feel) for a bit more work. Which does P'Aim want first?
4. **Wide screens only, or also justify on phone width?** On a narrow phone a phrase wraps
   to several rows; justifying those can look loose. Recommend justify on wide/print only,
   keep the current wrap behaviour on phones. OK?

---

### File anchors referenced
- `src/components/SongSheet.vue:68` `renderLines` (authored line → `.song-line`); `:394`
  template; `:228-335` `measureTies` + slur overlay (measured note positions); `:515`
  `.lyric-syl` per-syllable spread; `:4` `beatCount` import.
- `src/components/NoteRow.vue:94-104` `applyArc`, `:155-172` `applyBeam` (measured beams),
  `:285` `.note-row` flex.
- `src/lib/notation.js:89` `beatCount` (duration in beats — the spacing basis for Option B).
- `src/lib/songModel.js:107` `resolveContent` (stanza → flat authored lines).
- `src/styles.css:596-627` `.song-line` (no `justify-content`), `.bar-group`, `.segment`,
  `.note-row` `space-around`.
