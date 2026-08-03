# pleng.phrakham.life — เพลง.พระคำ.ชีวิต

Free worship-song library for Thai churches: lyrics, guitar chords, and numeric
melody notation (โน้ตตัวเลข), with one-click chord-number toggle, live transpose,
and clean A4 printing.

**Live site:** https://pleng.phrakham.life (GitHub Pages)

## Stack

- **Frontend:** Vue 3 + Vite + Vue Router (hash mode), hosted on GitHub Pages
- **Backend:** Supabase — PostgreSQL (`songs` table, RLS: public read / team write)
  + email-password auth for the editing team
- **License:** GPL-3.0 — fork it, point it at your own Supabase, and run your
  church's own song library

## Pages

| Route | Purpose |
|---|---|
| `/` | Song catalog: search by title, number, lyrics, key, or note sequence |
| `/song/:id` | Song sheet: lyrics-only or full view, letter/number chords, transpose, print A4 |
| `/studio` | Editor: build songs segment-by-segment, live preview, save (team) or export JSON (anyone) |

## Develop

```sh
npm install
npm run dev
```

## Song data shape (`songs.content` jsonb)

```json
{
  "key": "E",
  "timeSignature": "4/4",
  "lines": [
    [
      { "type": "segment", "chord": "E", "note": "5. .5 .5 .6", "lyric": "พระเจ้าเป็นความรัก" },
      { "type": "bar" },
      { "type": "marker", "label": "***" }
    ]
  ]
}
```
