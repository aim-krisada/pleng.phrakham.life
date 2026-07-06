# CLAUDE.md — pleng.phrakham.life

Read this first every session. Universal rules live in `C:\gl\CLAUDE.md`; this file
is project-specific only.

## What it is

Free worship-song library for Thai churches: lyrics + guitar chords + numeric melody
notation (โน้ตตัวเลข), with chord↔number toggle, live transpose, and A4 print.
Live: https://pleng.phrakham.life

## Stack

- **Frontend:** Vue 3 + Vite + Vue Router (**hash mode**) → GitHub Pages
- **Backend:** Supabase — Postgres `songs` table (RLS: public read / team write) + email-password auth
- Deploy: push to `main` → `.github/workflows/deploy.yml`. `keepalive.yml` pings Supabase every 2 days.

## Run

```sh
npm install
npm run dev          # port 5173
```
Preview tools: `preview_start "dev"` (config in `.claude/launch.json`).

## Layout

- `src/views/` — pages: `SongList` (`/`), `SongView` (`/song/:id`), `Studio` (`/studio`), `Guide`, `About`
- `src/components/` — `SongSheet`, `NoteBoxes`, `NoteRow`, `ComboSelect`, `DownloadTool`, `ProfileTool`, `SiteFooter`
- `src/lib/` — `notation.js` (parse โน้ตตัวเลข), `songModel.js` (v1/v2 model), `chords.js` (transpose), `songSearch.js`, `midi.js`, `diff.js`
- `src/store.js`, `src/supabase.js`, `src/router.js`
- `docs/song-model-v2.md` — **design doc for the v2 song model (read before touching notation/model)**

## Domain

- **Song content** = `songs.content` jsonb. **v1:** flat `content.lines[]` of `{type: segment|bar|marker, chord, note, lyric}`.
  **v2:** separates **melody (stanza)** from **words (verse/refrain linked to a stanza)**, one syllable per syllable-bearing note. See `docs/song-model-v2.md`.
- Notation: numbers = scale degrees; `.` above/below = octave; `-`/`~` = held/tie; `|` = bar.

## Work convention (folders are gitignored — local scratch per device)

- New work → `features/feature NNN/` · bugs → `bugs/bug NNN/`. Each holds a `.txt` (Thai brief) + screenshots.
- To start a task, just say e.g. **"ทำ bug 016"** → read `bugs/bug 016/*.txt` + images, then work.
- Current WIP: feature 003 v2 (linked stanzas, repeat/volta playback) — see git log.

## Parallel sessions on one PC → git worktree

**Design goal (พี่เอม):** the whole workflow is built so several Claude Code sessions
can run **in parallel on one PC** without stepping on each other. Design every task to
be self-contained so it can go in its own worktree/branch. Practical rules:
- **1 task = 1 worktree = 1 branch = 1 dev-server port** — never two sessions in the same working dir.
- Keep work isolated: no shared mutable scratch that two sessions write at once; sessions meet only at `git merge`.
- Each `feature NNN` / `bug NNN` should stand alone so it can be picked up in a fresh session with no cross-talk.

One task = one worktree = one branch (no live file clashes; merge via normal git):

```sh
git worktree add ../pleng-feat-003 -b feature-003
git worktree add ../pleng-bug-016  -b bug-016
npm run dev -- --port 5174          # give each worktree its own port
git worktree remove ../pleng-feat-003   # when done
```
Open a separate Claude Code window per worktree. Merge branches back to `main` when done.
