# PM board — pleng (สด · ย่อโดย pm4 · 2026-07-10 ค่ำ)

ประวัติเต็ม (ก่อนย่อ) → `docs/pm/board-archive-2026-07-10.md`
กระดานนี้ = "ไม้ต่อ" ให้ PM session หน้า · อ่าน `docs/pm/pm.md` + memory `pleng-pm-role` ก่อน แล้วอ่านไฟล์นี้

---

## ▶ RESUME (สถานะสดที่ git-verify แล้ว)
- **ฐาน `studio-shell-redesign` HEAD = `1245325`** = **288 เทสต์เขียว + build ผ่าน** (merged วันนี้: note-search · preview · B073 · B075 · MP3 lib+dock · favicon-footer · search-555(B074) · SA editor-ux docs · 1 "failed file" = `notationLint.test.mjs` process.exit เดิม ไม่ใช่บั๊ก)
- ✅ **พร้อม deploy รอบ 6 (ยกเว้น DockKey phase2 ที่ยัง build):** ของ user-facing ที่ merged = ตัวหนังสือมีหัว/ไม่มีหัว · ค้นหาโน้ต+555 · พรีวิว · undo · MP3(dock ฝึกร้อง) · favicon+footer · (B073 อยู่ live แล้ว) — **รอ P'Aim เคาะ: deploy เลย หรือรอ DockKey**
- 🚀 **DEPLOY B073 เดี่ยว (P'Aim สั่งชัด 10 ก.ค. · พี่เปาตรวจ live):** cherry-pick `320f4dd` เข้า main → **main `1535e1f`→`b538701`** (push แล้ว · Actions `29095988380`) · EditorMode-only · build ผ่าน · ⚠️ **main แตกจากฐานแล้ว** (main มี B073 เดี่ยว · ฐานมี B073 ใน `2ab5628`) → **deploy รอบหน้าต้อง reconcile** (merge base→main จะเจอ B073 ซ้ำ = git ข้ามให้ ถ้า identical · หรือ reset main=base ตอน full deploy)
- 🚀 **release ที่เหลือ:** หลัง 4 สาย merge + DockKey accept → deploy รอบ 6 (⛔ รอ P'Aim "go" ชัดต่อรอบ)
- ⚠️ **บทเรียนซ้ำ (pm4 10 ก.ค.):** main dir ถูกสลับไป branch `sa-dockkey-print-edit` ใต้มือ (แม้ spawn_task ใช้ auto-worktree) → commit เอกสาร 5 อันหลุดไปลง branch นั้น · กู้ด้วย `git switch studio-shell-redesign && git merge --ff-only sa-dockkey-print-edit` (เส้นตรง = FF สะอาด) · **เช็ก `git branch --show-current` ก่อน commit เสมอ**
- **live = `1535e1f` (deploy รอบ 5)** · ✅ **P'Aim เคาะ "ปล่อยไว้" (10 ก.ค.) — ไม่ rollback** (ของขึ้น = 264-test-green ไม่พัง)
- verify ฐานรวม: `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'`
- **บทเรียน deploy:** ห้าม deploy จน P'Aim สั่ง "go" ชัดต่อรอบ (PM รอบ a เผลอ deploy รอบ 5 โดยอ่านคำสั่งผิด)

## 🎯 PM session ปัจจุบัน = `pm4`
- สายที่ PM สั่ง → รายงานกลับ "PM ปัจจุบัน" ที่ระบุตรงนี้ (PM หมุน session · **อย่า hardcode ชื่อสายใน prompt**)
- วิธี dev/SA รายงานเสร็จ (session-agnostic): (1) เขียน `docs/reports/<branch>.md` (2) เพิ่มบรรทัด §📥 inbox ล่าง (3) ping PM ปัจจุบัน · PM สายใหม่อ่าน inbox เจอเอง
- **PM หมุนสายใหม่ → เปลี่ยนชื่อบรรทัดนี้ทันที**

---

## 🟢 กำลังทำ — คลื่น 60 นาที (pm4 จ่าย 10 ก.ค. ค่ำ · P'Aim สั่ง "เสร็จพร้อม deploy ใน 60 นาที")
กันชนไฟล์แล้ว (3 สาย disjoint) · ทุก brief สั่ง `--host` + Network URL + รายงานกลับ pm4 · ⛔ ห้าม merge/deploy เอง

| สาย/branch | chip | ไฟล์ที่แตะ | brief | สถานะ |
|---|---|---|---|---|
| **dockkey-dev** (DockKey core + หน้าฝึกร้อง) | `task_9ca47954` | DockKey.vue(ใหม่)/SingTransport/SongViewer | `brief-dockkey-dev.md` | ✅ เสร็จ + rework 2 รอบ · **`3d44d94` = `width:fit-content` ทุกจอ · flex-start เกาะกลุ่ม · เลิก margin-auto/space-between หมด (พอดีปุ่มเป๊ะ · 383px บนจอ 1265) · timeline min 190 · sing 53 test** · **⏸️ HOLD — รอ P'Aim LAN `http://10.215.141.98:5315` (มือถือจริง · MCP headless วัดพิกัดไม่ได้) + 3 คำถามเดิม** |
| **fix-favicon-footer** (bug1 ไอคอนแบรนด์ + bug2 footer ติดล่าง) | `task_5bf7aeb4` | ShellBar / styles.css+App.vue | `brief-bugs-favicon-footer.md` | ✅✅ **MERGED `db14779`** (โลโก้ phrakham แทนโลก · footer flush ล่างจอเหนือ dock · font menu ไม่ revert · 283 test) |
| **sa-dockkey-print-edit** (descriptor พิมพ์/แก้ · docs) | `task_9d603bb7` | docs/ds เท่านั้น | `brief-dockkey-sa-print-edit.md` | ✅ เสร็จ → inbox (รอ PM ตรวจ+merge docs) |
| **fix-editor-preview-final** (พรีวิว "ดูผลทั้งเพลง": ล็อกบรรทัดไม่ reflow + ไทข้ามห้องซ้อน 2 เส้น) | `task_49330996` | EditorMode + SongSheet | `brief-fix-editor-preview.md` | ✅✅ **MERGED `a8ae3d3`** (nowrap+hscroll · ซ่อนครึ่ง START ของ NoteRow สมมาตร · เพลง 100 ไม่ regress · 268 test) |
| **fix-beat-count-continued** (B073 · ห้องต่อกันข้ามบรรทัด 11/4) | `task_4ae1acda` | EditorMode | `brief-beat-count-continued.md` | ✅✅ **MERGED `2ab5628`** (ต้นตอ=pickup path ไม่ใช่ cont join · pickupCheck แยกกลุ่ม RUN/ISOLATED · 270 test · preview-fix ยังอยู่) |
| **fix-undo-latest** (B075 · Ctrl+Z ย้อนผิดตัว) | `task_662f4039` | EditorMode | `brief-undo-latest.md` | ✅✅ **MERGED `0e29bc0`** (ต้นเหตุ=debounce รวบ 2 แก้เร็ว <400ms · แก้ leading-edge commit · 275 test) · รอ พี่เปา verify มือถือ |
| **note-search-verify** (ตรวจผลค้นโน้ต sequence เพลง 1/29/43 + มี/ไม่มีเว้นวรรค) | `task_a69020e0` | songSearch.js | `brief-note-search-verify.md` | ✅✅ **MERGED `5f6dc82`** (เจอบั๊กจริง: fuzzy fallthrough → match หลอก · แก้ให้ note query = exact-sequence · ผลค้น = เพลง 1 เดียว · 268 test) |
| **mp3-download** (B072 · ดาวน์โหลดเสียง MP3 · client-side) | `task_c6130db7` | midi.js + audioExport + DownloadTool + lamejs | `brief-mp3-download.md` | ✅✅ **LIB MERGED `fb10927`** (OfflineAudioContext+lamejs · `audioExport.songToMp3Blob/estimateMp3` · P'Aim verify มือถือ+PC · 283 test · bundle flat=tree-shaken) · **⏳ ปุ่มยังไม่โผล่ (DownloadTool orphan หลัง B045)** → **P'Aim: เอาทางไวสุด ขึ้น live แล้วปรับ** → **จ่ายสาย `mp3-dock-wire`** (send_message สาย mp3 เดิม) เสียบ MP3 เข้า dock หน้าฝึกร้อง `SongViewer.vue` (item download ~374) เรียก `audioExport` + progress · ⚠️ ชน dockkey-dev(HOLD)ที่ SongViewer → carry เข้า descriptor ตอน DockKey merge · ไม่ Web Worker |
| **search-short-notes** (B074 · ค้น "555" เจอทำนอง · เลขล้วน ≥3 union) | `task_263349f9` | songSearch.js | `brief-search-555.md` | ✅✅ **MERGED `8b2d779`** ("555"→ทำนอง 5-5-5 · "100"/"117"→เลขเพลง+ทำนอง union · 288 test) · 💡 follow-on idea บน branch: ป้าย "ทำไม match" (backlog) |
| **sa-editor-section-ux** (โหมดแก้ไขจัดการท่อน/ข้อ ให้ intuitive มาตรฐานสากล · docs) | `task_9544a30b` | docs/us,ds,design | `brief-sa-editor-section-ux.md` | ✅ **เสร็จ · docs MERGED `1245325`** — audit 8 ข้อ + redesign (ยุบ 3 รายการเป็น "โครงเพลง" เดียว · คลิกชื่อแก้ inline · ลากจัดลำดับรองรับนิ้ว · ตัดบล็อกล่าง · แนว Google Docs/Notion) · **mockup `docs/design/editor-section-ux.html`** · ✅ **P'Aim เคาะ mockup แล้ว → จ่าย dev `editor-section-ux-dev` `task_5d47b107`** (brief `brief-editor-section-ux-dev.md` · เน้นหนัก "ของเดิมห้าม regress") · **⚠️ ชน EditorMode.vue กับ DockKey phase2 → คนละส่วน (นี่=rail/arrangement · DockKey=dock) · PM เรียงคิว merge + resolve** |

**🟢 DockKey — UN-PARKED · phase 2 เดินหน้า (P'Aim เคาะ 10 ก.ค.):** P'Aim **accept หน้าฝึกร้อง DockKey fit-content ตัวล่าสุด (`3d44d94`)** + สั่งเดินหน้าครบ 3 หน้า + **เอา MP3 ใส่ใน DockKey** (ไม่ใช่ dock เดิม) → **send_message สาย `dockkey-dev` เดิม ต่อ phase 2** (brief `brief-dockkey-phase2.md`):
- sync ฐานล่าสุด → build **แผ่นเพลง(Studio) ITEMS_PRINT** + **แก้ไข(EditorMode) ITEMS_EDIT + E1-E3** (ระวัง undo/beat/preview/แป้นโน้ต regress) + **เสียบ MP3 เข้า DockKey export menu** (เรียก audioExport lib) + ถอด StudioDock เดิม
- ✅✅ **MP3 กดได้จริงแล้ว — `mp3-dock-wire` MERGED `b2ffbab`** (dev ทำเสร็จก่อนคำสั่งยกเลิกถึง · MP3 item ในเมนู ⚙ dock ฝึกร้อง SongViewer · เรียก audioExport dynamic-import · key/tempo ตรง playback · 283 test · lamejs code-split) → **MP3 ขึ้น live ได้เลยรอบ 6** · **dockkey-dev phase2 = carry MP3 item เข้า DockKey descriptor ตอน sync/replace sing dock** (มี reference ใน SongViewer ที่ merged)
- **P'Aim gate: LAN 3 หน้าก่อน merge** (โดยเฉพาะหน้าแก้ไข) · ⛔ styles.css/ShellBar/App/songSearch/NoteRow (สายอื่นถือ)

**คิว phase 2 (หลัง 3 สายเข้าฐาน):** เสียบ ITEMS_PRINT/ITEMS_EDIT (จาก SA) เข้า DockKey core → dock ครบ 3 หน้า (= เป้า P'Aim ข้อ 4.1)
**หลักฐานบั๊ก (ISO traceability):** `docs/pm/realuse-assets/bug-favicon-brand-icon.*` + `bug-footer-bottom.*`

## 🎯 รอ P'Aim ตัดสิน (คุย SA/PM เอง · ไม่บล็อกคลื่นบน)
- **B028 บันทึกประวัติ (audit log)** — DS `docs/ds/audit-log.md` · 3 คำถาม (วิวัฒน์ song_revisions เดิม vs ตารางใหม่ · แยก "ถอน"/"ลบ" · ทำ RPC approve+publish เลยไหม)
- **i18n Google Translate** — `lang=th` + `translate="no"` ที่คอร์ด/โน้ต(NoteRow)/แบรนด์(ShellBar) · P'Aim เลือกแทน i18n เต็ม (ยังไม่ spawn)
- **สิทธิ์ลบเพลง** — approver-only vs ทีมล็อกอินทุกคน

## 📦 งานข้อมูล/รีวิว (ไม่เร่ง)
- **10 เพลง COMPLEX repeat** — พี่เปาตั้งใน Studio (ไม่ auto · กันปล่อยผิด)
- **พี่เปา review 41 เพลงติดธง** (16 repeat / 6 lint / 28 words · review_flags ในฐาน)
- `tools/repeat-6-simple.sql` — P'Aim อาจยังไม่ run (6 SIMPLE repeat)
- DA option B: ตัวอ่าน repeat/volta จาก geometry (~18 เพลง) — defer · `docs/reports/da-handoff.md`

## ⏸️ optional / backlog (ปล่อยได้)
- B046 ระยะชื่อ↔เนื้อ · B066 tempo (ปล่อย 92) · footer โหมดแก้ (dock >88px) — follow-up B047
- mobile pass (Android · P'Aim ยัง "งง" · `prompt-android-mobile.md`) · tablet-primary
- editor-ux 3 ธง: draft ไม่มีคอลัมน์ theme/หมวด (draft ไม่ round-trip) · verified RLS=approver · B061 preview สูงบนแท็บเล็ต
- B062 ข้อค้าง: cross-bar tie บน print = แก้แล้วใน B069 (songsheet-finish) · Q5 auto-scroll = HOLD (desktop-only ภายหลัง)
- **ค้นโน้ต match ข้ามท่อน** (note-search-verify Q): ตอนนี้ยุบทั้งเพลงเป็นสตริงเดียว = ลำดับข้ามขอบเขตท่อน/บรรทัดได้ · ถ้าอยากบังคับ match ภายในบรรทัด/ท่อนเดียว = งานแยก (รอ P'Aim เคาะ · ไม่เร่ง)

## ✅ เข้าฐานแล้ว (สรุปสั้น · 8-10 ก.ค. · รายละเอียด → archive)
responsive overhaul S0-S4 · B062 slur/tie render · B068 ties data (import-ties.sql run แล้ว) · editor-ux v2 (6 งาน) · dock-core/polish · B043 sing dock ph1 · **B045 top-bar cleanup** · **songsheet-finish (B069 cross-bar tie + B004 print + B044 spacing · P'Aim print PDF ผ่าน)** · songviewer-refs · catalog review UI · B053 book refs · B057 lint R8/R9 · B047 sticky footer · B052/B058 search + **note-search-spaceless** · B027 จุดคู่ · B026 lint R4-R7 · B055/B056 editor · B059/B064/B065/B067 · **system-font-switch (ตัวหนังสือมีหัว/ไม่มีหัว รายคน · `eedc205`)** · **DockKey design docs (`83c0b4f`)** · **DA import 120 เพลง LIVE**
**Deploy:** รอบ 2 `b44edbf` · รอบ 3 `bbb3757` · รอบ 4 `c9a0cf8` · **รอบ 5 `1535e1f` = live ปัจจุบัน**

## 🧹 cleanup ค้าง (ทำเมื่อ session ปิด · เสี่ยงถ้าเปิดอยู่)
- worktree เก่าเยอะ (~15 ใน `.claude/worktrees/` + `pleng-*` ข้างนอก) — ลบเมื่อยืนยันสายปิด · `git worktree list` ดู
- dev server `:5400` (ฐาน --host) อาจยังรัน — ปิดได้
- branch เก่า `claude/*` เยอะ (สาย spawn เก่า) — prune เมื่อว่าง

## 📥 PM inbox (สายเสร็จ → รอ PM ตรวจ DoD)
> ล้างแล้ว 10 ก.ค. (pm4) — inbox เก่า merged เข้าฐานครบ (ดู "เข้าฐานแล้ว" + archive) · เหลือเฉพาะที่ยังไม่ merge จริง:

| สาย/branch | commit | สถานะ |
|---|---|---|
| **SA B028 audit-log** `sa-b028-audit-log` | docs only (ยังไม่ push) | ✅ DS เสร็จ · **รอ P'Aim เคาะ 3 คำถาม** ก่อน dev (ดู §🎯 รอ P'Aim) |
| **SA dockkey-print-edit** `sa-dockkey-print-edit` | docs only (ยังไม่ push) | ✅ DS เสร็จ `docs/ds/dockkey-print-edit.md` (ITEMS_PRINT เสียบ core ได้ทันที · ITEMS_EDIT รอขยาย schema E1–E3) · report `docs/reports/sa-dockkey-print-edit.md` · **4 คำถามถึง P'Aim** (ไม่บล็อก) · → phase 2 เสียบ DockKey |
| _(3 สายคลื่น 60 นาที)_ | — | 🔨 กำลังทำ (ดู §🟢 กำลังทำ) — จะเข้า inbox เมื่อรายงานเสร็จ |
| **editor-section-ux-dev** (โหมดแก้ไข "โครงเพลง": ยุบ 3 รายการเป็น 1 · rename inline · ลากจัดลำดับนิ้ว+เมาส์ · ตัดบล็อกล่าง) `task_5d47b107` | `56fbdb4` (local, ยังไม่ push) | ✅ **เสร็จ + รอบแก้ layout** (P'Aim: แถวเทอะทะ `songstruct-row-cramped.png` → แก้ตาม `ui-standards §2`: แถวบรรทัดเดียว · ▲▼ ข้างกัน · ชื่อไม่ตัดโหด · rail 250px · ♪ pill) · vitest **300** เขียว + build · verify desktop 1280 (row 42px · ▲▼ 26×26 ข้างกัน · "ร้อง 1" ไม่ตัด · console 0) + มือถือ 375 · report `docs/reports/editor-section-ux-dev.md` (§รอบแก้ layout) · แตะแค่ `EditorMode.vue` rail+arrangement (ไม่แตะ DOCK/PALETTE — กันชน DockKey) · **⚠️ ชน EditorMode.vue กับ DockKey phase2 → PM เรียงคิว merge+resolve** · ⛔ **process ใหม่: ส่ง tester ตรวจ checklist+ui-standards ก่อน P'Aim** · LAN `http://192.168.1.124:5372/#/studio` |
| **SA DockKey พิมพ์/แก้ไข (final)** `sa-print-dock-followup` | docs only · 6 commits | ✅ P'Aim เคาะครบ (พิมพ์/แก้ไข descriptor + prototype 3 โหมด) · report `docs/reports/sa-dockkey-print-edit.md` · **รอ PM merge → studio-shell-redesign** (SA merge เองไม่ได้ · DockKey dev ยัง HOLD = input รอบ rework) |

**GitHub:** `C:\Users\aimkr\OneDrive\4 Personal\claude\.env` → `GITHUB_TOKEN_PLENG` (`source .env` ก่อน · repo public) · Supabase = `SUPABASE_*_PLENG`
