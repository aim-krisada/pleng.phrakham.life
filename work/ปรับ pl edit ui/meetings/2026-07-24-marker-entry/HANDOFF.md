# HANDOFF — marker-entry UI (G consult + finalize)

**From:** midbar-jumps session (heavy after Phase 1 + Phase 2 + this spec draft)
**For:** the continuation session that finishes the marker-entry design gate
**Branch:** `midbar-jumps` @c1685c9 (worktree can be re-created off this branch)

## State — spec draft DONE, G consult is the remaining gate
- ✅ `docs/ds/marker-entry-ui.md` — full buildable spec + 13 AC. Read it first.
- ✅ G question ready: `meetings/2026-07-24-marker-entry/00-question-for-G.md` (5 Qs).
- ⏳ **G consult NOT done — do this:** it's mandatory (§4.5 r10 · `feedback_sa_must_consult_g_every_design`).
  Was blocked because meeting-room `:9222` isn't running.

## Do the G consult (per PM 43 + §4.5 r10 — via meeting-room, NOT hand-rolled Chromium)
1. Read `C:\gl\krisada\ceo\tools\meeting-room\CLAUDE.md` first.
2. meeting-room needs **P'Aim to launch** (`py meeting_cli.py launch` + login once, shared Chromium :9222).
   If not up → raise a help-board slip (`pm-inbox/_ขอความช่วยเหลือ/`) + tell PM. Check `:9222/json/version`.
3. `new-meeting marker-entry-2026-07-24` → **upload `docs/ds/marker-entry-ui.md` as a FILE** (don't paste big
   blocks — meeting-room rule) → `push G` the question in `00-question-for-G.md` → verify chip = **Pro**.
4. Save transcript → `01-sent-to-G.md` + `02-reply-from-G.md` (question + full answer, not just summary).
5. Fold G's answers into `marker-entry-ui.md` (esp. Q1 dropzone, Q2 mid-bar affordance, Q4 delete-cascade).

## Then
- Update inbox `pm-inbox/pleng/2026-07-24-marker-entry.md` VERDICT → pass, put transcript path in EVIDENCE.
- Ping **pl pm** (highest number — was 43) that the design gate is complete.
- ⛔ Still NO SongViewer.vue code — build is the hot-file-queue step after deploy + PM gate.

## Key facts already established (don't re-derive)
- Canonical shape = `{type:'jump',kind,al?,id}` (kind: segno|coda|to-coda|dc|ds|fine · al on dc/ds). SSOT §7 of
  `repeat-jumps-midbar.md`. Engine (Phase 2) reads it; render (SongSheet.vue) draws it; entry inserts it.
- Seam = `editorCommands.js` (CP-0 unified registry) → add JUMP_COMMANDS/JUMP_PRESETS + 'jump' behavior.
- 🔴 Build dependency: `editorSerde.js KNOWN_ITEM_TYPES` (:47) lacks 'jump' → add it or markers drop on save.
- Engine + guards done (Phase 2, commits on this branch: daa8c7f + 429a3ce). mint knows 'jump'. Resolver mid-bar
  native. Merge of the engine is HELD by PM until after tonight's /v2 deploy.
