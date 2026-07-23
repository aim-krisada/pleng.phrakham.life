# Tester verdict — B108 หมวด/เล่ม ถูกเปลี่ยนเป็น "อนุชน" เอง (`fix-draft-category`)

Independent QA session (separate from the dev). Base = live round 33 `23f2e19`.
Dev report: `fix-draft-category.md`.

- **Round 1** — commit `1fc24f2`: PASS, with two residual holes (R1, R2) reported.
- **Round 2** — commit **`7284b34`**: per-field knownness + Phase 1 activated (P'Aim has run
  `db/010` on the live DB). **This is the current verdict.**

## Overall (round 2, `7284b34`): **PASS** — safe for PM gate → deploy round 34

R1 and R2 are genuinely closed, the Phase-1 gap is closed, and three further corruption paths are
covered. No new corruption path found. One documented non-corrupting quirk confirmed (§5) and one
deploy-order note (§6).

## 1. Build + suite

| Check | Result |
|---|---|
| `npx vitest run` | **733 passed / 68 files** (dev's figure confirmed) · 1 file failed = `src/lib/notationLint.test.mjs` |
| notationLint failure identical to base? | **Yes — verified, not assumed.** Same file run in the `pleng-guide` worktree pinned at base `23f2e19`: identical `Error: process.exit unexpectedly called with "0"` at `notationLint.test.mjs:190`. The file is untouched by this branch |
| `npx vite build` | ✓ built in 2.05s, no errors (only the pre-existing >500 kB chunk warning) |
| Diff scope vs base | exactly 4 files: `EditorMode.vue`, `EditorMode.category.test.js` (new), `docs/reports/fix-draft-category.md`, `db/010-draft-category.sql`. **fermata / DockKey / SongSheet / Guide untouched** |
| `db/010` changed since P'Aim ran it? | Only the `B104 → B108` word in a comment. **The DDL is byte-identical** — nothing to re-run |

## 2. Payload-level verification (round 2)

I did not rely on the dev's tests. I wrote and ran an independent 12-case probe suite that mounts
the real editor against a recording Supabase mock and asserts **what is sent to Supabase**
(`songs.update` / `songs.insert` / `song_drafts` / the `approve_and_publish` RPC args). All 12
passed. The probe file was deleted afterwards; the tree is clean.

| # | Case | Verdict | Evidence |
|---|---|---|---|
| 1 | **R1 closed** — touching ธีม only | **PASS** | `categoryKnown` stays `false`; the `songs.update` row has **no `category` key** (was `"anuchon"` on `1fc24f2`), while `theme` — the field the user *did* touch — is written as `พระคัมภีร์` |
| 2 | **R2 closed** — picking a หมวด only | **PASS** | `category: "dek-lek"` is written (deliberate re-file still works) and there is **no `theme` key** (was `null` = wiped on `1fc24f2`) |
| 3 | **LEGACY draft (both columns present, both NULL) + resolve FAILS** ← highest risk | **PASS** | both flags `false`; the update payload omits **both** keys and `JSON.stringify(row)` contains no `anuchon`. A legacy NULL never masquerades as a pick and is never written |
| 4 | Legacy draft + resolve SUCCEEDS | **PASS** | editor shows the song's real `lem-yai` / `กิตติคุณ` and writes exactly those back |
| 5 | **Draft's own stored pick BEATS the published song** | **PASS** | draft `category='dek-lek'`, song still `lem-yai` → editor keeps `dek-lek` and publishes `dek-lek`; the still-unknown ธีม is filled from the song. `resolveBook()` fills only unknown fields |
| 6 | **NEW-song draft round-trip (Phase-1 gap)** | **PASS — gap closed** | `pickCategory('lem-yai')` → the `song_drafts` write carries `category: "lem-yai"`; reopening that row gives `meta.category='lem-yai'`, `categoryKnown=true` (used to read back as อนุชน) |
| 7 | A guess is never persisted into the draft either | **PASS** | unknown → `draftRow()` stores `category: null`, `theme: null` — not `'anuchon'`. A guess cannot be laundered into a future "real pick" |
| 8 | **Unfiled song (`category` null) stays unfiled** | **PASS** | published song loaded with null category/theme → both flags `false` → re-publish omits both keys; no `anuchon` written over an intentionally unfiled song |
| 9 | `approve()` still refuses rather than wiping ธีม | **PASS** | existing song + unreadable ธีม → **no `approve_and_publish` call at all**, message `❌ อ่านหมวด/ธีมเดิม...` |
| 10 | `approve()` does **not** over-block | **PASS** | new-song draft with both unknown → RPC **is** called, omitting both keys. Checked against the RPC source (`db/004`): its INSERT branch is `coalesce(p_song->>'category','anuchon')`, so new songs still land in อนุชน. **No regression** |
| 11 | `approve()` partial knowledge | **PASS** | category unknown + ธีม known → publishes, omitting only `category` (RPC `coalesce` keeps the stored one); the draft's own ธีม wins over the song's |
| 12 | Quirk (see §5) | **confirmed non-corrupting** | measured, not assumed |

**Design check (source reading, not inference):** `ComboSelect.vue` emits `update:modelValue`
**only** from a human action (`pick`, Enter, allow-custom blur). It never emits on mount or on a
programmatic `modelValue` change, and blur without typing (3 options → `filtered.length === 3`)
emits nothing. So neither `categoryKnown` nor `themeKnown` can be flipped true by rendering alone.

## 3. Real browser (Chrome, dev server :5380)

- Fresh page load: all combos render populated — **no empty-combo artifact** (หมวด, ธีม
  `— ไม่ระบุธีม —`, คีย์ `C`, จังหวะ `4/4`).
- Real pointer: หมวด opens with exactly **3 options** `เล่มใหญ่ / อนุชน / เด็กเล็ก` (B095 lock intact);
  clicking `เล่มใหญ่` sticks (`input.value === 'เล่มใหญ่'`). The `:model-value` +
  `@update:model-value` rebinding is intact.
- Typing a value outside the list (`zzzz`) + blur reverts — allow-custom still off.
- **Console clean on a fresh load.**
- ℹ️ Mid-session I did capture `ReferenceError: bookKnown is not defined` — but only from Vite HMR
  hot-update modules (`EditorMode.vue?t=...`, stack ending in `HMRClient.queueUpdate`). Verified
  **not real**: `bookKnown` appears **0 times** in the source and **0 times** in the freshly served
  module. It is the HMR corruption artifact the dev flagged; a fresh load is clean.

## 4. Round-1 findings — status

| Finding | Status on `7284b34` |
|---|---|
| R1 — ธีม touch licensed writing a guessed `anuchon` | **CLOSED** (probe 1) |
| R2 — หมวด pick licensed writing `theme: null` | **CLOSED** (probe 2) |
| B104 id collision with the MIDI work | **CLOSED** — renumbered to B108 in code, tests, report and SQL comment |

## 5. Documented quirk — confirmed, non-corrupting, **not a blocker**

Choosing "— ไม่ระบุธีม —" stores `null`, which reads back as *unknown*, so reopening the draft
re-shows the song's old ธีม. Measured end-to-end:

```
theme persisted into draft : null
theme after reopen         : "กิตติคุณ"   (resolved from the published song)
theme in publish payload   : "กิตติคุณ"
```

So the consequence goes one step past "it re-shows": publishing from that reopened draft writes
the old ธีม back, silently reverting the clear. **No data is destroyed and no other song is
touched** — the song simply keeps the ธีม it already had — so this is *lost user intent*, not
corruption, and no worse than described. Clearing ธีม and publishing directly (without the draft
round-trip) works correctly. A proper fix needs tri-state knownness; deferred as agreed.

## 6. Deploy-order note (not a defect)

`draftRow()` now sends `category`/`theme` to `song_drafts`, so **round 34 depends on `db/010`
being applied** — otherwise every draft save fails with `42703`. PM has confirmed the migration is
live (`select=id,category,theme` → `[]`; a bogus column → `42703`), so this is already satisfied.
Recorded only so the ordering is on the record if the branch is ever rebuilt or rolled back:
**this code must not ship to an environment without 010.**

## 7. NEEDS-P'AIM — real-DB round-trip

No team/approver credentials in this session, so nothing was published or approved against the
live database. Every claim above is proven at the **payload** layer, which is exactly where the
bug lived. For final confidence, one pass on the deployed build:

1. Open a **เล่มใหญ่** song → บันทึกร่าง → close → reopen from "งานร่าง" → หมวด reads **เล่มใหญ่**.
2. From that draft press **เผยแพร่** → the song is still under **เล่มใหญ่**, ธีม unchanged.
3. Repeat 1-2 with a **เด็กเล็ก** song.
4. **New song**: pick หมวด เล่มใหญ่ → บันทึกร่าง → close → reopen → still **เล่มใหญ่** (the newly closed gap).
5. Approver opens a เล่มใหญ่ draft → sees เล่มใหญ่ → **อนุมัติและเผยแพร่** without touching หมวด →
   song stays เล่มใหญ่ **and ธีม is still there**.
6. Open a เล่มใหญ่ song → change หมวด to **เด็กเล็ก** yourself → เผยแพร่ → it really moves.

## Verdict

**PASS — safe for PM gate → P'Aim → deploy round 34.** No blockers, no FAILs. One deferred quirk
(§5) and one already-satisfied deploy dependency (§6).
