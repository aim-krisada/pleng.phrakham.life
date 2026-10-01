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
- `docs/lessons.md` — **build lessons & conventions (permission model · one shared ShellBar · verify-fallback · commit-checkpoint · phased-on-branch) — read before non-trivial UI/architecture work**

## Domain

- **Song content** = `songs.content` jsonb. **v1:** flat `content.lines[]` of `{type: segment|bar|marker, chord, note, lyric}`.
  **v2:** separates **melody (stanza)** from **words (verse/refrain linked to a stanza)**, one syllable per syllable-bearing note. See `docs/song-model-v2.md`.
- Notation: numbers = scale degrees; `.` above/below = octave; `-`/`~` = held/tie; `|` = bar.

## Work convention (docs-driven — read `docs/README.md` first)

- **Orientation, every session:** `docs/README.md` = project map (folders + key files). `docs/mission.md` = purpose + 3-tier permission model + worktree plan.
- **Flow (ISO 29110-5-4, light):** `docs/backlog.md` (single idea inbox) → `docs/us/<epic>.md` (user story + AC) → `docs/ds/<epic>.md` (design spec) → code. Everything traces back to the mission.
- **New idea from P'Aim (image + text):** file it into `docs/backlog.md` with an id + save the image under `docs/backlog-assets/`.
- **Base branch for all work = `main`.** Branch per aimgit issue as `v1-<issue#>-<short-name>` (e.g. `v1-53-slur2beat`, `v1-94-section-copy`), open a GitHub PR into `main`, and **stop there — P'Aim reviews and merges it himself** (merging auto-deploys). Never merge or push to `main` yourself.
- **Commit messages** reference the aimgit issue as `(ใบ v3/pleng#<n>)`, e.g. `สเลอร์ที่คร่อมเส้นใต้เกิน 1 ท่อน ต้องมีเส้นโค้ง (ใบ v3/pleng#53)`.
- `studio-shell-redesign` is a legacy branch — do not base new work on it (older `docs/pm/` briefs and `docs/reports/` still mention it as the base; those are history).
- Old `features/` + `bugs/` scratch folders were archived to `OneDrive/4 Personal/claude/pleng/scratch-archive/` (no longer in the repo).

## Parallel sessions on one PC → git worktree

**Design goal (พี่เอม):** the whole workflow is built so several Claude Code sessions
can run **in parallel on one PC** without stepping on each other. Design every task to
be self-contained so it can go in its own worktree/branch. Practical rules:
- **1 task = 1 worktree = 1 branch = 1 dev-server port** — never two sessions in the same working dir.
- Keep work isolated: no shared mutable scratch that two sessions write at once; sessions meet only at `git merge`.
- Each `feature NNN` / `bug NNN` should stand alone so it can be picked up in a fresh session with no cross-talk.
- **The main dir is NOT pinned to `main` — another session can switch its branch under you.** Always run `git branch --show-current` before `git add`/`git commit` in the main dir. Do every task in its own worktree branched from `main` — never commit in the shared main dir. (Learned 2026-07-07: a commit landed on the wrong branch this way.)

One task = one worktree = one branch (no live file clashes; meet via PR). Branch from `main`:

```sh
git fetch origin
git worktree add ../pleng-v1-94 -b v1-94-section-copy origin/main
npm run dev -- --port 5394               # give each worktree its own port
git push -u origin v1-94-section-copy    # then open a GitHub PR into main — do NOT merge it
git worktree remove ../pleng-v1-94       # after P'Aim has merged
```
Open a separate Claude Code window per worktree. The PR into `main` is the hand-off; P'Aim merges it (= deploy).

**Previewing a worktree in the browser pane:** `preview_start` reads `.claude/launch.json`
from the *primary* working dir, and a plain `npm run dev` entry serves the primary dir — but
you *can* point it at your worktree. Add a temporary entry to the primary dir's
`.claude/launch.json` that runs the worktree's own vite against the worktree root:

```json
{
  "name": "v1-94",
  "runtimeExecutable": "C:/Program Files/nodejs/node.exe",
  "runtimeArgs": ["<worktree>/node_modules/vite/bin/vite.js", "<worktree>", "--port", "5394", "--strictPort"],
  "port": 5394
}
```
then `preview_start "v1-94"`. Node is at `C:\Program Files\nodejs` (may not be on PATH in an
already-running shell — prepend it). `launch.json` is tracked: revert your entry when done.

Other ways to verify from a worktree:
1. `node` tests importing `src/lib/*` (e.g. `parseNotes`, `songToNotes`) for pure logic.
2. `curl http://localhost:<port>/src/....vue` against the worktree's own `npm run dev` —
   a `200` with your text present = it compiles and the change is in.
3. after P'Aim merges/deploys, poll the live JS bundle for the commit hash (build stamps `__BUILD_COMMIT__`).

`preview_screenshot` is flaky (often times out); prefer `preview_inspect` / DOM queries via
`preview_eval` for precise checks (colours, positions, alignment) even when it does work.
