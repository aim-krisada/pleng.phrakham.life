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
npm test             # fast loop — everything except db/
npm run test:all     # EVERYTHING incl. db/ (pglite) — must be green before a merge
npm run test:db      # only db/
```
Preview tools: `preview_start "dev"` (config in `.claude/launch.json`).

## Layout

- `src/views/` — pages: `SongList` (`/`), `SongView` (`/song/:id`), `Studio` (`/studio`), `Guide`, `About`
- `src/components/` — `SongSheet`, `NoteBoxes`, `NoteRow`, `ComboSelect`, `DownloadTool`, `ProfileTool`, `SiteFooter`
- `src/lib/` — `notation.js` (parse โน้ตตัวเลข), `songModel.js` (v1/v2 model), `chords.js` (transpose), `songSearch.js`, `midi.js`, `diff.js`
- `src/store.js`, `src/supabase.js`, `src/router.js`
- `docs/song-model-v2.md` — **design doc for the v2 song model (read before touching notation/model)**
- `docs/lessons.md` — **build lessons & conventions (permission model · one shared ShellBar · verify-fallback · commit-checkpoint · phased-on-branch) — read before non-trivial UI/architecture work**

## Domain

- **Song content** = `songs.content` jsonb. **v1:** flat `content.lines[]` of `{type: segment|bar|marker, chord, note, lyric}`.
  **v2:** separates **melody (stanza)** from **words (verse/refrain linked to a stanza)**, one syllable per syllable-bearing note. See `docs/song-model-v2.md`.
- Notation: numbers = scale degrees; `.` above/below = octave; `-`/`~` = held/tie; `|` = bar.

## Work convention (docs-driven — read `docs/README.md` first)

- **Orientation, every session:** `docs/README.md` = project map (folders + key files). `docs/mission.md` = purpose + 3-tier permission model + worktree plan.
- **Flow (ISO 29110-5-4, light):** `docs/backlog.md` (single idea inbox) → `docs/us/<epic>.md` (user story + AC) → `docs/ds/<epic>.md` (design spec) → code. Everything traces back to the mission.
- **New idea from P'Aim (image + text):** file it into `docs/backlog.md` with an id + save the image under `docs/backlog-assets/`.
- **Base branch for all current work = `studio-shell-redesign`** (NOT merged to `main`; `main` auto-deploys — never merge/deploy without P'Aim's go).
- Old `features/` + `bugs/` scratch folders were archived to `OneDrive/4 Personal/claude/pleng/scratch-archive/` (no longer in the repo).

## Parallel sessions on one PC → git worktree

**Design goal (พี่เอม):** the whole workflow is built so several Claude Code sessions
can run **in parallel on one PC** without stepping on each other. Design every task to
be self-contained so it can go in its own worktree/branch. Practical rules:
- **1 task = 1 worktree = 1 branch = 1 dev-server port** — never two sessions in the same working dir.
- Keep work isolated: no shared mutable scratch that two sessions write at once; sessions meet only at `git merge`.
- Each `feature NNN` / `bug NNN` should stand alone so it can be picked up in a fresh session with no cross-talk.
- **The main dir is NOT pinned to `main` — another session can switch its branch under you.** Always run `git branch --show-current` before `git add`/`git commit` in the main dir. Do `main`-targeted fixes (guide, notation, small bugs) in a worktree that tracks `main` — never commit them in the shared main dir. (Learned 2026-07-07: a commit landed on `studio-shell-redesign` instead of `main` this way.)

One task = one worktree = one branch (no live file clashes; merge via normal git). Branch from the base `studio-shell-redesign`, not `main`:

```sh
git worktree add ../pleng-wt0 -b wt0-foundation studio-shell-redesign
npm run dev -- --port 5301               # give each worktree its own port
git worktree remove ../pleng-wt0         # when done
```
Open a separate Claude Code window per worktree. Merge branches back to the base `studio-shell-redesign` when done; `main` only on P'Aim's explicit go (it auto-deploys).

**Verifying from a worktree:** the `preview_*` tools attach to the *primary* working dir,
not your worktree — they will NOT show your worktree's changes. Verify instead by:
1. `node` tests importing `src/lib/*` (e.g. `parseNotes`, `songToNotes`) for pure logic.
2. `curl http://localhost:<port>/src/....vue` against the worktree's own `npm run dev` —
   a `200` with your text present = it compiles and the change is in.
3. after deploy, poll the live JS bundle for the commit hash (build stamps `__BUILD_COMMIT__`).

`preview_screenshot` is flaky (often times out); prefer `preview_inspect` / DOM queries via
`preview_eval` for precise checks (colours, positions, alignment) even when it does work.
