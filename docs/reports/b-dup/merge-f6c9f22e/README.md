# B-DUP merged onto the deployed /v2 (main @ f6c9f22e)

`claude/keen-hellman-70be16` (ตัวกันชื่อเพลงซ้ำ) branched from `27978bf9`, i.e. **before** the two
fixes that shipped to /v2 on 2026-07-27. Merging it back produced four conflicts. All four were
resolved as a **union** — no side dropped — because the three features are independent:

| conflict | HEAD (deployed) | branch (B-DUP) | resolution |
|---|---|---|---|
| `Studio.vue` imports | `emptyContent`, `searchSongs` | `categoryName`, `findTitleConflicts` | both |
| `Studio.vue` ~763 | comment moved elsewhere | new `inlineDup` computed | keep `inlineDup`, comment stays at its moved home (kept exactly once) |
| `Studio.vue` `<SongViewer>` | `:start-set` / `@set` | `:dup-note` | both |
| `SongViewer.vue` props | `startSet` | `dupNote` | both |
| `EditorMode.vue` ~1371 | new guarded `watch(pickerId)` (`confirmDiscard` + `skipWatch` bounce) | B-DUP block **followed by the OLD bare** `watch(pickerId, id => loadSong(id))` | keep the guarded watch + the B-DUP block; **delete the old bare watch** |

That last one is the only resolution where a wrong choice fails silently. Keeping both watchers
would run both callbacks: cancelling the guard bounces `pickerId` back, and the second, unguarded
watcher then calls `loadSong(id)` anyway — the guard would be bypassed with no visible error.
G confirmed this reading (transcript below).

## Proof after the merge (all three features together)

Chromium headless on its own port/profile, against this worktree's own dev server, at 1280 and 360.

- `npm run test:all` → **1872 passed / 10 skipped, exit 0** (baseline on f6c9f22e was 1838/10)
- `vite build` → exit 0
- **กันชื่อซ้ำ** (`dup-block-*.png`, `dup-editor-*.png`) — an unrelated name shows nothing; the same
  name in another เล่ม shows ℹ️; the same name in the same เล่ม shows ⛔, and `passTitleGate('เผยแพร่')`
  returns `false` for a non-approver with the refusal spelled out in `saveMsg`.
- **เปียโนเดี่ยว** (`sound-*.png`) — the panel has exactly 2 radiogroups (เสียงที่เล่น · อารมณ์/สไตล์);
  เครื่องดนตรี and การบรรเลง are absent, and the explanatory note is shown.
- **กันงานหาย** — all 5 `confirmDiscard` points are byte-identical to `origin/main`. Driven live:
  switching songs with unsaved work asks and bounces the picker back; ย้อนเวอร์ชัน asks.
- G's two follow-up cases: **cancel** keeps the song, the edits and the ⛔ state; **accept** loads the
  new song and re-evaluates the duplicate check against *it* (`block` → `ok`, banner gone), with the
  dirty flag reset and no stale banner. A second switch on a clean document asks nothing —
  `skipWatch` does not stay armed.

## Not covered here

`db/011-duplicate-title-guard.sql` rides along in the tree but is **not run** — the library still has
two duplicate pairs in เล่มเด็กเล็ก and the index would refuse to create. Web-side only.
