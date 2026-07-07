# Lessons & conventions — pleng.phrakham.life

Working conventions distilled from build sessions. Read alongside `CLAUDE.md`
before non-trivial UI / architecture work.

## 1. Permission / role features → agree the model BEFORE coding show/hide
Write a **role × capability table** (who can view / do / must-not) and get it
approved first. The real dividing line is usually not "can edit" but
**"can store in the system / publish"**.
- pleng model: **anyone** views + edits (keeps their own work as JSON via
  download/upload) · **logged in** = save into the system (draft → review) ·
  **approver** = publish to the song list + delete/restore.
- Cost of skipping: once gated "edit = must log in" (wrong) → had to rip the
  show/hide back out.

## 2. Shared UI = one component (no duplicate-and-sync)
Header / nav / chrome used on ≥2 pages must be **one** component
(shared / slot / Vue `<Teleport>`), never copy-pasted then hand-synced — the
copies drift and the user notices. (pleng: an `AppHeader` built separate from
the Studio bar → brand sizes mismatched → merged into one app-level `ShellBar`
that the Studio page `<Teleport>`s its contextual menus into.)

## 3. Always verify real behaviour; never make the reviewer test it
- If the preview / screenshot tool jams: **restart the preview server** first;
  if still stuck, verify via **DOM / computed-style assertions + a production
  build** (`npm run build`) — that is valid evidence. Log the tool failure.
- Don't hand verification to พี่เอม ("open it yourself and check") when you can
  assert it programmatically.

## 4. Commit a checkpoint before experiments
Commit a working state on the branch before trying an alternative UX /
architecture — makes reverting trivial.

## 5. Big redesigns = phased on a branch; `main` untouched until approved
Work in small, reviewable phases on a feature branch and show each phase.
Never touch `main` (it auto-deploys via `deploy.yml`) until พี่เอม approves —
this lets direction pivot cheaply.

## 6. Windows dev-env gotcha
If `vite` / tooling suddenly reports **"not recognized"** though it worked
minutes ago, `node_modules/.bin` was wiped (OneDrive / antivirus). Fix:
`npm install` (restores the `.bin` shims). The dev server can keep running while
this happens — the CLI build is what breaks first.

## 7. Avoid ambiguous English UI jargon with พี่เอม
e.g. "chrome" (the UI frame/shell) was read as the Chrome browser. Use Thai or
expand the term on first use.
