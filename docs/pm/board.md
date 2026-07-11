# PM board — pleng (ไม้ต่อ · กระชับ · pm4 2026-07-10 ค่ำ)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิคอยู่ใน git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
เปิด PM session ใหม่: อ่าน `docs/pm/pm.md` + memory `pleng-pm-role` (บทเรียน PM) ก่อน แล้วอ่านไฟล์นี้ · ประวัติเก่า → `docs/pm/board-archive-2026-07-10.md`

---

## ▶ RESUME (git-verified)
- **ฐาน `studio-shell-redesign` HEAD = `97e735b`** = **288 test เขียว + build** (`npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` · "1 failed file" = notationLint process.exit เดิม ไม่ใช่บั๊ก)
- 🎉 **live = deploy รอบ 6 (`1a3aa65` · verified bundle stamp)** · **main === base** (align เสร็จ · divergence B073-solo หาย · รอบหน้า clean FF)
- **ได้ขึ้น live รอบ 6:** ตัวหนังสือมีหัว/ไม่มีหัว · ค้นโน้ต+"555" · พรีวิวดูผลทั้งเพลง · undo · MP3 (dock ฝึกร้อง) · favicon+footer · B073

## 🎯 PM session ปัจจุบัน = `pm7` (sprint รอบ 7 · pm4 รับต่อเป็น pm7 เอง ไม่ handoff · P'Aim 10 ก.ค.)
- **กติกา (P'Aim 10 ก.ค.): เลข PM = เลข sprint/deploy รอบ** · pm4→รอบ6 · **pm7 = sprint รอบ 7**
- **pm7 กำลังทำ:** เปิด LAN 2 server (`5315` DockKey · `5372` โครงเพลง) รอ P'Aim ลอง → git-verify DoD → merge เรียงคิว (EditorMode) → deploy รอบ 7 · **ยังไม่ merge ทั้ง 2**
- dev/SA รายงานเสร็จ (session-agnostic): (1) `docs/reports/<branch>.md` (2) เพิ่มบรรทัด §📥 inbox (3) ping PM ปัจจุบัน · **อย่า hardcode ชื่อสายใน prompt**
- **เช็ก `git branch --show-current` ก่อน commit ทุกครั้ง** (spawn_task สลับ branch main dir ใต้มือ · ดู memory)

---

## 🟢 กำลัง build (→ deploy รอบ 7) — 2 สายใหญ่ · ⚠️ ทั้งคู่แตะ `EditorMode.vue` คนละส่วน → PM เรียงคิว merge + resolve
1. **dockkey-dev phase 2 = ✅ ส่งแล้ว** (ล่าสุด `08870aa` · re-sync `9f2ad42` · **300 test** · build) — 3 หน้าใช้ DockKey engine เดียว (แผ่นเพลง ITEMS_PRINT · แก้ไข ITEMS_EDIT band 21 keys · **MP3 เข้า `ExportTool.vue` กลาง = เมนู PDF/JSON/MP3 เดียวกันครบ 3 หน้า** · sing MP3 render ตามคีย์/สปีดที่เลือก · ถอด StudioDock) · ⏳ **P'Aim ตรวจหน้าฝึกร้อง (11 ก.ค.) เจอหลายจุด → dev กำลังแก้ตาม `dockkey-checklist.md` §A(engine invariant)+§B(12 ข้อ)** (popup ชิดขวา/ไม่ scroll · button hierarchy · bug เลือกท่อน↔timeline · label download หาย ฯลฯ) · **flow: dev แก้ → tester ตรวจ checklist เขียวครบ → ค่อยให้ P'Aim ดู** · dev จะให้ Network URL ใหม่ · detail `docs/reports/dockkey-phase2.md`+`dockkey-checklist.md`
2. **editor-section-ux-dev = ✅ ส่งแล้ว** (`61015fa` · **299 test** · build) — ยุบ 3 รายการแถบซ้าย→รายการเดียว "โครงเพลง" · rename inline (rail+หัวท่อน sync) · ลากจัดลำดับนิ้ว+เมาส์+▲▼ (WCAG 2.5.7+aria-live) · หัวท่อนบนแคนวาส · ตัดบล็อก #pk-arrange · "ท่อน A"→"ทำนอง A" · **dev verify ของเดิมไม่ regress** (note/seg/syl/preview/ย่อหน้า/ตั้งค่า) · **🔺 pm7 ทำ: git-verify + P'Aim LAN `http://10.215.141.98:5372/#/studio` (เทียบของเดิมทำได้หมด+ง่ายขึ้น) ก่อน merge** · detail `docs/reports/editor-section-ux-dev.md`
> **pm7 merge sequencing:** 2 สายบนแตะ `EditorMode.vue` คนละส่วน (DockKey=dock/PALETTE/editDockTools · section-ux=rail/arrangement) → merge ทีละสาย + git-verify ของอีกสายไม่หาย + rerun test · สายไหน merge ก่อนก็ได้ อีกสาย rebase

## 🔬 research (ขนาน · ไม่บล็อก)
- **jianpu-ly** (`task_c8d52b9f`) — ศึกษา `OneDrive/.../jianpu-ly-master` (text→LilyPond jianpu engraver) เอามาใช้ pleng อะไรได้ (print คุณภาพ/syntax/slur-tie/MusicXML/license) · read-only · brief `brief-jianpu-ly-study.md` → report `docs/reports/jianpu-ly-study.md`
- ✅ **UI standards SSOT = P'Aim approve แล้ว** `docs/ui-standards.md` (5 de-facto + invariants + บังคับใช้ 4 ชั้น) — ทุก brief อ้างอิง · เฉพาะฟีเจอร์ = `docs/pm/dockkey-checklist.md` ต่อยอด
- 🧪 **Tester role เปิดแล้ว** (`task_afad8e4c` · `brief-tester-role.md`) — automate axe-core/no-scroll/target-size + ตรวจ checklist ก่อน P'Aim ทุกครั้ง · เริ่ม DockKey → ต่อ แผ่นเพลง/แก้ไข
- **หลัก process (P'Aim 11 ก.ค. · memory `feedback_pm_process_not_output`):** มีมาตรฐาน→ตรวจ→iterate · เจอไม่ตรงแก้ที่ process ไม่โทษคน · PM = ensure process perfect

## 🎯 รอ P'Aim ตัดสิน (ไม่บล็อก)
- **B028 audit log** — DS `docs/ds/audit-log.md` · 3 Qs (branch `sa-b028-audit-log` docs · รอเคาะก่อน dev)
- **i18n** — `lang=th` + `translate="no"` ที่ NoteRow/ShellBar (แทน i18n เต็ม · ยังไม่ spawn)
- **สิทธิ์ลบเพลง** — approver-only vs ทีมทุกคน

## 📦 data/review + backlog (ไม่เร่ง · detail ใน `docs/backlog.md`)
- **พี่เปา:** review 41 เพลงติดธง (review_flags: 16 repeat/6 lint/28 words) · ตั้ง 10 COMPLEX repeat ใน Studio · verify undo/นับจังหวะ บน live
- `tools/repeat-6-simple.sql` — P'Aim อาจยังไม่ run · DA option B (repeat จาก geometry ~18) defer
- **ideas ใหม่:** ป้าย "ทำไม match" ในผลค้นหา · ค้นโน้ต match ข้ามท่อน (บังคับในท่อนเดียว) · B046 ชื่อ↔เนื้อ · B066 tempo

## 🧹 cleanup (เมื่อสายปิด)
worktree เก่า ~15 (`.claude/worktrees/` + `pleng-*`) · branch `claude/*` เยอะ · dev server `:5315`/`:5400` อาจยังรัน · `git worktree list` ดู

**Deploy history:** รอบ2 `b44edbf` · รอบ3 `bbb3757` · รอบ4 `c9a0cf8` · รอบ5 `1535e1f` · **รอบ6 `1a3aa65` = live**
**env:** GitHub `OneDrive/4 Personal/claude/.env` → `GITHUB_TOKEN_PLENG` (source ก่อน · repo public) · Supabase `SUPABASE_*_PLENG` · main อยู่ worktree `pleng-natural-tie`
