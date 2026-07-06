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
