# Playbook — importing a song from YS 2014 into pleng.phrakham.life

You are a **parallel/side session**. Your only job is to turn a song from the YS 2014
songbook into a **JSON + SQL seed** that P'Aim runs in Supabase. Follow this exactly.

## Ground rules (so you don't clash with the main coding session)

- **Do NOT edit the app source, do NOT `git commit`, do NOT push or deploy.** The main
  session owns the code and deployments. A repo edit here will collide with theirs.
- You only ever: **read** the song images / this repo (read-only), and **write** files
  into the OneDrive `song-data/` folder (see paths below).
- You **cannot write the database directly** — the anon key is read-only (RLS blocks
  inserts: `42501`). So you produce SQL and P'Aim runs it. Never try to insert via the API.

## Where things are

| What | Path |
|---|---|
| Songbook PDF | `C:\Users\aimkr\OneDrive\4 Personal\pleng.phrakham.life\song-picture\YS 2014.pdf` |
| Output folder (write here) | `C:\Users\aimkr\OneDrive\4 Personal\pleng.phrakham.life\song-data\` |
| Format example (song 1) | `song-data\001-insert.sql` and `song-data\001-phrajao-pen-khwamrak.json` |
| Notation parser (source of truth) | `src/lib/notation.js` |
| Data model doc | `docs/song-model-v2.md` |
| Ready images | `features/feature 003/S__3112975_0.jpg` = **song 31** (left) · `features/feature 003/S__3112974_0.jpg` = **song 84** |

### Getting a song's picture
This machine is **ARM64 Windows** — PDF→image rendering does **not** work
(`pdftoppm`, `pymupdf`, ghostscript all unavailable). `pdftotext -layout -f N -l N
"YS 2014.pdf"` extracts text but the two-column layout + octave dots come out scrambled
— use it only as a rough cross-check, never as the primary source.

**So: read a clear image.** For songs 31 and 84 the images above already exist. For any
other song, ask P'Aim to send a clear screenshot of that song (they have the PDF open on
an iPad and have been sending screenshots). To find the page: `pdftotext -layout "YS
2014.pdf" - | grep -n "NN\."` gives the rough page, but you still need the image.

## Supabase

- URL `https://vlpuvaofbzdawgjjpgfu.supabase.co` · table `public.songs`.
- Columns: `id` (uuid auto), `number` (int, unique), `title_th`, `title_en` (nullable),
  `content` (jsonb). Read-only key is in `C:\Users\aimkr\OneDrive\4 Personal\claude\.env`
  (`SUPABASE_*_PLENG`) — read is fine for checking existing songs; **write is blocked**.
- P'Aim runs your `.sql` in the Supabase **SQL Editor**.

## The `content` shape

Use **v1** (a flat `lines` array) — it's the simplest to hand-author and the reader
supports it (the app migrates v1→v2 on load). v2 (`stanzas`+`arrangement`) is also valid
but only reach for it if a melody is clearly reused across many verses.

```jsonc
{
  "key": "A", "timeSignature": "3/4", "bpm": 92,   // bpm optional
  "lines": [
    [ /* one visual line = an array of items, left to right */
      { "type": "segment", "chord": "A", "note": "5 5 5", "lyric": "ข้า จะ ถวาย" },
      { "type": "bar" },
      { "type": "segment", "chord": "F#m", "note": "6 - 6", "lyric": "สิ่ง ใด" }
    ]
  ]
}
```

### Item types (in a line array)
- `{type:"segment", chord, note, lyric}` — a chord + its note-run + the words under it.
  `chord` may be `""` (continues the previous chord). `lyric` may be `""`.
- `{type:"bar"}` — a normal barline between bars.
- `{type:"section", name}` — a section heading (e.g. `"ร้อง 1"`, `"รับ"`).
- `{type:"marker", label}` — the `***` hook marker (`label:"***"`).
- `{type:"label", text}` — free text on the line (e.g. `"Fine"`, `"D.C. al Fine"`).
- `{type:"continue"}` — this line continues the previous line's LAST bar (put it first;
  used when one bar is split across two printed lines).
- `{type:"end"}` — final barline `‖` (put at the end of the last line).
- `{type:"repeat-start"}` / `{type:"repeat-end"}` — repeat `‖:` … `:‖`.
- `{type:"volta", num}` — a 1st/2nd ending (`num:1` or `num:2`) on the following bar.

## Notation — the `note` string (READ `src/lib/notation.js` to be sure)

Space-separated tokens, one note per token. Movable-do numbers.

| You see in the book | Write | Meaning |
|---|---|---|
| a number 1–7 | `1`..`7` | scale degree, 1 beat (quarter note) |
| dot **above** the number | `1'` | up one octave (two dots → `1''`) |
| dot **below** the number | `.1` | down one octave (two dots → `..1`) |
| **underline** under the number | `5_` | eighth note (two underlines → `5__` = sixteenth) |
| **dot after** the number (augmentation) | `5.` | dotted (×1.5 length) |
| a dash `–` | `-` | hold/extend the previous note +1 beat |
| `0` | `0` | rest |
| tie (curved line, same pitch) | `~` between them, e.g. `5~ 5` | hold, don't re-strike |
| slur (curved line over a group) | `( … )` e.g. `(5 6 5)` | เอื้อน / melisma |
| triplet (bracket "3" over 3 notes) | `{ … }` e.g. `{3 2 1}` | 3 notes in 2 beats |
| `#` / `b` before a number | `#4`, `b7` | sharp / flat |

**Lyric alignment:** 1 syllable = 1 **attack** note. Held notes (`-`, tie, and a
same-pitch slur) take **no** new syllable. Thai has no spaces between syllables, so
separate them in `lyric` with a **space** = new word, a **hyphen** `-` = next syllable of
the SAME word (e.g. `"ส-ถิตย์"`). The number of syllables in a segment's `lyric` must
equal the number of attack notes in its `note`.

**Beats per bar must match the time signature** (3/4 → 3 quarter-beats per bar, 4/4 → 4).
Use this to catch mistakes — see the validator below.

## Step by step (per song)

1. Open the song's image. Note: **title (Thai)**, **key**, **time signature**, and any
   `bpm`/tempo. Read each printed staff line: its chords (above), note numbers, and the
   lyric line(s) below.
2. Transcribe each staff line into a `line` array: chords → `segment.chord`, note numbers
   (with octave dots + durations, per the table) → `segment.note`, words → `segment.lyric`
   (1 syllable per attack note). Barlines → `{type:"bar"}`. Section names (ร้อง/รับ) →
   `{type:"section"}`. Repeats/voltas/end as above.
3. **Multiple verses** that share one printed melody: the book stacks verse 2/3 lyrics
   under (or below) verse 1. For a v1 seed, spell the song out in play order — repeat the
   melody lines once per verse with that verse's words (this is what song 1 does). If the
   extra verses are lyric-only at the bottom, you may include just verse 1 + refrain and
   note the rest for P'Aim, OR spell them all out.
4. Write two files into `song-data\`:
   - `NNN-slug.json` — pretty-printed `{ "number": N, "title_th": "…", "title_en": null,
     "content": { … } }` (slug = a short ascii name).
   - `NNN-slug.sql` — the upsert (template below).
5. **Validate** (see script) — fix any bar whose beats ≠ the time signature, and any
   segment whose syllable count ≠ its attack-note count.
6. Report to P'Aim: the `.sql` path to run in Supabase SQL Editor, and a note that the
   song should be opened in **Studio** afterward to eyeball/repair the notes ("Claude
   seeds, P'Pao fixes"). Flag any bars you were unsure of.

### SQL template (`NNN-slug.sql`)
```sql
-- Seed song #NN — run in Supabase SQL Editor
insert into public.songs (number, title_th, title_en, content)
values (NN, 'ชื่อเพลงไทย', null, $json$ <<the content JSON on one line>> $json$::jsonb)
on conflict (number) do update
  set title_th = excluded.title_th, title_en = excluded.title_en, content = excluded.content;
```
(`$json$…$json$` is a dollar-quoted string so you don't have to escape the quotes inside.)

### Validator (run from the repo root; read-only, no repo changes)
Write this to a temp file OUTSIDE the repo (e.g. your scratchpad), run it, then delete it.
It checks every bar's beats against the time signature and every segment's syllable count.
```js
import { parseNotes, beatCount, expectedBeats, attackSlots } from './src/lib/notation.js'
import fs from 'node:fs'
const song = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const c = song.content, exp = expectedBeats(c.timeSignature)
;(c.lines || []).forEach((line, li) => {
  let bar = [], bi = 0
  const check = () => {
    const notes = bar.flatMap(s => parseNotes(s.note))
    const beats = beatCount(notes)
    if (exp != null && Math.abs(beats - exp) > 0.01)
      console.log(`line ${li+1} bar ${bi+1}: ${beats} beats (expected ${exp})`)
    bar.forEach(s => {
      const need = attackSlots(s.note), got = (s.lyric||'').split(/[\s-]+/).filter(Boolean).length
      if (got && got !== need) console.log(`  seg "${s.note}": ${got} syllables vs ${need} notes`)
    })
  }
  for (const it of line) {
    if (it.type === 'bar') { check(); bar = []; bi++ }
    else if (it.type === 'segment') bar.push(it)
  }
  check()
})
console.log('done')
```
Run: `node <that-file>.mjs "C:\...\song-data\NNN-slug.json"`. Zero output on the beat
lines = every bar fits the meter. (`continue` lines legitimately split a bar across two
printed lines, so a lone short bar there is OK.)

## Hard cases — be honest, flag them

- **Mid-song key change** (e.g. song 84 "C → A", "เปลี่ยนคีย์เป็น A Major"): v1 has a single
  `key`. Simplest: keep the numbers as printed (movable-do numbers don't change with the
  key on the page) and set `key` to the STARTING key; add a `{type:"label", text:"→ A"}`
  where the change is marked, and leave a `-- TODO: key change` comment in the SQL for
  P'Aim to resolve in Studio. Don't silently guess.
- **Volta / repeats** (song 84 has a 1st/2nd ending): use `{type:"repeat-start"}`,
  `{type:"repeat-end"}`, `{type:"volta",num}`. If unsure, spell both endings out instead.
- **Anything you can't read confidently** (an octave dot, a duration): make your best
  guess AND add a `-- TODO verify: line X bar Y` comment in the SQL. The transcription is
  a *seed*; P'Aim/P'Pao verifies and repairs it in the Studio editor.

## For this request: songs 31 and 84
- Song 31 "ข้าจะถวายสิ่งใดดี" — key A, 3/4 — image `features/feature 003/S__3112975_0.jpg`
  (it's the LEFT song on that page; song 32 is on the right — ignore it).
- Song 84 "ข้าจะยกยอสรรเสริญพระองค์" — starts C then changes to A, 4/4 — image
  `features/feature 003/S__3112974_0.jpg`. This one is complex (key change + volta +
  2 verses + 2 refrains) — go slow, flag uncertainties.
Produce `031-*.json/.sql` and `084-*.json/.sql`, validate, and hand P'Aim the SQL to run.
