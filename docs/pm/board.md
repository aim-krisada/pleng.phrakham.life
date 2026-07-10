# PM board — pleng (ไม้ต่อ · กระชับ · pm4 2026-07-10 ค่ำ)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิคอยู่ใน git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
เปิด PM session ใหม่: อ่าน `docs/pm/pm.md` + memory `pleng-pm-role` (บทเรียน PM) ก่อน แล้วอ่านไฟล์นี้ · ประวัติเก่า → `docs/pm/board-archive-2026-07-10.md`

---

## ▶ RESUME (git-verified)
- **ฐาน `studio-shell-redesign` HEAD = `97e735b`** = **288 test เขียว + build** (`npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` · "1 failed file" = notationLint process.exit เดิม ไม่ใช่บั๊ก)
- 🎉 **live = deploy รอบ 6 (`1a3aa65` · verified bundle stamp)** · **main === base** (align เสร็จ · divergence B073-solo หาย · รอบหน้า clean FF)
- **ได้ขึ้น live รอบ 6:** ตัวหนังสือมีหัว/ไม่มีหัว · ค้นโน้ต+"555" · พรีวิวดูผลทั้งเพลง · undo · MP3 (dock ฝึกร้อง) · favicon+footer · B073

## 🎯 PM session ปัจจุบัน = `pm4` (รอบ 6) → **session หน้า = `pm7`**
- **กติกา (P'Aim 10 ก.ค.): เลข PM = เลข sprint/deploy รอบ** · pm4→รอบ6 · **pm7 = sprint รอบ 7** · เปิดมาตั้งชื่อตัวเอง + อัปเดตบรรทัดนี้
- dev/SA รายงานเสร็จ (session-agnostic): (1) `docs/reports/<branch>.md` (2) เพิ่มบรรทัด §📥 inbox (3) ping PM ปัจจุบัน · **อย่า hardcode ชื่อสายใน prompt**
- **เช็ก `git branch --show-current` ก่อน commit ทุกครั้ง** (spawn_task สลับ branch main dir ใต้มือ · ดู memory)

---

## 🟢 กำลัง build (→ deploy รอบ 7) — 2 สายใหญ่ · ⚠️ ทั้งคู่แตะ `EditorMode.vue` คนละส่วน → PM เรียงคิว merge + resolve
1. **dockkey-dev phase 2 = ✅ ส่งแล้ว** (`5c71c16`+`b94c3d9` · 295 test) — 3 หน้าใช้ DockKey engine เดียว (แผ่นเพลง ITEMS_PRINT · แก้ไข ITEMS_EDIT band 21 keys · MP3 = `ExportTool.vue` เมนูรวม PDF/JSON/MP3 · ถอด StudioDock) · **🔺 pm7 ทำ: git-verify DoD + P'Aim LAN 3 หน้า (เน้นหน้าแก้ไข+MP3+undo มือถือ) ก่อน merge** · 4 จุดค้าง + brief = `docs/reports/dockkey-phase2.md` · dev `http://10.215.141.98:5315`
2. **editor-section-ux-dev** (`task_5d47b107`) — เปลือกจัดลำดับท่อนง่ายขึ้น (P'Aim เคาะ mockup `docs/design/editor-section-ux.html`) · **เน้นหนัก: ของเดิมห้าม regress** · brief `brief-editor-section-ux-dev.md` · ยังไม่รายงานกลับ

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
