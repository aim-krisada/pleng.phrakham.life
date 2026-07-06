# Song model v2 — linked stanzas + syllable-level lyrics

Design for feature 003 phase 2+. Status: proposed (awaiting review before build).

## Why change

The v1 model stores each line flat: a `segment` holds `{chord, note, lyric}` and a
song is `content.lines` (array of items). Verses that share a melody must be
duplicated — tiring to key, and a melody fix must be repeated in every verse
(they drift). It also can't drive paper-saving print (stacked verses) because
nothing records that two verses share a melody.

v2 goals:
- **Edit once, update everywhere** — a melody lives in one place.
- **Faster authoring** — type each verse's words only, not the melody again.
- **Syllable-level lyric↔note alignment** (พี่เปา) — the finest unit; unlocks
  per-syllable follow-along highlight and correct melisma handling.
- **One dataset, three renders** — compact authoring, expanded follow-along screen,
  stacked paper-saving print.

## Core idea

Separate the **melody** (a stanza) from the **words** (a verse/refrain that links
to a stanza). Words are stored as **one syllable per syllable-bearing note**.

### Syllable-bearing notes
Parsing a stanza's notation (`notation.js`) yields tokens. A note is
**syllable-bearing** (gets its own word) unless it is a *held continuation*:
- `-` extension, or
- a tie (`~`), or
- a same-pitch note under a slur (a melisma — see bug 015).

So the number of syllable slots = number of attack notes. A melisma = one syllable
held over several notes (the held notes take no word). This is already how the
notation encodes เอื้อน, so the author controls it by writing slurs/dashes — no AI
guessing.

## Schema

```jsonc
{
  "version": 2,
  "key": "C", "timeSignature": "4/4", "bpm": 92,

  // Melodies, entered once. A stanza has NO lyrics.
  "stanzas": [
    {
      "id": "A",
      "lines": [                     // visual lines (wrap/layout, like v1)
        [
          { "type": "segment", "chord": "C", "note": "5 5 4 3" },
          { "type": "bar" },
          { "type": "segment", "chord": "G", "note": "6 6 7 1'" }
        ]
      ]
    }
    // "B" = refrain melody, etc.
  ],

  // Play order. Each entry links a stanza + supplies only its words.
  "arrangement": [
    { "stanza": "A", "label": "ร้อง 1", "syllables": ["ข้า","จะ","ยก","ยอ","สรร","เสริญ","พระ","องค์"] },
    { "stanza": "A", "label": "ร้อง 2", "syllables": ["พระ","องค์","ได้","ทรง", "..."] },
    { "stanza": "B", "label": "รับ",   "syllables": ["สรร","เสริญ","พระ","นาม"] },
    { "stanza": "B", "label": "รับ 2", "syllables": ["ทรง","บันดาล","..."], "key": "A" }
  ]
}
```

- `syllables[]` aligns 1:1 to the stanza's syllable-bearing notes, in order across
  all bars. `""` = intentionally blank slot (rare).
- `key` on an arrangement entry = transpose that section (mid-song key change, 2b).
- Optional later: `endingOverride` on an entry to change its final bar(s) without a
  new stanza (covers song-84 voltas if we ever want in-place endings).

## Three renders from one dataset

- **Authoring (Studio):** two panels — *Melodies* (edit stanzas A, B… once) and
  *Arrangement* (rows: pick a stanza, fill a word per syllable slot, optional key).
  Compact like paper; editing stanza A updates ร้อง 1 and ร้อง 2 together.
- **Screen (reader):** walk `arrangement` in order; for each entry render the linked
  stanza's melody with that entry's syllables written under the notes → the v1
  spelled-out look + existing follow-along highlight/auto-scroll, now per syllable.
- **Print:** group `arrangement` by stanza; print each melody once with its verses'
  words stacked (verse 1 / 2 / 3 rows) → paper-saving (1B).

## Migration (v1 → v2)

Reader/print must support BOTH `content.lines` (v1) and `content.stanzas`+
`arrangement` (v2) — existing DB songs stay valid.

Migration helper for a v1 song:
1. Move all `lines` into a single stanza `A` (strip lyrics).
2. Create one arrangement entry `{stanza:'A', label:'', syllables}` where syllables =
   each segment's `lyric` split on spaces, mapped to that segment's syllable-bearing
   notes.
3. If a segment's word count ≠ its syllable-bearing-note count, flag the song for
   manual review (don't guess silently — same principle as the validator).

Most v1 songs are single-melody, so they migrate to a 1-stanza / 1-arrangement song
that renders identically.

## Build phases

1. Schema + `notation.js` helper `syllableSlots(noteString)` + v1↔v2 reader support.
2. Studio v2 authoring (Melodies panel + Arrangement panel).
3. Reader: resolve arrangement → render + per-syllable follow-along.
4. Print: stack verses by stanza (1B).
5. Migration tool + review flagging for the YS 2014 batch.

## Syllable input convention (Thai)

Thai has no spaces between syllables, so the author marks them the same way the
YS 2014 book already does (e.g. "อ - รุณ"):
- **space** = new word (`พระ เจ้า` = 2 syllables, 2 notes)
- **hyphen `-`** = next syllable continues the SAME word (`ส-ถิตย์` = 2 syllables of
  one word, 2 notes) — rendered with a connecting hyphen so it reads as one word
- **one syllable = one attack note.** A syllable held over several notes (เอื้อน) is
  a slur on the melody (held notes take no syllable — bug 015), not an extra slot.

Tokenizing a verse's lyric line on spaces AND hyphens gives the syllable slots; the
count must equal `syllableSlots(stanza)` or the song is flagged for manual review
(never guess). Edge cases beyond this (clusters, special finals) deferred.

## Hand-off status (6-Jul-2026)

**Done, verified, live** (this describes reality, not a plan):
- Step 1 — `notation.js syllableSlots()` + `songModel.js resolveContent()`; reader
  (`SongView`/`SongSheet`) and playback (`midi.js`) render/play BOTH v1 `lines` and
  v2 `stanzas+arrangement`. No change to existing songs.
- Step 5 core — `songModel.js migrateToV2()` + `splitSyllables`/`joinSyllables`;
  v1→v2 round-trips exactly for cleanly-aligned songs, flags mismatches for review,
  preserves the "ส-ถิตย์" hyphen convention.

**Step 2 — Studio v2 authoring: DONE (browser-verified; DB save/publish pending a
logged-in human).** Built in `Studio.vue`:
- The bar/segment editor is unchanged — it edits the active stanza via a writable
  `lines` computed (`stanzas[activeStanza].lines`). Verified: switching tabs keeps
  each stanza's bars isolated (A=35 bars, B=1 bar, no cross-corruption).
- **Stanza tabs** (A, B…) with add/delete; deleting a stanza that an arrangement row
  uses prompts, then drops those rows.
- **Arrangement panel** — rows of {stanza picker, label, key, live syllable-count
  indicator, lyric textarea} with add/remove/reorder. Count = `splitSyllables(lyric)`
  vs `stanzaSlots(stanza)`, coloured/flagged like `barStatus`.
- Per-segment lyric field removed (stanza = melody only); `serializeLine` drops empty
  lyrics so stanza JSON stays clean.
- `previewContent` builds v2; `resolvedPreview = resolveContent(previewContent)` feeds
  the sheet + full-song play. `applyRow` runs every load through `migrateToV2` (v2
  passes through; v1 auto-splits + surfaces mismatch warnings in a banner). Verified on
  real song #1: 35 bars into stanza A, lyrics split into the arrangement row, 19 real
  alignment mismatches flagged for review.
- `snapshotState`/`applyState` (undo) now carry stanzas + arrangement + activeStanza —
  verified undo/redo restores the lyric edits.
- Playback: `playStanza` (active melody, editor highlight) · `playFull` (resolved
  arrangement, no editor highlight since resolved line indices ≠ editor bars) ·
  `playLine` unchanged.
- **Verse lens** (added after พี่เอม's first test — notes and words felt too far apart):
  a "👁 ดูเนื้อคู่โน้ต" selector picks one ข้อ and renders a text box **per
  syllable-bearing note, right under the notes** in the melody editor. Typing fills the
  ข้อ's `syllables[slot]`; a blank box is red, so a verse that's short shows exactly
  which note has no word (solved the "120/125 but where?" problem). The arrangement
  textarea and the boxes edit the same `syllables` array (join/split), so bulk-paste and
  fine-align both work. Arrangement rows now store `syllables[]` (not a joined string).
  "เที่ยว" renamed to "ข้อ" throughout. Browser-verified: 125 boxes on song #1, 22 red
  gaps, editing a box updates the count + textarea live, hide/show + reverse sync work.
- **Slot shift tools** (พี่เอม's idea — one missing syllable mid-verse shifts every later
  word off its note): focusing a syllable box pops ◀ ▶ above it. ▶ opens a blank at that
  slot and ripples the rest of the ข้อ right; ◀ drops the slot and ripples left — both
  across the whole verse (past bars/lines), so re-aligning is one click, not a retype.
  Tools show only on the focused box (`@mousedown.prevent` keeps focus through the click).
  Browser-verified: push/pull ripple the tail and keep focus, count stays consistent.
- **Space/Enter auto-split** in a syllable box: a box holding more than one syllable
  (e.g. migration kept "พระเจ้า" as one) splits into one-per-box — first stays, the rest
  ripple into the following notes — then focus advances. Space splits at the caret
  (inserts the break there); Enter splits on any space already in the box, else just
  advances. Browser-verified: "พระเจ้า" + space after "พระ" → [พระ][เจ้า] with the tail
  rippled and the trailing blank absorbed, count +1, focus on the next box.
- **Readable editor layout** (พี่เอม's 2nd-test refinements): bars now stack one per row
  (full width) instead of side-by-side, so a whole bar reads as one horizontal line and
  the next bar sits below it. The per-bar live preview renders notes **and** the chosen
  verse's words together through the real render path (NoteRow + the sheet's
  chord/note/lyric classes) — so it doubles as a render-engine check. Verified: preview
  shows "…พระเจ้า เป็น ความ" under the notes, bars share one X and stack down the page.
- **Text-box-like syllable editing + nothing lost** (พี่เอม's 3rd test — the lyric is
  really one continuous string; insert/delete of space/hyphen is the whole job):
  - a syllable box now edits like a text field — Space/Enter split at the caret,
    **Backspace at the start merges into the previous box, Delete at the end pulls the
    next in** — all rippling the whole verse across bars.
  - the ripple used to drop a syllable once it passed the last note. Now overflow
    (more words than notes) renders as note-less red boxes in an **"เกินโน้ต N พยางค์"**
    strip — visible and fixable, never silently dropped. Verified: 130 words on a
    125-note stanza → 5 overflow boxes holding the exact tail tokens.
  - a collapsible **paragraph editor** ("แก้เนื้อแบบย่อหน้า") edits the selected ข้อ as
    free text, two-way synced with the boxes — the "edit like a paragraph" path.
  - decision: no Thai auto-splitter — text-box-style space/hyphen editing is enough.
- **2-row column layout (step 4, part 1)** — the duplicate render preview above each bar
  was removed; the bar editor is now one WYSIWYG-ish surface: per segment a column of
  chord / note boxes / syllable boxes, with each syllable box the same 46px width as its
  note box so the word sits directly under its note (verified: dx=0 across a 4-note
  segment). Bars still stack one per row. Full pretty render stays on the "👁 แผ่นเพลง"
  button. Known limit: syllable boxes left-align to note boxes, so a rest/held note in the
  MIDDLE of a segment can nudge alignment (rare; trailing-held aligns correctly).
  Chord entry stays the per-segment ComboSelect for now; chord-at-note-box is a later step.
- **Chord-at-note-box (step 4, part 2)** — each note box now has a chord cell above it:
  the segment's first note shows its chord, later notes show a faint "+". Picking a chord
  on a "+" splits the segment there into a new one that starts with that chord; picking
  "— ไม่มีคอร์ด —" on a later segment's first note merges it back (removes the chord
  change). The cells are 46px so a chord sits above its note. Verified on song #1: "+"
  on note 3 splits E[.5. .5_] + A[.5 .6] with syllables still aligned, and clearing A
  merges the notes back to one segment. Replaces the per-segment ComboSelect.
- **Three fixes from the 4th test:**
  1. *Words aligned under held/rest notes* — `notation.js noteBoxBearing()` gives a
     syllable-bearing flag per note box; the lyric row now renders a word box under each
     ATTACK note and an empty spacer under a held `-` / rest, so on "2 - - 1" the 2nd word
     sits under the "1" (was mis-left-aligned under the first "-"). Verified dx=0. This
     retires the earlier "middle rest/held" known-limit.
  2. *Space pushes the syllable right* — Space now inserts a break at the caret (text
     before stays, text after — even empty — moves to a new box and ripples), so a Space
     at the very start of a box pushes that whole word right (used to do nothing).
  3. *End-of-song barline* — a per-line "‖ จบเพลง" toggle serializes `{type:'end'}` and
     SongSheet renders a final double barline (thin + thick). Also: the verse lens now
     auto-selects the first ข้อ when a song loads.
- **Repeat + volta — phase A (render only)** — a bar can now carry `repeatStart` (‖:),
  `repeatEnd` (:‖) and `volta` (1st/2nd ending). Serialized as `{type:'repeat-start'}`,
  `{type:'repeat-end'}`, `{type:'volta',num}` in the line stream (resolveContent passes
  them through). Editor: a per-bar "repeat-row" with two checkboxes + a "ห้องจบ" select.
  SongSheet draws the repeat barlines (thick bar + two dots, dots on the correct side)
  and a "1." / "2." volta tag. Verified: toggles render `.rep-start` / `.rep-end` /
  `.volta-tag`. Visual polish of the dots/bracket needs a human eye (can't screenshot).
- **Repeat + volta — phase B (playback)** — `midi.js songToNotes()` now groups each line
  into bars (with the repeat/volta flags), runs `expandRepeats()` to produce the real
  play order, then flattens to notes. `expandRepeats`: play to a `:‖`, jump back to the
  last `‖:` (or song start), play twice; with voltas the 1st ending plays only on pass 1
  and the 2nd ending replaces it on pass 2. Node-verified play order (bar indices):
  simple repeat `A‖: B:‖ C` → 0,1,0,1,2; volta `A‖: B C(v1):‖ D(v2) E` → 0,1,2,0,1,3,4;
  no-repeat → 0,1,2 (unchanged); end-only → 0,1,0,1,2. Note/tie/slur handling unchanged
  (scoped to each bar). Limit: 2 passes max (1st/2nd endings); 3+ endings not handled.
- **STILL CANNOT be auto-verified**: the DB save/draft/publish path needs a logged-in
  human to save a v2 draft → reopen → publish. song_revisions + git make it revertable.

**Next up — step 3 (per-syllable highlight, replaces segment-level for v2; v1 falls
back), then step 4 (print stacking = paper-saving 1B).** Step-3 plan is de-risked: the
attack-note order from `songToNotes` already aligns 1:1 with `syllableSlots`, so it
needs only a global syllable index on played notes + per-syllable spans in `SongSheet`.

Decisions locked: screen = spelled-out follow-along (not book-stacked); print = stacked
(paper-saving); highlight will move to per-syllable; do all this BEFORE batch-keying
the ~100-song YS 2014 hymnbook (avoid re-keying).

## Open questions — resolved 6-Jul-2026

All three cleared before starting step 2 (พี่เอม):

- **Sequencing** — build v2 (steps 2-4) BEFORE the YS 2014 ~100-song batch. Keying v1
  first then changing the model = re-keying all 100 twice. Locked.
- **Per-syllable highlight** — YES, replaces segment-level, but only for **v2** songs;
  **v1 falls back to segment-level** (a v1 segment holds one lyric string, so it can't
  align 1:1 to notes). The swap itself is **step 3** work — step 2 only has to make the
  model carry the syllable slots so step 3 can address them.
- **Blank/pickup/melisma UI** — no special UI needed in the arrangement panel:
  - *Melisma (เอื้อน)* is a **melody** concern — a slur in the stanza's notation, and
    slurred notes already take no syllable slot. The author just types fewer syllables.
  - *Pickup (anacrusis)* is an ordinary attack note — it takes a slot like any other.
  - *Blank slot* (`""`, rare) needs only a **live syllable-count indicator per
    arrangement row** — `splitSyllables(input).length` vs `syllableSlots(stanza)`,
    shown like `barStatus` (`8/8 ✓` / `7/8 ⚠`). A mismatch flags the row for review
    (same principle as `migrateToV2` — never guess).
