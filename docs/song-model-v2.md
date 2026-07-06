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

## Open questions
- Do this BEFORE the YS 2014 ~100-song batch (recommended — avoids re-keying).
- Per-syllable highlight replaces the current segment-level highlight — confirm.
- Blank/pickup slots and multi-note melisma UI in the arrangement panel: nail in step 2.
