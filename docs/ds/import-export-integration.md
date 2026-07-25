# DS — Fold import / export into the inline editor (SongViewer ✏️)

**Status:** DRAFT (design-only · no code) · **G consult:** brief ready at
`work/import-export-design/00-question-for-G.md` · consult PENDING (shared :9222 Gemini
busy with P'Aim's live Acts-27 chat — PM to serialize). Decisions below marked **[std]**
follow a named standard and are firm; **[G?]** are the ones I want G to pressure-test.

Traces to: `docs/mission.md` (3-tier model), `docs/us/wt-c-json/` (US-C01..C04),
`docs/ds/wt-c-json/`, `docs/ds/menu-drawer-spec.md` (Google-Docs-clean tools drawer),
`docs/us/wt0-integration/US-I5-editor-json-wiring.md` (the pending `importSong` hookup).

---

## 1. Why this work (plain words for P'Aim)

Import (open a song JSON file) and export (download a song as JSON) already exist, but they
are scattered and half-wired. Meanwhile a **real, repeated workflow** depends on them: several
song-makers keep adding hymnal ("เล่มใหญ่") songs by running a local parser that turns the
printed page into a JSON, then opening that JSON in the app to fix and verify it, then handing
it off. This spec folds import/export into the **new inline editor (SongViewer ✏️)** so that
whole loop feels like one smooth task — and closes a known trap where imported repeat marks
(|: :|, 1./2. endings, D.C./D.S., Segno/Coda) can make a song *look* right but *play* wrong.

**North star:** at least as capable as today, clearly cleaner, safe on repeats, world-class on
mobile — one coherent "**ไฟล์**" (File) story instead of four half-overlapping surfaces.

---

## 2. Current state (verified inventory — the thing we're improving)

All logic funnels through **`src/lib/jsonIO.js`**: `exportSong`/`downloadSong` (US-C01) and
`validateSong`/`parseSongText`/`importSong` (US-C02+C04, friendly Thai errors, v1→v2 migrate).

**Import — exactly ONE live surface, and it bypasses the good engine:**
- `EditorMode.vue:2990` — "จัดการ" menu → **"อัปโหลด JSON"** (`manageUpload`, handler `:2862`).
  It does its **own raw `JSON.parse`** (`:2871`), NOT `importSong`/`validateSong`. Success →
  `applyRow(...)` loads it in-editor, no DB (matches DS-C02 on-demand intent); error → dock
  message "❌ ไฟล์ JSON ไม่ถูกต้อง" (`:2884`). The rich `validateSong` reasons + v1→v2 warnings
  are **surfaced nowhere**. This is the pending US-I5/DS-I5 wiring.
- The **SongViewer ✏️ inline editor has NO import surface at all** — only export. Import lives
  only in the older full-grid `EditorMode`.

**Export — several surfaces, all via jsonIO:**
- Dock **ExportTool.vue** (unified PDF · JSON · MP3) — the primary path, mounted in all three
  docks (sheet/sing/edit); JSON row "ข้อมูลเพลง (JSON)".
- **SongViewer save button** — for anon, label "บันทึกเป็นไฟล์", downloads JSON (tier-0 path).
- Studio print-dock item "ดาวน์โหลด JSON" (`Studio.vue:454`).
- **`DownloadTool.vue` — DEAD/orphaned** (removed from navbar; rendered nowhere). → remove.

**parse_song.py is NOT in this repo** — the hymnal parser is entirely external (DA's local
Python + OneDrive `song-data/`). So the app's job is **JSON in / JSON out only**; document
parsing stays out-of-app. **[std]**

**Email-submit (US-C03):** spec'd (download JSON + pre-filled `mailto`), build not confirmed.

---

## 3. Design principles (from mission + menu SSOT)

1. **The gate is SAVE-TO-SERVER, never EDIT/IMPORT/EXPORT.** Everyone — including anon — can
   import a file, edit it, and download it. Only "keep it in the central library" needs login.
   So every File action except server-save shows for all tiers. (mission.md tier table.) **[std]**
2. **One "ไฟล์" group, Google-Docs-clean.** Import/export are set-once/occasional actions →
   flat rows in the editor's tools drawer under a **"ไฟล์"** heading, not competing with the
   frequent note-editing controls. (menu-drawer-spec.md §3: switches/actions = flat rows.) **[std]**
3. **jsonIO is the single engine.** Every surface calls `importSong`/`validateSong`/`downloadSong`
   — kill the `EditorMode` raw-parse fork so validation + warnings are identical everywhere. **[std]**
4. **Non-destructive by default.** Importing must never silently destroy unsaved work, and must
   never silently ship a broken-repeat song. **[std]**

---

## 4. The design

### 4.1 Where the File actions live

A single **"ไฟล์"** section in the editor's overflow/tools drawer (the "จัดการ"/"เพิ่มเติม"
menu), consistent across the inline editor and reachable in every mode:

| Row | Label (Thai) | Tier | Action |
|---|---|---|---|
| Open | 📂 เปิดไฟล์ JSON… | all | file picker → `importSong` → review (4.3) → load in ✏️ |
| Download | ⬇️ ดาวน์โหลด JSON | all | `downloadSong(currentSong)` |
| Print/PDF | 🖨️ พิมพ์ / บันทึก PDF | all | (existing ExportTool) |
| Submit | ✉️ ส่งขออนุมัติทางอีเมล | anon/tier-0 | download JSON + pre-filled `mailto` (US-C03) |
| Save to server | 💾 บันทึกเข้าคลัง (ร่าง) | tier-1+ | existing server-save (login-gated) |

- **IMPORT placement [G?]:** proposed = **both** the song-list/library level ("เปิดไฟล์ JSON"
  to start from a file) **and** the editor's ไฟล์ menu ("เปิดไฟล์อื่น…"). Rationale: the creator
  loop starts from a file (library entry) but they also swap files mid-session (editor entry).
- **EXPORT vs SAVE [G?]:** keep the dock **ExportTool** as the primary download path (already in
  every dock, already unified with PDF/MP3). The anon Save button stays "บันทึกเป็นไฟล์" =
  download, but we **relabel for clarity** so a first-time creator isn't confused between *Save*
  (server), *Download* (file), and *Submit* (email). Firm proposal: anon primary button =
  "⬇️ บันทึกเป็นไฟล์ (JSON)"; server-save only appears when logged in. (Confirm wording with G/P'Aim.)

### 4.2 The creator loop (parse → import → edit → export/submit) — one continuous task

Because the DOCX/PDF parse is external, the **in-app** loop is: **open JSON → editor opens it →
fix/verify inline → hand off**. Make it feel continuous:

1. **Entry from a file** — library screen gets a quiet "📂 เปิดไฟล์ JSON" affordance next to
   "สร้างเพลงใหม่". Picking a file opens the ✏️ inline editor directly on that song (no DB write).
2. **In-editor swap** — ไฟล์ → "เปิดไฟล์อื่น…" to load the next hymnal JSON without leaving edit.
3. **Hand off in place** — when done: anon → "⬇️ ดาวน์โหลด JSON" (or ✉️ submit-by-email);
   tier-1+ → "💾 บันทึกเข้าคลัง". Same ไฟล์ menu, no context switch.

This upgrades today's EditorMode-only, raw-parse upload into a first-class inline loop, and makes
"seed then fix" (Claude/parser seeds, P'Pao fixes) a supported path instead of a side-channel.

### 4.3 Broken-repeat guard on import (the core safety feature)

On every import, after `validateSong` normalizes v1→v2, run a **repeat/marker reconciliation**
against the just-locked canonical shape (`{type:'jump',kind,al?,id}` + `{type:'end'}`, per
pm-42 lock) and present a **review panel** (not a toast, not a silent fix):

- **Auto-normalized** marks (old encoding → canonical) are applied and **listed** ("แปลงเครื่องหมาย
  ย้อน/ซ้ำ 3 จุดให้เป็นรูปแบบมาตรฐานแล้ว").
- **Unmappable / ambiguous** marks (e.g. a jump whose target we can't resolve, an unpaired
  repeat) are flagged **inline on the sheet + summarized** ("จุดที่ต้องตรวจ: บรรทัด 3 —
  เครื่องหมายวนไม่มีปลายทาง"), and the song still opens so the human can fix it.
- **Choice [G?]:** proposed = **auto-normalize + review summary** (open the song, show what
  changed + what needs a human), NOT silent and NOT refuse-to-open. Review is a calm checklist a
  non-technical creator can act on, with a "ไปที่จุดนั้น" jump link per item.
- Uses only the canonical resolver; **does not** invent new marker semantics (avoids the
  cross-lane drift the PM-42 lock was made to kill). Corpus today has ~0 jump songs, so live risk
  is nil — this guard is for the imported/parser files that DO carry repeats.

### 4.4 WCAG 2.2 AA + mobile **[std]**

- File input: a real `<input type=file accept="application/json,.json">` behind an accessible
  labelled button; keyboard-focusable; announced. Errors/warnings are **persistent, readable
  Thai** in the review panel (not a disappearing toast) — WCAG 3.3.1/4.1.3.
- Targets ≥ sibling control size, 24px floor (WCAG 2.2 AA target-size; match `.ed-mini` ~30px —
  not the AAA 44 myth).
- **Mobile:** the ไฟล์ menu + review panel render as a **full-screen drawer/sheet**, not a popup
  (platform pattern; matches the structure drawer we just verified goes full-width at 412).
  Download on iOS Safari opens the share sheet — copy must set expectations ("ไฟล์จะถูกบันทึก/แชร์").
- No `@media (hover)` gating on any File control (the Surface disappearing-control trap).

---

## 5. Delta (files touched — for the eventual dev spec, NOT built here)

- `src/lib/jsonIO.js` — add repeat/marker reconciliation returning `{song, normalized[], needsReview[]}`
  (reuse the canonical resolver; no new marker semantics).
- `src/components/SongViewer.vue` — add the ไฟล์ menu (Open/Download/Submit) + the post-import
  review panel; wire Open → `importSong`.
- `src/components/EditorMode.vue` — replace the raw `JSON.parse` in `manageUpload` (:2862) with
  `importSong`; route errors/warnings through the shared review panel (closes US-I5/DS-I5).
- Library/list screen — add "📂 เปิดไฟล์ JSON" entry beside "สร้างเพลงใหม่".
- `src/components/DownloadTool.vue` — **delete** (dead/orphaned).
- Guide.vue — document the File menu + creator loop (user-visible change ⇒ Guide updated, SOP §4.1).

## 6. Phasing (proposal)

- **P1 (safety + wiring):** route all import through `importSong` + review panel + broken-repeat
  reconciliation; delete dead DownloadTool. (Closes the real hazard; small, self-contained.)
- **P2 (loop polish):** library "เปิดไฟล์ JSON" entry + in-editor "เปิดไฟล์อื่น…" + unsaved-work
  guard + relabel Save/Download/Submit.
- **P3 (submit):** finish US-C03 email-submit from the ไฟล์ menu.

## 7. Open questions parked for G (see `00-question-for-G.md`)

Placement of import (library vs editor vs both) · Save-vs-Download-vs-Submit labelling · smoothest
realistic creator loop given external parse · broken-repeat behavior (normalize+review vs refuse) ·
batch vs one-at-a-time import · export payload (add key/theme meta?) · mobile file-input pitfalls.
The DS above states a firm proposal for each; G is to pressure-test, and the transcript will be
folded back in before this leaves DRAFT.
