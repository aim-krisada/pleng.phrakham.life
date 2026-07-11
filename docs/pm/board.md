# PM board — pleng (ไม้ต่อ · กระชับ · pm4 2026-07-10 ค่ำ)

กระดานนี้ = สถานะสด + งานค้าง + routing เท่านั้น · **รายละเอียดเทคนิคอยู่ใน git log + `docs/reports/<branch>.md` + `docs/backlog.md`** (อย่าซ้ำที่นี่)
เปิด PM session ใหม่: อ่าน `docs/pm/pm.md` + memory `pleng-pm-role` (บทเรียน PM) ก่อน แล้วอ่านไฟล์นี้ · ประวัติเก่า → `docs/pm/board-archive-2026-07-10.md`

---

## ▶▶ ต่อ session (pm7 · assembled deploy รอบ 7 base · 11 ก.ค. บ่าย)
**ยัง sprint 7 · session = `pm7` ต่อ · อ่าน `docs/pm/pm.md` + `docs/sop.md` + memory ก่อน**
**สถานะ workers:** dev DockKey / tester / slur dev / section-ux dev / SA interlinear = **idle (`isRunning:false`) ทั้งหมด** (เช็ก 11 ก.ค. บ่าย) · ไม้ต่อจริงอยู่ใน git ครบ ไม่ต้อง re-ping · running มีแต่ phrakham.life2 (คนละโปรเจกต์)
- **✅ ฐานรวม deploy รอบ 7 ประกอบ+ตรวจแล้ว → `studio-shell-redesign` HEAD `b369a49`** · **317 test เขียว** (300 เดิม + 17 axe/invariant ใหม่ · "1 failed file" = notationLint process.exit เดิม ไม่ใช่บั๊ก) · **build เขียว**
- **merge เข้าฐานรอบนี้ (ทั้งหมด tester PASS):**
  1. **DockKey §D GATE-4 polish** `108167c` + **B079** download single-source `10e91d5` (merge `84f0b38`) — tester PASS 3 โหมด dock (`d2a1dc2`)
  2. **slur B076** Bézier ตามความกว้างจริง `c202e13` (merge `c845183`) — tester PASS geometry (`0edf690`) · conflict launch.json (พอร์ต) resolve เก็บทั้งคู่
  3. **tester a11y infra** (axe-core + `ui-invariants.js` + DockKey invariant spec) `b369a49` — npm test รัน a11y ในฐานแล้ว (follow-up ปิด)
- **🚧 GATE-4 defect (P'Aim 11 ก.ค.) → บล็อก deploy รอบ 7 · [dev เสร็จ → in tester]:** หน้าฝึกร้อง หัวสไลด์ไทม์ไลน์ชิดขอบ dock (เดิม 3px) — **dev แก้แล้ว** (`66915b8` branch `fix-sing-timeline-edge` · inset ราง+หัว 10px ในเซลล์เดิม ไม่ทำกว้างขึ้น · self-verify 375/768/1280 = 11/13/13px · ลาก 1:1 · 317 test) → **ส่ง tester (`local_03855226`) confirm D6 แล้ว รอผล** · server `192.168.1.124:5401` · report `docs/reports/sing-timeline-edge.md`
  - **pm7 ต่อ:** tester PASS → merge `fix-sing-timeline-edge` เข้าฐาน (มี doc-divergence: dev แตกก่อน commit process-rule ของ pm7 → 3-way keep ทั้งคู่ · board.md อาจ conflict inbox line) → re-serve 5400 → P'Aim ตรวจ → go
  - **process ปิดช่องโหว่แล้ว:** ui-standards + checklist **D6** (slider knob วัดสองปลาย ≥10px) แทน B1/B6 ที่กว้างไป → tester ดักครั้งหน้า
  - **P'Aim เคาะ (11 ก.ค.):** เสนอเพิ่มกรอบรอบ timeline → **ไม่ทำ** (PM เตือน nested-border ซ้อนในการ์ดที่มีกรอบแล้ว = ขัด minimalist · slider มาตรฐานไม่มีกรอบ · บันทึกใน ui-standards) → **สั่ง "รอ tester ผ่าน แล้ว deploy รอบ 7 เลย"** (pre-authorized deploy · contingent tester PASS)
  - **pm7 ต่อ (สำคัญ):** tester PASS → merge fix เข้าฐาน → **deploy รอบ 7** (align main=base + push · P'Aim สั่งแล้ว) → รายงาน version จริง vs live footer · ถ้า tester FAIL → หยุด แจ้ง P'Aim
- 🟢 ขนาน (ไม่บล็อก deploy): **SA interlinear ≥3 ภาษา** (mockup รอ P'Aim เคาะ) · **B080 expert standards** · Amazing Grace ในคลัง (พี่เปาฟังเช็ก)
- **✅ จ่าย 2 สาย bug พี่เปาแล้ว (11 ก.ค. บ่าย · หลัง deploy รอบ 7):**
  - **สาย A** = B082 (เส้นปิดห้องท้ายบรรทัด) + B069 (ไทข้ามห้อง) · `SongSheet.vue` · branch `fix-songsheet-barline-tie` · → dev `local_3e1ae3ed` (SongSheet finishing · เจ้าของ B069) · brief `brief-songsheet-barline-tie.md`
  - **สาย B** = B081 (พรีวิว "ดูผลทั้งเพลง" กระดาษล้น) · `EditorMode.vue` · branch `fix-editor-preview-overflow` · → dev `local_bbeeb02f` (บั๊กพรีวิว) · brief `brief-editor-preview-overflow.md`
  - ⚠️ 2 สายห้ามแตะไฟล์ของกัน (A=SongSheet · B=EditorMode) · ทั้งคู่ **verify print PDF จริง** · รอ dev → tester → merge → deploy รอบ 8
  - kanban พี่เปา 3 ตัว ย้าย **รอทำ→กำลังทำ** แล้ว (`สถานะบั๊ก/2-กำลังทำ/`)
- **📊 kanban พี่เปา (P'Aim 11 ก.ค.):** สถานะ bug พี่เปา mirror เป็น folder ให้พี่เปาเห็นเองที่ `OneDrive/4 Personal/pleng.phrakham.life/pleng2-pow-bug-report/สถานะบั๊ก/` (3 ช่อง `1-รอทำ`/`2-กำลังทำ`/`3-เสร็จแล้ว`) · **PM ต้องย้ายโฟลเดอร์บั๊กไปช่องถัดไปทุกครั้งที่สถานะเปลี่ยน** (จ่าย=→กำลังทำ · deploy ขึ้น live=→เสร็จแล้ว) + อัปเดต `อ่านตรงนี้-สถานะบั๊ก.md` · ตอนนี้ 3 ตัวอยู่ `1-รอทำ`
- **cleanup ค้าง:** ปิด dev server เก่า (:5315/:5372/:5376 อาจยังรัน) · worktree เก่า ~15

## ▶ RESUME (git-verified)
- **ฐาน `studio-shell-redesign` = main HEAD = `71b8d8f`** = **317 test + build** · main===base อีกครั้ง (clean FF)
- 🎉 **DEPLOY รอบ 7 = LIVE + verified (11 ก.ค. · `71b8d8f`)** — live footer stamp `71b8d8f*` (ยืนยัน bundle มี `71b8d8f` · ไม่มี `1a3aa65` เดิม) · `*` = CI build tree dirty (cosmetic · ไม่กระทบโค้ด · follow-up เล็ก)
- **ขึ้น live รอบ 7:** DockKey §D polish + B079 export single-source · slur B076 โค้งไม่บิด · **หัวไทม์ไลน์ไม่ชิดขอบ (D6 · knob 13px)** · tester a11y infra · (ของรอบ 6 ครบ)
- **pm7 ต่อ:** **จ่าย 2 สาย bug พี่เปา** (P'Aim สั่ง "หลัง deploy รอบ 7") → ตอนจ่าย ย้าย kanban พี่เปา 3 ตัว รอทำ→กำลังทำ (`สถานะบั๊ก/`)

## 🎯 PM session ปัจจุบัน = `pm7` (sprint รอบ 7 · pm4 รับต่อเป็น pm7 เอง ไม่ handoff · P'Aim 10 ก.ค.)
- **กติกา (P'Aim 10 ก.ค.): เลข PM = เลข sprint/deploy รอบ** · pm4→รอบ6 · **pm7 = sprint รอบ 7**
- **🎯 เป้าหมายวันนี้ (P'Aim 11 ก.ค.) — ✅ ครบ + polish + slur + tester infra MERGED เข้าฐาน `b369a49` (317 test · build):** (1) DockKey 3 หน้า + §D polish + B079 (2) โครงเพลง (3) slur B076 — ทั้งหมด tester PASS → **🚦 GATE 4: เสิร์ฟฐานรวม `http://192.168.1.124:5400` (กำลังรัน) รอ P'Aim ตรวจ "ผลรวม" ก่อน deploy รอบ 7** · ✅ follow-up ปิด: tester infra เข้าฐานแล้ว · ⏳ ปิด server dev เก่า
- **⭐ process upgrade (P'Aim 11 ก.ค.):** Tier-B ทำอัตโนมัติผ่าน **Claude Browser MCP** (resize+วัดพิกัดจริง) · auto-loop `fix-verify-loop` (≤3 รอบ) ครอบ Tier-A+B · P'Aim เหลือแค่ทิศทาง/ความสวย
- dev/SA รายงานเสร็จ (session-agnostic): (1) `docs/reports/<branch>.md` (2) เพิ่มบรรทัด §📥 inbox (3) ping PM ปัจจุบัน · **อย่า hardcode ชื่อสายใน prompt**
- **เช็ก `git branch --show-current` ก่อน commit ทุกครั้ง** (spawn_task สลับ branch main dir ใต้มือ · ดู memory)

## 📥 inbox (รายงานเข้า → pm7 อ่าน)
- **✅ MERGED เข้าฐาน b369a49 แล้ว (pm7 11 ก.ค. บ่าย):** DockKey §D polish+B079 (`84f0b38`) · slur B076 (`c845183`) · tester a11y infra (`b369a49`) — ดู §▶▶ ด้านบน
  - **follow-up ค้างจาก B076:** P'Aim ควร print PDF จริง (verify print/PDF จาก PDF ไม่ใช่ DOM — memory) · **B069 cross-bar overlay (SongSheet คนละกลไก) ยังไม่ตรวจ** · detail `docs/reports/slur-bezier.md`

---

## ✅ merged เข้าฐาน deploy รอบ 7 (b369a49) — เดิมอยู่ §🟢 กำลัง build
- **dockkey-dev** (3 หน้า DockKey engine เดียว · §A/§B/§D + B079 · ถอด StudioDock) — merge `84f0b38` · tester PASS
- **editor-section-ux-dev** (โครงเพลงรายการเดียว · rename inline · ▲▼) `56fbdb4` — เข้าฐาน `2b8462b` ก่อนหน้า · tester PASS
- **slur-bezier B076** (`v-arc` Bézier ตามความกว้างจริง) — merge `c845183` · tester PASS
> merge sequencing เสร็จแล้ว: dockkey-dev + slur-bezier แตะ `EditorMode.vue`/`NoteRow.vue` คนละส่วน — merge clean, conflict มีแค่ launch.json (พอร์ต) resolve เก็บทั้งคู่

## 🔬 research/experiment (ขนาน · ไม่บล็อก)
- ✅ **Amazing Grace experiment เสร็จ** (`task_90eab2dc`) — PD-safe ยืนยัน (EN Newton1779+New Britain PD · TH แต่งเอง CC0) · เข้า v2 verify ผ่าน · 2-row EN+TH ใช้ได้ 0 โค้ด · report `docs/reports/bilingual-amazing-grace.md` · sample `docs/samples/amazing-grace.json` · **P'Aim เคาะ:** (1) ทำ interlinear จับคู่ 2 row (2) **เข้าคลังจริงทดสอบ** → session ทำ `tools/insert-amazing-grace.sql` (verified=false · พี่เปาฟังเช็ก melody syllabic) **รอ P'Aim run**
- 🟢 **SA interlinear หลายภาษา** (`task_aea51f3c`) — ออกแบบ "แสดงหลายภาษาคู่กัน render-only" · **⭐ ≥3 ภาษา (ไทย/จีน/อังกฤษ — P'Aim ใช้ในที่ประชุม)** ไม่ล็อก 2 · จับกลุ่ม N row · mockup ให้ P'Aim เคาะก่อน dev · brief `brief-bilingual-interlinear-sa.md` · dev รอบหลัง (ชน SongSheet → pm7 จัดคิว)
- ✅ **jianpu-ly research เสร็จ** (`task_c8d52b9f`) → report `docs/reports/jianpu-ly-study.md` (branch `research-jianpu-ly`) · **🟢 P'Aim ตัดสิน (11 ก.ค.): เอาแค่แนวคิดมาปรับปรุงของเราให้ดีขึ้นพอ — ❌ ไม่รับ LilyPond export / ❌ ไม่รับ MusicXML import** · แนวคิดที่รับมา = (1) เช็กลิสต์ syntax ตรวจ `notation.js` (gap เฝ้าดู ไม่รีบ: เขบ็ต 3 ชั้น/ห้องยก/DC-Coda · v2 playOrder แก้ซ้ำได้ดีกว่า volta) (2) แก้ B062/B069 เส้นเอื้อนบิด → คำนวณ Bézier ตามความกว้างจริง (เลิก `preserveAspectRatio=none`) · license Apache 2.0 → รวมใน GPL v3 ได้ (เอาแนวคิด ไม่ลอกโค้ด) · **pm7: จ่ายเป็น backlog ปรับปรุงในสายเราเอง ไม่มี dependency ภายนอก**
- ✅ **UI standards SSOT = P'Aim approve แล้ว** `docs/ui-standards.md` (5 de-facto + invariants + บังคับใช้ 4 ชั้น) — ทุก brief อ้างอิง · เฉพาะฟีเจอร์ = `docs/pm/dockkey-checklist.md` ต่อยอด
- 🧪 **Tester gate = ด่านของ *ทุก* UI delivery ก่อน P'Aim** (`task_afad8e4c`) — automate axe/no-scroll/target-size + ตรวจ ui-standards+checklist · **ห้าม UI ใดถึง P'Aim โดยไม่ผ่าน tester** (P'Aim 11 ก.ค. — โครงเพลงหลุดถึง P'Aim เพราะไม่ผ่าน tester = ช่องโหว่ที่ปิดแล้ว) · คิว: DockKey · editor-section-ux(แถวโครงเพลง) · B076 slur
- **⭐ process rule (P'Aim 11 ก.ค.):** ทุกตัวอย่างที่ P'Aim ยกมา = **เพิ่มเป็นกฎใน `ui-standards`/checklist** (ไม่ใช่แก้จุดเดียว) → tester ดักครั้งหน้า · เป้า = ดันคุณภาพ ~100% ก่อนถึง P'Aim · เพิ่มล่าสุด: list-row บรรทัดเดียว/▲▼ ข้างกัน/ไม่ตัดชื่อโหด
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

**Deploy history:** รอบ2 `b44edbf` · รอบ3 `bbb3757` · รอบ4 `c9a0cf8` · รอบ5 `1535e1f` · รอบ6 `1a3aa65` · **รอบ7 `71b8d8f` = live (11 ก.ค.)**
**env:** GitHub `OneDrive/4 Personal/claude/.env` → `GITHUB_TOKEN_PLENG` (source ก่อน · repo public) · Supabase `SUPABASE_*_PLENG` · main อยู่ worktree `pleng-natural-tie`
