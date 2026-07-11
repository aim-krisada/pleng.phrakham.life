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
- **🎯 เป้าหมายวันนี้ (P'Aim 11 ก.ค.):** (1) **DockKey เสร็จ 3 หน้า** (dev แก้ตาม checklist → tester → P'Aim) (2) **โหมดแก้ไข intuitive** (โครงเพลง · git-verify+P'Aim LAN → merge) (3) **แก้เส้นเอื้อนบิด** (B076 · จ่ายแล้ว) → deploy รอบ 7
- dev/SA รายงานเสร็จ (session-agnostic): (1) `docs/reports/<branch>.md` (2) เพิ่มบรรทัด §📥 inbox (3) ping PM ปัจจุบัน · **อย่า hardcode ชื่อสายใน prompt**
- **เช็ก `git branch --show-current` ก่อน commit ทุกครั้ง** (spawn_task สลับ branch main dir ใต้มือ · ดู memory)

## 📥 inbox (รายงานเข้า → pm7 อ่าน)
- **B076 slur/tie bézier = ✅ ส่งแล้ว** (branch `slur-bezier` จาก `studio-shell-redesign`) — เลิกยืด path (`preserveAspectRatio=none`) → คำนวณ `d` จากความกว้างจริง (directive `v-arc` ใน NoteRow) · จุดควบคุม taper คงที่ 26px ทุกความยาว → เอื้อน 8 โน้ตโค้งเรียบไม่บิด · **292 test + build** · แตะแค่ `NoteRow.vue`(+test)+`launch.json` (ไม่แตะ SongSheet/DockKey/EditorMode) · verify: Guide+song sheet+editor ไม่ regress, console ไม่ error, geometry viewBox=clientWidth 1:1 · **ค้าง: P'Aim print PDF จริง + ดูมือถือ `http://192.168.1.124:5376/`** · **follow-up: B069 cross-bar overlay (SongSheet คนละกลไก) ยังไม่ตรวจ** · detail `docs/reports/slur-bezier.md` · ⛔ ยังไม่ merge/deploy

---

## 🟢 กำลัง build (→ deploy รอบ 7) — 2 สายใหญ่ · ⚠️ ทั้งคู่แตะ `EditorMode.vue` คนละส่วน → PM เรียงคิว merge + resolve
1. **dockkey-dev phase 2 = ✅ ส่งแล้ว** (ล่าสุด `08870aa` · re-sync `9f2ad42` · **300 test** · build) — 3 หน้าใช้ DockKey engine เดียว (แผ่นเพลง ITEMS_PRINT · แก้ไข ITEMS_EDIT band 21 keys · **MP3 เข้า `ExportTool.vue` กลาง = เมนู PDF/JSON/MP3 เดียวกันครบ 3 หน้า** · sing MP3 render ตามคีย์/สปีดที่เลือก · ถอด StudioDock) · ✅ **dev แก้ checklist ครบแล้ว** (`99911c5` · re-sync `7a09023` · **300 test**) — §A engine (popup ชิดขวา gap 9px เท่ากัน · no-scroll · ตัดลูกศร · **button hierarchy: filled=primary จริง [ฝึกร้อง▶/แผ่นพิมพ์/แก้บันทึก] · download ghost หมด**) + §B (เวลาไม่ซ้อนคีย์ · **B2 ลบ progress fill ที่ทำให้ท่อนดูถูกเลือก** · ซ้อม→ฟัง ฯลฯ) · **🔺 pm7: ส่ง tester ตรวจ checklist ก่อน (⛔ ยังไม่ให้ P'Aim)** · export ยัง row1 (ghost แล้ว · ย้ายเข้า ⚙=งานแยก) · detail `docs/reports/dockkey-phase2.md`+`dockkey-checklist.md` · **IP วันนี้ = `192.168.1.124`**
2. **editor-section-ux-dev = ✅ ส่งแล้ว** (`61015fa` · **299 test** · build) — ยุบ 3 รายการแถบซ้าย→รายการเดียว "โครงเพลง" · rename inline (rail+หัวท่อน sync) · ลากจัดลำดับนิ้ว+เมาส์+▲▼ (WCAG 2.5.7+aria-live) · หัวท่อนบนแคนวาส · ตัดบล็อก #pk-arrange · "ท่อน A"→"ทำนอง A" · **dev verify ของเดิมไม่ regress** (note/seg/syl/preview/ย่อหน้า/ตั้งค่า) · **🔺 pm7 ทำ: git-verify + P'Aim LAN `http://192.168.1.124:5372/#/studio` (เทียบของเดิมทำได้หมด+ง่ายขึ้น) ก่อน merge** · detail `docs/reports/editor-section-ux-dev.md`
> **pm7 merge sequencing:** 2 สายบนแตะ `EditorMode.vue` คนละส่วน (DockKey=dock/PALETTE/editDockTools · section-ux=rail/arrangement) → merge ทีละสาย + git-verify ของอีกสายไม่หาย + rerun test · สายไหน merge ก่อนก็ได้ อีกสาย rebase

3. **slur-bezier (B076) = 🔨 จ่ายแล้ว** (`task_94f2d5c8`) — แก้เส้นเอื้อน/ไทบิด (`NoteRow.vue` `preserveAspectRatio=none`+path ตายตัว → คำนวณ Bézier ตามความกว้างจริง · หลักการจาก jianpu-ly research) · **NoteRow เดียว = ไม่ชน DockKey/โครงเพลง** · brief `brief-slur-bezier.md`

## 🔬 research/experiment (ขนาน · ไม่บล็อก)
- **Amazing Grace + เนื้อ 2 ภาษา** (`task_90eab2dc`) — เอาเพลง PD (Amazing Grace) เข้าระบบทดสอบ (ปลอดลิขสิทธิ์ · Crossover/10ปลาวาฬ ติดลิขสิทธิ์ใช้ไม่ได้) + ประเมิน feature เนื้อ 2 ภาษา (v2 ไม่มี native · ทดสอบ 2-row workaround + gap) · experiment ไม่ push DB · brief `brief-amazing-grace-bilingual.md`
- ✅ **jianpu-ly research เสร็จ** (`task_c8d52b9f`) → report `docs/reports/jianpu-ly-study.md` (branch `research-jianpu-ly`) · **🟢 P'Aim ตัดสิน (11 ก.ค.): เอาแค่แนวคิดมาปรับปรุงของเราให้ดีขึ้นพอ — ❌ ไม่รับ LilyPond export / ❌ ไม่รับ MusicXML import** · แนวคิดที่รับมา = (1) เช็กลิสต์ syntax ตรวจ `notation.js` (gap เฝ้าดู ไม่รีบ: เขบ็ต 3 ชั้น/ห้องยก/DC-Coda · v2 playOrder แก้ซ้ำได้ดีกว่า volta) (2) แก้ B062/B069 เส้นเอื้อนบิด → คำนวณ Bézier ตามความกว้างจริง (เลิก `preserveAspectRatio=none`) · license Apache 2.0 → รวมใน GPL v3 ได้ (เอาแนวคิด ไม่ลอกโค้ด) · **pm7: จ่ายเป็น backlog ปรับปรุงในสายเราเอง ไม่มี dependency ภายนอก**
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
