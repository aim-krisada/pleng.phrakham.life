# Scoping — lyric↔note alignment vs Gemini's "rebuild SongSheet" plan

Read-only analysis (23 ก.ค.). Compares Gemini's recommendation against the **real code + data**
already in this repo. No implementation. Companion to commit `a343571` (grid align, WIP on
`editor-usability`).

## Bottom line (F60+)

- **P'Aim's actual complaint — "อ่านไม่ออกว่าคำไหนคู่โน้ตไหน" — is a LAYOUT problem, and it is
  already solved** by the shared-column grid (commit `a343571`), *proven in a real A4 print PDF*:
  every word now sits unambiguously under its own note, melisma bars included.
- **Gemini's "root cause = DATA, must rebuild SongSheet" over-generalizes.** The pairing info
  needed for alignment already exists (v2 stores one slot per note, blank = held). What Gemini is
  really pointing at is a *separate, additive* feature: **drawing a slur to visually show a word is
  held across N notes.** That is worth doing — but the **data-encoding pattern (B068) and the render
  engine (B062 within-segment / B118 cross-segment) already exist and shipped.** It does not require
  a parallel SongSheet.
- **Recommend: minimal path** = keep the grid align (done) + (optional, if P'Aim wants the melisma
  *bracket* drawn) encode the few missing slurs via the existing B068→B062 pipeline. **A full
  musical-moment rewrite would re-implement beam/slur/highlight/songbook that were *just* shipped
  (B062/B006/B059/B110/B118) and risks regressing them — high cost, low marginal gain.**

## Answers to the 5 scoping questions (real code)

**1. Existing slur/tie — how much is reusable?**
- `lib/notation.js`: `parseNotes` already tokenizes `~`(tie), `(`/`)`(slur), `{`/`}`(triplet),
  fermata `^`. `slurSpans(noteStrings)` + `arcPlan()` compute cross-segment slur spans (incl.
  line-wrap split) — pure, unit-tested.
- `SongSheet.vue:228–335`: measures real note rects and draws cross-bar ties **and** cross-segment
  slurs as one continuous SVG arc (B069/issues5). `NoteRow.vue`: within-segment slur/tie arcs
  (B062/B076) as width-driven engraved lenses; beams (B110) as measured `<i>` bars.
- **EditorMode's preview does NOT draw its own slur — it renders `<SongSheet>` directly**
  (`EditorMode.vue:3438/3461`). So the render path is already centralized: **one SongSheet serves
  print + edit-preview + (via SongViewer) sing.** B118 is finishing the last EditorMode-specific
  gap. → **Reuse is high; almost nothing about slur/tie is net-new.**

**2. What the v2 model stores today (+ what an adapter would add)**
- Per-note **syllable slots**: `arrangement[].syllables` is a flat array; `resolveContent` slices
  `syllableSlots(note)` per segment → `seg.syllables`, one entry per note-box, **blank = held /
  melisma / no-word**. So *which* note lacks a word is stored; a word + trailing blanks ⇒ melisma
  (derivable by left-fill).
- **Tie/slur**: stored inline in the note string (`~`, `()`), NOT as separate fields. **B068 already
  did a data pass encoding 193 arcs across 48 songs** from the source images.
- Song 141: has ties (`.2.~ ~.2`, `1.~ ~1`, …) but **no `()` slur**. The circled bar `.6_ 1_ .6_`
  is 3 *attack* notes / `["","ใจ","รับ"]` — the wordless note is a melisma of the previous word
  (ดวง) **but no slur is encoded**, so no arc is (or would be) drawn there today.
- **Adapter need:** to draw a melisma *bracket* you either (a) DA-encode the missing `()` (B068
  pattern, feeds the existing engine) or (b) derive a span from blank-runs (left-fill heuristic).
  **No new stored field and no DB migration is strictly required** (respects ⛔ no-reimport).

**3. Distance from "musical-moment columns"**
- The grid (`a343571`) already makes note-k and syllable-k share **one column** (subgrid), i.e. it
  *is* column pairing — without bundling each note+word into one DOM node.
- Gemini's per-note *bundle* (each note+word = one flex-column unit) is a **bigger rip-up**: beams
  and slur arcs measure the **contiguous `.note-row`**; splitting notes into per-column bundles
  breaks that contiguity and forces re-architecting B062/B110/B118. The subgrid approach keeps
  `.note-row` intact on purpose. → **This is the key technical fork (below).**

**4. Print / visual-regression infra**
- Print chrome = `lib/printChrome.js` (@page margin-box footer, injected on `beforeprint`).
  `break-inside: avoid` is at **ท่อน level** (`.song-section`), not per-bar (US-B02 "ไม่ตัดกลางท่อน").
- **No visual-regression / screenshot-diff harness exists** — every test is jsdom unit (px
  misalignment is invisible to them). Gemini is right on this gap. My verify used headless
  Edge→PDF→PNG + DOM measurement (works, but manual).

**5. Backlog overlap (avoid dup)**
- **B062** ✅ merged — continuous SVG slur/tie in NoteRow.
- **B068** ✅ done — tie/slur DATA encoded for 48 songs.
- **B118** 🔨 in progress (`b118-slur-continuous`) — unifies cross-segment slur in EditorMode with
  SongSheet's. **Direct file overlap with any slur/SongSheet work — must reconcile at merge.**
- **B006** ✅ merged — per-syllable karaoke highlight (v2, 1 syllable/note).
- **B059** ✅ — songbook mode in SongSheet.
- **B044/B046** (→ B043 phase 2) — SongSheet within-block spacing + title gap (`.note`/`.lyric`);
  same file/region my grid touches.

## Phased plan (print-first) — reuse vs net-new · risk/effort

- **Phase 0 — Align (DONE, `a343571`).** Shared-column grid; words pinned under notes; verified in
  A4 PDF + 224 tests. *Reuse: all. Net-new: ~45 lines CSS/template. Risk: low.* Solves the stated
  complaint. **Decision needed: is this enough, or does P'Aim also want melisma brackets drawn?**
- **Phase 1 — Print hardening (only if we keep going).** Confirm subgrid across the browsers P'Aim
  actually prints from; if any fails, fall back to a no-subgrid column variant. Optional per-bar
  `break-inside:avoid`. *Net-new: small. Risk: low–med.*
- **Phase 2 — Melisma visibility (optional, product call).** If P'Aim wants the *held-across-notes*
  shown, **DA-encode the missing `()` slurs (B068 pipeline) → the existing B062/B118 engine draws
  them.** *Reuse: the whole slur engine. Net-new: a data pass + maybe a left-fill auto-suggest.
  Risk: med (data accuracy), NOT a render rewrite.*
- **Phase 3 — Visual-regression harness (infra, any time).** Headless-Chromium screenshot diff on a
  fixed song set. *Net-new. Risk: low. Value: catches future px regressions Gemini flagged.*
- **NOT recommended — parallel musical-moment SongSheet rewrite.** Would re-implement beam/slur/
  highlight/songbook shipped in B062/B006/B059/B110/B118 and risk regressing them; collides with
  active B118. High effort, high risk, low marginal gain over Phases 0–2.

## Technical forks to decide (and where to sharpen the question for G)

1. **Column pairing: subgrid (keep `.note-row`, beams/slurs untouched) vs per-note bundle
   (Gemini).** Sharpen for G: *"Beams (B110) and slur arcs (B062/B118) are drawn by measuring the
   contiguous `.note-row`; a per-note bundle breaks that contiguity. Given subgrid already prints
   correctly in Chromium (verified PDF), is the bundle rewrite still worth breaking the shipped
   beam/slur engines?"*
2. **Melisma encoding: note-centric `~`/`()` inline (matches our existing slur engine + B068 data)
   vs lyric-centric `span:N`.** Our whole render + data pipeline is note-centric already, so
   introducing a lyric-centric span means an adapter both ways. Ask G whether a span model buys
   anything the inline `()` + left-fill derivation doesn't.
3. **Does alignment alone satisfy the requirement, or is a drawn bracket required?** This is a
   P'Aim product call, not a technical one — it decides whether Phase 2 happens at all.

## STOP — no implementation beyond the WIP grid. Awaiting PM.
